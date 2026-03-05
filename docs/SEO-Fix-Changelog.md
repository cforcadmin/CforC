# SEO Fix Changelog — Culture for Change Website

**Date:** 2026-03-06
**URL:** https://cultureforchange.net
**Framework:** Next.js 15 (App Router)

---

## Summary

All SEO issues identified in the SEO Audit Report have been fixed. The changes fall into three categories: root-level metadata enhancements, static page metadata, and dynamic route refactoring for server-side metadata generation.

**Total files created:** 18
**Total files modified:** 4
**Build status:** Passing (no errors)

---

## Phase 1 — Root Layout & Quick Wins

### 1. Enhanced root layout metadata (`app/layout.tsx`)

**What changed:**
- Added `metadataBase` pointing to `https://cultureforchange.net`
- Changed `title` from a plain string to a template object (`{ default: 'Culture for Change', template: '%s | Culture for Change' }`) — child pages now automatically get " | Culture for Change" appended
- Updated `description` to Greek
- Added **Open Graph** tags: `type`, `locale`, `url`, `siteName`, `title`, `description`, `images`
- Added **Twitter Card** tags: `card`, `title`, `description`, `images`
- Added `alternates.canonical` and `alternates.languages` for canonical URL and hreflang
- Added `robots: { index: true, follow: true }`
- Added **Organization JSON-LD** structured data (`schema.org/Organization`) with name, url, logo, description, and social media links (Instagram, Facebook)
- OG image set to `/Homepage_Block1.jpg` (existing public asset)

**SEO impact:** Google and social platforms now display proper titles, descriptions, and images when the site is shared or indexed.

---

### 2. Static page metadata (12 layout files + 1 direct metadata export)

For pages that are `'use client'` components (cannot export metadata directly), a `layout.tsx` file was created in each route directory. For the `about` page (already a server component), metadata was added directly.

| Page | File Created/Modified | Title (Greek) |
|------|----------------------|---------------|
| `/about` | `app/about/page.tsx` (modified) | Σχετικά με εμάς |
| `/activities` | `app/activities/layout.tsx` (created) | Δραστηριότητες |
| `/members` | `app/members/layout.tsx` (created) | Μέλη |
| `/open-calls` | `app/open-calls/layout.tsx` (created) | Ανοιχτές Προσκλήσεις |
| `/privacy` | `app/privacy/layout.tsx` (created) | Πολιτική Απορρήτου |
| `/terms` | `app/terms/layout.tsx` (created) | Όροι Χρήσης |
| `/transparency` | `app/transparency/layout.tsx` (created) | Διαφάνεια |
| `/accessibility` | `app/accessibility/layout.tsx` (created) | Προσβασιμότητα |
| `/participation` | `app/participation/layout.tsx` (created) | Συμμετοχή |
| `/cookies` | `app/cookies/layout.tsx` (created) | Πολιτική Cookies |
| `/coordination-team` | `app/coordination-team/layout.tsx` (created) | Ομάδα Συντονισμού |
| `/login` | `app/login/layout.tsx` (created) | Σύνδεση |
| `/profile` | `app/profile/layout.tsx` (created) | Προφίλ |

**Notes:**
- Each layout exports `metadata` with `title`, `description`, and `alternates.canonical`
- `/login` and `/profile` are marked `robots: { index: false, follow: false }` to prevent indexing of auth/private pages
- All titles use the root layout's template — e.g., "Δραστηριότητες | Culture for Change"

**SEO impact:** Every page now has a unique, descriptive title and meta description instead of the generic "Culture for Change".

---

### 3. Sitemap expansion (`app/sitemap.ts`)

**What changed:**
- Imported `getActivities` and `getMembers` from `lib/strapi.ts`
- Added dynamic URL generation for all `/activities/[slug]` routes (fetches all activities from Strapi)
- Added dynamic URL generation for all `/members/[name]` routes (fetches all visible members, skips hidden profiles)
- Each entry includes `lastModified`, `changeFrequency: 'monthly'`, and appropriate `priority`

**SEO impact:** Google can now discover and index all activity and member pages (potentially hundreds of URLs that were previously missing from the sitemap).

---

## Phase 2 — Dynamic Route Refactoring

### 4. Activity detail page (`app/activities/[slug]/`)

**Problem:** Page was a `'use client'` component — cannot export `generateMetadata()`.

**Solution:** Split into two files:
- `page.tsx` — **Server component** (new, 80 lines)
  - Exports `generateMetadata()` that fetches the activity from Strapi
  - Returns: `title`, `description` (first 160 chars of content), `canonical`, Open Graph (`type: 'article'`, `publishedTime`), Twitter Card, and activity image
  - Renders **Article JSON-LD** (`schema.org/Article`) with headline, description, datePublished, dateModified, image, author, publisher
- `ActivityDetailClient.tsx` — **Client component** (445 lines, original code moved here unchanged)
  - Renamed default export from `ActivityDetailPage` to `ActivityDetailClient`
  - All functionality preserved: photo carousel, fullscreen modal, related activities, accessibility button, newsletter section

**No code was removed or modified in the client component.**

---

### 5. Member detail page (`app/members/[name]/`)

**Problem:** Page was a `'use client'` component — cannot export `generateMetadata()`.

**Solution:** Split into two files:
- `page.tsx` — **Server component** (new, 80 lines)
  - Exports `generateMetadata()` that fetches the member from Strapi
  - Returns: `title` (member name), `description` (name + fields of work), `canonical`, Open Graph (`type: 'profile'`), Twitter Card, and member image
  - Renders **Person JSON-LD** (`schema.org/Person`) with name, url, image, address (city), and memberOf (Culture for Change)
  - Respects `HideProfile` flag — returns generic metadata for hidden profiles
