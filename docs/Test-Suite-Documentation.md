# CforC Website — Test Suite Documentation

## Overview

The test suite covers three tiers of automated testing:

| Tier | Tool | Tests | What it validates |
|------|------|------:|-------------------|
| **Unit** | Jest | 60 | Pure library functions (auth, CSRF, rate limiting, taxonomy, submissions) |
| **API Integration** | Jest | 59 | Every API route handler with mocked Strapi/Resend calls |
| **E2E** | Playwright | 40 | Real browser flows against a running dev server + live Strapi |

**Total: ~159 automated tests**

---

## Quick Start

### Install dependencies (first time only)

```bash
npm install
npx playwright install chromium
```

### Run tests

```bash
# All Jest tests (unit + API)
npm test

# Unit tests only
npm run test:unit

# API route tests only
npm run test:api

# Jest in watch mode (re-runs on file changes)
npm run test:watch

# E2E tests (requires dev server + Strapi)
npm run test:e2e

# E2E with interactive UI
npm run test:e2e:ui

# Full suite (Jest + Playwright)
npm run test:all
```

---

## Test Structure

```
__tests__
├── setup.ts                          # Test environment variables
├── helpers/
│   ├── mockStrapi.ts                 # Shared fetch mock + NextRequest builder
│   └── testAccount.ts                # E2E test account credentials
├── unit/
│   ├── auth.test.ts                  # lib/auth.ts — 19 tests
│   ├── rateLimiter.test.ts           # lib/rateLimiter.ts — 7 tests
│   ├── csrf.test.ts                  # lib/csrf.ts — 8 tests
│   ├── memberTaxonomy.test.ts        # lib/memberTaxonomy.ts — 12 tests
│   └── membershipSubmissions.test.ts # lib/membershipSubmissions.ts — 4 tests
├── api/
│   ├── auth-login.test.ts            # /api/auth/login — 7 tests
│   ├── auth-session.test.ts          # /api/auth/session + logout — 7 tests
│   ├── auth-magic-link.test.ts       # /api/auth/request + verify — 8 tests
│   ├── auth-set-password.test.ts     # /api/auth/set-password — 7 tests
│   ├── subscribe.test.ts             # /api/subscribe + confirm — 9 tests
│   ├── members-update.test.ts        # /api/members/update — 8 tests
│   └── monthly-report.test.ts        # /api/admin/monthly-profile-report — 3 tests
└── e2e/
    ├── navigation.spec.ts            # Nav links, dark mode, hamburger, skip-to-content
    ├── activities.spec.ts            # Listing, detail pages, back navigation
    ├── members.spec.ts               # Listing, search, detail, tag links
    ├── open-calls.spec.ts            # Listing page
    ├── auth-flow.spec.ts             # Login, session, logout, wrong password
    └── seo-metadata.spec.ts          # OG tags, Twitter card, JSON-LD, lang
```

---

## Tier 1 — Unit Tests

Unit tests run in isolation with no network calls. They import functions directly from `lib/` and validate behavior.

### `auth.test.ts` → `lib/auth.ts`

| Test | What it checks |
|------|---------------|
| hashPassword + verifyPassword | Correct password passes, wrong fails, different salts produce different hashes |
| generateSessionToken | Returns valid JWT, payload has memberId/email/type:'session', 30-day expiry |
| generateMagicLinkToken | type:'magic-link', 6-hour expiry |
| generateNewsletterToken | type:'newsletter' with email, 24-hour expiry |
| verifyToken | Valid returns payload; expired/wrong-secret/malformed return null |
| hashToken | Deterministic SHA256, 64-char hex, different inputs differ |
| validatePassword | Passes "Passw0rd"; fails for short/no-upper/no-lower/no-number; reports multiple violations |
| isValidEmail | Accepts valid formats, rejects invalid ones |

### `rateLimiter.test.ts` → `lib/rateLimiter.ts`

