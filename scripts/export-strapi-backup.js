/**
 * Script to export all Strapi content types to JSON backup files
 *
 * Usage:
 * 1. Make sure you have your .env.local file with STRAPI_URL and STRAPI_API_TOKEN
 * 2. Run: node scripts/export-strapi-backup.js
 * 3. Find the output in: strapi-backup-[date]/ folder
 */

const fs = require('fs')
const path = require('path')

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' })

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN || process.env.NEXT_PUBLIC_STRAPI_API_TOKEN

if (!STRAPI_URL || !STRAPI_API_TOKEN) {
  console.error('❌ Error: STRAPI_URL and STRAPI_API_TOKEN must be set in .env.local')
  process.exit(1)
}

// Content types to export with their population settings
const CONTENT_TYPES = [
  {
    name: 'members',
    endpoint: '/api/members',
    populate: 'populate[0]=Image&populate[1]=Project1Pictures&populate[2]=Project2Pictures'
  },
  {
    name: 'activities',
    endpoint: '/api/activities',
    populate: 'populate=*'
  },
  {
    name: 'open-calls',
    endpoint: '/api/open-calls',
    populate: 'populate=*'
  },
  {
    name: 'hero-section',
    endpoint: '/api/hero-section',
    populate: 'populate=*',
    single: true // Single type, not a collection
  },
  {
    name: 'pages',
    endpoint: '/api/pages',
    populate: 'populate=*'
  },
  {
    name: 'auth-tokens',
    endpoint: '/api/auth-tokens',
    populate: 'populate=*'
  }
]

// Function to fetch all items from a collection with pagination
async function fetchCollection(contentType) {
  console.log(`📡 Fetching ${contentType.name}...`)

  if (contentType.single) {
    // Single type - just fetch once
    const url = `${STRAPI_URL}${contentType.endpoint}?${contentType.populate}`
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${STRAPI_API_TOKEN}`
      }
    })

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`   ⚠️  ${contentType.name} not found (might not exist yet)`)
        return null
      }
      throw new Error(`Failed to fetch ${contentType.name}: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log(`   ✅ Fetched ${contentType.name}`)
    return data
  }

  // Collection type - paginate
  let allItems = []
  let page = 1
  const pageSize = 100
  let hasMore = true

  while (hasMore) {
    const url = `${STRAPI_URL}${contentType.endpoint}?${contentType.populate}&pagination[page]=${page}&pagination[pageSize]=${pageSize}`

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${STRAPI_API_TOKEN}`
      }
    })

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`   ⚠️  ${contentType.name} not found (might not exist yet)`)
        return { data: [], meta: null }
      }
      throw new Error(`Failed to fetch ${contentType.name}: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (data.data && data.data.length > 0) {
      allItems = allItems.concat(data.data)
      if (page === 1) {
        console.log(`   Fetching page ${page}... (${data.data.length} items)`)
      } else {
        console.log(`   Fetching page ${page}... (${allItems.length} total)`)
      }
    }

    // Check if there are more pages
    if (data.meta && data.meta.pagination) {
      hasMore = page < data.meta.pagination.pageCount
      page++
    } else {
      hasMore = false
    }
  }

  console.log(`   ✅ Fetched ${allItems.length} ${contentType.name}`)
  return { data: allItems, meta: { total: allItems.length } }
}

// Function to download media files (optional)
async function downloadMedia(mediaUrl, outputDir) {
  try {
    const response = await fetch(mediaUrl)
    if (!response.ok) return null

    const buffer = await response.arrayBuffer()
    const filename = path.basename(new URL(mediaUrl).pathname)
    const filepath = path.join(outputDir, filename)

    fs.writeFileSync(filepath, Buffer.from(buffer))
    return filename
  } catch (error) {
    console.error(`   ⚠️  Failed to download: ${mediaUrl}`)
    return null
  }
}

// Main export function
async function main() {
  try {
    console.log('🚀 Starting Strapi backup export...\n')
    console.log(`📍 Source: ${STRAPI_URL}\n`)

    // Create backup directory with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0]
    const backupDir = path.join(process.cwd(), `strapi-backup-${timestamp}`)

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
    }

    const exportSummary = {
      exportedAt: new Date().toISOString(),
      sourceUrl: STRAPI_URL,
      contentTypes: {}
    }

    // Export each content type
    for (const contentType of CONTENT_TYPES) {
      try {
        const data = await fetchCollection(contentType)

        if (data) {
          const filename = `${contentType.name}.json`
          const filepath = path.join(backupDir, filename)

          fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8')

          const itemCount = contentType.single ? 1 : (data.data ? data.data.length : 0)
          exportSummary.contentTypes[contentType.name] = {
            count: itemCount,
            file: filename
          }
        }
      } catch (error) {
        console.error(`   ❌ Error exporting ${contentType.name}:`, error.message)
        exportSummary.contentTypes[contentType.name] = {
          error: error.message
        }
      }
    }

    // Write summary file
    const summaryPath = path.join(backupDir, 'export-summary.json')
    fs.writeFileSync(summaryPath, JSON.stringify(exportSummary, null, 2), 'utf8')

    console.log('\n' + '='.repeat(50))
    console.log('✅ Backup completed successfully!')
    console.log('='.repeat(50))
    console.log(`\n📁 Backup location: ${backupDir}`)
    console.log('\n📊 Export summary:')

    for (const [name, info] of Object.entries(exportSummary.contentTypes)) {
      if (info.error) {
        console.log(`   ❌ ${name}: ${info.error}`)
      } else {
        console.log(`   ✅ ${name}: ${info.count} items`)
      }
    }

    console.log('\n💡 To import this data to another Strapi instance:')
    console.log('   1. Use Strapi Transfer feature (recommended)')
    console.log('   2. Or create an import script using these JSON files')

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  }
}

// Run the script
main()
