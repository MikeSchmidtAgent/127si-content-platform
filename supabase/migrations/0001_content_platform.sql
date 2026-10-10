create extension if not exists pgcrypto;

create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  content_type text not null check (content_type in ('tutorial','fbc_book','shout_out')),
  title text not null,
  slug text not null,
  short_description text,
  long_description text,
  rationale text,
  type_data jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','published','unpublished','removed')),
  visibility text not null default 'public' check (visibility in ('public','link_only')),
  source_system text,
  source_record_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  unique (source_system, source_record_id)
);

create table if not exists public.content_revisions (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  revision_number integer not null,
  snapshot jsonb not null,
  published_at timestamptz not null default now(),
  unique (content_item_id, revision_number)
);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null,
  media_type text not null,
  mime_type text,
  filename text not null,
  file_size bigint,
  alt_text text,
  caption text,
  source_attachment_id text,
  checksum_sha256 text,
  created_at timestamptz not null default now()
);

create table if not exists public.content_media (
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  media_asset_id uuid not null references public.media_assets(id) on delete cascade,
  role text not null default 'primary',
  display_order integer not null default 0,
  primary key (content_item_id, media_asset_id)
);

create or replace view public.published_content as
select c.id, c.content_type, c.title, c.slug, c.short_description, c.long_description, c.rationale, c.type_data,
       c.visibility, c.published_at, r.id as revision_id, r.revision_number,
       coalesce((c.type_data->'challenge_ids'), '[]'::jsonb) as challenge_ids
from public.content_items c
join lateral (select * from public.content_revisions r where r.content_item_id = c.id order by r.revision_number desc limit 1) r on true
where c.status = 'published' and c.visibility in ('public','link_only');

alter table public.content_items enable row level security;
alter table public.content_revisions enable row level security;
alter table public.media_assets enable row level security;
alter table public.content_media enable row level security;

create policy "published content is readable" on public.content_items for select using (status = 'published');
create policy "published revisions are readable" on public.content_revisions for select using (exists (select 1 from public.content_items c where c.id = content_item_id and c.status = 'published'));