| Test | What it checks |
|------|---------------|
| Allows up to maxRequests | 3 requests pass |
| Blocks after exceeded | 4th request blocked, remaining=0, resetTime in future |
| Tracks remaining count | Decrements correctly |
| Resets after window | Fake timers advance past window, requests allowed again |
| cleanup() | Removes expired entries, preserves active ones |
| getRateLimitErrorMessage | Returns Greek "λεπτά" for minutes, "ώρα" for >60min |

### `csrf.test.ts` → `lib/csrf.ts`

| Test | What it checks |
|------|---------------|
| Allowed origins | localhost:3000, cultureforchange.net, www.cultureforchange.net |
| Blocked origin | evil.com returns "Forbidden" |
| No origin/referer | Allowed (same-origin assumption) |
| Referer fallback | Valid referer passes, invalid/malformed blocked |

### `memberTaxonomy.test.ts` → `lib/memberTaxonomy.ts`

| Test | What it checks |
|------|---------------|
| Type guards | isSplittable/isHinted identify correct types |
| Label extraction | getSubLabel/getSubDisplayLabel return correct values |
| isKnownTaxonomyValue | Categories, subcategories, splittable labels, partial combos recognized; unknown rejected |
| doesFieldMatchFilter | Exact match, category filter, splittable options, empty inputs, non-matching |

### `membershipSubmissions.test.ts` → `lib/membershipSubmissions.ts`

| Test | What it checks |
|------|---------------|
| add + check | Returns true after adding |
| Unknown ID | Returns false |
| removeSubmission | Clears entry |
| Expiry cleanup | Fake timers advance past EXPIRY_TIME, entry gone |

---

## Tier 2 — API Route Tests

API tests import route handlers directly and call them with mocked `global.fetch` (intercepting Strapi/Resend calls) and mocked `next/headers` cookies.

### `auth-login.test.ts` → `POST /api/auth/login`

| Status | Scenario |
|--------|----------|
| 403 | Disallowed CSRF origin |
| 400 | Missing email/password |
| 400 | Invalid email format |
| 401 | Member not found in Strapi |
| 401 | No passwordHash in auth-tokens |
| 401 | Wrong password (bcrypt mismatch) |
| 200 | Correct credentials → session cookie set, member data returned |
| 429 | Rate limit exceeded (5 attempts) |

### `auth-session.test.ts` → `GET /api/auth/session` + `POST /api/auth/logout`

| Status | Scenario |
|--------|----------|
| 401 | No session cookie |
| 401 | Invalid token → cookie deleted |
| 401 | Wrong token type (magic-link instead of session) |
| 404 | Member not found in Strapi |
| 200 | Valid session → member data returned |
| 200 | Logout → cookie deleted |
| 403 | Logout with bad CSRF |

### `auth-magic-link.test.ts` → request + verify routes

| Status | Scenario |
|--------|----------|
| 400 | Invalid email (request) |
| 200 | Email not found → still returns success (no enumeration) |
| 200 | Member exists → email sent |
| 400 | Missing token (verify) |
| 401 | Invalid/expired JWT (verify) |
| 401 | Token not in database (verify) |
| 200 | Valid token → returns email + memberId |
| 401 | Expired token in database (verify) |

### `auth-set-password.test.ts` → `POST /api/auth/set-password`

| Status | Scenario |
|--------|----------|
| 403 | Bad CSRF origin |
| 400 | Missing token or password |
| 400 | Weak password (validation fails) |
| 401 | Invalid JWT |
| 401 | Token not in database |
| 401 | Expired database token |
| 200 | Valid → password saved, session cookie set, member data returned |

### `subscribe.test.ts` → subscribe + confirm routes

| Status | Scenario |
|--------|----------|
| 400 | Invalid email |
| 200 | Honeypot filled → silent success (bot rejected) |
| 200 | Suspicious email pattern → silent success |
| 200 | Valid email → confirmation email sent via Resend |
| 403 | Bad CSRF origin |
| 307 | Confirm: missing/invalid token → redirect with error |
| 307 | Confirm: already subscribed → redirect with `subscribe_error=already` |
| 307 | Confirm: success → creates subscriber, sends welcome email, redirects |

### `members-update.test.ts` → `POST /api/members/update`

