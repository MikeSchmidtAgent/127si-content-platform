-- MVP media storage: public delivery, authenticated admin uploads through the server.
insert into storage.buckets (id, name, public)
values ('content-media', 'content-media', true)
on conflict (id) do update set public = excluded.public;

alter table public.media_assets
  add column if not exists uploaded_by uuid references auth.users(id);

alter table public.media_assets enable row level security;
alter table public.content_media enable row level security;

drop policy if exists "published media assets are readable" on public.media_assets;
create policy "published media assets are readable"
  on public.media_assets for select
  using (exists (
    select 1
    from public.content_media cm
    join public.content_items ci on ci.id = cm.content_item_id
    where cm.media_asset_id = media_assets.id
      and ci.status = 'published'
  ));

drop policy if exists "published content media links are readable" on public.content_media;
create policy "published content media links are readable"
  on public.content_media for select
  using (exists (
    select 1 from public.content_items ci
    where ci.id = content_media.content_item_id and ci.status = 'published'
  ));

drop policy if exists "public content media is readable" on storage.objects;
create policy "public content media is readable"
  on storage.objects for select
  using (bucket_id = 'content-media');

create or replace view public.published_content as
select c.id, c.content_type, c.title, c.slug, c.short_description, c.long_description, c.rationale, c.type_data,
       c.visibility, c.published_at, r.id as revision_id, r.revision_number,
       coalesce((c.type_data->'challenge_ids'), '[]'::jsonb) as challenge_ids,
       coalesce((select jsonb_agg(jsonb_build_object(
         'id', ma.id,
         'storage_path', ma.storage_path,
         'media_type', ma.media_type,
         'mime_type', ma.mime_type,
         'filename', ma.filename,
         'alt_text', ma.alt_text,
         'caption', ma.caption,
         'role', cm.role,
         'display_order', cm.display_order
       ) order by cm.display_order, ma.created_at)
       from public.content_media cm
       join public.media_assets ma on ma.id = cm.media_asset_id
       where cm.content_item_id = c.id), '[]'::jsonb) as media
from public.content_items c
join lateral (select * from public.content_revisions r where r.content_item_id = c.id order by r.revision_number desc limit 1) r on true
where c.status = 'published' and c.visibility in ('public','link_only');
