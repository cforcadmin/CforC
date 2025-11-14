# 🌐 Custom Domain Setup: cultureforchange.gr

## Complete guide to connect your GoDaddy domain to Vercel

---

## Part 1: Add Domain in Vercel (Do This First!)

### Step 1: Go to Your Vercel Project
1. Log in to [vercel.com](https://vercel.com)
2. Select your **CforC** project
3. Click **Settings** → **Domains**

### Step 2: Add Your Domain
1. In the domain input field, enter: `cultureforchange.gr`
2. Click **Add**
3. Vercel will also ask if you want to add `www.cultureforchange.gr` - **Add it too!**

### Step 3: Note the DNS Records
After adding the domain, Vercel will show you the DNS records you need. They will look like:

**For the root domain (cultureforchange.gr):**
```
Type: A
Name: @
Value: 76.76.21.21
```

**For www subdomain (www.cultureforchange.gr):**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

⚠️ **Important:** Keep this Vercel page open! You'll need these values for GoDaddy.

---

## Part 2: Configure DNS in GoDaddy

### Step 1: Log into GoDaddy
1. Go to [godaddy.com](https://godaddy.com)
2. Sign in to your account
3. Go to **My Products**
4. Find **cultureforchange.gr** and click **DNS** or **Manage DNS**

### Step 2: Add/Update A Record (Root Domain)

1. Look for existing **A Records** with name **@**
2. **Delete or update** any existing A records for @ (root)
3. Click **Add** or **Add Record**
4. Configure:
   - **Type:** A
   - **Name:** @ (this represents the root domain)
   - **Value/Points to:** `76.76.21.21` (from Vercel)
   - **TTL:** 600 seconds (or default)
5. Click **Save**

### Step 3: Add CNAME Record (www Subdomain)

1. Look for existing **CNAME Records** with name **www**
2. **Delete** any existing www CNAME records
3. Click **Add** or **Add Record**
4. Configure:
   - **Type:** CNAME
   - **Name:** www
   - **Value/Points to:** `cname.vercel-dns.com` (from Vercel)
   - **TTL:** 1 hour (or default)
5. Click **Save**

### Step 4: Remove Conflicting Records (Important!)

Check if you have any of these and **delete them**:
- Old A records pointing to different IPs
- Old CNAME for @ (root)
- Parking page records
- Forwarding records

These will conflict with Vercel!

---

## Part 3: Verify and Wait

### In Vercel:
1. Go back to your Vercel dashboard → Settings → Domains
2. You should see your domains with status "Pending" or "Configuring"
3. Wait 5-10 minutes for DNS propagation

### Check Status:
After 10-15 minutes:
- Visit: `https://cultureforchange.gr`
- Visit: `https://www.cultureforchange.gr`
- Both should show your website!

⚠️ **DNS propagation can take up to 48 hours** (usually much faster, typically 15-60 minutes)

---

## Part 4: SSL Certificate (Automatic!)

Vercel automatically provisions SSL certificates:
- ✅ Free SSL certificate
- ✅ Auto-renewal
- ✅ HTTPS enforced
- ✅ Both cultureforchange.gr and www.cultureforchange.gr secured

No action needed - it just works!

---

## Summary of DNS Records in GoDaddy

Your final DNS configuration should look like this:

| Type  | Name | Value/Target           | TTL    |
|-------|------|------------------------|--------|
| A     | @    | 76.76.21.21           | 600    |
| CNAME | www  | cname.vercel-dns.com  | 3600   |

---

## Troubleshooting

### Domain shows "Invalid Configuration"
**Solution:** Wait 10-15 minutes. DNS changes take time to propagate.

### "This domain is not registered with Vercel"
**Solution:** Make sure you added the domain in Vercel first (Part 1).

### Shows GoDaddy parking page
**Solution:**
1. Remove all parking page redirects in GoDaddy
2. Remove any URL forwarding
3. Clear your browser cache
4. Wait for DNS propagation

### www works but root domain doesn't (or vice versa)
**Solution:**
1. Verify both A record AND CNAME record are correct
2. Make sure both domains are added in Vercel
3. Check for conflicting DNS records in GoDaddy

### SSL Certificate not working
**Solution:**
1. Wait 10-30 minutes after DNS is configured
2. Vercel auto-provisions SSL - no action needed
3. Check Vercel dashboard for SSL status

### Still showing old Vercel URL
**Solution:**
1. Clear browser cache
2. Try incognito/private browsing
3. Wait for DNS propagation (up to 48 hours max)

---

## Verification Checklist

- [ ] Domain added in Vercel (cultureforchange.gr)
- [ ] www subdomain added in Vercel (www.cultureforchange.gr)
- [ ] A record configured in GoDaddy (@ → 76.76.21.21)
- [ ] CNAME record configured in GoDaddy (www → cname.vercel-dns.com)
- [ ] Removed conflicting DNS records
- [ ] Waited 15-30 minutes for propagation
- [ ] Tested https://cultureforchange.gr (works!)
- [ ] Tested https://www.cultureforchange.gr (works!)
- [ ] SSL certificate active (padlock in browser)

---

## Expected Timeline

| Time          | What Happens                                    |
|---------------|-------------------------------------------------|
| 0 min         | Add domain in Vercel                           |
| 2 min         | Configure DNS records in GoDaddy               |
| 10-30 min     | DNS propagates, domain starts working          |
| 30-60 min     | SSL certificate issued and active              |
| 48 hours max  | Full global DNS propagation complete           |

---

## Additional Options

### Redirect www to root (or vice versa)
Vercel automatically handles this! Just add both domains and Vercel will:
- Redirect www → non-www (or your preferred version)
- Configure this in Vercel Settings → Domains → Click on domain → Set as primary

### Add Subdomains Later
Example: `blog.cultureforchange.gr`
1. Add in Vercel: Settings → Domains → Add `blog.cultureforchange.gr`
2. Add CNAME in GoDaddy:
   - Type: CNAME
   - Name: blog
   - Value: cname.vercel-dns.com

---

## Need Help?

- **Vercel Support:** [vercel.com/support](https://vercel.com/support)
- **GoDaddy DNS Help:** [godaddy.com/help](https://godaddy.com/help)
- **Check DNS propagation:** [dnschecker.org](https://dnschecker.org)

---

## 🎉 Success!

Once complete, your website will be accessible at:
- ✅ `https://cultureforchange.gr`
- ✅ `https://www.cultureforchange.gr`
- ✅ Secured with SSL
- ✅ Global CDN delivery
- ✅ Professional custom domain!

**No more `.vercel.app` - you have your own domain!**
