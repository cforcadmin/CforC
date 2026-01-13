/**
 * Import translated FieldsOfWork from CSV back to Strapi
 *
 * Usage: node scripts/import-fields-of-work.js
 *
 * Input: fields-of-work-export.csv (with FieldsOfWork_Greek column filled)
 */

const fs = require('fs')
require('dotenv').config({ path: '.env.local' })

// Use DESTINATION if available, otherwise fall back to regular STRAPI_URL
const STRAPI_URL = process.env.DESTINATION_STRAPI_URL || process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.DESTINATION_STRAPI_TOKEN || process.env.STRAPI_API_TOKEN || process.env.NEXT_PUBLIC_STRAPI_API_TOKEN

if (!STRAPI_URL || !STRAPI_API_TOKEN) {
  console.error('❌ Error: STRAPI_URL and STRAPI_API_TOKEN must be set in .env.local')
  process.exit(1)
}

console.log(`📍 Target Strapi: ${STRAPI_URL}\n`)

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

async function updateMember(documentId, greekFields) {
  const url = `${STRAPI_URL}/api/members/${documentId}`

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
      console.error(`❌ File not found: ${filename}`)
      console.error('   Run export-fields-of-work.js first')
      process.exit(1)
    }

    const content = fs.readFileSync(filename, 'utf8')
    const rows = parseCSV(content)

    console.log(`📁 Loaded ${rows.length} rows from ${filename}\n`)

    let updated = 0
    let skipped = 0
    let failed = 0

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const docId = row.DocumentID
      const name = row.Name
      const greek = row.FieldsOfWork_Greek

      if (!greek || !greek.trim()) {
        skipped++
        continue
      }

      console.log(`[${i + 1}/${rows.length}] ${name}`)
      console.log(`   → ${greek}`)

      try {
        await updateMember(docId, greek)
        console.log(`   ✅ Updated`)
        updated++
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`)
        failed++
      }

      await new Promise(r => setTimeout(r, 100))
    }

    console.log('\n' + '='.repeat(40))
    console.log(`✅ Done! Updated: ${updated}, Skipped: ${skipped}, Failed: ${failed}`)

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

main()
