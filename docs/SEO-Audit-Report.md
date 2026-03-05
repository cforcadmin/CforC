# SEO Audit Report — Culture for Change Website

**Date:** 2026-03-06
**URL:** https://cultureforchange.net
**Framework:** Next.js 15 (App Router)

---

## Summary

The website has a solid foundation (sitemap, robots.txt, semantic HTML, image optimization) but is missing critical SEO elements on most pages. The biggest issue is that the most content-rich pages (activities, members) are client-rendered with no server-side metadata, making them nearly invisible to search engines.

| Area | Status |
|------|--------|
| Sitemap | Partial |
| robots.txt | OK |
| Root metadata | Partial |
| Page-level metadata | Poor |
| Open Graph / Twitter cards | Missing |
| JSON-LD structured data | Missing |
| Canonical URLs | Missing |
| Semantic HTML | Good |
| Image optimization | Good |
| Internationalization SEO | Partial |
| Performance (loading.tsx) | Missing |

---

## Critical Issues

### 1. No metadata on most pages

**Impact:** High
**Current state:** Only `/projects` and its dynamic sub-routes export metadata. All other pages (activities, members, open calls, about, privacy, terms, etc.) rely solely on the root layout's generic title "Culture for Change".

**Affected pages (no metadata):**
- `app/activities/page.tsx`
- `app/activities/[slug]/page.tsx`
- `app/members/page.tsx`
- `app/members/[name]/page.tsx`
- `app/members/[name]/[project]/page.tsx`
- `app/open-calls/page.tsx`
- `app/about/page.tsx`
- `app/privacy/page.tsx`
- `app/terms/page.tsx`
- `app/transparency/page.tsx`
- `app/accessibility/page.tsx`
- `app/participation/page.tsx`
- `app/cookies/page.tsx`
- `app/coordination-team/page.tsx`
- `app/announcements-2025/page.tsx`
- `app/login/page.tsx`
- `app/profile/page.tsx`

**Fix:** Add `export const metadata` to static pages, and `generateMetadata()` to dynamic routes.

---

### 2. Dynamic routes are client components — can't export metadata

**Impact:** High
**Current state:** `/activities/[slug]`, `/members/[name]`, and `/members/[name]/[project]` are marked `'use client'`, which makes it impossible to export metadata. Google sees a blank title/description for these pages.

**Fix:** Refactor these into a server component wrapper + client component pattern:
- Server component fetches data and exports `generateMetadata()`
- Client component receives data as props and handles interactivity

---

### 3. No Open Graph or Twitter Card tags

**Impact:** High
**Current state:** No og:image, og:title, og:description, or Twitter card tags anywhere except `/projects/[slug]`.

**Fix:** Add Open Graph and Twitter metadata to root layout and all page-level metadata exports.

---

### 4. No JSON-LD structured data

**Impact:** High
**Current state:** No schema.org markup on any page.

**Recommended schemas:**
- **Organization** — on homepage/layout (name, logo, url, sameAs for social links)
- **Person** — on member detail pages (name, image, jobTitle, url)
- **Event/Article** — on activity detail pages (name, description, image, datePublished)
- **BreadcrumbList** — on all pages with navigation depth

**Fix:** Add `<script type="application/ld+json">` blocks to relevant pages.

---

### 5. Sitemap missing dynamic activity and member routes

**Impact:** High
**Current state:** `app/sitemap.ts` includes static pages and project routes, but **not** activities or members — potentially hundreds of missing URLs.

**Fix:** Add dynamic generation for:
- `/activities/[slug]` — fetch all activities from Strapi
- `/members/[name]` — fetch all visible members from Strapi

---

## Medium Issues

### 6. No canonical URLs

**Impact:** Medium
**Current state:** No canonical tags on any page. Risk of duplicate content from query parameters (e.g., `?field=`, `?from=`).

**Fix:** Add `alternates.canonical` to metadata on all pages.

---

### 7. No hreflang tags

**Impact:** Medium
**Current state:** The site is in Greek with Google Translate for other languages, but no hreflang tags indicate language variants to search engines.

**Fix:** Since the site uses client-side translation (not separate URLs per language), hreflang tags are not strictly necessary. However, adding `<link rel="alternate" hreflang="el" href="...">` for the default language confirms the primary language to crawlers.

---

### 8. No loading.tsx files

**Impact:** Medium
**Current state:** No `loading.tsx` files exist for any route segment. Users see no visual feedback during server-side rendering.

**Fix:** Add `loading.tsx` files to key route groups (activities, members, projects) with the existing `LoadingIndicator` component.

---

## What's Already Good

### Sitemap (partial)
- `app/sitemap.ts` generates URLs for static pages and project routes
- Includes priorities, change frequencies, and last modified dates

### robots.txt
- `app/robots.ts` allows all crawlers and points to sitemap

### Semantic HTML
- Proper heading hierarchy (h1 > h2 > h3) across pages
- `<main id="main-content">` landmark on all pages
- Skip-to-content link for accessibility
- Proper use of `<section>`, `<article>`, `<nav>`, `<footer>`

### Image Optimization
- Next.js `Image` component used consistently
- Strapi CDN domains configured in `next.config.js`
- Alt text present on most images

### Language
- Root `<html lang="el">` correctly set

---

## Proposed Fix Plan (Priority Order)

### Phase 1 — Quick Wins (no refactoring needed)
1. Add Open Graph + Twitter card metadata to root `app/layout.tsx`
2. Add `export const metadata` to all static pages (about, privacy, terms, etc.)
3. Add activities and members to `app/sitemap.ts`
4. Add Organization JSON-LD to root layout
5. Add canonical URLs to root metadata

### Phase 2 — Dynamic Route Metadata (refactoring needed)
6. Refactor `/activities/[slug]/page.tsx` — server/client split for `generateMetadata()`
7. Refactor `/members/[name]/page.tsx` — server/client split for `generateMetadata()`
8. Refactor `/members/[name]/[project]/page.tsx` — server/client split for `generateMetadata()`
9. Add Person JSON-LD to member detail pages
10. Add Article/Event JSON-LD to activity detail pages

### Phase 3 — Polish
11. Add `loading.tsx` to activities, members, projects route groups
12. Add BreadcrumbList JSON-LD to nested pages
13. Verify all pages with Google Search Console after deployment

---

## Estimated Impact

| Fix | SEO Benefit |
|-----|-------------|
| Page-level metadata | Google shows proper titles/descriptions in search results |
| Open Graph tags | Social sharing shows images/titles on Facebook, LinkedIn, etc. |
| JSON-LD structured data | Rich snippets in search results (knowledge panels, events, people) |
| Sitemap expansion | Google discovers and indexes all activity/member pages |
| Canonical URLs | Prevents duplicate content penalties from query parameters |
| Dynamic route metadata | Activity and member pages become fully indexable |