| Status | Scenario |
|--------|----------|
| 401 | No session cookie |
| 401 | Invalid session token |
| 401 | Wrong token type |
| 403 | CSRF violation |
| 400 | Empty name / empty email / invalid email format |
| 409 | Duplicate email |
| 200 | Valid update → detects changed fields, logs changes |

### `monthly-report.test.ts` → `GET /api/admin/monthly-profile-report`

| Status | Scenario |
|--------|----------|
| 401 | Missing/wrong authorization |
| 200 | No changes → "No changes to report" |
| 200 | Logs exist → email sent with CSV attachment |

---

## Tier 3 — E2E Tests (Playwright)

E2E tests run in real Chromium (desktop + mobile viewport) against the live dev server and Strapi.

### `navigation.spec.ts`

- Homepage loads with "Culture for Change" in title
- Desktop nav links navigate to /about, /activities, /members (skipped on mobile)
- Dark mode toggle adds/removes `dark` class on `<html>`
- Skip-to-content link and `#main-content` target exist in DOM
- Mobile hamburger menu opens (shows `#mobile-menu`) and closes

### `activities.spec.ts`

- Activities page loads with visible heading
- Clicking an activity card navigates to `/activities/[slug]`
- Browser back button returns to listing

### `members.spec.ts`

- Members page loads with visible heading
- Search input filters member cards
- Clicking a member card navigates to detail page with `<h1>` name
- Field-of-work tags link back to `/members?field=...`

### `open-calls.spec.ts`

- Open calls page loads with visible heading

### `auth-flow.spec.ts`

- Login page renders email (`#login-email`) and password (`#password`) inputs
- Empty form submission triggers validation
- **Successful login** with test account → redirects to /profile
- **Session persists** — profile/logout link visible after navigating away
- **Logout** — clears session, profile link disappears
- **Wrong password** — stays on /login, shows error message

### `seo-metadata.spec.ts`

- Homepage has `og:title`, `og:description`, `og:image` meta tags
- Homepage has `twitter:card` meta tag
- Homepage has Organization JSON-LD script
- Activities page has a non-empty `<title>`
- `<html lang="el">` is set

---

## E2E Test Account

A hidden test account exists in Strapi for E2E login tests:

| Field | Value |
|-------|-------|
| Email | `e2e-test@cultureforchange.net` |
| Password | `TestPass1!` |
| HideProfile | `true` (invisible on website) |

**To create or reset the test account:**

```bash
node scripts/setup-test-account.js
```

> **Note:** The profile update route (`/api/members/update`) sets `HideProfile = false` on save. If you write E2E tests that save the test profile, re-run the setup script afterward to re-hide it.

---

## Configuration Files

| File | Purpose |
|------|---------|
| `jest.config.ts` | ts-jest preset, `@/` path alias, node environment |
| `playwright.config.ts` | Chromium desktop + mobile (iPhone 14), auto-starts dev server |
| `__tests__/setup.ts` | Sets test env vars (JWT_SECRET, STRAPI_URL, etc.) |
| `__tests__/helpers/mockStrapi.ts` | Shared `global.fetch` spy + `NextRequest` builder |
| `__tests__/helpers/testAccount.ts` | E2E test credentials constant |

---

## Source Modification

One source file was modified to support testing:

- **`lib/rateLimiter.ts`** — Added `export` keyword to `class RateLimiter` so tests can create isolated instances without touching shared singletons.

---

## Troubleshooting

### "A worker process has failed to exit gracefully"

This is caused by the `setInterval` cleanup timer in `rateLimiter.ts`. The `--forceExit` flag in the npm script handles this. It's harmless.

### E2E tests fail with "Executable doesn't exist"

Run `npx playwright install chromium` to download the browser.

### Rate limit errors (429) in API tests

API tests use unique IPs (`x-forwarded-for` header) or unique email addresses to avoid hitting the shared in-memory rate limiters. If tests still hit limits, ensure `jest.clearAllMocks()` runs in `afterEach`.

### E2E auth tests fail

Ensure the test account exists in Strapi: `node scripts/setup-test-account.js`. Also ensure the dev server is running and can reach Strapi Cloud.
