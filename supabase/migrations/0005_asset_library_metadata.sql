-- Asset-library metadata for browsing and reuse.
-- Existing media_assets rows remain valid through the defaults below.

alter table public.media_assets
  add column if not exists storage_bucket text not null default 'content-media',
  add column if not exists asset_kind text not null default 'file',
  add column if not exists display_name text,
  add column if not exists description text,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists tags text[] not null default '{}'::text[],
  add column if not exists is_archived boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

alter table public.media_assets
  drop constraint if exists media_assets_asset_kind_check;

alter table public.media_assets
  add constraint media_assets_asset_kind_check
  check (asset_kind in ('image', 'video', 'document', 'file'));

update public.media_assets
set asset_kind = case
  when media_type in ('image', 'video', 'document') then media_type
  else 'file'
end
where asset_kind = 'file';

update public.media_assets
set display_name = filename
where display_name is null;

create unique index if not exists media_assets_bucket_path_key
  on public.media_assets (storage_bucket, storage_path);

create index if not exists media_assets_library_browse_idx
  on public.media_assets (is_archived, asset_kind, created_at desc);

create index if not exists media_assets_tags_gin_idx
  on public.media_assets using gin (tags);

comment on table public.media_assets is
  'Reusable asset library. One asset may be linked to many content items through content_media.';
comment on column public.media_assets.metadata is
  'Extensible file metadata such as dimensions, duration, page count, and import details.';
comment on column public.media_assets.tags is
  'Lowercase, human-maintained tags used for asset-library browsing.';
