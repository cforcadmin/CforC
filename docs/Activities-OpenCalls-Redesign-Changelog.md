# Activities & Open Calls Redesign + Grid/List Toggle

**Date:** 2026-03-06
**Scope:** Filter bar redesign for Activities & Open Calls pages, grid/list view toggle across all listing pages, Strapi schema updates, category assignment

---

## Summary

Redesigned the Activities and Open Calls pages to match the Members page filter/search pattern. Added a reusable grid/list view toggle to all listing pages across the site. Created shared filter components for consistent UI. Added a Funding Guidelines modal with 6 external resource links. Created and executed category assignment systems for both Activities (63 items) and Open Calls (73 items). Removed the Priority field from Open Calls (both Strapi schema and frontend) and replaced it with a required Category field. Updated Strapi DB schema, pushed to main and backup branch.

---

## Strapi Schema Changes

### Open Calls Collection (`StrapiDBforCforC`)

**Removed:**
- `Priority` (boolean, default: false) — no longer needed

**Added:**
- `Category` (string, required) — categorization for filtering

**Files changed in Strapi repo:**
- `src/api/open-call/content-types/open-call/schema.json`
- `types/generated/contentTypes.d.ts`

**Git:**
- Commit: `3a07f7f` — "Replace Priority with Category field on Open Calls schema"
- Pushed to: `origin/main`
- Backup branch: `Stable-backup-official_OpenCallCategory_V8_6-3-26`

**Post-deploy:** Verify Settings > Users & Permissions > Roles > Public has `find`/`findOne` enabled for Open Calls.

---

## New Shared Components

### `components/shared/ViewToggle.tsx`
- Grid/list toggle with radio group accessibility pattern
- SVG icons for grid (4-square) and list (horizontal lines) views
- Styling matches Members page AND/OR toggle (charcoal pill buttons)
- Props: `view: 'grid' | 'list'`, `onViewChange: (view) => void`
- Greek aria-labels: "Προβολή πλέγματος" / "Προβολή λίστας"

### `components/shared/CategoryFilter.tsx`
- Single-select dropdown with clear button
- Inverted colors when a category is active
- Click-outside and Escape key dismissal
- Props: `categories: string[]`, `selectedCategory: string`, `onCategoryChange: (cat) => void`

### `components/shared/YearFilter.tsx`
- Year dropdown with "Ολα" (all) null option
- Same styling as CategoryFilter
- Props: `years: number[]`, `selectedYear: number | null`, `onYearChange: (year) => void`

### `components/shared/SortDropdown.tsx`
- Generic sort dropdown with configurable options
- Selected label shown in button, chevron rotates on open
- Props: `options: SortOption[]`, `selected: string`, `onSortChange: (value) => void`

### `components/FundingGuidelinesModal.tsx`
- Modal with 6 funding resource cards in 2-column grid
- Resources:
  1. On The Move - Funding Resources
  2. CulturEU Funding Guide
  3. EU Funding & Tenders Portal
  4. European Funding Guide
  5. EU Calls - Complete Guide
  6. EU Funding Explained (Video)
- Accessible: `role="dialog"`, `aria-modal`, Escape key close, body scroll lock
- Coral-bordered trigger button with info icon

---

## Page Changes

### Activities Page (`app/activities/page.tsx`) - FULL REWRITE

**Filter Bar:**
- Search input (max-w-[200px])
- Tab pills: Τρέχουσες / Προηγούμενες (Current/Previous)
- CategoryFilter dropdown
- YearFilter dropdown (visible only on Previous tab)
- SortDropdown (Νεότερα πρώτα, Παλαιότερα πρώτα, Α-Ω, Ω-Α)
- ViewToggle (grid/list)
- FundingGuidelinesModal button

**Grid View:**
- 3-column grid (`lg:grid-cols-3`)
- Rounded-3xl cards with `hover:border-l-4 border-coral`
- Date badge overlay on image
- Category tag below title

**List View:**
- Horizontal card layout with thumbnail
- Date, title, category inline
- Hover border-l-4 coral effect

**Other:**
- Animated result counter with `aria-live="polite"`
- Info box with description text above filter bar
- Current/Previous tab determined by activity date vs today

