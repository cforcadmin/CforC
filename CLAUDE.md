# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git Push Rules

- **IMPORTANT: Always ask user for confirmation before pushing to GitHub** - Never push automatically
- **Default**: Push only to `main` branch
- **Backup branch**: `Stable-bakcup-official_V1_13-01026` - Only push when user explicitly confirms
- Never push to backup branch automatically

## Development Commands

```bash
# Install dependencies
npm install

# Development server (http://localhost:3000)
npm run dev

# Production build
npm run build
npm start

# Linting
npm run lint
```

## Environment Configuration

Required `.env.local` variables:
- `NEXT_PUBLIC_STRAPI_URL` - Strapi API endpoint (production or localhost:1337)
- `NEXT_PUBLIC_STRAPI_API_TOKEN` - Strapi API token for authenticated requests
- `JWT_SECRET` - Secret for JWT token generation/verification
- `RESEND_API_KEY` - For sending magic link emails

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 15 (App Router) with TypeScript
- **Styling**: Tailwind CSS with custom coral/charcoal theme
- **CMS**: Strapi v5 Cloud (headless CMS)
- **Auth**: Custom JWT-based auth with magic links and password login
- **Email**: Resend for transactional emails
- **Translation**: Google Translate widget integration (primary language: Greek)

### Project Structure

```
app/
├── api/                 # API routes
│   ├── auth/           # Authentication endpoints (login, magic-link, session, logout)
│   ├── subscribe/      # Newsletter subscription
│   └── members/update/ # Member profile updates
├── activities/         # Activities listing and detail pages ([slug])
├── members/            # Member profiles ([name]) and projects ([name]/[project])
├── open-calls/         # Open calls listing
├── profile/            # Authenticated member profile editing
└── [various pages]     # Static pages (about, privacy, terms, transparency, etc.)

components/
├── Navigation.tsx         # Main nav with mobile menu, language switcher, theme toggle, auth state
├── Footer.tsx            # Site footer
├── LoadingIndicator.tsx  # Loading state with animated progress bar
├── AuthProvider.tsx      # Auth context (session, login, logout)
├── ThemeProvider.tsx     # Dark mode context
└── profile/              # Editable profile components (EditableField, EditableImage, etc.)

lib/
├── strapi.ts           # Centralized Strapi API functions
├── auth.ts             # JWT, bcrypt, password validation, magic link tokens
├── types.ts            # TypeScript types for Strapi responses
└── rateLimiter.ts      # Rate limiting for auth endpoints

scripts/
└── [various .js files] # Node scripts for Strapi data management (see below)
```

### Key Architectural Patterns

**Strapi v5 Data Structure**
- Strapi v5 removed the `attributes` wrapper - data is now directly on the object
- Media fields require explicit population: `?populate=Visuals` or `?populate=*`
- Pagination defaults to 25 items - use `pagination[limit]=1000` for full datasets
- All Strapi API calls are centralized in `lib/strapi.ts`

**Authentication Flow**
- Two auth methods: password login and magic link (passwordless)
- JWT tokens stored in httpOnly cookies via API routes
- Session tokens valid for 30 days, magic link tokens for 6 hours
- Magic link tokens hashed with SHA256 before storage in Strapi
- Auth state managed via `AuthProvider` context
- Password requirements: 8+ chars, uppercase, lowercase, number

**Data Fetching**
- Pages use server components for initial data fetch from Strapi
- `lib/strapi.ts` provides typed functions: `getActivities()`, `getOpenCalls()`, etc.
- Loading states use custom `LoadingIndicator` component with progress bar

