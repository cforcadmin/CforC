# Culture for Change Website

A modern, hybrid static website built with Next.js and Tailwind CSS, recreating the design and functionality of cultureforchange.net.

## Features

- ✅ Responsive navigation with mobile menu
- ✅ Hero section with large typography
- ✅ About section with statistics
- ✅ Interactive activities carousel
- ✅ Greece map with clickable regions
- ✅ Newsletter signup section
- ✅ Comprehensive footer
- ✅ Cookie consent popup
- ✅ Mobile-first responsive design
- ✅ Multi-language support via Google Translate (100+ languages)
- ✅ Custom loading indicators with animated progress
- ✅ Dynamic member profiles and activity pages
- ✅ CMS-ready structure (connected to Strapi Cloud)

## Tech Stack

- **Frontend Framework:** Next.js 15
- **Styling:** Tailwind CSS
- **Language:** TypeScript
- **Deployment:** Vercel (recommended) / Netlify / Cloudflare Pages

## Getting Started

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
website/
├── app/
│   ├── layout.tsx       # Root layout
│   ├── page.tsx         # Homepage
│   └── globals.css      # Global styles
├── components/
│   ├── Navigation.tsx
│   ├── HeroSection.tsx
│   ├── AboutSection.tsx
│   ├── ActivitiesSection.tsx
│   ├── MapSection.tsx
│   ├── NewsletterSection.tsx
│   ├── Footer.tsx
│   └── CookieConsent.tsx
└── public/              # Static assets
```

## Connecting to a CMS

This project is designed to easily connect to a headless CMS. To integrate:

### Option 1: Strapi (Recommended)

1. Install Strapi locally or use Strapi Cloud
2. Create content types matching the sections
3. Install `@strapi/sdk-js` or fetch directly
4. Replace static content with API calls

### Option 2: Contentful

1. Create a Contentful space
2. Install `contentful` package
3. Create content models
4. Use `getStaticProps` to fetch content

### Option 3: Sanity

1. Create a Sanity project
2. Install `@sanity/client`
3. Define schemas
4. Query content in components

## Keeping Strapi Cloud Awake with UptimeRobot

**Why is this needed?**

Strapi Cloud's free tier automatically goes to sleep after 10-15 minutes of inactivity to save resources. When a user visits the website after the Strapi server has been inactive, the first request can take 10-30 seconds as the server "wakes up" (cold start). This creates a poor user experience.

**Solution: UptimeRobot**

[UptimeRobot](https://uptimerobot.com) is a free monitoring service that can ping your Strapi API every 5 minutes, preventing it from going to sleep.

### Setup Instructions

1. **Create a free UptimeRobot account**
   - Visit [https://uptimerobot.com](https://uptimerobot.com)
   - Sign up for a free account (no credit card required)

2. **Add a new monitor**
   - Click "Add New Monitor"
   - **Monitor Type:** HTTP(s)
   - **Friendly Name:** "Culture for Change - Strapi API"
   - **URL:** `https://your-strapi-instance.strapiapp.com/api/activities`
     - Replace with your actual Strapi Cloud URL
     - Use any valid API endpoint (e.g., `/api/activities`, `/api/members`)
   - **Monitoring Interval:** 5 minutes (recommended)
   - **Monitor Timeout:** 30 seconds

3. **Configure alerts (optional)**
   - Add your email to receive notifications if the server goes down
   - Enable "Alert When Down" for immediate notifications

4. **Verify it's working**
   - Wait 5-10 minutes
   - Check the UptimeRobot dashboard to see successful pings
   - Your website should now load much faster on first visit

### Important Notes

- **Free tier limits:** UptimeRobot's free plan allows up to 50 monitors with 5-minute intervals
- **API endpoint:** Use a lightweight endpoint to minimize resource usage
- **Don't use authentication:** Make sure the endpoint you monitor is publicly accessible (no Bearer token required)
- **Alternative:** If you upgrade to Strapi Cloud Pro ($99/month), the server doesn't sleep and this setup is unnecessary

### Current Configuration

- **Strapi Cloud URL:** Set in `.env.local` as `NEXT_PUBLIC_STRAPI_URL`
- **Monitored Endpoint:** `/api/activities`
- **Ping Interval:** Every 5 minutes
- **Expected Response Time:** < 2 seconds (when awake)

## Member Management Scripts

A set of Node scripts in the `scripts/` folder help manage member data in Strapi.

> All scripts expect a `.env.local` file with at least:
>
> - `STRAPI_URL`
> - `STRAPI_API_TOKEN`
>
> Run them from the project root with `node scripts/<script-name>.js`.

