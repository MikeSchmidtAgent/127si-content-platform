# Content destination releases rollout (Task 6)

Cross-platform coordination item **6**: consumers send `destination` first, then merge and apply `0006_content_releases.sql`, then require `destination` on `/api/v1/content` only after consumers are live.

**Owner:** Mike (approved plan). **Agents:** merge PRs after required checks pass; never apply Production migrations, assign destination releases, or flip `CONTENT_V1_REQUIRE_DESTINATION` in Production.

## Destinations

| Destination | Consumer |
|-------------|----------|
| `challenge` | Shooting Challenge (`127si-shooting-challenge`) |
| `referee` | Jr. Referee Clinic product (`127-si-jr-ref`, separate repo) |

Public API values are lowercase: `challenge`, `referee`.

## Rollout order (strict)

1. **Consumer apps ship first** — every Content API client adds `?destination=<name>` on list and detail reads (see [Consumer changes](#consumer-changes-required)).
2. **Merge this migration** — `supabase/migrations/0006_content_releases.sql` lands on `master` via PR (do not apply to Production until step 1 is verified in staging/production consumers).
3. **Owner applies migration in staging, then Production** — see [Owner: apply migration](#owner-apply-migration-staging--production).
4. **Owner assigns releases** — backfill assigns existing published items to `challenge` only; assign `referee` (and updates after republish) manually.
5. **Deploy Content app** — optional `destination` filtering works once the migration exists; omitting `destination` still returns all published rows until step 6.
6. **Require destination (final)** — after Challenge and Referee production builds that send `destination` are live, set `CONTENT_V1_REQUIRE_DESTINATION=true` on the Content Platform hosting project and redeploy.

## API behavior

### List — `GET /api/v1/content`

Optional query parameter: `destination` (`challenge` | `referee`).

- **Before step 6:** omitting `destination` returns all published content (legacy). Providing `destination` filters to items with an active release for that destination at the current published revision (requires migration applied).
- **After step 6:** `destination` is **required**; missing → `400`, invalid → `400`.

### Detail — `GET /api/v1/content/:id`

Same `destination` rules. With a filter, unknown ID or no release for that destination → `404`.

### Examples

```http
GET /api/v1/content?destination=challenge&type=tutorial
GET /api/v1/content?destination=referee&page=1&page_size=20
GET /api/v1/content/{id}?destination=challenge
```

## Consumer changes required

Agents **cannot** edit Challenge or Referee repos from this workspace. Owners or consumer-repo agents should implement the following.

### Challenge (`127si-shooting-challenge`)

**Status (2026-10-14):** No `api/v1/content` or `destination=` usage found on `master` or sampled `cursor/*` branches in this environment. **Not live yet — implement before Production migration.**

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

1. Review `supabase/migrations/0006_content_releases.sql` in GitHub (table, view, backfill to `challenge`, `assign_content_release` RPC).
2. In **staging** Supabase SQL editor or CLI: run pending migrations through `0006_content_releases.sql`.
3. Confirm backfill: `select destination, count(*) from content_releases group by destination;` — expect `challenge` rows for previously published items.
4. Staging smoke:
   - `GET /api/v1/content?destination=challenge` returns expected rows.
   - `GET /api/v1/content?destination=referee` returns only items you explicitly assigned.
5. Repeat migration apply on **Production** Supabase when staging and **both consumers** send `destination`.
6. Do **not** set `CONTENT_V1_REQUIRE_DESTINATION=true` until Production consumer deploys are confirmed.

### Migration numbering note

Open PR #1 (`codex/swarm-secure-content-publishing`) also proposes a `0006_*` migration (`0006_atomic_publication.sql`). Only one file can be `0006` on `master`. Merge order:

- If atomic publication merges first, renumber **this** migration to `0007_content_releases.sql` before merge, or merge destination releases first as `0006_content_releases.sql` and renumber atomic publication to `0007`.

## Owner: assign / update destination releases

Agents must **not** call these in Production. After publish or republish, owners pin the visible revision per destination.

**Default:** new migration backfills `challenge` only. Referee (and cross-destination updates) use the service-role RPC:

```sql
select public.assign_content_release(
  '<content-item-uuid>'::uuid,
  'referee'
);
```

Optional third argument pins a specific revision UUID; omit to use the current published revision from `published_content`.

After republishing content, re-run `assign_content_release` for each destination that should show the new revision.

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
- [ ] `0006_content_releases.sql` merged to `master`
- [ ] Migration applied staging → Production by owner
- [ ] Release assignments reviewed (`challenge` backfill + any `referee` assignments)
- [ ] `CONTENT_V1_REQUIRE_DESTINATION=true` only after consumer deploy proof
