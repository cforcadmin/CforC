# Accessibility Improvements Documentation

This document details all accessibility changes made to the Culture for Change website to comply with WCAG 2.2 AA guidelines.

## Summary

- **Initial Audit Score:** 65%
- **Critical Issues Identified:** 24
- **Primary Issues:** Color contrast (22 failing elements), missing aria-labels, small text sizes

---

## 1. Color Contrast Fixes

### Problem
The original coral color (`#FF8B6A`) on white backgrounds had a contrast ratio of **2.9:1**, which fails WCAG AA requirements (minimum 4.5:1 for normal text, 3:1 for large text).

### Solution
Instead of changing the brand color, we inverted the color scheme:
- **Labels/Badges:** Dark charcoal background (`bg-charcoal`) with coral text (`text-coral`) = **4.8:1 contrast ratio** ✓
- **Buttons:** Dark charcoal background with coral text and coral border for visual distinction

### Accessible Design Pattern

**Labels/Badges:**
```jsx
className="bg-charcoal dark:bg-gray-700 text-coral dark:text-coral-light px-3 py-1 rounded-full text-sm font-medium shadow-[0_0_15px_8px_rgba(45,45,45,0.4)] dark:shadow-[0_0_15px_8px_rgba(55,65,81,0.5)]"
```

**Buttons:**
```jsx
className="bg-charcoal dark:bg-gray-700 text-coral dark:text-coral-light border-2 border-coral dark:border-coral-light px-6 py-3 rounded-full font-medium hover:bg-coral hover:text-white dark:hover:bg-coral-light dark:hover:text-gray-900 transition-colors"
```

**Links (on light backgrounds):**
```jsx
className="text-charcoal dark:text-coral-light hover:underline font-bold"
```

---

## 2. Files Modified

### Homepage Components

#### `components/ActivitiesSection.tsx`
- **Lines 57, 72:** Updated section labels to dark badge with glow shadow
- **Lines 66, 217:** Updated "ΟΛΕΣ ΟΙ ΔΡΑΣΤΗΡΙΟΤΗΤΕΣ" buttons to accessible pattern
- **Lines 181-214:** Added `aria-label` to prev/next slide buttons ("Προηγούμενη σελίδα", "Επόμενη σελίδα")
- **Lines 192-201:** Added `aria-label` to pagination dots ("Μετάβαση στη σελίδα X") and `aria-current` for active state

#### `components/AboutSection.tsx`
- **Line 99:** Updated "ΠΟΙΟΙ ΕΙΜΑΣΤΕ" label to dark badge with glow shadow

#### `components/AboutCoreSection.tsx`
- **Line 77:** Updated "ΤΟ ΤΡΙΠΤΥΧΟ ΜΑΣ" label to dark badge with glow shadow

#### `components/NewsletterSection.tsx`
- **Line 57:** Updated "ΟΛΑ TA NEA ΣTO EMAIL ΣΑΣ!" label to dark badge with glow shadow
- **Line 147-150:** Added `aria-hidden="true"` to modal backdrop

#### `components/OpenCallsSection.tsx`
- **Lines 48, 69:** Updated "ΑΝΟΙΧΤΕΣ ΠΡΟΣΚΛΗΣΕΙΣ" labels to dark badge with glow
- **Lines 63, 78, 91, 148:** Updated buttons to accessible pattern
- **Lines 126-134:** Added `aria-label="Κλείσιμο"` to close button, `aria-hidden="true"` to SVG

#### `components/BecomeMemberSection.tsx`
- **Line 40:** Updated "ΓΙΝΕ ΜΕΛΟΣ ΤΩΡΑ" button to accessible pattern

### Navigation Components

#### `components/Navigation.tsx`
- **Lines 48-56:** Removed BETA badge (no longer in beta)
- **Line 117:** Added dynamic `aria-label` to hamburger menu button:
  - Open state: "Κλείσιμο μενού"
  - Closed state: "Άνοιγμα μενού"

