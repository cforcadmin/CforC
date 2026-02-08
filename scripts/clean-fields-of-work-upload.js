/**
 * UPLOAD: Apply the reviewed CSV data to Strapi.
 *
 * Reads the edited CSV (fields-of-work-cleanup-report-*.csv) and updates
 * FieldsOfWork for ALL members using the "New FieldsOfWork NEW DESIGN" column.
 *
 * Uses the same two-step pattern as app/api/members/update:
 *   1. Filter by documentId to get the numeric ID
 *   2. PUT update using the numeric ID
 *
 * Usage:
 *   node scripts/clean-fields-of-work-upload.js
 */

const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

const STRAPI_URL = process.env.STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

if (!STRAPI_URL || !STRAPI_API_TOKEN) {
  console.error('❌ STRAPI_URL and STRAPI_API_TOKEN must be set in .env.local')
  process.exit(1)
}

// ─── CSV Parser (handles quoted fields with commas/newlines) ────────────────

function parseCSV(text, delimiter = ',') {
  const rows = []
  let current = ''
  let inQuotes = false
  const lines = text.split('\n')

  for (let i = 0; i < lines.length; i++) {
    if (inQuotes) {
      current += '\n' + lines[i]
    } else {
      current = lines[i]
    }
    const quoteCount = (current.match(/"/g) || []).length
    inQuotes = quoteCount % 2 !== 0
    if (!inQuotes) {
      const fields = parseCSVLine(current, delimiter)
      if (fields.length > 1) rows.push(fields)
      current = ''
    }
  }
  return rows
}

function parseCSVLine(line, delimiter = ',') {
  const fields = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === delimiter) {
        fields.push(current)
        current = ''
      } else {
        current += ch
      }
    }
  }
  fields.push(current)
  return fields
}

// ─── Find the most recent CSV report ────────────────────────────────────────

function findCSVReport() {
  const files = fs.readdirSync(process.cwd())
    .filter(f => f.startsWith('fields-of-work-cleanup-report-') && f.endsWith('.csv'))
    .sort()
    .reverse()

  if (files.length === 0) {
    throw new Error('No CSV report found. Run clean-fields-of-work-dry-run.js first.')
  }
  return files[0]
}

// ─── Strapi helpers ─────────────────────────────────────────────────────────

/**
 * Resolve a documentId to the numeric Strapi id + current field values.
 * Returns { id, ProfileImageAltText } so we can fix null required fields.
 */
async function resolveMember(documentId) {
  const url = `${STRAPI_URL}/api/members?filters[documentId][$eq]=${documentId}&fields[0]=ProfileImageAltText`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
  })
  if (!res.ok) throw new Error(`Filter lookup failed: ${res.status}`)
  const data = await res.json()
  if (!data.data || data.data.length === 0) throw new Error('Member not found')
  const m = data.data[0]
  return {
    id: m.id,
    ProfileImageAltText: m.ProfileImageAltText || '',
  }
}

/**
 * PUT update using the numeric id.
 */
async function updateMember(numericId, name, data) {
  const url = `${STRAPI_URL}/api/members/${numericId}`
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ data }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`PUT failed for ${name} (id ${numericId}): ${res.status} — ${body}`)
  }
  return res.json()
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 Fields-of-Work Cleanup — UPLOAD FROM CSV\n')
  console.log('⚠️  This will modify the Strapi database!\n')

  // Find and read CSV
  const csvFile = findCSVReport()
  console.log(`📄 Reading: ${csvFile}\n`)

  let csvText = fs.readFileSync(path.join(process.cwd(), csvFile), 'utf8')
  if (csvText.charCodeAt(0) === 0xFEFF) csvText = csvText.slice(1)

  // Auto-detect delimiter: if first line contains semicolons but the fields
  // aren't matching with comma parsing, use semicolon
  const firstLine = csvText.split('\n')[0]
  const delimiter = firstLine.includes(';') ? ';' : ','
  console.log(`   Detected delimiter: "${delimiter === ';' ? 'semicolon' : 'comma'}"`)

  const rows = parseCSV(csvText, delimiter)
  const headers = rows[0]
  const dataRows = rows.slice(1)

  // Find column indices
  const colIndex = {}
  headers.forEach((h, i) => { colIndex[h.trim()] = i })

  const docIdCol = colIndex['Document ID']
  const nameCol = colIndex['Name']
  const newFoWCol = colIndex['New FieldsOfWork NEW DESIGN']

  if (docIdCol === undefined || nameCol === undefined || newFoWCol === undefined) {
    throw new Error(`Missing required columns. Found: ${headers.join(', ')}`)
  }

  // Count how many have non-empty NEW DESIGN values
  const nonEmptyCount = dataRows.filter(r => (r[newFoWCol]?.trim() || '').length > 0).length
  console.log(`   Non-empty "New FieldsOfWork NEW DESIGN" entries: ${nonEmptyCount}`)

  console.log(`📊 Found ${dataRows.length} members in CSV\n`)

  let updatedCount = 0
  let errorCount = 0

  for (const row of dataRows) {
    const documentId = row[docIdCol]?.trim()
    const name = row[nameCol]?.trim()
    const newFoW = row[newFoWCol]?.trim() || ''

    if (!documentId || !name) {
      console.log(`   ⚠️  Skipping row with missing ID/Name`)
      continue
    }

    try {
      // Step 1: resolve documentId → numeric id + get current required fields
      const member = await resolveMember(documentId)

      // Step 2: PUT update using numeric id, including required fields to pass validation
      await updateMember(member.id, name, {
        FieldsOfWork: newFoW,
        ProfileImageAltText: member.ProfileImageAltText,
      })

      updatedCount++
      console.log(`   ✅ ${name} → ${newFoW || '(empty)'}`)
    } catch (err) {
      errorCount++
      console.error(`   ❌ ${name}: ${err.message}`)
    }

    // Small delay to avoid rate-limiting
    await new Promise(r => setTimeout(r, 200))
  }

  console.log(`\n📊 Results:`)
  console.log(`   Updated: ${updatedCount}`)
  console.log(`   Errors:  ${errorCount}`)
  console.log('\n✅ Done.')
}

main().catch(err => { console.error('❌', err.message); process.exit(1) })
