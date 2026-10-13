-- Deploy before the application. Only the server service_role may call this RPC.
create or replace function public.set_content_status(p_content_id uuid, p_status text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  item public.content_items%rowtype;
  next_revision integer;
  media_snapshot jsonb;
begin
  if p_status is null or p_status not in ('draft', 'published', 'unpublished') then
    raise exception 'Invalid content status' using errcode = '22023';
  end if;
  -- Serialize publishing with edits and other status transitions for this item.
  select * into item from public.content_items where id = p_content_id for update;
  if not found then
    raise exception 'Content not found' using errcode = 'P0002';
  end if;
  -- A retried publish after success must not create another revision.
  if item.status = p_status then return; end if;
  if p_status = 'published' then
    if item.content_type = 'shout_out' and
       (item.type_data->'permission_confirmed') is distinct from 'true'::jsonb then
      raise exception 'Shout Outs require permission confirmation' using errcode = '22023';
    end if;
    select coalesce(max(revision_number), 0) + 1 into next_revision
      from public.content_revisions where content_item_id = p_content_id;
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', ma.id, 'storage_path', ma.storage_path,
      'public_url', format('/storage/v1/object/public/%s/%s', ma.storage_bucket, ma.storage_path),
      'media_type', ma.media_type, 'mime_type', ma.mime_type,
      'filename', ma.filename, 'alt_text', ma.alt_text, 'caption', ma.caption,
      'role', cm.role, 'display_order', cm.display_order
    ) order by cm.display_order, ma.created_at, ma.id), '[]'::jsonb)
      into media_snapshot from public.content_media cm
      join public.media_assets ma on ma.id = cm.media_asset_id
      where cm.content_item_id = p_content_id;
    insert into public.content_revisions(content_item_id, revision_number, snapshot)
      values (p_content_id, next_revision, jsonb_build_object(
        'id', item.id, 'content_type', item.content_type, 'title', item.title,
        'slug', item.slug, 'short_description', item.short_description,
        'long_description', item.long_description, 'rationale', item.rationale,
        'type_data', item.type_data, 'visibility', item.visibility,
        'challenge_ids', coalesce(item.type_data->'challenge_ids', '[]'::jsonb),
        'media', media_snapshot
      ));
  end if;
  update public.content_items set status = p_status,
    published_at = case when p_status = 'published' then now() else null end,
    updated_at = now() where id = p_content_id;
end;
$$;
revoke all on function public.set_content_status(uuid, text) from public, anon, authenticated;
grant execute on function public.set_content_status(uuid, text) to service_role;

-- Capture the existing live media at migration time for legacy revisions only.
-- Earlier media history was never recorded and cannot be reconstructed.
update public.content_revisions r set snapshot = r.snapshot || jsonb_build_object('media',
  coalesce((select jsonb_agg(jsonb_build_object(
    'id', ma.id, 'storage_path', ma.storage_path,
    'public_url', format('/storage/v1/object/public/%s/%s', ma.storage_bucket, ma.storage_path),
    'media_type', ma.media_type, 'mime_type', ma.mime_type, 'filename', ma.filename,
    'alt_text', ma.alt_text, 'caption', ma.caption, 'role', cm.role, 'display_order', cm.display_order
  ) order by cm.display_order, ma.created_at, ma.id)
  from public.content_media cm join public.media_assets ma on ma.id = cm.media_asset_id
  where cm.content_item_id = r.content_item_id), '[]'::jsonb))
where not (r.snapshot ? 'media') and r.id = (
  select latest.id from public.content_revisions latest
  where latest.content_item_id = r.content_item_id
  order by latest.revision_number desc limit 1
);

-- Keep the established published/link_only contract; freeze media along with text.
create or replace view public.published_content as
select c.id, r.snapshot->>'content_type' as content_type,
  r.snapshot->>'title' as title, r.snapshot->>'slug' as slug,
  r.snapshot->>'short_description' as short_description,
  r.snapshot->>'long_description' as long_description,
  r.snapshot->>'rationale' as rationale,
  coalesce(r.snapshot->'type_data', '{}'::jsonb) as type_data,
  coalesce(r.snapshot->>'visibility', c.visibility) as visibility,
  c.published_at, r.id as revision_id, r.revision_number,
  coalesce(r.snapshot->'challenge_ids', r.snapshot->'type_data'->'challenge_ids', '[]'::jsonb) as challenge_ids,
  coalesce(r.snapshot->'media', '[]'::jsonb) as media
from public.content_items c
join lateral (
  select revision.* from public.content_revisions revision
  where revision.content_item_id = c.id and revision.published_at is not null
  order by revision.revision_number desc limit 1
) r on true
where c.status = 'published'
  and coalesce(r.snapshot->>'visibility', c.visibility) in ('public', 'link_only');
comment on view public.published_content is
  'Published revision content and media snapshot; media URLs are relative to the Supabase project URL. Existing public/link_only semantics are unchanged.';