### Fix member images from existing external URLs

- File: `scripts/fix-member-images.js`
- Purpose: Finds members whose `Image` field points to an external URL (e.g. Webflow CDN), downloads those images, uploads them to Strapi (`/api/upload`), and updates the member to point to the uploaded media.
- Usage:
  ```bash
  node scripts/fix-member-images.js
  ```

### Set member images from CSV

- File: `scripts/fix-member-images-from-csv.js`
- Purpose: Reads `scripts/CforC_Members.csv`, matches rows by member name, downloads the `Profile Image` URL from the CSV, uploads to Strapi, and sets that file as the member’s profile image.
- Notes:
  - Auto-detects `;` vs `,` as CSV delimiter.
  - Expects a `Profile Image` column for the profile photo URL.
- Usage:
  ```bash
  node scripts/fix-member-images-from-csv.js
  ```

### Normalize member name casing (Greek)

- File: `scripts/fix-member-names-case.js`
- Purpose: Converts Greek member names stored in ALL CAPS (e.g. `ΓΙΩΡΓΟΣ ΣΤΥΛ`) into title case using Greek locale (e.g. `Γιώργος Στυλ`) and updates the `Name` field in Strapi.
- Usage:
  ```bash
  node scripts/fix-member-names-case.js
  ```

### Other utility scripts

Additional scripts exist in `scripts/` for slug population, image URL migration, testing and email sending. They follow the same pattern (Node script + `.env.local` Strapi config) and are intended for internal maintenance.

## Member Detail Page Hero

On individual member pages (`/members/[name]`):

- The hero line shows the member’s name in **Greek ALL CAPS**, with punctuation stripped, using Greek locale uppercasing.
- Directly below, the member’s name is shown **as stored in Strapi** (first-letter capital, with proper punctuation).

Implementation details are in `app/members/[name]/page.tsx` via the `getHeroName` helper.

## Deployment

### Deploy to Vercel (Recommended - FREE)

```bash
npm install -g vercel
vercel
```

Or connect your GitHub repo to Vercel for automatic deployments.

### Deploy to Netlify

```bash
npm install -g netlify-cli
netlify deploy --prod
```

## Multi-Language Support

The website uses Google Translate for automatic translation into 100+ languages.

### Features

- **Custom Language Switcher:** Globe icon dropdown in navigation
- **Priority Languages:** English, German, Spanish, Portuguese displayed first
- **Persistent Selection:** Language choice saved in browser cookies
- **Smart UI:** "Back to Greek" button always displays in English (not translated)
- **Free & Unlimited:** No translation limits or costs

### How It Works

1. Google Translate JavaScript widget is integrated in `app/layout.tsx`
2. Custom `LanguageSwitcher` component provides the UI
3. Original content is in Greek (default language)
4. Users select their preferred language from the dropdown
5. Google automatically translates all text except elements with `notranslate` class

### Customization

To modify the available languages, edit the `includedLanguages` parameter in `app/layout.tsx`:

```typescript
includedLanguages: 'en,de,es,pt,fr,it,ru,zh-CN,ja,ar,tr,nl,pl,sv,no,da,fi,cs,ro,hu,el'
```

To prevent specific elements from being translated, add the `notranslate` class:

```tsx
<span className="notranslate">Culture for Change</span>
```

## Loading Indicators

Custom loading indicators are displayed while fetching data from Strapi, providing visual feedback during cold starts.

### Features

- **Animated Logo:** Pulsing Culture for Change logo
- **Progress Bar:** Smooth gradient animation in brand colors (coral to orange)
- **Random Messages:** 16 inspirational/humorous messages rotate on each page load
- **Professional Design:** Consistent with website branding

### Messages Include

- Technical: "Almost ready... Polishing the details"
- Cultural: "Culture evolves, please wait..."
- Greek wisdom: "Καλά τὰ καλὰ, καὶ βραδέα" (Good things come slow)
- Humorous: "Loading... Teaching robots to dance"

### Implementation

The `LoadingIndicator` component is used in:
- Homepage sections (Activities, Open Calls)
- `/activities` page
- `/open-calls` page
- `/members` page

## Customization

### Colors

Edit `tailwind.config.js` to customize the color palette:

```js
colors: {
  coral: {
    DEFAULT: '#FF8B6A',
    light: '#FFB299',
    dark: '#FF6B47',
  },
}
```

### Content

Update content directly in component files or connect to a CMS for dynamic content management.

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers

## License

This project is created for demonstration purposes.

## Credits

Design inspired by cultureforchange.net
Built with Next.js and Tailwind CSS
