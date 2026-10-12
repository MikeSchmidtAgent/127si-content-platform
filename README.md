# 127SI Content Platform

Central content service for 127SI Tutorials, FBC Book readings, and athlete Shout Outs.

## Status

MVP admin, publishing workflow, media upload path, and public v1 API are implemented.
Deployment preparation is documented in [docs/deployment.md](docs/deployment.md).

## Initial consumer

Challenge-Platform.

## Planned stack

- Next.js application
- Supabase Postgres
- Supabase Storage
- Supabase Auth
- Versioned `/v1` content API
- Simple custom admin

## Local commands

```text
pnpm install
pnpm dev
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

The production site is planned for `content.fairfieldbasketballclub.com`.
