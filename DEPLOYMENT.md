# Deploying Culture for Change Website to Vercel

## 🚀 Quick Deployment Guide

This website is ready to deploy to Vercel for **FREE** hosting with automatic HTTPS, CDN, and CI/CD.

---

## Method 1: Deploy via Vercel Dashboard (Recommended - Easiest)

### Step 1: Create Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Click "Sign Up"
3. Sign up with your GitHub account (recommended)

### Step 2: Import Project
1. Click "Add New..." → "Project"
2. Click "Import Git Repository"
3. Select your repository: `yoryosstyl/CforC`
4. Click "Import"

### Step 3: Configure Project
Vercel will auto-detect Next.js. Configure as follows:

**Framework Preset:** Next.js
**Root Directory:** `website`
**Build Command:** `npm run build` (auto-detected)
**Output Directory:** `.next` (auto-detected)
**Install Command:** `npm install` (auto-detected)

### Step 4: Deploy
1. Click "Deploy"
2. Wait 1-2 minutes for the build
3. Your site will be live at: `https://your-project-name.vercel.app`

### Step 5: Custom Domain (Optional)
1. Go to Project Settings → Domains
2. Add your custom domain (e.g., `cultureforchange.org`)
3. Follow DNS configuration instructions
4. SSL certificate is automatic and free!

---

## Method 2: Deploy via Vercel CLI (For Developers)

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Login
```bash
vercel login
```

### Step 3: Deploy
```bash
cd /path/to/Cforc/website
vercel
```

Follow the prompts:
- Set up and deploy? **Y**
- Which scope? Select your account
- Link to existing project? **N**
- What's your project's name? **cforc-website**
- In which directory is your code located? **./** (current directory)

### Step 4: Deploy to Production
```bash
vercel --prod
```

---

## Method 3: GitHub Integration (Best for Continuous Deployment)

### Benefits:
- ✅ Every push to `main` automatically deploys
- ✅ Pull requests get preview deployments
- ✅ Rollback to any previous version instantly

### Setup:
1. Go to [vercel.com/new](https://vercel.com/new)
2. Connect your GitHub account
3. Select the `yoryosstyl/CforC` repository
4. Configure root directory as `website`
5. Click Deploy

### Auto-Deploy:
- Push to `main` → Automatic production deployment
- Create PR → Automatic preview deployment
- Merge PR → Automatic production update

---

## Configuration Details

### Environment Variables (if needed)
If you add a CMS or API later:

1. Go to Project Settings → Environment Variables
2. Add variables like:
   - `NEXT_PUBLIC_API_URL`
   - `STRAPI_API_TOKEN`
   - etc.

### Build Settings
The project is configured with:
- **Framework:** Next.js 15
- **Node Version:** 18.x or higher (auto-detected)
- **Package Manager:** npm
- **Output:** Static + Server (hybrid)

---

## After Deployment

### Your Live URLs:
1. **Production:** `https://your-project.vercel.app`
2. **Preview (PRs):** `https://your-project-git-branch.vercel.app`
3. **Custom Domain:** Configure in settings

### Performance:
- ✅ Global CDN (150+ locations)
- ✅ Automatic HTTPS/SSL
- ✅ Edge caching
- ✅ Automatic image optimization
- ✅ Analytics included

### Monitoring:
- View deployments: [vercel.com/dashboard](https://vercel.com/dashboard)
- Check analytics
- View build logs
- Monitor performance

---

## Pricing

### Free Tier Includes:
- ✅ Unlimited deployments
- ✅ Automatic HTTPS
- ✅ 100GB bandwidth/month
- ✅ 100 GB-hours compute/month
- ✅ 1000 deployments/month
- ✅ Analytics
- ✅ Custom domains

**Cost:** $0/month for most small-to-medium sites!

### Pro Tier ($20/month):
Only needed if you exceed free tier limits or need:
- Advanced analytics
- Password protection
- More team members

---

## Troubleshooting

### Build Fails?
1. Check build logs in Vercel dashboard
2. Ensure `website` is set as root directory
3. Verify all dependencies are in package.json

### 404 Error?
1. Ensure root directory is set to `website`
2. Check that build completed successfully

### Slow Loading?
1. Enable image optimization (automatic)
2. Check bundle size in build logs
3. Consider code splitting for large components

---

## Next Steps After Deployment

1. ✅ Test the live site thoroughly
2. ✅ Configure custom domain
3. ✅ Set up SSL (automatic with Vercel)
4. ✅ Connect to CMS (Strapi/Contentful) if needed
5. ✅ Add Google Analytics
6. ✅ Submit to search engines

---

## Support

- **Vercel Docs:** [vercel.com/docs](https://vercel.com/docs)
- **Next.js Docs:** [nextjs.org/docs](https://nextjs.org/docs)
- **Community:** [vercel.com/community](https://vercel.com/community)

---

## Summary

Your website is **production-ready** and optimized for Vercel deployment:
- ✅ Build tested and passing
- ✅ Configuration files in place
- ✅ Optimized for performance
- ✅ Mobile responsive
- ✅ SEO friendly

**Estimated deployment time:** 2-5 minutes
**Cost:** $0/month

Ready to go live! 🚀
