# Content destination releases rollout (Task 6)

Cross-platform coordination item **6**: consumers send `destination` first, merge the reconciled `0006_content_releases.sql`, deploy the Content API that filters on `destination_key`, then require `destination` on `/api/v1/content` only after consumers are live.

**Owner:** Mike (approved plan). **Agents:** merge PRs after required checks pass; never apply Production migrations, assign destination releases, or flip `CONTENT_V1_REQUIRE_DESTINATION` in Production.

## Production schema (canonical)

Supabase project **Production** (`oqnnvmxjdersgcguhvsc`) already has destination releases applied outside this repo’s migration history. Treat this as source of truth:

| Object | Purpose |
|--------|---------|
| `public.content_releases` | Per-item, per-destination release rows (`destination_key`, `status`, schedule, ordering) |
| `public.published_destination_content` | Join of `published_content` ↔ `content_releases` for active published releases |

**Not** in Production: PR #2’s `destination` / `revision_id` columns, `published_content_by_destination`, `assign_content_release` RPC, or automatic backfill from `published_content`.

Reconciled migration `supabase/migrations/0006_content_releases.sql` matches Production DDL and is **idempotent** there (`CREATE TABLE IF NOT EXISTS` no-ops; view/policy/indexes use `IF NOT EXISTS` / `CREATE OR REPLACE`).

### `content_releases` columns (Production)

`id`, `content_item_id`, `destination_key`, `status`, `starts_at`, `ends_at`, `featured`, `display_order`, `created_by`, `updated_by`, `published_at`, `unpublished_at`, `archived_at`, `created_at`, `updated_at`.

As of **2026-10-14** (read-only inspection): **31** published release rows — **29** `challenge`, **2** `referee`, all `status = 'published'`.

## Destinations

| Destination (`destination_key`) | Consumer |
|---------------------------------|----------|
| `challenge` | Shooting Challenge (`127si-shooting-challenge`) |
| `referee` | Jr. Referee Clinic product (`127-si-jr-ref`, separate repo) |

Public API query parameter remains `destination` (`challenge` | `referee`); the database column is `destination_key`.

## API behavior

### List — `GET /api/v1/content`

Optional query parameter: `destination` (`challenge` | `referee`).

- **Without `destination`:** reads `published_content` (all items that satisfy the published read model).
- **With `destination`:** reads `published_destination_content` and filters `destination_key = <destination>` (active release window + published read model).

During rollout, `destination` is optional until step 6. When `CONTENT_V1_REQUIRE_DESTINATION=true`, missing `destination` → `400`.

### Detail — `GET /api/v1/content/:id`

Same rules. With a filter, unknown ID or no matching active release → `404`.

### Examples

```http
GET /api/v1/content?destination=challenge&type=tutorial
GET /api/v1/content?destination=referee&page=1&page_size=20
GET /api/v1/content/{id}?destination=challenge
```

## Runbook: why `published_content` shows 1 row but 31 items are “published”

**Symptom (Production, 2026-10-14):**

| Query | Row count |
|-------|-----------|
| `content_items` where `status = 'published'` | **31** |
| `content_releases` where `status = 'published'` | **31** |
| `published_content` | **1** |
| `published_destination_content` | **1** |

**Cause:** `published_content` (migration `0004_published_snapshot_media_links.sql`) only includes items that have at least one `content_revisions` row with `published_at IS NOT NULL`, joined as the latest such revision. Production has **only one** row in `content_revisions` total. **30** published `content_items` have **no** revision rows, so they never appear in `published_content`.

Those items were likely marked published (or imported) without creating revision snapshots. `published_destination_content` inner-joins `published_content`, so destination filtering cannot surface the other **30** releases until those items enter the published read model.

**Owner decision required (pick one or combine):**

1. **Backfill revisions** — For each published item missing revisions, insert a `content_revisions` snapshot from current item fields (or source import data) and set `published_at` (and item `published_at` if needed). Re-verify counts on `published_content` and `published_destination_content`.
2. **Relax or replace the read model** — Change `published_content` (or add a Production-only view) so published items without revision history still resolve. Requires explicit product rules (which fields are authoritative when no snapshot exists).
3. **Republish through admin/import** — Use flows that create revisions on publish going forward; bulk-republish legacy items.

Until one of these is done, the Content API will return **one** item for both unscoped and destination-scoped reads, despite **31** release rows in `content_releases`.

**Verification queries (Production, read-only):**

```sql
select count(*) from content_items where status = 'published';
select count(*) from content_revisions;
select count(*) from published_content;
select destination_key, count(*) from content_releases where status = 'published' group by 1;
select count(*) from published_destination_content;
select count(*) as published_without_revision
from content_items c
where c.status = 'published'
  and not exists (
    select 1 from content_revisions r
    where r.content_item_id = c.id and r.published_at is not null
  );
```

## Rollout order (strict)