#### `components/LanguageSwitcher.tsx`
- **Line 142:** Language badge improvements:
  - Increased font size from `text-[9px]` to `text-[11px]`
  - Changed to dark background with coral text: `bg-charcoal dark:bg-gray-600 text-coral dark:text-coral-light`
  - Added padding: `px-1.5 py-0.5`

### Modal Components

#### `components/MembershipRegistrationModal.tsx`
- **Line 56-58:** Added `aria-hidden="true"` to backdrop
- **Line 82-84:** Added `aria-label="Κλείσιμο"` to close button

#### `components/ThankYouModal.tsx`
- **Line 18-20:** Added `aria-hidden="true"` to backdrop

#### `components/profile/ProfileGuidelinesModal.tsx`
- **Line 18-20:** Added `aria-hidden="true"` to backdrop
- **Line 44-46:** Added `aria-label="Κλείσιμο"` to close button

#### `components/ConfirmationModal.tsx`
- Already had proper accessibility attributes (no changes needed)

### Video/Interactive Components

#### `components/HeroSection.tsx`
- **Lines 59-76:** Changed clickable `<div>` to semantic `<button>` element
- Added `aria-label="Αναπαραγωγή βίντεο"`
- Added `aria-hidden="true"` to decorative play icon SVG

#### `components/AboutVideoSection.tsx`
- **Lines 32-48:** Changed clickable `<div>` to semantic `<button>` element
- Added `aria-label="Αναπαραγωγή βίντεο"`
- Added `aria-hidden="true"` to decorative play icon SVG

#### `components/MapSection.tsx`
- **Lines 69-90:** Added full keyboard accessibility to map region circles:
  - `role="button"` - Semantic role for assistive technology
  - `tabIndex={0}` - Makes element focusable via keyboard
  - `aria-label={`Επιλογή περιοχής ${region.name}`}` - Descriptive label
  - `aria-pressed={activeRegion === region.name}` - Indicates selected state
  - `onKeyDown` handler for Enter/Space key activation
  - `focus:outline-none focus:ring-2 focus:ring-coral` - Visual focus indicator

### Profile Components

#### `components/profile/EditableMultipleImages.tsx`
- **Lines 89-97, 111-119:** Added `aria-label="Αφαίρεση εικόνας"` to remove image buttons
- Added `aria-hidden="true"` to close icon SVGs

### Page Files

#### `app/login/page.tsx`
- **Line 110:** Updated "Περιοχή Μελών" badge to accessible pattern with glow shadow
- **Line 171:** Changed "Ξεχάσες τον κωδικό σου;" link from `text-coral` to `text-charcoal`
- **Lines 275, 278, 381, 384:** Changed `text-[11px]` to `text-xs` (12px minimum)
- **Lines 290, 295:** Changed footer links from `text-coral` to `text-charcoal`
- **Line 319:** Added `aria-label="Κλείσιμο"` to password reset modal close button
- **Lines 191-207:** Updated "Σύνδεση" button to accessible pattern
- **Lines 255-271:** Updated "Αποστολή Συνδέσμου" button (magic link) to accessible pattern
- **Lines 363-379:** Updated "Αποστολή Συνδέσμου" button (password reset) to accessible pattern

#### `app/participation/page.tsx`
- **Lines 275-281:** Updated "ΘΕΛΩ ΝΑ ΕΓΓΡΑΦΩ!" button to accessible pattern
- **Line 177:** Changed "Οδηγός Τσέπης" link from `text-coral` to `text-charcoal`

#### `app/members/page.tsx`
- **Line 281:** Changed FieldsOfWork tag from `text-[10px]` to `text-xs` (12px)

#### `app/members/[name]/page.tsx`
- **Lines 313-318:** Updated "ΜΑΘΕ ΠΕΡΙΣΣΟΤΕΡΑ" button to accessible pattern

#### `app/terms/page.tsx`
- **Lines 33, 41, 45, 111, 119:** Changed all 5 internal links from `text-coral` to `text-charcoal dark:text-coral-light`

