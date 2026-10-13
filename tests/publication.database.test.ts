import assert from "node:assert/strict";
import { execFile, execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { promisify } from "node:util";
import test from "node:test";

const database = process.env.CONTENT_TEST_DATABASE_URL;
const migrations = new URL("../supabase/migrations/", import.meta.url);
const runAsync = promisify(execFile);

test("PostgreSQL publishing rolls back failure, serializes retries, and freezes approved media", { skip: !database }, async () => {
  // This harness resets schemas. Refuse anything except a disposable local DB.
  const url = new URL(database!);
  assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(url.hostname));
  assert.equal(url.pathname, "/content_test");
  const args = [database!, "-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1"];
  const sql = (query: string) => execFileSync("psql", [...args, "-c", query], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  sql(`drop schema public cascade; create schema public;
    create schema if not exists auth; create table if not exists auth.users(id uuid primary key);
    create schema if not exists storage;
    create table if not exists storage.buckets(id text primary key,name text,public boolean);
    create table if not exists storage.objects(id uuid,bucket_id text);
    do $$begin
      if not exists(select from pg_roles where rolname='anon') then create role anon nologin; end if;
      if not exists(select from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
      if not exists(select from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
    end$$;`);
  for (const file of readdirSync(migrations).sort()) if (file.endsWith(".sql")) {
    if (file === "0008_atomic_publication.sql") {
      sql(`insert into public.content_items(id,content_type,title,slug,status,published_at) values
        ('00000000-0000-0000-0000-000000000003','tutorial','Legacy','legacy','published',now());
        insert into public.media_assets(id,storage_path,media_type,filename,caption) values
        ('00000000-0000-0000-0000-000000000004','legacy.png','image','legacy.png','Legacy caption');
        insert into public.content_media(content_item_id,media_asset_id) values
        ('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000004');
        insert into public.content_revisions(content_item_id,revision_number,snapshot) values
        ('00000000-0000-0000-0000-000000000003',1,'{"title":"Old legacy","content_type":"tutorial","visibility":"public"}'),
        ('00000000-0000-0000-0000-000000000003',2,'{"title":"Legacy","content_type":"tutorial","visibility":"public"}');`);
    }
    sql(readFileSync(new URL(file, migrations), "utf8"));
  }
  assert.equal(sql(`select snapshot ? 'media' from public.content_revisions where revision_number=1`), "f");
  assert.equal(sql(`select snapshot->>'title' from public.content_revisions where revision_number=1`), "Old legacy");
  assert.equal(sql(`select title||':'||(media->0->>'caption')||':'||revision_number from public.published_content where slug is null`), "Legacy:Legacy caption:2");
  sql(`delete from public.content_items where id='00000000-0000-0000-0000-000000000003';
    delete from public.media_assets where id='00000000-0000-0000-0000-000000000004';`);
  sql(`grant usage on schema public to service_role;
    grant all on all tables in schema public to service_role;`);
  const id = "00000000-0000-0000-0000-000000000001";
  const asset = "00000000-0000-0000-0000-000000000002";
  sql(`insert into public.content_items(id,content_type,title,slug,type_data) values
    ('${id}','tutorial','Approved title','approved','{"challenge_ids":["challenge-1"]}');
    insert into public.media_assets(id,storage_path,media_type,filename,caption) values
    ('${asset}','approved.png','image','approved.png','Approved caption');
    insert into public.content_media(content_item_id,media_asset_id) values ('${id}','${asset}');
    create function public.test_fail_publish() returns trigger language plpgsql as $$begin
      if new.status='published' then raise exception 'injected publication failure'; end if; return new;
    end$$;
    create trigger test_fail_publish before update on public.content_items for each row execute function public.test_fail_publish();`);
  assert.throws(() => sql(`set role service_role; select public.set_content_status('${id}','published');`), /Command failed/);
  assert.equal(sql(`select status||':'||(select count(*) from public.content_revisions) from public.content_items where id='${id}'`), "draft:0");
  sql("drop trigger test_fail_publish on public.content_items; drop function public.test_fail_publish();");
  await Promise.all(Array.from({ length: 12 }, () => runAsync("psql", [...args, "-c", `set role service_role; select public.set_content_status('${id}','published');`])));
  assert.equal(sql(`select status||':'||(select count(*) from public.content_revisions) from public.content_items where id='${id}'`), "published:1");
  assert.equal(sql(`select title||':'||(media->0->>'caption')||':'||(challenge_ids->>0) from public.published_content where id='${id}'`), "Approved title:Approved caption:challenge-1");
  sql(`update public.media_assets set caption='Unapproved caption' where id='${asset}';
    delete from public.content_media where content_item_id='${id}';`);
  assert.equal(sql(`select media->0->>'caption' from public.published_content where id='${id}'`), "Approved caption");
  sql(`set role service_role; select public.set_content_status('${id}','unpublished');`);
  assert.equal(sql("select count(*) from public.published_content"), "0");
  sql(`set role service_role; select public.set_content_status('${id}','published');`);
  assert.equal(sql(`select revision_number||':'||jsonb_array_length(media) from public.published_content where id='${id}'`), "2:0");
  for (const role of ["anon", "authenticated"]) {
    assert.equal(sql(`select has_function_privilege('${role}', 'public.set_content_status(uuid,text)', 'execute')`), "f");
    assert.throws(() => sql(`set role ${role}; select public.set_content_status('${id}','draft');`));
  }
  sql(`insert into public.content_items(content_type,title,slug,type_data) values ('shout_out','No permission','no-permission','{}');`);
  assert.throws(() => sql("select public.set_content_status((select id from public.content_items where slug='no-permission'),'published')"));
});
