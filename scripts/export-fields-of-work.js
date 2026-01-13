/**
 * Export FieldsOfWork from all members to a file for manual translation
 *
 * Usage: node scripts/export-fields-of-work.js
 *
 * Output: fields-of-work-export.csv
 */

const fs = require('fs')
require('dotenv').config({ path: '.env.local' })

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN || process.env.NEXT_PUBLIC_STRAPI_API_TOKEN

if (!STRAPI_URL || !STRAPI_API_TOKEN) {
  console.error('❌ Error: STRAPI_URL and STRAPI_API_TOKEN must be set in .env.local')
  process.exit(1)
}

async function fetchMembers() {
  console.log('📡 Fetching members...')

  let allMembers = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    const url = `${STRAPI_URL}/api/members?pagination[page]=${page}&pagination[pageSize]=100&fields[0]=Name&fields[1]=FieldsOfWork&fields[2]=Email`

    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${STRAPI_API_TOKEN}` }
    })

    if (!response.ok) throw new Error(`Failed: ${response.status}`)

    const data = await response.json()
    if (data.data?.length > 0) {
      allMembers = allMembers.concat(data.data)
    }

    hasMore = data.meta?.pagination ? page < data.meta.pagination.pageCount : false
    page++
  }

  return allMembers
}

async function main() {
  try {
    const members = await fetchMembers()
    console.log(`✅ Fetched ${members.length} members\n`)

    // Filter members with FieldsOfWork
    const withFields = members.filter(m => m.FieldsOfWork?.trim())

    // Create CSV content
    let csv = 'DocumentID,Name,FieldsOfWork_Original,FieldsOfWork_Greek\n'

    for (const m of withFields) {
      const docId = m.documentId || m.id
      const name = (m.Name || '').replace(/"/g, '""')
      const fields = (m.FieldsOfWork || '').replace(/"/g, '""')
      csv += `"${docId}","${name}","${fields}",""\n`
    }

    const filename = 'fields-of-work-export.csv'
    fs.writeFileSync(filename, csv, 'utf8')

    console.log(`📁 Exported to: ${filename}`)
    console.log(`📊 Members with FieldsOfWork: ${withFields.length}`)
    console.log('\n💡 Instructions:')
    console.log('   1. Open the CSV in Excel/Google Sheets')
    console.log('   2. Fill in the "FieldsOfWork_Greek" column')
    console.log('   3. Save and run: node scripts/import-fields-of-work.js')

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

main()
