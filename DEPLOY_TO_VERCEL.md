# 🚀 Deploy to Vercel in 3 Minutes

## Quick Start - Web Interface (Easiest!)

### Step 1: Visit Vercel
Go to: **https://vercel.com/new**

### Step 2: Sign In
- Click "Sign Up" or "Continue with GitHub"
- Authorize Vercel to access your GitHub account

### Step 3: Import Repository
1. You'll see "Import Git Repository"
2. Find and select: **yoryosstyl/CforC**
3. Click "Import"

### Step 4: Configure
**IMPORTANT:** Set these settings:

| Setting | Value |
|---------|-------|
| Framework Preset | Next.js |
| Root Directory | `website` ⚠️ **MUST SET THIS** |
| Build Command | `npm run build` (auto) |
| Output Directory | `.next` (auto) |
| Install Command | `npm install` (auto) |

### Step 5: Deploy
1. Click the big blue "Deploy" button
2. Wait 2-3 minutes ⏱️
3. Done! 🎉

Your site will be live at:
```
https://cforc-[random].vercel.app
```

---

## What You Get (FREE):

✅ Live website with HTTPS
✅ Global CDN (fast worldwide)
✅ Automatic deployments on git push
✅ Custom domain support
✅ SSL certificate (free)
✅ 100GB bandwidth/month
✅ Analytics

**Cost: $0/month**

---

## After First Deployment:

### Add Custom Domain (Optional):
1. Go to your project in Vercel dashboard
2. Click "Settings" → "Domains"
3. Add your domain (e.g., `cultureforchange.org`)
4. Update your DNS as instructed
5. SSL automatically configured!

### Enable Auto-Deploy:
Already enabled! Every time you push to the main branch, Vercel will:
1. Detect the change
2. Build the site
3. Deploy automatically
4. Send you a notification

---

## Troubleshooting:

### ❌ Build Failed?
**Solution:** Make sure you set **Root Directory** to `website`

### ❌ 404 Error?
**Solution:**
1. Check that root directory is `website` not empty
2. Redeploy after fixing settings

### ❌ Environment Variables?
If you add a CMS later:
1. Settings → Environment Variables
2. Add your API keys
3. Redeploy

---

## That's It!

Your website is now:
- ✅ Live on the internet
- ✅ Secured with HTTPS
- ✅ Cached globally for speed
- ✅ Automatically deploying on updates

**Next:** Share your link and celebrate! 🎊

---

## Need Help?

- Full deployment guide: See `DEPLOYMENT.md`
- Vercel docs: https://vercel.com/docs
- Support: https://vercel.com/help
