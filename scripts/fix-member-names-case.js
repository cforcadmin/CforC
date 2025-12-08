/**
 * Script to convert Greek member names from ALL CAPS to capitalized form.
 *
 * Example: "ΓΙΩΡΓΟΣ ΣΤΥΛ" -> "Γιώργος Στυλ"
 *
 * Usage: node scripts/fix-member-names-case.js
 */

require('dotenv').config({ path: '.env.local' })

const STRAPI_URL = process.env.STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

if (!STRAPI_URL || !STRAPI_API_TOKEN) {
  console.error('❌ Error: Missing STRAPI_URL or STRAPI_API_TOKEN')
  process.exit(1)
}

/**
 * Heuristic title-case for Greek names.
 * - Lowercases using Greek locale (may restore tonos in many cases).
 * - Capitalizes the first letter of each word.
 */
function titleCaseGreek(name) {
  if (!name) return name

  // Normalize whitespace
  const trimmed = name.trim().replace(/\s+/g, ' ')

  // Lowercase using Greek locale (helps with tonos restoration in many cases)
  const lower = trimmed.toLocaleLowerCase('el-GR')

  return lower
    .split(' ')
    .map(word => {
      if (!word) return word
      const [first, ...rest] = word
      return first.toLocaleUpperCase('el-GR') + rest.join('')
    })
    .join(' ')
}

function isAllCapsGreek(str) {
  if (!str) return false
  const letters = str.replace(/[^\p{L}]+/gu, '')
  if (!letters) return false
  return letters === letters.toLocaleUpperCase('el-GR')
}

async function fetchAllMembers() {
  console.log('📥 Fetching members from Strapi...')

  const response = await fetch(`${STRAPI_URL}/api/members?populate=*&pagination[limit]=1000`, {
    headers: {
      'Authorization': `Bearer ${STRAPI_API_TOKEN}`
    }
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to fetch members: ${response.status} ${errorText}`)
  }

  const data = await response.json()

  const members = (data.data || []).map(raw => {
    const attrs = raw.attributes || {}
    const name = attrs.Name || raw.Name || ''
    return {
      raw,
      id: raw.id,
      documentId: raw.documentId || attrs.documentId || raw.id,
      name
    }
  })

  console.log(`✅ Found ${members.length} members`)
  return members
}

async function updateMemberName(memberId, newName) {
  const payload = {
    data: {
      Name: newName
    }
  }

  const response = await fetch(`${STRAPI_URL}/api/members/${memberId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${STRAPI_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to update member ${memberId}: ${response.status} ${errorText}`)
  }
}

async function main() {
  try {
    const members = await fetchAllMembers()

    let changed = 0
    let skipped = 0
    let failed = 0

    for (const member of members) {
      const { id: memberId, name } = member

      if (!memberId) {
        console.log(`\n👤 Skipping member with missing id (name: ${name || '—'})`)
        skipped++
        continue
      }

      if (!name) {
        console.log(`\n👤 Member ${memberId} has no Name - skipping`)
        skipped++
        continue
      }

      console.log(`\n👤 Processing: ${name} (id: ${memberId})`)

      if (!isAllCapsGreek(name)) {
        console.log('   ⏭️  Name is not ALL CAPS Greek - skipping')
        skipped++
        continue
      }

      const newName = titleCaseGreek(name)

      if (newName === name) {
        console.log('   ⏭️  Title-cased name is same as original - skipping')
        skipped++
        continue
      }

      console.log(`   🔤 New name: ${newName}`)

      try {
        await updateMemberName(memberId, newName)
        console.log('   ✅ Updated name in Strapi')
        changed++
      } catch (error) {
        console.error('   ❌ Failed to update member:', error.message)
        failed++
      }

      // Small delay to avoid hammering the API
      await new Promise(resolve => setTimeout(resolve, 300))
    }

    console.log('\n' + '='.repeat(60))
    console.log('📊 SUMMARY')
    console.log('='.repeat(60))
    console.log(`✅ Names changed: ${changed}`)
    console.log(`⏭️  Skipped: ${skipped}`)
    console.log(`❌ Failed: ${failed}`)

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

main()