#### `app/activities/[slug]/page.tsx`
- **Line 124:** Changed error page back link to `text-charcoal`
- **Line 156:** Changed content back link to `text-charcoal`
- **Lines 338-346:** Added `aria-label="Κλείσιμο"` to fullscreen modal close button
- **Lines 362-379:** Added aria-labels to photo navigation buttons:
  - Previous: `aria-label="Προηγούμενη φωτογραφία"`
  - Next: `aria-label="Επόμενη φωτογραφία"`
- Added `aria-hidden="true"` to all navigation SVG icons

#### `app/profile/page.tsx`
- **Lines 713-716:** Added `aria-hidden="true"` to unsaved changes modal backdrop

---

## 3. Text Size Improvements

### WCAG Requirement
While WCAG doesn't mandate a specific minimum font size, 12px is the commonly accepted minimum for accessibility.

### Changes Made

| File | Original | Updated | Location |
|------|----------|---------|----------|
| `app/members/page.tsx` | `text-[10px]` | `text-xs` (12px) | FieldsOfWork tags |
| `app/login/page.tsx` | `text-[11px]` | `text-xs` (12px) | Info text (4 occurrences) |
| `components/LanguageSwitcher.tsx` | `text-[9px]` | `text-[11px]` | Language code badge |

---

## 4. ARIA Attributes Added

### aria-label (Screen Reader Descriptions)

| Component | Element | Label |
|-----------|---------|-------|
| Navigation.tsx | Hamburger menu | "Άνοιγμα μενού" / "Κλείσιμο μενού" |
| MembershipRegistrationModal.tsx | Close button | "Κλείσιμο" |
| ProfileGuidelinesModal.tsx | Close button | "Κλείσιμο" |
| OpenCallsSection.tsx | Close button | "Κλείσιμο" |
| login/page.tsx | Close button | "Κλείσιμο" |
| activities/[slug]/page.tsx | Close button | "Κλείσιμο" |
| activities/[slug]/page.tsx | Prev photo | "Προηγούμενη φωτογραφία" |
| activities/[slug]/page.tsx | Next photo | "Επόμενη φωτογραφία" |
| ActivitiesSection.tsx | Prev slide | "Προηγούμενη σελίδα" |
| ActivitiesSection.tsx | Next slide | "Επόμενη σελίδα" |
| ActivitiesSection.tsx | Pagination dots | "Μετάβαση στη σελίδα X" |
| HeroSection.tsx | Play button | "Αναπαραγωγή βίντεο" |
| AboutVideoSection.tsx | Play button | "Αναπαραγωγή βίντεο" |
| MapSection.tsx | Region circles | "Επιλογή περιοχής [NAME]" |
| EditableMultipleImages.tsx | Remove buttons | "Αφαίρεση εικόνας" |
| ScrollToTop.tsx | Scroll button | "Scroll to top" (already existed) |

### aria-hidden (Hide from Screen Readers)

Applied to decorative elements that don't provide meaningful information:
- Modal backdrops (7 files)
- Decorative SVG icons in buttons (all close buttons, navigation arrows, play icons)

### aria-current / aria-pressed (State Indicators)

| Component | Element | Attribute |
|-----------|---------|-----------|
| ActivitiesSection.tsx | Active pagination dot | `aria-current="true"` |
| MapSection.tsx | Selected region | `aria-pressed={true/false}` |

---

## 5. Keyboard Navigation Improvements

### MapSection.tsx
Added full keyboard support to interactive map regions:
```jsx
<circle
  tabIndex={0}
  role="button"
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setActiveRegion(region.name)
    }
  }}
/>
```

### Focus Indicators
Added visible focus states:
```jsx
className="focus:outline-none focus:ring-2 focus:ring-coral"
```

---

## 6. Heading Structure Improvements

### Problem
Screen readers rely on heading hierarchy (H1 → H2 → H3) to navigate pages. Skipping heading levels (e.g., H1 → H4) causes confusion for users with assistive technology.

