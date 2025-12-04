/**
 * Script to onboard beta testers to the new Culture for Change website
 *
 * This script:
 * 1. Creates member entries in Strapi with placeholder data
 * 2. Sends personalized onboarding emails with magic links
 * 3. Tracks which members were successfully onboarded
 *
 * Usage:
 * 1. Create a CSV file with columns: email,name (optional)
 * 2. Run: node scripts/onboard-beta-testers.js path/to/members.csv
 */

const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const STRAPI_URL = process.env.STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN
const RESEND_API_KEY = process.env.RESEND_API_KEY

if (!STRAPI_URL || !STRAPI_API_TOKEN || !RESEND_API_KEY) {
  console.error('❌ Error: Missing required environment variables')
  console.error('   Required: STRAPI_URL, STRAPI_API_TOKEN, RESEND_API_KEY')
  process.exit(1)
}

// Parse CSV content (simple parser for email,name format)
function parseCSV(content) {
  const lines = content.trim().split('\n')
  const members = []

  for (let i = 1; i < lines.length; i++) { // Skip header
    const line = lines[i].trim()
    if (!line) continue

    const [email, name] = line.split(',').map(s => s.trim())
    if (email) {
      members.push({ email, name: name || null })
    }
  }

  return members
}

// Create member in Strapi with placeholder data
async function createMemberInStrapi(email, name = null) {
  const memberData = {
    data: {
      Email: email,
      Name: name || 'Νέο Μέλος',
      FieldsOfWork: 'Προς Συμπλήρωση',
      City: '-',
      Province: '-',
      Phone: '-',
      Websites: '-',
      Bio: [],
      Project1Title: '',
      Project1Description: [],
      Project1Tags: '',
      Project2Title: '',
      Project2Description: [],
      Project2Tags: ''
    }
  }

  const response = await fetch(`${STRAPI_URL}/api/members`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${STRAPI_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(memberData)
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Strapi error: ${error.error?.message || response.statusText}`)
  }

  return await response.json()
}

// Generate magic link token
async function generateMagicLink(email, memberId) {
  const response = await fetch(`${STRAPI_URL}/api/auth-tokens`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${STRAPI_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      data: {
        member: memberId,
        token: generateToken(),
        expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString() // 6 hours
      }
    })
  })

  if (!response.ok) {
    throw new Error('Failed to generate magic link token')
  }

  const data = await response.json()
  return data.data.token
}

// Generate random token
function generateToken() {
  return Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('')
}

// Send onboarding email using Resend
async function sendOnboardingEmail(email, name, magicLinkToken) {
  const magicLink = `https://www.cultureforchange.gr/auth/set-password?token=${magicLinkToken}`

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #E8845C 0%, #D67355 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
    .button { display: inline-block; background: #E8845C; color: white; padding: 14px 28px; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 20px 0; }
    .warning { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    .note { background: #F3F4F6; padding: 15px; border-radius: 8px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 28px;">🎉 Καλώς ήρθες στη Νέα Ιστοσελίδα!</h1>
    </div>

    <div class="content">
      <p>Γεια σου${name && name !== 'Νέο Μέλος' ? ` ${name}` : ''}!</p>

      <p><strong>Σε προσκαλούμε να δοκιμάσεις τη νέα beta έκδοση της ιστοσελίδας Culture for Change!</strong></p>

      <p>Σου έχουμε δημιουργήσει έναν λογαριασμό για να μπορέσεις να δοκιμάσεις τις νέες λειτουργίες της ιστοσελίδας και να μας δώσεις το πολύτιμο feedback σου.</p>

      <div class="note">
        <p style="margin: 0;"><strong>🔑 Πρώτο βήμα: Ορισμός κωδικού πρόσβασης</strong></p>
        <p style="margin: 5px 0 0 0;">Κάνε κλικ στο παρακάτω κουμπί για να ορίσεις τον κωδικό σου:</p>
      </div>

      <div style="text-align: center;">
        <a href="${magicLink}" class="button">
          Ορισμός Κωδικού Πρόσβασης
        </a>
      </div>

      <div class="warning">
        <p style="margin: 0;"><strong>⚠️ Σημαντικό:</strong></p>
        <ul style="margin: 5px 0;">
          <li>Ο σύνδεσμος λήγει σε <strong>6 ώρες</strong></li>
          <li>Έλεγξε τον φάκελο <strong>SPAM</strong> αν δεν βρεις το email</li>
        </ul>
      </div>

      <h3>📝 Τι μπορείς να κάνεις;</h3>
      <ul>
        <li><strong>Επεξεργασία Προφίλ:</strong> Συμπλήρωσε τα στοιχεία σου (βιογραφικό, πεδία εργασίας, έργα, φωτογραφίες)</li>
        <li><strong>Δοκιμή Λειτουργιών:</strong> Εξερεύνησε τις νέες δυνατότητες της σελίδας</li>
        <li><strong>Feedback:</strong> Μοιράσου τις παρατηρήσεις σου για bugs ή βελτιώσεις</li>
      </ul>

      <h3>🎯 Γιατί το προφίλ μου είναι κενό;</h3>
      <p>Για λόγους ασφαλείας και προστασίας προσωπικών δεδομένων, δημιουργήσαμε το προφίλ σου με placeholder δεδομένα. Εσύ αποφασίζεις τι θέλεις να συμπληρώσεις και πόσο λεπτομερές θέλεις να είναι το προφίλ σου.</p>

      <div class="note">
        <p style="margin: 0;"><strong>🚀 Beta Testing Περίοδος: 10/12 - 6/1</strong></p>
        <p style="margin: 5px 0 0 0;">Η βοήθειά σου είναι πολύτιμη για να κάνουμε την ιστοσελίδα ακόμα καλύτερη!</p>
      </div>

      <p>Για οποιαδήποτε ερώτηση ή πρόβλημα, απάντησε σε αυτό το email.</p>

      <p style="margin-top: 30px;">Ευχαριστούμε για τη συμμετοχή σου! 🙌</p>
      <p><strong>Η ομάδα του Culture for Change</strong></p>
    </div>

    <div class="footer">
      <p>Culture for Change | Δίκτυο Κοινωνικής Καινοτομίας</p>
      <p>Αυτό το email στάλθηκε στη διεύθυνση ${email}</p>
    </div>
  </div>
</body>
</html>
`

  const emailText = `
Γεια σου${name && name !== 'Νέο Μέλος' ? ` ${name}` : ''}!

Σε προσκαλούμε να δοκιμάσεις τη νέα beta έκδοση της ιστοσελίδας Culture for Change!

Σου έχουμε δημιουργήσει έναν λογαριασμό για να μπορέσεις να δοκιμάσεις τις νέες λειτουργίες της ιστοσελίδας και να μας δώσεις το πολύτιμο feedback σου.

🔑 ΟΡΙΣΜΟΣ ΚΩΔΙΚΟΥ ΠΡΟΣΒΑΣΗΣ
Κάνε κλικ στον παρακάτω σύνδεσμο για να ορίσεις τον κωδικό σου:
${magicLink}

⚠️ ΣΗΜΑΝΤΙΚΟ:
- Ο σύνδεσμος λήγει σε 6 ώρες
- Έλεγξε τον φάκελο SPAM αν δεν βρεις το email

📝 ΤΙ ΜΠΟΡΕΙΣ ΝΑ ΚΑΝΕΙΣ;
- Επεξεργασία Προφίλ: Συμπλήρωσε τα στοιχεία σου (βιογραφικό, πεδία εργασίας, έργα, φωτογραφίες)
- Δοκιμή Λειτουργιών: Εξερεύνησε τις νέες δυνατότητες της σελίδας
- Feedback: Μοιράσου τις παρατηρήσεις σου για bugs ή βελτιώσεις

🎯 ΓΙΑΤΙ ΤΟ ΠΡΟΦΙΛ ΜΟΥ ΕΙΝΑΙ ΚΕΝΟ;
Για λόγους ασφαλείας και προστασίας προσωπικών δεδομένων, δημιουργήσαμε το προφίλ σου με placeholder δεδομένα. Εσύ αποφασίζεις τι θέλεις να συμπληρώσεις και πόσο λεπτομερές θέλεις να είναι το προφίλ σου.

🚀 Beta Testing Περίοδος: 10/12 - 6/1
Η βοήθειά σου είναι πολύτιμη για να κάνουμε την ιστοσελίδα ακόμα καλύτερη!

Για οποιαδήποτε ερώτηση ή πρόβλημα, απάντησε σε αυτό το email.

Ευχαριστούμε για τη συμμετοχή σου! 🙌

Η ομάδα του Culture for Change
`

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Culture for Change <noreply@cultureforchange.gr>',
      to: email,
      subject: '🎉 Καλωσόρισμα στη Νέα Beta Ιστοσελίδα - Ορισμός Κωδικού',
      html: emailHtml,
      text: emailText
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Resend error: ${error.message || response.statusText}`)
  }

  return await response.json()
}

// Main onboarding function
async function onboardMember(email, name) {
  console.log(`\n📧 Processing: ${email}${name ? ` (${name})` : ''}`)

  try {
    // Step 1: Create member in Strapi
    console.log('   Creating member in Strapi...')
    const member = await createMemberInStrapi(email, name)
    const memberId = member.data.id
    console.log(`   ✅ Member created (ID: ${memberId})`)

    // Step 2: Generate magic link
    console.log('   Generating magic link token...')
    const token = await generateMagicLink(email, memberId)
    console.log('   ✅ Magic link generated')

    // Step 3: Send onboarding email
    console.log('   Sending onboarding email...')
    await sendOnboardingEmail(email, name, token)
    console.log('   ✅ Email sent successfully!')

    return { success: true, email, memberId }

  } catch (error) {
    console.error(`   ❌ Failed: ${error.message}`)
    return { success: false, email, error: error.message }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.log(`
Usage: node scripts/onboard-beta-testers.js <csv-file>

CSV Format:
  email,name
  user1@example.com,John Doe
  user2@example.com,Jane Smith
  user3@example.com

Or provide emails as arguments:
  node scripts/onboard-beta-testers.js email1@example.com email2@example.com
    `)
    process.exit(1)
  }

  let members = []

  // Check if first argument is a CSV file
  if (args[0].endsWith('.csv')) {
    const csvPath = path.resolve(args[0])

    if (!fs.existsSync(csvPath)) {
      console.error(`❌ Error: File not found: ${csvPath}`)
      process.exit(1)
    }

    const csvContent = fs.readFileSync(csvPath, 'utf8')
    members = parseCSV(csvContent)
  } else {
    // Treat arguments as email addresses
    members = args.map(email => ({ email, name: null }))
  }

  if (members.length === 0) {
    console.error('❌ Error: No members found to onboard')
    process.exit(1)
  }

  console.log(`🚀 Starting beta tester onboarding...`)
  console.log(`📊 Total members to onboard: ${members.length}\n`)

  const results = []

  for (const member of members) {
    const result = await onboardMember(member.email, member.name)
    results.push(result)

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  // Summary
  const successful = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length

  console.log('\n' + '='.repeat(60))
  console.log('📊 ONBOARDING SUMMARY')
  console.log('='.repeat(60))
  console.log(`✅ Successfully onboarded: ${successful}`)
  console.log(`❌ Failed: ${failed}`)

  if (failed > 0) {
    console.log('\n❌ Failed members:')
    results.filter(r => !r.success).forEach(r => {
      console.log(`   - ${r.email}: ${r.error}`)
    })
  }

  console.log('\n✨ Onboarding process complete!')
}

// Run the script
main().catch(error => {
  console.error('\n❌ Fatal error:', error)
  process.exit(1)
})
