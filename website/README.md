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
- ✅ CMS-ready structure (easily connect to Strapi, Contentful, etc.)

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
