/**
 * Script to import just AuthToken entries from backup to destination Strapi
 *
 * Usage:
 * 1. First run: node scripts/export-strapi-backup.js
 * 2. Then run: node scripts/import-auth-tokens.js
 */

const fs = require('fs')
const path = require('path')
const https = require('https')

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' })

// Source Strapi (for export)
const SOURCE_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const SOURCE_TOKEN = process.env.STRAPI_API_TOKEN || process.env.NEXT_PUBLIC_STRAPI_API_TOKEN

// Destination Strapi (for import)
const DESTINATION_URL = process.env.DESTINATION_STRAPI_URL || 'https://helpful-wealth-0a46a9eabb.strapiapp.com'
const DESTINATION_TOKEN = process.env.DESTINATION_STRAPI_TOKEN

if (!SOURCE_URL || !SOURCE_TOKEN) {
  console.error('❌ Error: STRAPI_URL and STRAPI_API_TOKEN must be set in .env.local')
  process.exit(1)
}

if (!DESTINATION_TOKEN) {
  console.error('❌ Error: DESTINATION_STRAPI_TOKEN must be set in .env.local')
  process.exit(1)
}

// Fetch all auth tokens from source
async function fetchAuthTokens() {
  console.log('📡 Fetching auth-tokens from source...')

  let allTokens = []
  let page = 1
  const pageSize = 100
  let hasMore = true

  while (hasMore) {
    const url = `${SOURCE_URL}/api/auth-tokens?pagination[page]=${page}&pagination[pageSize]=${pageSize}`

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${SOURCE_TOKEN}`
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (data.data && data.data.length > 0) {
      allTokens = allTokens.concat(data.data)
      console.log(`   Page ${page}: ${data.data.length} tokens (total: ${allTokens.length})`)
    }

    if (data.meta && data.meta.pagination) {
      hasMore = page < data.meta.pagination.pageCount
      page++
    } else {
      hasMore = false
    }
  }

  console.log(`✅ Fetched ${allTokens.length} auth-tokens\n`)
  return allTokens
}

// Create entry in destination
async function createAuthToken(tokenData) {
  const url = `${DESTINATION_URL}/api/auth-tokens`

  // Clean system fields
  const cleaned = { ...tokenData }
  delete cleaned.id
  delete cleaned.documentId
  delete cleaned.createdAt
  delete cleaned.updatedAt
  delete cleaned.publishedAt
  delete cleaned.createdBy
  delete cleaned.updatedBy

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DESTINATION_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ data: cleaned })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`${response.status}: ${errorText}`)
  }

  return await response.json()
}

// Main function
async function main() {
  try {
    console.log('🚀 Starting AuthToken transfer...\n')
    console.log(`📍 Source: ${SOURCE_URL}`)
    console.log(`📍 Destination: ${DESTINATION_URL}\n`)

    // Fetch from source
    const tokens = await fetchAuthTokens()

    if (tokens.length === 0) {
      console.log('⚠️  No auth-tokens found to import')
      return
    }

    // Import to destination
    console.log('📥 Importing to destination...\n')

    let imported = 0
    let failed = 0

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]
      const identifier = token.email || `Token ${i + 1}`

      try {
        console.log(`   [${i + 1}/${tokens.length}] ${identifier}`)
        await createAuthToken(token)
        console.log(`   ✅ Imported: ${identifier}`)
        imported++
      } catch (error) {
        console.log(`   ❌ Failed: ${identifier} - ${error.message}`)
        failed++
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    console.log('\n' + '='.repeat(50))
    console.log('✅ AuthToken transfer completed!')
    console.log('='.repeat(50))
    console.log(`\n📊 Summary: ${imported} imported, ${failed} failed`)

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  }
}

main()
