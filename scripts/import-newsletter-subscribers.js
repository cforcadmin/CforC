/**
 * Import newsletter subscribers from Sender CSV export into Strapi
 *
 * Usage:
 * 1. Make sure you have your .env.local file with STRAPI_URL and STRAPI_API_TOKEN
 * 2. Run: node scripts/import-newsletter-subscribers.js <path-to-csv>
 *
 * - Skips duplicates (checks Strapi before creating)
 * - Skips bounced/unsubscribed emails
 * - Uses the CSV "Created" date as ConfirmedAt
 */

const fs = require('fs')
const path = require('path')

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' })

const STRAPI_URL = process.env.STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

if (!STRAPI_URL || !STRAPI_API_TOKEN) {
  console.error('❌ Error: STRAPI_URL and STRAPI_API_TOKEN must be set in .env.local')
  process.exit(1)
}

const csvPath = process.argv[2]
if (!csvPath) {
  console.error('❌ Usage: node scripts/import-newsletter-subscribers.js <path-to-csv>')
  process.exit(1)
}

function parseCsvLine(line) {
  const fields = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  fields.push(current.trim())
  return fields
}

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
      console.error('❌ Failed to fetch existing subscribers:', await res.text())
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

async function createSubscriber(email, confirmedAt) {
  const res = await fetch(`${STRAPI_URL}/api/newsletter-subscribers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
    },
    body: JSON.stringify({
      data: {
        Email: email,
        ConfirmedAt: confirmedAt,
      },
    }),
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(errorText)
  }

  return await res.json()
}

async function main() {
  const absolutePath = path.resolve(csvPath)
  if (!fs.existsSync(absolutePath)) {
    console.error(`❌ File not found: ${absolutePath}`)
    process.exit(1)
  }

  const content = fs.readFileSync(absolutePath, 'utf-8')
  const lines = content.split('\n').filter(line => line.trim())

  // Parse header
  const header = parseCsvLine(lines[0])
  const emailIdx = header.indexOf('Email')
  const statusIdx = header.indexOf('Email status')
  const createdIdx = header.indexOf('Created')

  if (emailIdx === -1) {
    console.error('❌ CSV must have an "Email" column')
    process.exit(1)
  }

  // Parse rows
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i])
    const email = fields[emailIdx]
    const status = statusIdx !== -1 ? fields[statusIdx] : 'active'
    const created = createdIdx !== -1 ? fields[createdIdx] : ''

    if (!email || !email.includes('@')) continue

    // Skip bounced/unsubscribed
    if (status === 'bounced' || status === 'unsubscribed') {
      console.log(`⏭️  Skipping (${status}): ${email}`)
      continue
    }

    rows.push({ email: email.toLowerCase(), created: created.trim() })
  }

  console.log(`📋 Found ${rows.length} active subscribers in CSV`)

  // Fetch existing subscribers from Strapi
  console.log('🔍 Checking for existing subscribers in Strapi...')
  const existing = await fetchExistingSubscribers()
  console.log(`📊 Found ${existing.size} existing subscribers in Strapi`)

  // Filter out duplicates
  const toImport = rows.filter(row => !existing.has(row.email))
  const duplicates = rows.length - toImport.length

  console.log(`✅ ${toImport.length} new subscribers to import`)
  if (duplicates > 0) {
    console.log(`⏭️  ${duplicates} duplicates skipped`)
  }

  if (toImport.length === 0) {
    console.log('🎉 Nothing to import — all subscribers already exist!')
    return
  }

  // Import with rate limiting
  let created = 0
  let errors = 0

  for (const row of toImport) {
    const confirmedAt = row.created ? new Date(row.created).toISOString() : new Date().toISOString()

    try {
      await createSubscriber(row.email, confirmedAt)
      created++
      process.stdout.write(`\r✅ Created: ${created}/${toImport.length}`)
    } catch (err) {
      errors++
      console.log(`\n❌ Failed to create ${row.email}: ${err.message}`)
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  console.log(`\n\n🎉 Import complete!`)
  console.log(`   ✅ Created: ${created}`)
  console.log(`   ⏭️  Duplicates skipped: ${duplicates}`)
  if (errors > 0) console.log(`   ❌ Errors: ${errors}`)
}

main().catch(err => {
  console.error('❌ Unexpected error:', err)
  process.exit(1)
})
