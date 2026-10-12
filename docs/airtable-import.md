# Airtable Import Utility

`scripts/import-airtable.mjs` imports only these Airtable content types:

- Tutorial → `tutorial`
- FBC Book → `fbc_book`
- Shout Out → `shout_out`

The known source is base `appn84sqPw03zEbTT`, table `tblDOTgsWfqPm18bw` (`Tutorials & Assets`). The importer is safe to rerun because it upserts on `source_system + source_record_id`.

## Default: dry run

From the repository root, run:

```powershell
node scripts/import-airtable.mjs
```

This reads Airtable, writes no Supabase data, and creates `work/airtable-import-audit.json`. Records are classified as `ready_to_import`, `intentionally_excluded`, or `flagged_for_review`.

## Execute the import

After reviewing the audit file, set the same Supabase values used by the app in the shell, then run:

```powershell
node scripts/import-airtable.mjs --execute
```

The service-role key is required only for execute mode. Never commit it or place it in a browser-exposed variable.

By default, imported records are drafts. To import them as public records immediately:

```powershell
node scripts/import-airtable.mjs --execute --publish
```

## Options

```text
--input <file>       Use a saved Airtable JSON response instead of calling Airtable.
--audit <file>       Change the audit output path.
--base <id>          Override the Airtable base ID.
--table <id>         Override the Airtable table ID.
--execute            Write records to Supabase. Omit for dry run.
--publish            Set imported records to published. Requires --execute.
```

The importer stores the original Airtable fields, athlete/challenge values, and attachment metadata in `content_items.type_data`. It does not modify Airtable and does not delete or overwrite media files. Attachment downloading and Supabase Storage wiring remain a separate migration step so the first import can be audited safely.
