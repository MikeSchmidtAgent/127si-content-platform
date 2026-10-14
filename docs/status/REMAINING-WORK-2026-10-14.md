# Content Platform v1 — remaining work (2026-10-14)

## Canonical branch

| Ref | State |
|-----|--------|
| **`master`** | **Canonical.** All Task 6 work merged (PRs #2–#5): destination API, reconciled `0006_content_releases.sql`, `0007_backfill_published_revisions.sql`, npm CI. |
| **`127-si-shooting-challenge`** | **Not canonical.** Remote `HEAD` still points here, but the branch is only the initial README commit (~21 commits behind `master`). Active integration and deploys should track **`master`**. |

**Owner (one-time):** GitHub → **Settings → General → Default branch** → set to **`master`** so new clones and agents land on the real codebase.

---

## Verified today (Production `oqnnvmxjdersgcguhvsc`, read-only)

| Check | Result |
|-------|--------|
| Applied migrations (Supabase history) | `content_releases`, `backfill_published_revisions` |
| `published_content` rows | **31** |
| `published_destination_content` rows | **31** (29 `challenge`, 2 `referee`) |
| Live API `GET …/api/v1/content?destination=challenge&page_size=50` | **200**, `pagination.total` **29** |
| Live API `GET …/api/v1/content?destination=referee&page_size=50` | **200**, `pagination.total` **2** |
| Live API without `destination` | **400** (required destination already enforced in Production deploy) |

Public origin tested: `https://content.fairfieldbasketballclub.com`.

---

## Done (v1 core)

| Area | Why it mattered |
|------|-----------------|
| Admin CRUD, publish/unpublish, media upload | Operators can manage tutorials, FBC books, and shout outs without SQL. |
| Public `/api/v1/content` list + detail | Challenge and Referee apps consume published snapshots, not raw Supabase tables. |
| Destination releases (`content_releases`, `published_destination_content`) | Same catalog can ship different items per consumer (`challenge` vs `referee`). |
| Reconciled `0006` + `0007` on `master`; applied in Production | Read model matches 31 published release rows; API counts align with SQL. |
| Rollout runbook [`docs/destination-releases-rollout.md`](../destination-releases-rollout.md) | Documents order: consumers → migration → backfill → deploy → require destination. |
| CI on `master` (typecheck, lint, unit tests, build) | Regressions block merge without admin bypass. |

---

## Remaining — (a) agent / repo code work

Each item includes a one-line **why**.

| # | Work | Why |
|---|------|-----|
| A1 | **Fix admin “System status” when `CONTENT_V1_REQUIRE_DESTINATION=true`** — health check must not call `/api/v1/content` without `destination`. | Admins otherwise see a false “API down” while Production is healthy. |
| A2 | **Add `/api/health` (or extend status)** — lightweight configured + DB read check without destination. | Matches deployment checklist and avoids coupling ops UI to consumer query params. |
| A3 | **Optional: `scripts/verify-content-api-destinations.mjs`** — assert totals 31 / 29 / 2 for a given base URL. | Repeatable verification before/after deploys without manual curl. |
| A4 | **Resolve PR #1** (`codex/swarm-secure-content-publishing`): rebase onto `master`, rename `0006_atomic_publication.sql` → **`0008_atomic_publication.sql`**, update DB tests; merge or close with written reason. | Slot `0006`/`0007` are taken in Production; open PR blocks a clean migration story and duplicates rollout docs. |
| A5 | **After A4 merge (if merged):** wire admin routes to `set_content_status` RPC + scoped `content_admin` checks per PR #1. | Prevents forged metadata publish and makes publication atomic with revision snapshots. |
| A6 | **Consumer repos (outside this workspace):** Challenge + Referee must send `?destination=` on all v1 reads. | Required destination is already on in Production; clients without the param get **400**. |
| A7 | **Deploy latest `master` to Vercel** after A1–A2 merge. | Production error text may differ from repo until the current build is promoted. |
| A8 | **Default branch → `master` in GitHub** (can be done by agent if permitted; otherwise owner). | Stops agents and humans from working on an empty default branch. |

---

## Remaining — (b) owner-only steps

| # | Step | Why |
|---|------|-----|
| B1 | **GitHub: set default branch to `master`.** | Aligns clone/PR base with where code actually lives. |
| B2 | **Challenge (`127si-shooting-challenge`):** merge/deploy client that sets `destination=challenge` on every Content API call. | Production already rejects unscoped list/detail requests. |
| B3 | **Referee (`127-si-jr-ref`):** same with `destination=referee`. | Referee catalog is only 2 items today; without the param the app cannot load them. |
| B4 | **Confirm Vercel Production env:** `CONTENT_V1_REQUIRE_DESTINATION=true` only after B2–B3 are live (already appears true — verify consumer apps before changing). | Avoids locking out apps that still omit `destination`. |
| B5 | **If merging PR #1 / `0008`:** assign Supabase Auth **`app_metadata.content_admin`** (or approved pattern) for each admin **before** deploy. | RPC + scoped admin gate will return **403** for users without the flag. |
| B6 | **If merging `0008`:** run `0008_atomic_publication.sql` in **staging → Production** (owner SQL/CLI); do not duplicate `0006`/`0007`. | Installs atomic publish RPC and view refresh without re-running backfill. |
| B7 | **Review Production `content_releases` assignments** when adding items (SQL/admin); agents must not bulk-edit Production releases. | Wrong `destination_key` ships content to the wrong app. |
| B8 | **DNS / Vercel smoke** per [`docs/deployment.md`](../deployment.md) after deploys. | Confirms custom domain and env vars match the tested build. |

---

## PR #1 resolution note

- **Conflict:** PR #1 adds `supabase/migrations/0006_atomic_publication.sql` while `master` already has `0006_content_releases.sql` and `0007_backfill_published_revisions.sql`, both **applied in Production**.
- **Recommended path:** Rebase PR #1 onto `master`, renumber atomic migration to **`0008_*`**, run CI (including PostgreSQL publication tests), then merge as a follow-up security release **or** close PR #1 with a link to the renumbered branch if scope is deferred post–v1.

---

## Suggested finish order

1. Merge A1–A2 (health/status) → deploy Content app (A7).
2. Complete B2–B3 consumer deploys (parallel if separate owners).
3. Decide A4/A5 (atomic publication) — v1 serving works without it; security hardening is the motivator.
4. B1 default branch; B7 ongoing ops.

---

## Open GitHub items (snapshot)

| Kind | # | Title / note |
|------|---|----------------|
| PR | **#1** | Secure scoped admins + atomic publication — **OPEN**, migration number conflict |
| PR | #2–#5 | Destination rollout, npm, reconciled `0006`, `0007` — **MERGED** |
| Issues | — | No open issues in repo at time of writing |