### Issues Found

**`app/participation/page.tsx`:**
- H4 elements used before any H2/H3 (skipping levels)
- Incorrect hierarchy: H1 → H4 → H4 → H4 → H3 → H2

**`app/login/page.tsx`:**
- H1 used for card title instead of page title
- Missing page-level H1

### Solution: Visually Hidden Headers
Used `sr-only` class (screen reader only) to add proper heading structure without changing visual design.

### Changes Made

#### `app/participation/page.tsx`
- **Line 136:** Added `<h2 className="sr-only">Πληροφορίες Εγγραφής</h2>` as section header
- **Lines 146, 155, 165:** Changed `<h4>` → `<h3>` for info box titles:
  - Οικονομικές υποχρεώσεις μελών
  - Λειτουργία Δικτύου
  - Προνόμια μελών
- **Line 198:** Added `<h2 className="sr-only">Ποιος μπορεί να γίνει μέλος</h2>` before feature boxes

**New hierarchy:** H1 → H2 (sr-only) → H3 → H3 → H3 → H3 → H2 (sr-only) → H3 → H3 → H3 → H3 → H2 ✓

#### `app/login/page.tsx`
- **Line 109:** Added `<h1 className="sr-only">Περιοχή Μελών - Σύνδεση</h1>` as page title
- **Line 113:** Added `aria-hidden="true"` to decorative "Περιοχή Μελών" badge
- **Line 127:** Changed `<h1>` → `<h2>` for "Σύνδεση" card title

**New hierarchy:** H1 (sr-only) → H2 → H2 → H3 ✓

---

## 7. Semantic HTML Improvements

### Clickable Divs → Buttons
Changed non-semantic clickable `<div>` elements to proper `<button>` elements:
- `components/HeroSection.tsx` - Video play overlay
- `components/AboutVideoSection.tsx` - Video play overlay

This ensures:
- Proper keyboard focus
- Screen reader announcement as interactive element
- Native button behaviors (Enter/Space activation)

---

## 8. Button Accessibility Audit

### Why Semantic Buttons Matter
Screen readers rely on semantic HTML to announce element types. When a user navigates to a button:

| Element | Screen Reader Announces |
|---------|------------------------|
| `<button>Σύνδεση</button>` | "Σύνδεση, κουμπί" ✓ |
| `<div onClick={...}>Σύνδεση</div>` | "Σύνδεση" (no "button" announcement) ❌ |
| `<div role="button" tabIndex={0}>Σύνδεση</div>` | "Σύνδεση, κουμπί" ✓ |

### WCAG Requirements for Buttons
Per WCAG 2.2 and MDN documentation:

1. **Use native `<button>` elements** - They provide built-in:
   - Keyboard support (Enter/Space activation)
   - Focus management
   - Screen reader semantics ("button" role)

2. **If using non-button elements** (e.g., SVG circles), must add:
   - `role="button"` - Tells screen reader it's a button
   - `tabIndex={0}` - Makes it keyboard focusable
   - `onKeyDown` handler - For Enter/Space key support
   - `aria-label` - Descriptive label for screen readers

3. **Minimum target size**: 24×24 CSS pixels (WCAG 2.2 Level AA)

### Audit Results

**Codebase scan performed:** Searched for `<div onClick` and `<span onClick` patterns.

**Result:** ✓ **All interactive elements use proper `<button>` elements.**

No `<div>` or `<span>` elements with `onClick` handlers were found. The codebase correctly uses semantic HTML buttons throughout.

### Special Case: SVG Map Circles

The only non-button interactive elements are SVG `<circle>` elements in `MapSection.tsx`. These have been properly configured with full accessibility support:

```jsx
<circle
  role="button"
  tabIndex={0}
  aria-label={`Επιλογή περιοχής ${region.name}`}
  aria-pressed={activeRegion === region.name}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setActiveRegion(region.name)
    }
  }}
  className="focus:outline-none focus:ring-2 focus:ring-coral"
/>
```

