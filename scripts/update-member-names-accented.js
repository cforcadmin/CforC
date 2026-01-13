/**
 * Update member names to include Greek accents/punctuation
 *
 * Usage: node scripts/update-member-names-accented.js
 *
 * Input: names-accented.csv (semicolon-separated with DocumentID;Name)
 */

const fs = require('fs')
require('dotenv').config({ path: '.env.local' })

const STRAPI_URL = process.env.DESTINATION_STRAPI_URL || process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.DESTINATION_STRAPI_TOKEN || process.env.STRAPI_API_TOKEN || process.env.NEXT_PUBLIC_STRAPI_API_TOKEN

if (!STRAPI_URL || !STRAPI_API_TOKEN) {
  console.error('Error: STRAPI_URL and STRAPI_API_TOKEN must be set in .env.local')
  process.exit(1)
}

console.log(`Target Strapi: ${STRAPI_URL}\n`)

// Remove Greek accents for comparison
function removeAccents(str) {
  if (!str) return ''
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

function parseCSV(content) {
  const lines = content.split('\n')
  const rows = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Split by semicolon
    const parts = line.split(';')
    if (parts.length >= 2) {
      rows.push({
        documentId: parts[0].trim(),
        name: parts[1].trim()
      })
    }
  }

  return rows
}

async function fetchAllMembers() {
  console.log('Fetching members from Strapi...')

  let allMembers = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    const url = `${STRAPI_URL}/api/members?pagination[page]=${page}&pagination[pageSize]=100&fields[0]=Name`

    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${STRAPI_API_TOKEN}` }
    })

    if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`)

    const data = await response.json()
    if (data.data?.length > 0) {
      allMembers = allMembers.concat(data.data)
    }

    hasMore = data.meta?.pagination ? page < data.meta.pagination.pageCount : false
    page++
  }

  console.log(`Fetched ${allMembers.length} members\n`)
  return allMembers
}

async function updateMember(numericId, newName) {
  const url = `${STRAPI_URL}/api/members/${numericId}`

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${STRAPI_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      data: { Name: newName }
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`${response.status}: ${errorText}`)
  }
}

async function main() {
  try {
    const filename = 'names-accented.csv'

    if (!fs.existsSync(filename)) {
      console.error(`File not found: ${filename}`)
      process.exit(1)
    }

    // Load CSV with accented names
    const content = fs.readFileSync(filename, 'utf8')
    const accentedNames = parseCSV(content)
    console.log(`Loaded ${accentedNames.length} accented names from CSV`)

    // Build a map of normalized name -> accented name
    const accentMap = new Map()
    for (const row of accentedNames) {
      const normalized = removeAccents(row.name)
      accentMap.set(normalized, row.name)
    }
    console.log(`Created accent map with ${accentMap.size} entries\n`)

    // Fetch members from Strapi
    const members = await fetchAllMembers()

    let updated = 0
    let skipped = 0
    let notFound = 0
    let failed = 0

    for (let i = 0; i < members.length; i++) {
      const member = members[i]
      const numericId = member.id
      const currentName = member.Name || ''
      const normalizedCurrent = removeAccents(currentName)

      // Check if we have an accented version for this member
      const accentedName = accentMap.get(normalizedCurrent)

      if (!accentedName) {
        console.log(`[${i + 1}/${members.length}] ${currentName} - No accented version found`)
        notFound++
        continue
      }

      // Check if name already matches (no update needed)
      if (currentName.trim() === accentedName.trim()) {
        skipped++
        continue
      }

      console.log(`[${i + 1}/${members.length}] "${currentName}" -> "${accentedName}"`)

      try {
        await updateMember(numericId, accentedName)
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
    console.log(`  Already correct: ${skipped}`)
    console.log(`  No accented version found: ${notFound}`)
    console.log(`  Failed: ${failed}`)

  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

main()
