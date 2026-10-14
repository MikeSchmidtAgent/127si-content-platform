-- Backfill published revision snapshots for legacy published content_items.
-- Production (oqnnvmxjdersgcguhvsc): 30 published items had no content_revisions row,
-- so published_content / published_destination_content only exposed 1 item.
-- Idempotent: skips items that already have a revision with published_at set.
-- Does not update content_releases or mutate existing revision rows.

insert into public.content_revisions (content_item_id, revision_number, snapshot, published_at)
select
  c.id,
  coalesce((
    select max(r.revision_number)
    from public.content_revisions r
    where r.content_item_id = c.id
  ), 0) + 1,
  jsonb_build_object(
    'id', c.id,
    'content_type', c.content_type,
    'title', c.title,
    'slug', c.slug,
    'short_description', c.short_description,
    'long_description', c.long_description,
    'rationale', c.rationale,
    'type_data', c.type_data,
    'visibility', c.visibility,
    'challenge_ids', coalesce(c.type_data->'challenge_ids', '[]'::jsonb)
  ),
  coalesce(c.published_at, now())
from public.content_items c
where c.status = 'published'
  and c.visibility in ('public', 'link_only')
  and not exists (
    select 1
    from public.content_revisions r
    where r.content_item_id = c.id
      and r.published_at is not null
  );

comment on table public.content_revisions is
  'Immutable publish snapshots. Legacy items may receive revision 1 via 0007_backfill_published_revisions.sql.';