### Open Calls Page (`components/OpenCallsContent.tsx`) - FULL REWRITE

**Filter Bar:**
- Search input
- Tab pills: Τρέχουσες / Προηγούμενες
- CategoryFilter dropdown
- YearFilter dropdown (Previous tab only)
- SortDropdown
- ViewToggle

**Grid View:**
- `md:grid-cols-2 lg:grid-cols-3` layout
- Deadline badge + Category bubble (side by side, rounded-full)
- Description preview (line-clamp-3)
- External link arrow

**List View:**
- Horizontal layout with date badge + category bubble stacked, title, description, arrow
- Category shown as truncated pill next to date

**Other:**
- Animated result counter
- Current/Previous determined by deadline vs today
- Priority field fully removed from both views

### Open Calls Section (`components/OpenCallsSection.tsx`)
- Replaced Priority badge with Category badge (coral/10 background, charcoal border)

### Members Page (`app/members/page.tsx`)
- Added `viewMode` state and ViewToggle to filter bar
- Shrunk search field from `max-w-[240px]` to `max-w-[200px]`
- **Grid view:** Existing 4-column card grid (unchanged)
- **List view:** Horizontal cards with circular 64px avatar, name, fields of work (line-clamp-1), city

### Projects Page (`components/ProjectsContent.tsx`)
- Added ViewToggle above the grid
- **Grid view:** Existing 3-column card grid (unchanged)
- **List view:** Horizontal cards with thumbnail, title, status badge, role, partners

### Newsletters (`components/NewslettersContent.tsx`)
- Added ViewToggle above the grid
- **Grid view:** Existing 3-column card grid (unchanged)
- **List view:** Horizontal cards with thumbnail, title, date, external link icon

### Working Groups (`components/WorkingGroupsContent.tsx`)
- Added ViewToggle above the grid
- **Grid view:** Existing 2-column card grid (unchanged)
- **List view:** Horizontal cards with image, name, coordinator, member count, join button

---

## Category System

### Activity Categories (5)
Assigned to all 63 activities via `scripts/assign-activity-categories.js`:

| Category | Count | Description |
|----------|-------|-------------|
| Εκδηλωσεις & Συναντησεις | 15 | Events & Meetings |
| Δικτυωση & Συνεργασιες | 15 | Networking & Collaborations |
| Εκπαιδευση & Εργαστηρια | 12 | Education & Workshops |
| Ενημερωση & Δημοσιευσεις | 12 | Information & Publications |
| Συνηγορια & Δρασεις | 9 | Advocacy & Actions |

Assignment method: Keyword matching on activity titles. Script: `scripts/assign-activity-categories.js`

### Open Call Categories (5)
Assigned to all 73 open calls via `scripts/assign-opencall-categories.js --execute`:

| Category | Count | Description |
|----------|-------|-------------|
| Καλλιτεχνικες Προσκλησεις | 25 | Artistic Calls |
| Χρηματοδοτησεις & Επιχορηγησεις | 24 | Funding & Grants |
| Εκπαιδευση & Καταρτιση | 12 | Education & Training |
| Δικτυωση & Συνεδρια | 7 | Networking & Conferences |
| Ψηφιακος Μετασχηματισμος | 5 | Digital Transformation |

Assignment method: Keyword matching on open call titles. Default fallback: Χρηματοδοτήσεις & Επιχορηγήσεις. Script: `scripts/assign-opencall-categories.js`

---

## Type Changes

### `lib/types.ts`
- Removed `Priority?: boolean` from `OpenCall` interface
- Changed `Category?: string` to `Category: string` (required) on `OpenCall` interface

---

## Files Created
- `components/shared/ViewToggle.tsx`
- `components/shared/CategoryFilter.tsx`
- `components/shared/YearFilter.tsx`
- `components/shared/SortDropdown.tsx`
- `components/FundingGuidelinesModal.tsx`
- `scripts/assign-activity-categories.js`
- `scripts/assign-opencall-categories.js`

