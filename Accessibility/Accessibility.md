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

## 6. Semantic HTML Improvements

### Clickable Divs → Buttons
Changed non-semantic clickable `<div>` elements to proper `<button>` elements:
- `components/HeroSection.tsx` - Video play overlay
- `components/AboutVideoSection.tsx` - Video play overlay

This ensures:
- Proper keyboard focus
- Screen reader announcement as interactive element
- Native button behaviors (Enter/Space activation)

---

## 7. Color Contrast Reference

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

## 8. Dark Mode Considerations

All accessibility improvements maintain proper contrast in dark mode:
- Labels: `dark:bg-gray-700 dark:text-coral-light`
- Buttons: `dark:bg-gray-700 dark:text-coral-light dark:border-coral-light`
- Links: `dark:text-coral-light`
- Hover states properly swap for dark mode

---

## 9. Testing Recommendations

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

## 10. Image Alt Text System

### Overview
Implemented a comprehensive alt text system for member profile images and project images to support screen readers and improve accessibility for visually impaired users.

### Strapi Schema Changes

Added three new fields to the Member content type (`StrapiDBforCforC/src/api/member/content-types/member/schema.json`):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `ProfileImageAltText` | string | Yes | Alt text for profile image |
| `Project1PicturesAltText` | string | Conditional | Alt text for Project 1 images (required when images exist) |
| `Project2PicturesAltText` | string | Conditional | Alt text for Project 2 images (required when images exist) |

### Frontend Implementation

#### Profile Editing Page (`app/profile/page.tsx`)

Added editable alt text fields with Greek labels:

```jsx
<EditableField
  label="Εναλλακτικό κείμενο φωτογραφίας"
  value={formData.ProfileImageAltText}
  placeholder="π.χ. Γυναίκα με καστανά μαλλιά χαμογελάει"
  helperText="Περιγραφή για άτομα με προβλήματα όρασης (μέγιστο 125 χαρακτήρες)"
  maxCharacters={125}
  required
/>
```

**Field Locations:**
- **Profile Image Alt Text:** Below profile image section
- **Project 1 Alt Text:** Below Project 1 images
- **Project 2 Alt Text:** Below Project 2 images

#### Member Display Pages

Updated all member pages to use the new alt text fields:

| File | Change |
|------|--------|
| `app/members/page.tsx` | `alt={member.ProfileImageAltText \|\| member.Name}` |
| `app/members/[name]/page.tsx` | Profile + Project images use respective alt text fields |
| `app/members/[name]/[project]/page.tsx` | Project detail images use `picturesAltText` from state |

#### Type Definitions

Updated `Member` interface in `components/AuthProvider.tsx`:
```typescript
interface Member {
  // ... existing fields
  ProfileImageAltText?: string
  Project1PicturesAltText?: string
  Project2PicturesAltText?: string
}
```

### User Guidelines (ProfileGuidelinesModal)

Added dedicated accessibility section to the profile guidelines modal with:

**Good Examples:**
- "Γυναίκα με καστανά μαλλιά χαμογελάει σε καλλιτεχνικό εργαστήρι"
- "Άνδρας παίζει βιολί σε υπαίθρια εκδήλωση"
- "Παιδιά ζωγραφίζουν τοιχογραφία σε δημόσιο χώρο"

