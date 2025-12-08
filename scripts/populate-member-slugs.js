/**
 * Script to populate Slug field for all existing members
 *
 * Usage: node scripts/populate-member-slugs.js
 */

require('dotenv').config({ path: '.env.local' })

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN || process.env.NEXT_PUBLIC_STRAPI_API_TOKEN

if (!STRAPI_URL || !STRAPI_API_TOKEN) {
  console.error('❌ Error: Missing STRAPI_URL or STRAPI_API_TOKEN')
  process.exit(1)
}

/**
 * Greek to Latin transliteration map
 */
const greekToLatinMap = {
  'α': 'a', 'ά': 'a', 'Α': 'A', 'Ά': 'A',
  'β': 'b', 'Β': 'B',
  'γ': 'g', 'Γ': 'G',
  'δ': 'd', 'Δ': 'D',
  'ε': 'e', 'έ': 'e', 'Ε': 'E', 'Έ': 'E',
  'ζ': 'z', 'Ζ': 'Z',
  'η': 'i', 'ή': 'i', 'Η': 'I', 'Ή': 'I',
  'θ': 'th', 'Θ': 'TH',
  'ι': 'i', 'ί': 'i', 'ϊ': 'i', 'ΐ': 'i', 'Ι': 'I', 'Ί': 'I', 'Ϊ': 'I',
  'κ': 'k', 'Κ': 'K',
  'λ': 'l', 'Λ': 'L',
  'μ': 'm', 'Μ': 'M',
  'ν': 'n', 'Ν': 'N',
  'ξ': 'ks', 'Ξ': 'KS',
  'ο': 'o', 'ό': 'o', 'Ο': 'O', 'Ό': 'O',
  'π': 'p', 'Π': 'P',
  'ρ': 'r', 'Ρ': 'R',
  'σ': 's', 'ς': 's', 'Σ': 'S',
  'τ': 't', 'Τ': 'T',
  'υ': 'y', 'ύ': 'y', 'ϋ': 'y', 'ΰ': 'y', 'Υ': 'Y', 'Ύ': 'Y', 'Ϋ': 'Y',
  'φ': 'f', 'Φ': 'F',
  'χ': 'ch', 'Χ': 'CH',
  'ψ': 'ps', 'Ψ': 'PS',
  'ω': 'o', 'ώ': 'o', 'Ω': 'O', 'Ώ': 'O',
  'αι': 'ai', 'ει': 'ei', 'οι': 'oi', 'ου': 'ou',
  'αυ': 'av', 'ευ': 'ev', 'ηυ': 'iv',
  'μπ': 'b', 'ντ': 'd', 'γκ': 'g', 'γγ': 'ng',
  'τσ': 'ts', 'τζ': 'tz'
}

function transliterate(text) {
  let result = text

  // Replace multi-character combinations first
  const multiChar = ['αι', 'ει', 'οι', 'ου', 'αυ', 'ευ', 'ηυ', 'μπ', 'ντ', 'γκ', 'γγ', 'τσ', 'τζ', 'θ', 'χ', 'ψ', 'ξ']
  multiChar.forEach(combo => {
    const regex = new RegExp(combo, 'gi')
    result = result.replace(regex, (match) => greekToLatinMap[match] || match)
  })

  // Replace single characters
  result = result.split('').map(char => greekToLatinMap[char] || char).join('')

  return result
}

function generateSlug(name) {
  let slug = transliterate(name)
  slug = slug.toLowerCase()
  slug = slug
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug
}

async function populateSlugs() {
  try {
    console.log('📥 Fetching all members...')

    const response = await fetch(`${STRAPI_URL}/api/members?pagination[limit]=1000`, {
      headers: {
        'Authorization': `Bearer ${STRAPI_API_TOKEN}`
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch members: ${response.statusText}`)
    }

    const data = await response.json()
    const members = data.data

    console.log(`✅ Found ${members.length} members\n`)

    let updated = 0
    let skipped = 0
    let failed = 0

    for (const member of members) {
      const name = member.Name
      const currentSlug = member.Slug
      const documentId = member.documentId

      if (currentSlug) {
        console.log(`⏭️  Skipping "${name}" - already has slug: ${currentSlug}`)
        skipped++
        continue
      }

      const newSlug = generateSlug(name)

      try {
        const updateResponse = await fetch(`${STRAPI_URL}/api/members/${documentId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${STRAPI_API_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            data: {
              Slug: newSlug
            }
          })
        })

        if (!updateResponse.ok) {
          throw new Error(`Failed to update: ${updateResponse.statusText}`)
        }

        console.log(`✅ Updated "${name}" → ${newSlug}`)
        updated++
      } catch (error) {
        console.error(`❌ Failed to update "${name}":`, error.message)
        failed++
      }
    }

    console.log('\n📊 Summary:')
    console.log(`   Updated: ${updated}`)
    console.log(`   Skipped: ${skipped}`)
    console.log(`   Failed: ${failed}`)
    console.log(`   Total: ${members.length}`)

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

populateSlugs()
