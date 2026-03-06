/**
 * Add a batch of email subscribers to both Strapi and Sender.net
 *
 * Usage: node scripts/add-subscribers-batch.js
 *
 * - Checks Strapi for existing subscribers (skips duplicates)
 * - Creates new entries in Strapi newsletter-subscribers
 * - Adds subscribers to Sender.net group
 */

require('dotenv').config({ path: '.env.local' })

const STRAPI_URL = process.env.STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN
const SENDER_API_KEY = process.env.SENDER_API_KEY
const SENDER_GROUP_ID = process.env.SENDER_GROUP_ID

if (!STRAPI_URL || !STRAPI_API_TOKEN) {
  console.error('Error: STRAPI_URL and STRAPI_API_TOKEN must be set in .env.local')
  process.exit(1)
}

if (!SENDER_API_KEY || !SENDER_GROUP_ID) {
  console.error('Error: SENDER_API_KEY and SENDER_GROUP_ID must be set in .env.local')
  process.exit(1)
}

// Approved emails to add
const EMAILS = [
  // Likely legitimate (Greek names, relevant orgs)
  'katsikadepi@gmail.com',
  'fromathenstobrusselswithlove@gmail.com',
  'deborahorfanidis@gmail.com',
  'annavaroucha@gmail.com',
  'fhimonakou@hotmail.com',
  'fvakitsidou@kpechios.org',
  'y.kleidara@snfcc.org',
  'nectarios_s2@hotmail.com',
  'provadiko.amke@gmail.com',
  'spyros.tzortzis@stellarpartners.gr',
  'lampiri.eir@gmail.com',
  'iliopdanai@gmail.com',
  'gstylianopoulos@gmail.com',
  'georekon@gmail.com',
  // Selected from second table
  'ron.preston@siemens.com',
  // Uncertain but approved
  'ioannisfilippopulos886@gmail.com',
  'peterfrost48@aol.com',
  'hkube3@icloud.com',
  'mariacrocetta1@gmail.com',
  'susanmdeg@yahoo.com',
  'patricianunn@hotmail.com',
  'tomisinsick@hotmail.com',
  'gpilotto@csi-institute.com',
  'heiko-fischer@t-online.de',
]

async function fetchExistingSubscribers() {
  const existing = new Set()
  let page = 1
  const pageSize = 100

  while (true) {
    const res = await fetch(
      `${STRAPI_URL}/api/newsletter-subscribers?fields[0]=Email&pagination[page]=${page}&pagination[pageSize]=${pageSize}`,
      { headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` } }
    )

    if (!res.ok) {
      console.error('Failed to fetch existing subscribers:', await res.text())
      break
    }

    const data = await res.json()
    for (const item of data.data) {
      existing.add(item.Email.toLowerCase())
    }

    if (data.meta.pagination.page >= data.meta.pagination.pageCount) break
    page++
  }

  return existing
}

async function addToStrapi(email) {
  const res = await fetch(`${STRAPI_URL}/api/newsletter-subscribers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
    },
    body: JSON.stringify({
      data: {
        Email: email,
        ConfirmedAt: new Date().toISOString(),
      },
    }),
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Strapi: ${errorText}`)
  }
  return await res.json()
}

async function addToSender(email) {
  const res = await fetch('https://api.sender.net/v2/subscribers', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SENDER_API_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      email,
      groups: [SENDER_GROUP_ID],
      trigger_automation: false,
    }),
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Sender: ${errorText}`)
  }
  return await res.json()
}

async function main() {
  console.log(`Processing ${EMAILS.length} emails...\n`)

  // Fetch existing Strapi subscribers
  console.log('Checking existing Strapi subscribers...')
  const existing = await fetchExistingSubscribers()
  console.log(`Found ${existing.size} existing subscribers in Strapi\n`)

  let strapiCreated = 0
  let strapiSkipped = 0
  let senderAdded = 0
  let strapiErrors = 0
  let senderErrors = 0

  for (const email of EMAILS) {
    const emailLower = email.toLowerCase()

    // Strapi
    if (existing.has(emailLower)) {
      console.log(`[SKIP] ${email} - already in Strapi`)
      strapiSkipped++
    } else {
      try {
        await addToStrapi(emailLower)
        console.log(`[STRAPI OK] ${email}`)
        strapiCreated++
      } catch (err) {
        console.log(`[STRAPI FAIL] ${email}: ${err.message}`)
        strapiErrors++
      }
    }

    // Sender (always try - Sender handles duplicates gracefully)
    try {
      await addToSender(emailLower)
      console.log(`[SENDER OK] ${email}`)
      senderAdded++
    } catch (err) {
      console.log(`[SENDER FAIL] ${email}: ${err.message}`)
      senderErrors++
    }

    // Rate limit
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  console.log('\n--- Summary ---')
  console.log(`Strapi: ${strapiCreated} created, ${strapiSkipped} skipped (existing), ${strapiErrors} errors`)
  console.log(`Sender: ${senderAdded} added, ${senderErrors} errors`)
}

main().catch(err => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
