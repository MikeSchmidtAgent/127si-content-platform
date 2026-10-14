-- Per-destination publication releases for consumer apps (Challenge, Referee, ...).
-- Apply in staging first. Do not assign or backfill Production from automation; owners review releases.

create table if not exists public.content_releases (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  destination text not null,
  revision_id uuid not null references public.content_revisions(id) on delete restrict,
  released_at timestamptz not null default now(),
  released_by uuid references auth.users(id),
  constraint content_releases_destination_check
    check (destination in ('challenge', 'referee')),
  constraint content_releases_item_destination_key
    unique (content_item_id, destination)
);

create index if not exists content_releases_destination_idx
  on public.content_releases (destination, released_at desc);

create index if not exists content_releases_revision_idx
  on public.content_releases (revision_id);

comment on table public.content_releases is
  'Maps a published content item to the revision visible for a named consumer destination.';

alter table public.content_releases enable row level security;

drop policy if exists "published destination releases are readable" on public.content_releases;
create policy "published destination releases are readable"
  on public.content_releases for select
  using (exists (
    select 1
    from public.content_items ci
    where ci.id = content_releases.content_item_id
      and ci.status = 'published'
  ));

create or replace view public.published_content_by_destination as
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
  cr.destination,
  cr.released_at as destination_released_at
from public.published_content pc
inner join public.content_releases cr
  on cr.content_item_id = pc.id
 and cr.revision_id = pc.revision_id;

comment on view public.published_content_by_destination is
  'Published content rows scoped to an active destination release at the current published revision.';

-- Legacy published items were consumed by Shooting Challenge before destination filtering existed.
insert into public.content_releases (content_item_id, destination, revision_id, released_at)
select
  pc.id,
  'challenge',
  pc.revision_id,
  coalesce(pc.published_at, now())
from public.published_content pc
on conflict (content_item_id, destination) do nothing;

-- Owner-operated release assignment (service_role only). Agents must not call this in Production.
create or replace function public.assign_content_release(
  p_content_id uuid,
  p_destination text,
  p_revision_id uuid default null
)
returns public.content_releases
language plpgsql
security invoker
set search_path = ''
as $$
declare
  item public.content_items%rowtype;
  target_revision uuid;
  result public.content_releases%rowtype;
begin
  if p_destination is null or p_destination not in ('challenge', 'referee') then
    raise exception 'Invalid destination' using errcode = '22023';
  end if;

  select * into item from public.content_items where id = p_content_id;
  if not found then
    raise exception 'Content not found' using errcode = 'P0002';
  end if;
  if item.status <> 'published' then
    raise exception 'Content must be published before assigning a destination release' using errcode = '22023';
  end if;

  if p_revision_id is null then
    select pc.revision_id into target_revision
    from public.published_content pc
    where pc.id = p_content_id;
  else
    target_revision := p_revision_id;
  end if;

  if target_revision is null then
    raise exception 'Published revision not found' using errcode = 'P0002';
  end if;

  if not exists (
    select 1
    from public.content_revisions r
    where r.id = target_revision
      and r.content_item_id = p_content_id
  ) then
    raise exception 'Revision does not belong to content item' using errcode = '22023';
  end if;

  insert into public.content_releases (content_item_id, destination, revision_id)
  values (p_content_id, p_destination, target_revision)
  on conflict (content_item_id, destination) do update
    set revision_id = excluded.revision_id,
        released_at = now()
  returning * into result;

  return result;
end;
$$;

revoke all on function public.assign_content_release(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.assign_content_release(uuid, text, uuid) to service_role;
