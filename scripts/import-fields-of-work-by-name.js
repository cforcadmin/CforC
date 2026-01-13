/**
 * Import translated FieldsOfWork from CSV back to Strapi
 *
 * This version matches by Name (not documentId) since documentIds
 * changed during database migration.
 *
 * Usage: node scripts/import-fields-of-work-by-name.js
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

function parseCSV(content) {
  const lines = content.split('\n')
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim())
  const rows = []

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue

    // Parse CSV line (handling quoted values with commas)
    const values = []
    let current = ''
    let inQuotes = false

    for (const char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    values.push(current.trim())

    const row = {}
    headers.forEach((h, idx) => {
      row[h] = values[idx] || ''
    })
    rows.push(row)
  }

  return rows
}

// Normalize name for matching (trim, lowercase, remove extra spaces)
function normalizeName(name) {
  if (!name) return ''
  return name.toLowerCase().trim().replace(/\s+/g, ' ')
}

async function fetchAllMembers() {
  console.log('Fetching members from Strapi...')

  let allMembers = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    const url = `${STRAPI_URL}/api/members?pagination[page]=${page}&pagination[pageSize]=100&fields[0]=Name&fields[1]=FieldsOfWork`

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

async function updateMember(numericId, greekFields) {
  // Use numeric ID, not documentId - Strapi v5 PUT requires numeric ID
  const url = `${STRAPI_URL}/api/members/${numericId}`

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${STRAPI_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      data: { FieldsOfWork: greekFields }
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`${response.status}: ${errorText}`)
  }
}

async function main() {
  try {
    const filename = 'fields-of-work-export.csv'

    if (!fs.existsSync(filename)) {
      console.error(`File not found: ${filename}`)
      process.exit(1)
    }

    // Load CSV with translations
    const content = fs.readFileSync(filename, 'utf8')
    const rows = parseCSV(content)
    console.log(`Loaded ${rows.length} rows from CSV`)

    // Build a map of normalized name -> Greek translation
    const translationMap = new Map()
    for (const row of rows) {
      const name = normalizeName(row.Name)
      const greek = row.FieldsOfWork_Greek?.trim()
      if (name && greek) {
        translationMap.set(name, greek)
      }
    }
    console.log(`Found ${translationMap.size} translations in CSV\n`)

    // Fetch members from Strapi
    const members = await fetchAllMembers()

    let updated = 0
    let skipped = 0
    let notFound = 0
    let failed = 0

    for (let i = 0; i < members.length; i++) {
      const member = members[i]
      const numericId = member.id
      const name = member.Name || ''
      const normalizedName = normalizeName(name)

      // Check if we have a translation for this member
      const greek = translationMap.get(normalizedName)

      if (!greek) {
        notFound++
        continue
      }

      console.log(`[${i + 1}/${members.length}] ${name}`)
      console.log(`   ID: ${numericId}`)
      console.log(`   Greek: ${greek}`)

      try {
        await updateMember(numericId, greek)
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
    console.log(`  No translation found: ${notFound}`)
    console.log(`  Failed: ${failed}`)

  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

main()
