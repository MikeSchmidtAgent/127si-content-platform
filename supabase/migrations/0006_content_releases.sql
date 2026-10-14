-- Destination-scoped publication releases (Production-canonical schema).
-- Idempotent against Production (ref oqnnvmxjdersgcguhvsc): table and rows already exist there.
-- Greenfield/staging: creates content_releases + published_destination_content; owners assign releases separately.

create table if not exists public.content_releases (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references public.content_items(id) on delete restrict,
  destination_key text not null,
  status text not null default 'draft',
  starts_at timestamptz,
  ends_at timestamptz,
  featured boolean not null default false,
  display_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  unpublished_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_releases_destination_key_check
    check (destination_key in ('challenge', 'referee')),
  constraint content_releases_status_check
    check (status in ('draft', 'published', 'unpublished', 'archived')),
  constraint content_releases_display_order_check
    check (display_order >= 0),
  constraint content_releases_published_requires_start_check
    check (status <> 'published' or (starts_at is not null and published_at is not null)),
  constraint content_releases_window_check
    check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create unique index if not exists content_releases_one_open_per_destination
  on public.content_releases (content_item_id, destination_key)
  where status in ('draft', 'published');

create index if not exists content_releases_public_destination_idx
  on public.content_releases (destination_key, featured desc, display_order, starts_at)
  where status = 'published';

create index if not exists content_releases_item_history_idx
  on public.content_releases (content_item_id, created_at desc);

comment on table public.content_releases is
  'Per-destination publication windows for consumer apps (Challenge, Referee). Production rows are owner-managed.';

alter table public.content_releases enable row level security;

drop policy if exists "published destination releases are readable" on public.content_releases;
drop policy if exists "active published releases are readable" on public.content_releases;
create policy "active published releases are readable"
  on public.content_releases for select
  using (
    status = 'published'
    and starts_at <= now()
    and (ends_at is null or ends_at > now())
  );

drop view if exists public.published_content_by_destination;

create or replace view public.published_destination_content as
select
  pc.id,
  pc.content_type,
  pc.title,
  pc.slug,
  pc.short_description,
  pc.long_description,
  pc.rationale,
  pc.type_data,
  pc.visibility,
  pc.published_at,
  pc.revision_id,
  pc.revision_number,
  pc.challenge_ids,
  pc.media,
  cr.id as release_id,
  cr.destination_key,
  cr.featured as release_featured,
  cr.display_order as release_display_order,
  cr.starts_at as release_starts_at,
  cr.ends_at as release_ends_at,
  cr.published_at as release_published_at
from public.published_content pc
inner join public.content_releases cr
  on cr.content_item_id = pc.id
where cr.status = 'published'
  and cr.starts_at <= now()
  and (cr.ends_at is null or cr.ends_at > now());

comment on view public.published_destination_content is
  'Published content rows with an active destination release (status + schedule window).';