1. **Consumer apps ship first** — every Content API client adds `?destination=<name>` on list and detail reads (see [Consumer changes](#consumer-changes-required)).
2. **Merge reconciled migration + API** — `0006_content_releases.sql` and `destination_key` filtering on `master` via PR.
3. **Resolve published read model gap** — see [Runbook above](#runbook-why-published_content-shows-1-row-but-31-items-are-published) before expecting destination lists to match release counts.
4. **Owner applies migration in staging, then Production** — see [Owner: apply migration](#owner-apply-migration-staging--production). On Production, expect mostly policy/view/index reconciliation, not new tables.
5. **Deploy Content app** — optional `destination` filtering uses `published_destination_content`.
6. **Require destination (final)** — after Challenge and Referee production builds send `destination`, set `CONTENT_V1_REQUIRE_DESTINATION=true` and redeploy.

## Consumer changes required

Agents **cannot** edit Challenge or Referee repos from this workspace. Owners or consumer-repo agents should implement the following.

### Challenge (`127si-shooting-challenge`)

**Status (2026-10-14):** No `api/v1/content` or `destination=` usage found on `master` or sampled `cursor/*` branches in this environment. **Not live yet — implement before requiring destination in Production.**

Add a constant and append on every Content Platform fetch:

```typescript
const CONTENT_DESTINATION = "challenge";

function contentApiUrl(path: string, params?: Record<string, string>) {
  const url = new URL(path, process.env.CONTENT_PLATFORM_URL);
  url.searchParams.set("destination", CONTENT_DESTINATION);
  if (params) {
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  }
  return url;
}

// List: contentApiUrl("/api/v1/content", { type: "tutorial", challenge_id })
// Detail: contentApiUrl(`/api/v1/content/${id}`)
```

Set `CONTENT_PLATFORM_URL` (or existing base URL env) to the deployed Content service origin.

### Referee (`127-si-jr-ref`)

**Status:** Repository not accessible from this agent token. **Assume not live until verified** — same pattern with `CONTENT_DESTINATION = "referee"`.

## Owner: apply migration (staging → Production)

1. Review `supabase/migrations/0006_content_releases.sql` (Production-shaped `content_releases`, `published_destination_content`, RLS policy).
2. In **staging** Supabase SQL editor or CLI: run pending migrations through `0006_content_releases.sql`.
3. Confirm releases: `select destination_key, status, count(*) from content_releases group by 1, 2;`
4. Confirm read model alignment: `select count(*) from published_content;` and `select count(*) from published_destination_content;` — investigate if release count ≫ view count (see runbook).
5. Staging smoke:
   - `GET /api/v1/content?destination=challenge`
   - `GET /api/v1/content?destination=referee`
6. On **Production**: apply the same migration file when ready. Expected changes:
   - **No** table recreate (already exists).
   - **Possible** idempotent index/policy/view refresh.
   - **Drops** obsolete `published_content_by_destination` if present from an aborted PR #2 apply.
   - **Does not** insert or mutate existing `content_releases` rows.
7. Do **not** set `CONTENT_V1_REQUIRE_DESTINATION=true` until consumers send `destination` and read-model counts match expectations.

### Migration numbering note

Open PR #1 (`codex/swarm-secure-content-publishing`) also proposes a `0006_*` migration (`0006_atomic_publication.sql`). Only one file can be `0006` on `master`. Merge order:

- If atomic publication merges first, renumber **this** migration to `0007_content_releases.sql` before merge, or merge destination releases first as `0006_content_releases.sql` and renumber atomic publication to `0007`.

## Owner: assign / update destination releases (Production)

Production does **not** expose `assign_content_release`. Releases are managed in Production tooling (admin UI, SQL, or import) with the live column model: set `destination_key`, `status = 'published'`, `starts_at`, `published_at`, and optional `ends_at` / ordering fields.

After changing what should appear for a destination, confirm the row satisfies RLS (`status`, `starts_at`, `ends_at`) and still joins via `published_content`.

Agents must **not** assign or bulk-edit Production releases.

## Owner: require destination (step 6)

On the Content Platform Vercel (or host) **Production** environment:

```text
CONTENT_V1_REQUIRE_DESTINATION=true
```

Redeploy. Verify:

- `GET /api/v1/content` without `destination` → `400`.
- Challenge and Referee production apps still succeed with `?destination=...`.

Leave staging unset until consumers are validated against staging Content.

## Verification checklist

- [ ] Challenge PR merged and deployed with `destination=challenge`
- [ ] Referee PR merged and deployed with `destination=referee`
- [ ] Reconciled `0006_content_releases.sql` merged to `master`
- [ ] Published read model gap understood / remediation chosen (see runbook)
- [ ] Migration applied staging → Production by owner
- [ ] Release assignments reviewed (`destination_key` counts vs API smoke tests)
- [ ] `CONTENT_V1_REQUIRE_DESTINATION=true` only after consumer deploy proof and read-model verification
