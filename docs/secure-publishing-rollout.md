# Secure publishing rollout

This change is prepared against upstream `master` at `108e58dc9b11596d3f145053357c156dec0e1d98`. The default branch is README-only; confirm the hosting source separately. No hosted migration, account-role assignment, deployment, storage visibility change, or branch administration was performed.

## Authorization prerequisite

Every content and asset admin API now requires a freshly verified Supabase user with **server-owned `app_metadata.content_admin` exactly `true`**, and rejects anonymous users. Ordinary authenticated accounts and client-editable `user_metadata` cannot authorize privileged access. No generic cross-platform `role=admin` claim is accepted. Supabase `getUser(token)` retrieves current metadata each request, so revocation is observed without relying on stale decoded JWT claims.

Before deployment, have the owner review the approved content administrators and explicitly assign this scoped app metadata using a trusted administrative operation. Preserve their other metadata. This code does not assign or bootstrap roles. Deploying before assignments intentionally denies all existing accounts lacking the claim.

## Migration and publishing prerequisite

Apply `0008_atomic_publication.sql` in a reviewed staging rollout before the new app version. Slots `0006_content_releases.sql` and `0007_backfill_published_revisions.sql` are already on `master` and applied in Production; this migration must not reuse those numbers.

The service-role-only, SECURITY INVOKER RPC locks the content item and commits its revision, content/media snapshot, status, and timestamps in one transaction. Failure rolls back everything. Concurrent duplicate publish calls serialize and create one revision. Shout Outs require permission confirmation at publication as well as at editing.

Text and linked media are frozen together. Attaching or changing media while an item is already published does not alter its public revision. To release those changes, **unpublish then publish**, or save a draft edit then publish. A repeated publish on an already-published item is intentionally an idempotent no-op. This preserves existing draft-save behavior; saving an edit still changes status to draft.

The migration captures current media for the latest legacy revision because previous code did not store media history. This changes legacy snapshot JSON and cannot reconstruct previously approved media. Review current live attachments before applying, back up revision data, and run the staging tests first. Older historical revisions are left untouched. The new view keeps existing public/link_only semantics; this change does not redefine link-only privacy or make the existing public media bucket private.

## Verification

`pnpm test` exercises real admin handlers with mocked external Auth/database adapters, verifies that denial occurs before service-role instantiation, checks current scoped role/revocation, and verifies the publish handler uses one RPC. PostgreSQL tests apply the actual migrations to a disposable database, inject a publication failure, issue 12 concurrent publishes, check frozen media/filters, unpublish/republish, permission checks, and denied RPC grants.

Run database tests with `CONTENT_TEST_DATABASE_URL=postgresql://postgres:<test-password>@127.0.0.1:5432/content_test pnpm test`. The test deliberately resets schemas and rejects remote hosts and database names other than `content_test`. It skips when that variable is absent. CI supplies a disposable PostgreSQL 16 service and runs typecheck, lint, tests, and build.

CI installs the existing GitHub-sourced admin design package; verify that the Actions environment can read that dependency. No credential or secret was added by this change. Local dependency installation and disposable PostgreSQL execution were blocked by the unavailable proxy/CLI and denied Docker socket, so local unit/handler results do not claim a successful database run or production acceptance.

## Remaining existing exposure to review separately

Existing RLS permits direct SELECT of revisions for a currently published item and mutable media links associated with published content, if the client roles have table grants. The application public API reads the approved snapshot view, but direct database consumers may still see old revision snapshots or later link metadata. The `content-media` bucket was already public and allows direct delivery of files by URL, including drafts. Changing those grants/policies or storage visibility needs a scoped consumer/compatibility review; this migration does not silently change them.

Staging acceptance must include approved-admin draft creation, upload, publish, public read, media change/republication, unpublish, ordinary-user denial, role revocation, and a rollback drill. Only then consider hosted deployment and consumer acceptance complete.
