/**
 * Populate Slug field for all activities in Strapi
 *
 * This generates URL-friendly slugs from activity titles to match
 * old Google-indexed URLs from the previous site.
 *
 * Usage: node scripts/populate-activity-slugs.js
 */

require('dotenv').config({ path: '.env.local' })

const STRAPI_URL = process.env.DESTINATION_STRAPI_URL || process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.DESTINATION_STRAPI_TOKEN || process.env.STRAPI_API_TOKEN || process.env.NEXT_PUBLIC_STRAPI_API_TOKEN

if (!STRAPI_URL || !STRAPI_API_TOKEN) {
  console.error('Error: STRAPI_URL and STRAPI_API_TOKEN must be set in .env.local')
  process.exit(1)
}

console.log(`Target Strapi: ${STRAPI_URL}\n`)

/**
 * Convert Greek text to URL-friendly slug
 * Matches the format used by Webflow: lowercase, hyphens, no special chars
 */
function generateSlug(title) {
  if (!title) return ''

  // Greek to Latin transliteration map
  const greekToLatin = {
    'α': 'a', 'ά': 'a', 'β': 'v', 'γ': 'g', 'δ': 'd', 'ε': 'e', 'έ': 'e',
    'ζ': 'z', 'η': 'i', 'ή': 'i', 'θ': 'th', 'ι': 'i', 'ί': 'i', 'ϊ': 'i',
    'κ': 'k', 'λ': 'l', 'μ': 'm', 'ν': 'n', 'ξ': 'x', 'ο': 'o', 'ό': 'o',
    'π': 'p', 'ρ': 'r', 'σ': 's', 'ς': 's', 'τ': 't', 'υ': 'y', 'ύ': 'y',
    'ϋ': 'y', 'φ': 'f', 'χ': 'h', 'ψ': 'ps', 'ω': 'o', 'ώ': 'o',
    'Α': 'a', 'Ά': 'a', 'Β': 'v', 'Γ': 'g', 'Δ': 'd', 'Ε': 'e', 'Έ': 'e',
    'Ζ': 'z', 'Η': 'i', 'Ή': 'i', 'Θ': 'th', 'Ι': 'i', 'Ί': 'i', 'Ϊ': 'i',
    'Κ': 'k', 'Λ': 'l', 'Μ': 'm', 'Ν': 'n', 'Ξ': 'x', 'Ο': 'o', 'Ό': 'o',
    'Π': 'p', 'Ρ': 'r', 'Σ': 's', 'Τ': 't', 'Υ': 'y', 'Ύ': 'y', 'Ϋ': 'y',
    'Φ': 'f', 'Χ': 'h', 'Ψ': 'ps', 'Ω': 'o', 'Ώ': 'o'
  }

  let slug = title.toLowerCase()

  // Replace Greek characters with Latin equivalents
  slug = slug.split('').map(char => greekToLatin[char] || char).join('')

  // Replace spaces and special characters with hyphens
  slug = slug
    .replace(/[^a-z0-9\s-]/g, '') // Remove non-alphanumeric except spaces and hyphens
    .replace(/\s+/g, '-')          // Replace spaces with hyphens
    .replace(/-+/g, '-')           // Replace multiple hyphens with single
    .replace(/^-|-$/g, '')         // Remove leading/trailing hyphens

  return slug
}

async function fetchAllActivities() {
  console.log('Fetching activities from Strapi...')

  const response = await fetch(`${STRAPI_URL}/api/activities?pagination[limit]=1000`, {
    headers: { 'Authorization': `Bearer ${STRAPI_API_TOKEN}` }
  })

  if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`)

  const data = await response.json()
  console.log(`Fetched ${data.data.length} activities\n`)
  return data.data
}

async function updateActivity(documentId, slug) {
  const url = `${STRAPI_URL}/api/activities/${documentId}`

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${STRAPI_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      data: { Slug: slug }
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`${response.status}: ${errorText}`)
  }
}

async function main() {
  try {
    const activities = await fetchAllActivities()

    let updated = 0
    let skipped = 0
    let failed = 0

    for (let i = 0; i < activities.length; i++) {
      const activity = activities[i]
      const documentId = activity.documentId  // Strapi v5 uses documentId for updates
      const title = activity.Title || ''
      const existingSlug = activity.Slug

      // Generate slug from title
      const newSlug = generateSlug(title)

      if (!newSlug) {
        console.log(`[${i + 1}/${activities.length}] "${title}" - No slug generated, skipping`)
        skipped++
        continue
      }

      // Skip if slug already exists and matches
      if (existingSlug === newSlug) {
        skipped++
        continue
      }

      console.log(`[${i + 1}/${activities.length}] "${title}"`)
      console.log(`   documentId: ${documentId}`)
      console.log(`   Slug: ${newSlug}`)

      try {
        await updateActivity(documentId, newSlug)
        console.log(`   Updated`)
        updated++
      } catch (error) {
        console.log(`   Error: ${error.message}`)
        failed++
      }

      await new Promise(r => setTimeout(r, 100))
    }

    console.log('\n' + '='.repeat(40))
    console.log(`Done!`)
    console.log(`  Updated: ${updated}`)
    console.log(`  Skipped: ${skipped}`)
    console.log(`  Failed: ${failed}`)

  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

main()