## Files Modified
- `app/activities/page.tsx` (full rewrite)
- `components/OpenCallsContent.tsx` (full rewrite — Priority removed, Category bubble added next to date)
- `components/OpenCallsSection.tsx` (Priority badge replaced with Category badge)
- `app/members/page.tsx` (ViewToggle + list view + search field width)
- `components/ProjectsContent.tsx` (ViewToggle + list view)
- `components/NewslettersContent.tsx` (ViewToggle + list view)
- `components/WorkingGroupsContent.tsx` (ViewToggle + list view)
- `lib/types.ts` (Priority removed, Category made required on OpenCall)

## Strapi DB Files Modified
- `StrapiDBforCforC/src/api/open-call/content-types/open-call/schema.json` (Priority → Category)
- `StrapiDBforCforC/types/generated/contentTypes.d.ts` (Priority → Category)

## Files Removed
- `scripts/fetch-content-titles.js` (temporary, no longer needed)

---

## Accessibility

- All filter components use `aria-label` in Greek
- Tab pills use `role="tablist"` / `role="tab"` / `aria-selected`
- Sort dropdown uses `role="listbox"` / `role="option"` / `aria-selected`
- ViewToggle uses `role="radiogroup"` / `role="radio"` / `aria-checked`
- Animated counter uses `aria-live="polite"` for screen reader announcements
- All dates use semantic `<time>` elements with `dateTime` attributes
- Focus rings: `focus:ring-2 focus:ring-coral`

---

## Activities → News Rename + Background Color Update

### URL Route Rename
- `app/activities/` directory renamed to `app/news/`
- All routes changed: `/activities` → `/news`, `/activities/[slug]` → `/news/[slug]`

### Background Color
- News page (`app/news/page.tsx`): changed from default white to `bg-[#F5F0EB]` (matching Members page)
- Open Calls page (`app/open-calls/page.tsx`): changed from default to `bg-[#F5F0EB]`
- OpenCallsContent section: removed redundant `bg-white` (inherits from parent)
- Both pages now use `<Footer variant="members" />` for matching footer background

### Text/Label Updates
- Hero heading: ΔΡΑΣΤΗΡΙΟΤΗΤΕΣ → ΝΕΑ
- Description: "δραστηριότητες" → "νέα"
- Search aria-label: "Αναζήτηση δραστηριοτήτων" → "Αναζήτηση νέων"
- Empty state: "Δεν βρέθηκαν δραστηριότητες" → "Δεν βρέθηκαν νέα"
- Detail page back links: "Επιστροφή στις δραστηριότητες" → "Επιστροφή στα νέα"
- Related section heading: "Πρόσφατες Δραστηριότητες" → "Πρόσφατα Νέα"
- ActivitiesSection (homepage): "ΠΡΟΣΦΑΤΕΣ ΔΡΑΣΤΗΡΙΟΤΗΤΕΣ" → "ΠΡΟΣΦΑΤΑ ΝΕΑ", "ΔΡΑΣΤΗΡΙΟΤΗΤΕΣ ΤΟΥ" → "ΝΕΑ ΤΟΥ", "ΟΛΕΣ ΟΙ ΔΡΑΣΤΗΡΙΟΤΗΤΕΣ" → "ΟΛΑ ΤΑ ΝΕΑ"
- Layout metadata: title "Δραστηριότητες" → "Νέα", canonical `/activities` → `/news`

### Link Updates (all files)
- `components/Navigation.tsx`: desktop + mobile nav links `/activities` → `/news`
- `components/Footer.tsx`: sitemap link `/activities` → `/news`
- `components/ActivitiesSection.tsx`: all card links + CTA button
- `app/news/[slug]/ActivityDetailClient.tsx`: back links + related item links
- `app/sitemap.ts`: static + dynamic URLs

### E2E Tests Updated
- `__tests__/e2e/activities.spec.ts`: all URLs
- `__tests__/e2e/navigation.spec.ts`: nav link selector + URL
- `__tests__/e2e/seo-metadata.spec.ts`: page URL

### Not Changed (intentional)
- `lib/strapi.ts`: Strapi API endpoints remain `/activities` (Strapi collection name unchanged)
- `app/api/strapi/[...path]/route.ts`: allowlist entry stays `'activities'`
- Internal function names: `getActivities()`, `getActivityById()` (internal API, no user-facing impact)
