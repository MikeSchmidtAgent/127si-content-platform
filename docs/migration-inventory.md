# Airtable Migration Inventory

## Source

- Base: `127SI - SHOOTING CHALLENGE GAME - NEW 5_1_2026`
- Table: `Tutorials & Assets`
- Source mode: read-only

## Required inventory fields

- Airtable record ID
- Content title
- Content type
- Airtable attachment IDs
- Attachment filenames
- Media type
- Media size
- SHA-256 checksum after download
- External URLs
- Athlete value
- Challenge values
- Migration status
- Migration notes

## Reconciliation rule

Every source record must be classified as one of:

- `migrated`
- `intentionally_excluded`
- `flagged_for_review`

The migration must be safe to rerun and must upsert using the Airtable source record ID.

## Phase 0 rule

Do not modify Airtable during inventory or migration. Download important attachments into durable storage before relying on Airtable attachment URLs.
