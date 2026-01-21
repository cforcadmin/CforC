/**
 * Update ImageAltText field for existing Activities and Open Calls in Strapi
 *
 * This script sets a placeholder alt text based on the Title for entries
 * that have empty ImageAltText fields. Content editors should then review
 * and update these with proper descriptive alt text.
 *
 * Usage: node scripts/update-image-alt-text.js
 *
 * Options:
 *   --dry-run    Preview changes without making updates
 *   --activities Only update activities
 *   --open-calls Only update open calls
 */

require('dotenv').config({ path: '.env.local' })

const STRAPI_URL = process.env.DESTINATION_STRAPI_URL || process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.DESTINATION_STRAPI_TOKEN || process.env.STRAPI_API_TOKEN || process.env.NEXT_PUBLIC_STRAPI_API_TOKEN

if (!STRAPI_URL || !STRAPI_API_TOKEN) {
  console.error('Error: STRAPI_URL and STRAPI_API_TOKEN must be set in .env.local')
  process.exit(1)
}

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const ONLY_ACTIVITIES = args.includes('--activities')
const ONLY_OPEN_CALLS = args.includes('--open-calls')

console.log(`Target Strapi: ${STRAPI_URL}`)
if (DRY_RUN) console.log('DRY RUN MODE - No changes will be made\n')
else console.log('')

/**
 * Generate placeholder alt text from title
 * Format: "Εικόνα για: [Title]"
 * This makes it clear the alt text needs manual review
 */
function generatePlaceholderAltText(title) {
  if (!title) return 'Εικόνα δραστηριότητας'
  return `Εικόνα για: ${title}`
}

async function fetchAll(contentType) {
  console.log(`Fetching ${contentType} from Strapi...`)

  const response = await fetch(`${STRAPI_URL}/api/${contentType}?pagination[limit]=1000`, {
    headers: { 'Authorization': `Bearer ${STRAPI_API_TOKEN}` }
  })

  if (!response.ok) throw new Error(`Failed to fetch ${contentType}: ${response.status}`)

  const data = await response.json()
  console.log(`Fetched ${data.data.length} ${contentType}\n`)
  return data.data
}

async function updateEntry(contentType, documentId, imageAltText) {
  if (DRY_RUN) return true

  const url = `${STRAPI_URL}/api/${contentType}/${documentId}`

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${STRAPI_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      data: { ImageAltText: imageAltText }
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`${response.status}: ${errorText}`)
  }

  return true
}

async function processContentType(contentType, displayName) {
  console.log(`\n${'='.repeat(50)}`)
  console.log(`Processing ${displayName}`)
  console.log('='.repeat(50))

  const entries = await fetchAll(contentType)

  let updated = 0
  let skipped = 0
  let failed = 0

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    const documentId = entry.documentId
    const title = entry.Title || ''
    const existingAltText = entry.ImageAltText

    // Skip if ImageAltText already exists
    if (existingAltText && existingAltText.trim() !== '') {
      skipped++
      continue
    }

    const newAltText = generatePlaceholderAltText(title)

    console.log(`[${i + 1}/${entries.length}] "${title}"`)
    console.log(`   documentId: ${documentId}`)
    console.log(`   ImageAltText: "${newAltText}"`)

    try {
      await updateEntry(contentType, documentId, newAltText)
      console.log(`   ${DRY_RUN ? 'Would update' : 'Updated'}`)
      updated++
    } catch (error) {
      console.log(`   Error: ${error.message}`)
      failed++
    }

    // Rate limiting
    if (!DRY_RUN) {
      await new Promise(r => setTimeout(r, 100))
    }
  }

  return { updated, skipped, failed }
}

async function main() {
  try {
    const results = {
      activities: { updated: 0, skipped: 0, failed: 0 },
      openCalls: { updated: 0, skipped: 0, failed: 0 }
    }

    // Process Activities
    if (!ONLY_OPEN_CALLS) {
      results.activities = await processContentType('activities', 'Activities')
    }

    // Process Open Calls
    if (!ONLY_ACTIVITIES) {
      results.openCalls = await processContentType('open-calls', 'Open Calls')
    }

    // Summary
    console.log('\n' + '='.repeat(50))
    console.log('SUMMARY')
    console.log('='.repeat(50))

    if (!ONLY_OPEN_CALLS) {
      console.log(`\nActivities:`)
      console.log(`  ${DRY_RUN ? 'Would update' : 'Updated'}: ${results.activities.updated}`)
      console.log(`  Skipped (already has alt text): ${results.activities.skipped}`)
      console.log(`  Failed: ${results.activities.failed}`)
    }

    if (!ONLY_ACTIVITIES) {
      console.log(`\nOpen Calls:`)
      console.log(`  ${DRY_RUN ? 'Would update' : 'Updated'}: ${results.openCalls.updated}`)
      console.log(`  Skipped (already has alt text): ${results.openCalls.skipped}`)
      console.log(`  Failed: ${results.openCalls.failed}`)
    }

    const totalUpdated = results.activities.updated + results.openCalls.updated
    const totalSkipped = results.activities.skipped + results.openCalls.skipped
    const totalFailed = results.activities.failed + results.openCalls.failed

    console.log(`\nTotal:`)
    console.log(`  ${DRY_RUN ? 'Would update' : 'Updated'}: ${totalUpdated}`)
    console.log(`  Skipped: ${totalSkipped}`)
    console.log(`  Failed: ${totalFailed}`)

    if (DRY_RUN && totalUpdated > 0) {
      console.log('\n' + '-'.repeat(50))
      console.log('To apply changes, run without --dry-run flag:')
      console.log('  node scripts/update-image-alt-text.js')
    }

    if (totalUpdated > 0 && !DRY_RUN) {
      console.log('\n' + '-'.repeat(50))
      console.log('NOTE: Placeholder alt text has been set.')
      console.log('Please review and update with proper descriptive text in Strapi.')
      console.log('Format: "Εικόνα για: [Title]" -> proper description')
    }

  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

main()
