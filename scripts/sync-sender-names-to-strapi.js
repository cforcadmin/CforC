/**
 * Sync First/Last names from Sender.net External group to Strapi newsletter-subscribers
 *
 * Reads all subscribers from the Sender.net External group, matches them by email
 * to Strapi newsletter-subscriber records, and updates FirstName/LastName where available.
 *
 * Usage:
 * 1. Make sure .env.local has STRAPI_URL, STRAPI_API_TOKEN, SENDER_API_KEY, SENDER_GROUP_ID
 * 2. Run: node scripts/sync-sender-names-to-strapi.js
 *
 * Add --dry-run to preview changes without writing to Strapi.
 */

require('dotenv').config({ path: '.env.local' })

const STRAPI_URL = process.env.STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN
const SENDER_API_KEY = process.env.SENDER_API_KEY
const SENDER_GROUP_ID = process.env.SENDER_GROUP_ID

const DRY_RUN = process.argv.includes('--dry-run')

if (!STRAPI_URL || !STRAPI_API_TOKEN) {
  console.error('Error: STRAPI_URL and STRAPI_API_TOKEN must be set in .env.local')
  process.exit(1)
}

if (!SENDER_API_KEY || !SENDER_GROUP_ID) {
  console.error('Error: SENDER_API_KEY and SENDER_GROUP_ID must be set in .env.local')
  process.exit(1)
}

async function fetchSenderSubscribers() {
  const subscribers = []
  let page = 1

  while (true) {
    const res = await fetch(
      `https://api.sender.net/v2/groups/${SENDER_GROUP_ID}/subscribers?page=${page}&limit=100`,
      {
        headers: {
          'Authorization': `Bearer ${SENDER_API_KEY}`,
          'Accept': 'application/json',
        },
      }
    )

    if (!res.ok) {
      const errorText = await res.text()
      console.error(`Failed to fetch Sender subscribers (page ${page}):`, errorText)
      break
    }

    const data = await res.json()
    const items = data.data || []

    if (items.length === 0) break

    for (const sub of items) {
      const firstName = (sub.firstname || '').trim()
      const lastName = (sub.lastname || '').trim()

      if (firstName || lastName) {
        subscribers.push({
          email: (sub.email || '').toLowerCase(),
          firstName,
          lastName,
        })
      }
    }

    // Check if there are more pages
    if (!data.links || !data.links.next) break
    page++
  }

  return subscribers
}

async function fetchStrapiSubscribers() {
  const subscribers = new Map() // email -> { documentId, FirstName, LastName }
  let page = 1
  const pageSize = 100

  while (true) {
    const res = await fetch(
      `${STRAPI_URL}/api/newsletter-subscribers?fields[0]=Email&fields[1]=FirstName&fields[2]=LastName&pagination[page]=${page}&pagination[pageSize]=${pageSize}`,
      { headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` } }
    )

    if (!res.ok) {
      console.error('Failed to fetch Strapi subscribers:', await res.text())
      break
    }

    const data = await res.json()
    for (const item of data.data) {
      subscribers.set(item.Email.toLowerCase(), {
        documentId: item.documentId,
        FirstName: item.FirstName || '',
        LastName: item.LastName || '',
      })
    }

    if (data.meta.pagination.page >= data.meta.pagination.pageCount) break
    page++
  }

  return subscribers
}

async function updateStrapiSubscriber(documentId, firstName, lastName) {
  const updateData = {}
  if (firstName) updateData.FirstName = firstName
  if (lastName) updateData.LastName = lastName

  const res = await fetch(`${STRAPI_URL}/api/newsletter-subscribers/${documentId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
    },
    body: JSON.stringify({ data: updateData }),
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(errorText)
  }

  return await res.json()
}

async function main() {
  if (DRY_RUN) console.log('=== DRY RUN MODE - no changes will be made ===\n')

  // Fetch from both sources
  console.log('Fetching subscribers from Sender.net External group...')
  const senderSubs = await fetchSenderSubscribers()
  console.log(`Found ${senderSubs.length} subscribers with names in Sender\n`)

  console.log('Fetching subscribers from Strapi...')
  const strapiSubs = await fetchStrapiSubscribers()
  console.log(`Found ${strapiSubs.size} subscribers in Strapi\n`)

  // Match and update
  let updated = 0
  let skipped = 0
  let notFound = 0
  let alreadySet = 0
  let errors = 0

  for (const sender of senderSubs) {
    const strapi = strapiSubs.get(sender.email)

    if (!strapi) {
      notFound++
      continue
    }

    // Check if Strapi already has names
    const needsFirstName = sender.firstName && !strapi.FirstName
    const needsLastName = sender.lastName && !strapi.LastName

    if (!needsFirstName && !needsLastName) {
      alreadySet++
      continue
    }

    const newFirst = needsFirstName ? sender.firstName : undefined
    const newLast = needsLastName ? sender.lastName : undefined

    if (DRY_RUN) {
      console.log(`[WOULD UPDATE] ${sender.email}: FirstName=${newFirst || '(skip)'}, LastName=${newLast || '(skip)'}`)
      updated++
    } else {
      try {
        await updateStrapiSubscriber(strapi.documentId, newFirst, newLast)
        console.log(`[UPDATED] ${sender.email}: FirstName=${newFirst || '(skip)'}, LastName=${newLast || '(skip)'}`)
        updated++
      } catch (err) {
        console.log(`[ERROR] ${sender.email}: ${err.message}`)
        errors++
      }

      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 150))
    }
  }

  console.log('\n--- Summary ---')
  console.log(`Updated: ${updated}`)
  console.log(`Already had names: ${alreadySet}`)
  console.log(`Not in Strapi: ${notFound}`)
  if (errors > 0) console.log(`Errors: ${errors}`)
  if (DRY_RUN) console.log('\n(Dry run - no changes were made)')
}

main().catch(err => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