**Styling Conventions**
- Primary colors: `coral` (#FF8B6A), `charcoal` (#2D2D2D)
- Dark mode via `class` strategy with ThemeProvider context
- Responsive design: mobile-first with Tailwind breakpoints
- Custom animations: `flyIn`/`flyOut` for modals (defined in tailwind.config.js)

**Internationalization**
- Default language: Greek (el)
- Google Translate widget auto-translates to 20+ languages
- Priority languages shown first: English, German, Spanish, Portuguese
- Use `notranslate` class to prevent translation of specific elements

**Member Detail Pages**
- Hero displays member name in Greek ALL CAPS (locale-aware uppercasing)
- Below hero shows name as stored in Strapi (title case with punctuation)
- Helper function: `getHeroName()` in member detail pages

## Node Scripts for Strapi Management

All scripts in `scripts/` require `.env.local` with `STRAPI_URL` and `STRAPI_API_TOKEN`.

Run from project root: `node scripts/<script-name>.js`

**Member Data Management:**
- `fix-member-images.js` - Download external image URLs and upload to Strapi
- `fix-member-images-from-csv.js` - Set member images from CSV file
- `fix-member-names-case.js` - Convert Greek names from ALL CAPS to title case
- `populate-member-slugs.js` - Generate URL slugs for members
- `export-members.js` - Export member data to CSV

**Email & Onboarding:**
- `onboard-beta-testers.js` - Send magic link emails to beta testers from CSV
- `resend-magic-link.js` - Resend magic link to specific member
- `send-email-to-db-members.js` - Bulk email to members in database

**Content Import:**
- `import-activities-from-old-site.js` - Scrape and import activities from old site
- `import-open-calls-from-old-site.js` - Scrape and import open calls from old site
- `import-activities-test.js` / `import-open-calls-test.js` - Test imports without writing to DB

## Image Handling

Images served from Strapi Cloud CDN:
- Domain: `faithful-crystal-a2269c9fd9.media.strapiapp.com`
- Next.js Image component configured for Strapi domains in `next.config.js`
- Multiple formats available: thumbnail, small, medium, large (check `formats` object)

## Strapi Cloud Cold Starts

Strapi Cloud free tier sleeps after 10-15 minutes of inactivity.

**Solution**: Use UptimeRobot (free) to ping API every 5 minutes:
- Monitor URL: `https://faithful-crystal-a2269c9fd9.strapiapp.com/api/activities`
- Interval: 5 minutes
- Prevents 10-30 second cold start delays

## Code Style & Development Preferences

### Async Patterns
- Use direct `await` in Server Components (App Router default)
- Use `async/await` in Client Components and API routes
- Avoid `.then()` chains - prefer async/await for readability
- Handle errors with try/catch blocks in API routes

### Naming Conventions
- Components: PascalCase (`MemberProfile.tsx`)
- Utilities: camelCase (`getHeroName()`)
- Constants: UPPER_SNAKE_CASE (`JWT_SECRET`)
- CSS classes: kebab-case for custom classes, Tailwind utilities as-is
- API routes: kebab-case folders (`/api/auth/verify-magic-link`)

### TypeScript Standards
- Always define types for Strapi responses (see `lib/types.ts`)
- Prefer interfaces over types for object shapes
- Use `?` for optional props, avoid `| undefined` unless necessary
- Export types that are shared across files

### Testing
- **Ask before writing tests** - not all features need tests immediately
- When tests are needed, focus on:
  - Authentication flows
  - Data mutations (profile updates, subscriptions)
  - Strapi API integration functions
- Use existing patterns from test files if present

### Git Workflow
- **Commit frequently** with descriptive messages
- Commit message format: Imperative mood ("Add feature" not "Added feature")
- Include context in commits (e.g., "Fix dark mode backgrounds for activity detail page")
- Use voice announcement after each task completion: `say -v "Samantha" "[completion message]"`
- Always ask before pushing to remote

### Project-Specific Rules

**Security:**
- Never expose JWT_SECRET or STRAPI_API_TOKEN in client-side code
- Always use httpOnly cookies for auth tokens
- Validate and sanitize user input in API routes
- Rate limit authentication endpoints (already implemented in `lib/rateLimiter.ts`)

**Performance:**
- Use Next.js Image component for all images
- Lazy load components below the fold when practical
- Set Strapi pagination limits appropriately (`pagination[limit]=1000` for full datasets)
- Minimize client-side JavaScript by preferring Server Components

**Internationalization:**
- All user-facing text should be translatable (avoid `notranslate` unless necessary)
- Greek text operations must use `'el'` locale (`.toLocaleUpperCase('el')`)
- Test features with Google Translate active to ensure layout doesn't break

**Component Patterns:**
- Keep Server Components as default (App Router best practice)
- Only use `'use client'` when needed (useState, useEffect, event handlers, context)
- Extract reusable logic to `lib/` utilities
- Context providers go in `components/` (AuthProvider, ThemeProvider)

## Common Gotchas

1. **Strapi v5 Breaking Changes**: No `attributes` wrapper, explicit media population required
2. **Greek Text Handling**: Use Greek locale for uppercasing/lowercasing (`toLocaleUpperCase('el')`)
3. **Auth Cookie Domain**: Cookies must match deployment domain (localhost vs production)
4. **Google Translate**: Don't wrap entire page in `notranslate` - be selective
5. **Dark Mode**: Use `dark:` prefix for all color utilities, backgrounds, and borders
6. **Rate Limiting**: Auth endpoints use in-memory rate limiter (resets on server restart)
