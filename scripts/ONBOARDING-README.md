# Beta Tester Onboarding System

Automated system for onboarding beta testers to the Culture for Change website.

## What It Does

1. **Creates member entries** in Strapi with placeholder data
2. **Generates magic link tokens** for password setup
3. **Sends personalized onboarding emails** explaining the beta test
4. **Tracks success/failure** for each member

## Usage

### Option 1: Using a CSV File

1. Create a CSV file with member emails and optional names:

```csv
email,name
user1@example.com,Γιάννης Παπαδόπουλος
user2@example.com,Μαρία Γεωργίου
user3@example.com
```

2. Run the script:

```bash
node scripts/onboard-beta-testers.js path/to/members.csv
```

### Option 2: Direct Email Arguments

```bash
node scripts/onboard-beta-testers.js email1@example.com email2@example.com email3@example.com
```

## Email Template

The onboarding email includes:

- 🎉 Welcome message explaining beta testing
- 🔑 Magic link for password setup (6-hour expiration)
- 📝 Instructions on what they can do
- 🎯 Explanation of why profile is empty (placeholder data)
- ⚠️ Reminder to check SPAM folder
- 🚀 Beta testing period dates (10/12 - 6/1)

## What Members See

### 1. Email with Magic Link
Personalized email explaining:
- They're invited to beta test
- How to set their password
- That profile starts empty (for privacy/security)
- What features to test

### 2. Profile Warning Banner
When they log in with placeholder data, they see:
- Amber warning banner
- Clear list of fields to complete
- Explanation that data is placeholder

## Placeholder Values Used

- **Name**: `Νέο Μέλος`
- **FieldsOfWork**: `Προς Συμπλήρωση`
- **City**: `-`
- **Province**: `-`
- **Phone**: `-`
- **Websites**: `-`
- **Bio**: Empty array `[]`
- **Projects**: Empty

## Requirements

- Strapi API token with permissions for:
  - `members`: create
  - `auth-tokens`: create
- Resend API key for sending emails
- Environment variables in `.env.local`:
  - `STRAPI_URL`
  - `STRAPI_API_TOKEN`
  - `RESEND_API_KEY`

## Example Run

```bash
$ node scripts/onboard-beta-testers.js beta-testers.csv

🚀 Starting beta tester onboarding...
📊 Total members to onboard: 3

📧 Processing: user1@example.com (John Doe)
   Creating member in Strapi...
   ✅ Member created (ID: 123)
   Generating magic link token...
   ✅ Magic link generated
   Sending onboarding email...
   ✅ Email sent successfully!

📧 Processing: user2@example.com
   Creating member in Strapi...
   ✅ Member created (ID: 124)
   Generating magic link token...
   ✅ Magic link generated
   Sending onboarding email...
   ✅ Email sent successfully!

============================================================
📊 ONBOARDING SUMMARY
============================================================
✅ Successfully onboarded: 3
❌ Failed: 0

✨ Onboarding process complete!
```

## Troubleshooting

### "Missing required environment variables"
Make sure `.env.local` has all three required variables.

### "Strapi error: Forbidden"
API token needs create permissions for `members` and `auth-tokens` collections.

### "Resend error: Invalid API key"
Check that `RESEND_API_KEY` is correct in `.env.local`.

### Emails going to SPAM
This is expected for the first few sends. The onboarding email includes a reminder to check SPAM.

## Notes

- Script includes 1-second delay between members to avoid rate limiting
- Magic links expire after 6 hours
- Members can request a new magic link if theirs expires
- All placeholder data can be edited by members after login