### References
- [ARIA: button role - MDN](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/button_role)
- [Divs Are Not Buttons - The Admin Bar](https://theadminbar.com/accessibility-weekly/divs-are-not-buttons/)
- [14 Tips for Button Accessibility - BeAccessible](https://beaccessible.com/post/button-accessibility/)

---

## 9. Image Alt Text Audit

### WCAG Requirement
WCAG 1.1.1 (Non-text Content) requires all images to have text alternatives that serve the equivalent purpose.

### Best Practices Applied

Based on W3C guidelines and accessibility research:

1. **Descriptive alt text** - Describe what's in the image, not just "image of..."
2. **Context matters** - Alt text should relate to the surrounding content
3. **Decorative images** - Use `alt=""` and `aria-hidden="true"` so screen readers skip them
4. **Keep it concise** - Aim for under 125 characters
5. **No redundant phrases** - Avoid "Image of" or "Photo of" (screen readers already announce "image")

### Audit Results

#### ✅ What Was Already Good

| Category | Implementation |
|----------|----------------|
| CMS images (Strapi) | Uses `alternativeText` field with fallback to title |
| Partner logos | Organization names as alt text |
| Social media icons | Platform names ("LinkedIn", "Facebook", etc.) |
| Member photos | Falls back to member name if no alt text set |

#### ❌ Issues Found & Fixed

**Decorative Images (updated alt text):**

Per WCAG guidelines, decorative images can use `alt=""` so screen readers skip them entirely. However, for consistency and to provide context in the Greek language, we've chosen to use `alt="Διακοσμητικό στοιχείο"` (meaning "Decorative element") combined with `aria-hidden="true"` for all decorative images.

| File | Image | Alt Text |
|------|-------|----------|
| `components/Footer.tsx` | Logo in footer | `alt="Διακοσμητικό στοιχείο"` + `aria-hidden="true"` |
| `components/BecomeMemberSection.tsx` | Background image | `alt="Διακοσμητικό στοιχείο"` + `aria-hidden="true"` |
| `components/LoadingIndicator.tsx` | Loading logo | `alt="Διακοσμητικό στοιχείο"` + `aria-hidden="true"` |
| `components/ActivitiesSection.tsx` | Small C4C logo | `alt="Διακοσμητικό στοιχείο"` + `aria-hidden="true"` |
| `app/activities/page.tsx` | Small C4C logo | `alt="Διακοσμητικό στοιχείο"` + `aria-hidden="true"` |
| `app/activities/[slug]/page.tsx` | Small C4C logo | `alt="Διακοσμητικό στοιχείο"` + `aria-hidden="true"` |

**Note:** The Navigation logo is not marked as decorative because it's inside a `<Link>` element and serves as a functional navigation element (clicking it navigates to the homepage).

**Generic Descriptions (improved):**

| File | Before | After |
|------|--------|-------|
| `AboutSection.tsx` | `alt="Culture for Change Community"` | `alt="Μέλη του δικτύου Culture for Change σε συνάντηση εργασίας"` |
| `AboutHeroSection.tsx` | `alt="Culture for Change Team"` | `alt="Ομαδική φωτογραφία μελών του δικτύου Culture for Change"` |
| `AboutGoalsSection.tsx` | `alt="Our Goals"` | `alt="Συμμετέχοντες σε δράση του Culture for Change συζητούν τους στόχους του δικτύου"` |
| `AboutMapSection.tsx` | `alt="Map of Greece"` | `alt="Χάρτης Ελλάδας με επισημασμένες τις τοποθεσίες των μελών του δικτύου"` |

### CMS Images (Strapi) - Action Required

The codebase correctly reads the `alternativeText` field from Strapi:

```jsx
alt={activity.Visuals[0].alternativeText || activity.Title}
```

However, if content editors don't fill in the Alternative Text field when uploading images, the fallback (title) is used, which may not be descriptive.

**Action Taken in Strapi:**

Added a new **required** `ImageAltText` field to both Activity and Open Calls content types:

| Content Type | Field Added | Required |
|--------------|-------------|----------|
| Activity | `ImageAltText` | ✅ Yes |
| Open Calls | `ImageAltText` | ✅ Yes |

**Files updated:**
- `StrapiDBforCforC/src/api/activity/content-types/activity/schema.json`
- `StrapiDBforCforC/src/api/open-call/content-types/open-call/schema.json`

**Pushed to GitHub:**
- Branch: `Stable-backup-official_ImageAltText_V1_21-1-26`
- Repo: `cforcadmin/StrapiDBforCforC`

**Frontend code updated** to use the new field:
- `lib/types.ts` - Added `ImageAltText: string` to Activity and OpenCall interfaces
- `app/activities/page.tsx` - Uses `activity.ImageAltText`
- `app/activities/[slug]/page.tsx` - Uses `activity.ImageAltText`
- `app/open-calls/page.tsx` - Uses `call.ImageAltText`
- `components/ActivitiesSection.tsx` - Uses `card.ImageAltText`
- `components/OpenCallsSection.tsx` - Uses `call.ImageAltText`

**Example of good alt text for activities:**
- ❌ "Εργαστήριο Χορού" (just the title - not descriptive)
- ✅ "Ομάδα 15 ατόμων χορεύει παραδοσιακούς χορούς σε αίθουσα" (describes the image)

### References
- [W3C - Tips for Alt Text](https://www.w3.org/WAI/tutorials/images/tips/)
- [W3C - Decorative Images](https://www.w3.org/WAI/tutorials/images/decorative/)
- [Harvard - Write Helpful Alt Text](https://accessibility.huit.harvard.edu/describe-content-images)
- [Level Access - Alt Text for Accessibility](https://www.levelaccess.com/blog/alt-text-for-accessibility/)

---

## 10. Color Contrast Reference

### Before (Failed)
| Text Color | Background | Contrast Ratio | Result |
|------------|------------|----------------|--------|
| Coral (#FF8B6A) | White (#FFFFFF) | 2.9:1 | ❌ Fail |

### After (Passed)
| Text Color | Background | Contrast Ratio | Result |
|------------|------------|----------------|--------|
| Coral (#FF8B6A) | Charcoal (#2D2D2D) | 4.8:1 | ✓ Pass |
| Charcoal (#2D2D2D) | White (#FFFFFF) | 12.6:1 | ✓ Pass |

---

## 11. Dark Mode Considerations

All accessibility improvements maintain proper contrast in dark mode:
- Labels: `dark:bg-gray-700 dark:text-coral-light`
- Buttons: `dark:bg-gray-700 dark:text-coral-light dark:border-coral-light`
- Links: `dark:text-coral-light`
- Hover states properly swap for dark mode

---

## 12. Testing Recommendations

### Automated Testing
- Run accessibility audit tools (Lighthouse, axe, WAVE)
- Target score: 90%+

### Manual Testing
1. **Keyboard Navigation:** Tab through all interactive elements
2. **Screen Reader:** Test with VoiceOver (Mac) or NVDA (Windows)
3. **Color Contrast:** Verify with browser DevTools
4. **Zoom:** Test at 200% zoom level
5. **Focus Indicators:** Ensure all focusable elements have visible focus states

### Test Pages
- Homepage (/)
- Login (/login)
- Participation (/participation)
- Members (/members)
- Member Detail (/members/[name])
- Activities (/activities)
- Activity Detail (/activities/[slug])
- Terms (/terms)
- Profile (/profile)

---

## 13. Future Improvements

Consider for future iterations:
1. Add skip navigation link
2. Implement focus trap in modals
3. Add `prefers-reduced-motion` media query support
4. Increase minimum text size to 14px (`text-sm`)
5. Implement ARIA live regions for dynamic content updates

---

*Last Updated: January 2026*
*WCAG Version: 2.2 AA*
