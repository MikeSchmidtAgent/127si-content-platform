-- Correct the published read model without changing the admin application.
-- The latest revision is the source of truth for published content fields.
-- Media remains delivered from the public `content-media` bucket for MVP.

create or replace view public.published_content as
select
  c.id,
  r.snapshot->>'content_type' as content_type,
  r.snapshot->>'title' as title,
  r.snapshot->>'slug' as slug,
  r.snapshot->>'short_description' as short_description,
  r.snapshot->>'long_description' as long_description,
  r.snapshot->>'rationale' as rationale,
  coalesce(r.snapshot->'type_data', '{}'::jsonb) as type_data,
  coalesce(r.snapshot->>'visibility', c.visibility) as visibility,
  c.published_at,
  r.id as revision_id,
  r.revision_number,
  coalesce(r.snapshot->'challenge_ids', '[]'::jsonb) as challenge_ids,
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', ma.id,
      'storage_path', ma.storage_path,
      'public_url', format('/storage/v1/object/public/content-media/%s', ma.storage_path),
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
    where cm.content_item_id = c.id
  ), '[]'::jsonb) as media
from public.content_items c
join lateral (
  select r.*
  from public.content_revisions r
  where r.content_item_id = c.id
    and r.published_at is not null
  order by r.revision_number desc
  limit 1
) r on true
where c.status = 'published'
  and coalesce(r.snapshot->>'visibility', c.visibility) in ('public', 'link_only');

comment on view public.published_content is
  'Public read model. Content fields come from the latest published revision snapshot. media.public_url is relative to the Supabase project URL and is valid for the public content-media bucket.';