**Bad Examples (what to avoid):**
- "Γιάννης Παπαδόπουλος" (name is already displayed)
- "Φωτογραφία προφίλ" (doesn't describe content)
- "Έργο 1" (too generic)

### Alt Text Requirements

| Requirement | Value |
|-------------|-------|
| Maximum length | 125 characters |
| Profile image alt | Always required |
| Project alt text | Required when project has images |
| Content | Describe what the image shows, not just the name/title |

---

## 11. Mandatory Field Validation

### Overview
Implemented comprehensive validation for all required profile fields to ensure complete member profiles.

### Required Fields

| Field | Validation Rules |
|-------|-----------------|
| Name | Required, cannot be "Νέο Μέλος", cannot be ALL CAPS |
| Email | Required, valid email format, not editable |
| Bio | Required, max 160 words / 1200 characters |
| FieldsOfWork | Required, cannot be "Προς Συμπλήρωση", max 5 items |
| City | Required, cannot be "-" |
| Province | Required, cannot be "-" |
| Image | Required (at least one profile image) |
| ProfileImageAltText | Required |
| Project1PicturesAltText | Required when Project 1 has images |
| Project2PicturesAltText | Required when Project 2 has images |

### Visual Indicators

**Required Field Asterisk:**
```jsx
<label className="block text-sm font-medium text-charcoal dark:text-gray-200">
  {label}
  {required && <span className="text-red-500 ml-1">*</span>}
</label>
```

**Dynamic Required State (Project Alt Texts):**
```jsx
required={(project1KeptImageIds.length > 0) || (project1Images.length > 0)}
```

### Validation Error Display

Errors appear at the top of the profile page in a red alert box:
- Lists all validation errors with bullet points
- Auto-scrolls to top when errors occur
- Dismissible by user

### Error Messages (Greek)

| Field | Error Message |
|-------|--------------|
| Name empty | "Το όνομα είναι υποχρεωτικό" |
| Name ALL CAPS | "Το όνομα δεν πρέπει να είναι σε κεφαλαία (ALL CAPS)" |
| Email empty | "Το email είναι υποχρεωτικό" |
| Bio empty | "Το βιογραφικό είναι υποχρεωτικό" |
| FieldsOfWork empty | "Οι τομείς εργασίας είναι υποχρεωτικοί" |
| City empty | "Η πόλη είναι υποχρεωτική" |
| Province empty | "Η περιφέρεια είναι υποχρεωτική" |
| Image missing | "Η φωτογραφία προφίλ είναι υποχρεωτική" |
| ProfileImageAltText empty | "Το εναλλακτικό κείμενο φωτογραφίας είναι υποχρεωτικό" |
| Project1 alt empty (with images) | "Το εναλλακτικό κείμενο φωτο έργου 1 είναι υποχρεωτικό όταν υπάρχουν εικόνες" |
| Project2 alt empty (with images) | "Το εναλλακτικό κείμενο φωτο έργου 2 είναι υποχρεωτικό όταν υπάρχουν εικόνες" |

---

## 12. Bulk Update Scripts

### Image Alt Text Update Script

**File:** `scripts/update-image-alt-text.js`

Updates `ImageAltText` field for existing Activities and Open Calls that don't have alt text set.

**Usage:**
```bash
# Dry run (preview changes without applying)
node scripts/update-image-alt-text.js --dry-run

# Update only Activities
node scripts/update-image-alt-text.js --activities

# Update only Open Calls
node scripts/update-image-alt-text.js --open-calls

# Update both (default)
node scripts/update-image-alt-text.js
```

**Auto-generated Alt Text Format:**
- Activities: "Εικόνα για: [Activity Title]"
- Open Calls: "Εικόνα για: [Open Call Title]"

**Note:** This generates placeholder alt text. Ideally, each entry should have custom-written descriptive alt text.

---

## 13. Files Modified Summary

### Accessibility Alt Text Implementation

| File | Changes |
|------|---------|
| `StrapiDBforCforC/src/api/member/content-types/member/schema.json` | Added ProfileImageAltText, Project1PicturesAltText, Project2PicturesAltText fields |
| `components/AuthProvider.tsx` | Added alt text fields to Member interface |
| `app/profile/page.tsx` | Added alt text input fields, mandatory validation for all required fields |
| `components/profile/ProfileGuidelinesModal.tsx` | Added accessibility section with alt text guidelines |
| `app/members/page.tsx` | Updated Member interface, use ProfileImageAltText |
| `app/members/[name]/page.tsx` | Updated Member interface, use all alt text fields |
| `app/members/[name]/[project]/page.tsx` | Updated to use picturesAltText from project data |
| `scripts/update-image-alt-text.js` | New script for bulk alt text updates |

---

## 14. Git Commits

### Accessibility Implementation Commits

| Commit | Description |
|--------|-------------|
| `ceba722` | Add WCAG 2.2 AA accessibility improvements (color contrast, ARIA, keyboard nav) |
| `8080ad1` | Add member alt text fields for accessibility |
| `4e5ec71` | Add mandatory field validation for profile saving |
| `5b546d4` | Add text size accessibility toggle with 3 levels |
| `45fb7f7` | Add bell-shake hover animation to inactive text size buttons |

### Branches

- **Main:** `main` - Production branch with all changes
- **Backup:** `Stable-backup-official_Accessibility2_V6_22-1-26` - Backup with accessibility features

---

## 15. Text Size Accessibility Toggle (January 22, 2026)

### Overview

Implemented a user-controlled text size toggle allowing visitors to increase the base font size across all pages. This feature helps users with visual impairments read content more comfortably.

### WCAG Reference
- **WCAG 1.4.4** - Resize Text (Level AA): Text can be resized without assistive technology up to 200% without loss of content or functionality

### Implementation

#### New Components

**TextSizeProvider (`components/TextSizeProvider.tsx`)**

A React context provider that manages text size state across the application.

```typescript
type TextSize = 'small' | 'medium' | 'large'

const TEXT_SCALES = {
  small: 1,      // 100% (default)
  medium: 1.125, // 112.5%
  large: 1.25,   // 125%
}
```

Features:
- Manages text size state globally
- Persists user preference in `localStorage` (key: `textSize`)
- Applies CSS custom property `--text-scale` to `<html>` element

**TextSizeToggle (`components/TextSizeToggle.tsx`)**

A visual toggle component with three "A" letters of different sizes.

| Size | Font Size | Scale |
|------|-----------|-------|
| Large | 18px | 125% |
| Medium | 16px | 112.5% |
| Small (default) | 14px | 100% |

Visual Features:
- **Active state:** White circle behind the A (black letter)
- **Inactive state:** Just the letter (black in light mode, white in dark mode)
- **Members page variant:** Orange/coral outline on the active circle
- **Hover animation:** Bell-shake effect on inactive A's (1 second duration)

### Animation Details

| Animation | Duration | Description |
|-----------|----------|-------------|
| Circle fade | 300ms | Opacity transition between active states |
| Text scaling | 300ms | Font size change across all elements |
| Bell-shake hover | 1000ms | Rotation from ±8° to ±1° |

### Location in UI

- **Desktop:** Left of the dark/light mode toggle in navbar
- **Mobile:** Top of mobile menu with label "ΜΕΓΕΘΟΣ ΚΕΙΜΕΝΟΥ"

### Files Modified

| File | Changes |
|------|---------|
| `components/TextSizeProvider.tsx` | New - Context provider |
| `components/TextSizeToggle.tsx` | New - Visual toggle component |
| `app/globals.css` | Added `--text-scale` CSS variable |
| `app/layout.tsx` | Added TextSizeProvider wrapper |
| `components/Navigation.tsx` | Added TextSizeToggle to nav |

---

## 16. Future Improvements

Consider for future iterations:

1. **Automated accessibility testing** - Add accessibility testing to CI/CD pipeline (axe-core, pa11y)
2. **Language-specific screen reader testing** - Test Greek content with VoiceOver and NVDA
3. **High contrast mode toggle** - Add user-controlled high contrast theme option
4. **Expand alt text guidelines** - Create detailed guide for content editors in Strapi CMS
5. **Increase minimum text to 14px** - Consider upgrading base text from 12px to 14px (`text-sm`)
6. **Touch target size audit** - Ensure all interactive elements meet 44x44px minimum on mobile
7. **Form error association** - Link error messages to inputs with `aria-describedby`
8. **Keyboard shortcut documentation** - Add help dialog showing available keyboard shortcuts
9. **Reading level analysis** - Audit content for readability (target: Grade 8 level or below)
10. **Color blindness testing** - Test all color combinations with color blindness simulators

---

*Last Updated: January 22, 2026*
*WCAG Version: 2.2 AA*
*Text Size Toggle: Section 15*
