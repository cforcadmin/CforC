# Strapi Integration Tests

These tests hit a **real** Strapi instance to verify response shapes and
upload behavior the app depends on. They exist because the unit/api tests
mock Strapi via `mockFetch` and therefore can't catch regressions caused
by Strapi version upgrades.

## When to run

- Before and after upgrading the Strapi version (e.g. 5.30 → 5.37)
- After modifying any function in `lib/strapi.ts`
- As part of release verification

They are **excluded from `npm test`** (the default jest run) so CI without
Strapi credentials doesn't fail.

## Required env vars

Loaded automatically from `.env.local`:

- `STRAPI_URL` (or `NEXT_PUBLIC_STRAPI_URL`)
- `STRAPI_API_TOKEN` (or `NEXT_PUBLIC_STRAPI_API_TOKEN`) — must have
  read permission on all collection types tested AND upload + delete
  permission for `strapi-upload.test.ts`

If env vars are missing or `STRAPI_URL` points at `localhost:1337`,
all tests in this folder are skipped with a console warning.

## Run

```bash
npm run test:integration
```

## What's covered

### `strapi-shape.test.ts`
- `data` array shape for activities, members, open-calls, newsletters,
  projects, working-groups
- v5 flat fields (no `attributes` wrapper)
- Populated media (`url`, `formats`)
- Filter by `Slug` / `Email` returns matching items
- Single member fetch by `documentId`
- Single types (`hero-section`)
- Pagination meta
- **CVE-2026-27886 guard:** member responses must not leak `passwordHash`

### `strapi-upload.test.ts`
- Valid PNG uploads succeed and return `mime: 'image/png'`
- **CVE-2026-22707 guard:** files with mismatched MIME / extension /
  content are rejected. On a vulnerable version (pre-5.37) this test
  will fail — that failure is the signal to upgrade.

Uploaded test files are deleted in `afterAll`.