- `MemberDetailClient.tsx` — **Client component** (629 lines, original code moved here unchanged)
  - Renamed default export from `MemberDetailPage` to `MemberDetailClient`
  - All functionality preserved: hero section, accessibility button with scroll fade, bio, contact info, email copy-to-clipboard, fields of work tags, location tags, projects section, newsletter form with honeypot, success popup, cookie consent, scroll-to-top

**No code was removed or modified in the client component.**

---

### 6. Member project detail page (`app/members/[name]/[project]/`)

**Problem:** Page was a `'use client'` component — cannot export `generateMetadata()`.

**Solution:** Split into two files:
- `page.tsx` — **Server component** (new, 55 lines)
  - Exports `generateMetadata()` that fetches the member and identifies which project to show
  - Returns: `title` (project title + member name), `description`, `canonical`, Open Graph, Twitter Card, and project image
- `ProjectDetailClient.tsx` — **Client component** (488 lines, original code moved here unchanged)
  - Renamed default export from `ProjectDetailPage` to `ProjectDetailClient`
  - All functionality preserved: hero section, accessibility button, image carousel with thumbnails, member thumbnail link, project description, project links, other projects section

**No code was removed or modified in the client component.**

---

## Phase 3 — Polish

### 7. Loading states (4 `loading.tsx` files)

Created `loading.tsx` files in key route directories, all using the existing `LoadingIndicator` component:

| File | Route |
|------|-------|
| `app/activities/loading.tsx` | `/activities` and `/activities/[slug]` |
| `app/members/loading.tsx` | `/members`, `/members/[name]`, `/members/[name]/[project]` |
| `app/projects/loading.tsx` | `/projects` and `/projects/[slug]` |
| `app/open-calls/loading.tsx` | `/open-calls` |

**SEO impact:** Users see visual feedback during server-side rendering, reducing perceived load time and bounce rates.

---

## Complete File List

### Files Created (18)

| File | Purpose |
|------|---------|
| `app/activities/layout.tsx` | Activities listing metadata |
| `app/activities/loading.tsx` | Activities loading state |
| `app/activities/[slug]/ActivityDetailClient.tsx` | Activity detail client component (moved from page.tsx) |
| `app/members/layout.tsx` | Members listing metadata |
| `app/members/loading.tsx` | Members loading state |
| `app/members/[name]/MemberDetailClient.tsx` | Member detail client component (moved from page.tsx) |
| `app/members/[name]/[project]/ProjectDetailClient.tsx` | Member project client component (moved from page.tsx) |
| `app/open-calls/layout.tsx` | Open calls metadata |
| `app/open-calls/loading.tsx` | Open calls loading state |
| `app/privacy/layout.tsx` | Privacy page metadata |
| `app/terms/layout.tsx` | Terms page metadata |
| `app/transparency/layout.tsx` | Transparency page metadata |
| `app/accessibility/layout.tsx` | Accessibility page metadata |
| `app/participation/layout.tsx` | Participation page metadata |
| `app/cookies/layout.tsx` | Cookies page metadata |
| `app/coordination-team/layout.tsx` | Coordination team metadata |
| `app/login/layout.tsx` | Login page metadata (noindex) |
| `app/profile/layout.tsx` | Profile page metadata (noindex) |
| `app/projects/loading.tsx` | Projects loading state |

### Files Modified (4)

| File | Changes |
|------|---------|
| `app/layout.tsx` | Enhanced metadata (OG, Twitter, canonical, JSON-LD, title template) |
| `app/about/page.tsx` | Added `export const metadata` |
| `app/sitemap.ts` | Added activity and member dynamic routes |
| `app/activities/[slug]/page.tsx` | Replaced with server component wrapper + `generateMetadata()` |
| `app/members/[name]/page.tsx` | Replaced with server component wrapper + `generateMetadata()` + Person JSON-LD |
| `app/members/[name]/[project]/page.tsx` | Replaced with server component wrapper + `generateMetadata()` |

---

## Before vs After

| SEO Element | Before | After |
|-------------|--------|-------|
| Page titles | Generic "Culture for Change" on all pages | Unique Greek titles per page |
| Meta descriptions | Single generic description | Unique descriptions per page |
| Open Graph tags | Missing (except /projects/[slug]) | Present on all pages |
| Twitter Cards | Missing | Present on all pages |
| JSON-LD structured data | None | Organization (root), Person (members), Article (activities) |
| Canonical URLs | Missing | Present on all pages |
| Sitemap coverage | Static pages + projects only | + all activities + all members |
| Dynamic route metadata | Impossible (client components) | Full metadata via server/client split |
| Loading states | None | LoadingIndicator on 4 route groups |

---

## Verification Steps

1. Run `npm run build` — should complete with no errors
2. Run `npm run dev` and check individual pages:
   - View page source to confirm `<title>`, `<meta>` OG/Twitter tags, and JSON-LD scripts
   - Test `/activities/[any-slug]` — should show activity title in browser tab
   - Test `/members/[any-slug]` — should show member name in browser tab
3. After deployment:
   - Check `/sitemap.xml` — should include activity and member URLs
   - Use [Google Rich Results Test](https://search.google.com/test/rich-results) to validate JSON-LD
   - Use [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) to verify OG tags
   - Submit updated sitemap in Google Search Console
