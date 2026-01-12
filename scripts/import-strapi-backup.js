/**
 * Script to import Strapi backup JSON files to a destination Strapi instance
 *
 * Usage:
 * 1. First run: node scripts/export-strapi-backup.js (to create backup)
 * 2. Set DESTINATION_STRAPI_URL and DESTINATION_STRAPI_TOKEN in .env.local
 * 3. Run: node scripts/import-strapi-backup.js
 *
 * Or pass the backup folder as argument:
 *    node scripts/import-strapi-backup.js strapi-backup-2024-01-15
 */

const fs = require('fs')
const path = require('path')
const https = require('https')
const http = require('http')

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' })

// Destination Strapi configuration
const DESTINATION_URL = process.env.DESTINATION_STRAPI_URL || 'https://helpful-wealth-0a46a9eabb.strapiapp.com'
const DESTINATION_TOKEN = process.env.DESTINATION_STRAPI_TOKEN

if (!DESTINATION_TOKEN) {
  console.error('❌ Error: DESTINATION_STRAPI_TOKEN must be set in .env.local')
  console.error('   Add this line to your .env.local:')
  console.error('   DESTINATION_STRAPI_TOKEN=your_api_token_here')
  process.exit(1)
}

// Content types to import (order matters for relations)
const CONTENT_TYPES = [
  { name: 'hero-section', endpoint: '/api/hero-section', single: true },
  { name: 'pages', endpoint: '/api/pages', single: false },
  { name: 'activities', endpoint: '/api/activities', single: false },
  { name: 'open-calls', endpoint: '/api/open-calls', single: false },
  { name: 'members', endpoint: '/api/members', single: false },
  { name: 'auth-tokens', endpoint: '/api/auth-tokens', single: false }
]

// Fields that contain media (need special handling)
const MEDIA_FIELDS = {
  'members': ['Image', 'Project1Pictures', 'Project2Pictures'],
  'activities': ['Visuals'],
  'open-calls': ['Image'],
  'hero-section': ['BackgroundImage', 'BackgroundVideo'],
  'pages': ['FeaturedImage']
}

// Find the most recent backup folder
function findBackupFolder(specificFolder = null) {
  if (specificFolder) {
    const fullPath = path.join(process.cwd(), specificFolder)
    if (fs.existsSync(fullPath)) {
      return fullPath
    }
    throw new Error(`Backup folder not found: ${specificFolder}`)
  }

  // Find most recent strapi-backup-* folder
  const files = fs.readdirSync(process.cwd())
  const backupFolders = files
    .filter(f => f.startsWith('strapi-backup-'))
    .filter(f => fs.statSync(path.join(process.cwd(), f)).isDirectory())
    .sort()
    .reverse()

  if (backupFolders.length === 0) {
    throw new Error('No backup folder found. Run export-strapi-backup.js first.')
  }

  return path.join(process.cwd(), backupFolders[0])
}

// Download file from URL and return buffer
async function downloadFile(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http
    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Follow redirect
        downloadFile(response.headers.location).then(resolve).catch(reject)
        return
      }
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`))
        return
      }
      const chunks = []
      response.on('data', chunk => chunks.push(chunk))
      response.on('end', () => resolve({
        buffer: Buffer.concat(chunks),
        contentType: response.headers['content-type'] || 'application/octet-stream'
      }))
      response.on('error', reject)
    }).on('error', reject)
  })
}

// Upload file using multipart form data (manual implementation)
async function uploadToStrapi(buffer, filename, contentType) {
  return new Promise((resolve, reject) => {
    const boundary = '----FormBoundary' + Math.random().toString(36).substring(2)

    // Build multipart body
    const header = `--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`
    const footer = `\r\n--${boundary}--\r\n`

    const headerBuffer = Buffer.from(header, 'utf8')
    const footerBuffer = Buffer.from(footer, 'utf8')
    const body = Buffer.concat([headerBuffer, buffer, footerBuffer])

    const url = new URL(`${DESTINATION_URL}/api/upload`)
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DESTINATION_TOKEN}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length
      }
    }

    const protocol = url.protocol === 'https:' ? https : http
    const req = protocol.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          try {
            resolve(JSON.parse(data))
          } catch (e) {
            reject(new Error(`Invalid JSON response: ${data}`))
          }
        } else {
          reject(new Error(`Upload failed: ${res.statusCode} - ${data}`))
        }
      })
    })

    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

// Upload a media file from URL to destination Strapi
async function uploadMediaFromUrl(mediaUrl, filename) {
  try {
    console.log(`      📤 Uploading: ${filename}`)

    // Download the file
    const { buffer, contentType } = await downloadFile(mediaUrl)

    if (!buffer || buffer.length === 0) {
      console.log(`      ⚠️  Empty file downloaded: ${mediaUrl}`)
      return null
    }

    // Upload to destination Strapi
    const uploadedFiles = await uploadToStrapi(buffer, filename, contentType)

    if (uploadedFiles && uploadedFiles.length > 0) {
      console.log(`      ✅ Uploaded: ${filename} (ID: ${uploadedFiles[0].id})`)
      return uploadedFiles[0].id
    }

    return null
  } catch (error) {
    console.log(`      ⚠️  Error uploading ${filename}: ${error.message}`)
    return null
  }
}

// Process media fields and upload files
async function processMediaFields(item, contentTypeName) {
  const mediaFields = MEDIA_FIELDS[contentTypeName] || []
  const processedItem = { ...item }

  for (const fieldName of mediaFields) {
    const mediaData = item[fieldName]

    if (!mediaData) continue

    // Handle array of media (multiple files)
    if (Array.isArray(mediaData)) {
      const uploadedIds = []
      for (const media of mediaData) {
        if (media && media.url) {
          const filename = path.basename(media.url.split('?')[0])
          const uploadedId = await uploadMediaFromUrl(media.url, filename)
          if (uploadedId) {
            uploadedIds.push(uploadedId)
          }
        }
      }
      processedItem[fieldName] = uploadedIds.length > 0 ? uploadedIds : null
    }
    // Handle single media file
    else if (mediaData && mediaData.url) {
      const filename = path.basename(mediaData.url.split('?')[0])
      const uploadedId = await uploadMediaFromUrl(mediaData.url, filename)
      processedItem[fieldName] = uploadedId || null
    }
  }

  return processedItem
}

// Remove system fields that shouldn't be sent on create
function cleanItemForCreate(item) {
  const cleaned = { ...item }

  // Remove Strapi system fields
  delete cleaned.id
  delete cleaned.documentId
  delete cleaned.createdAt
  delete cleaned.updatedAt
  delete cleaned.publishedAt
  delete cleaned.createdBy
  delete cleaned.updatedBy
  delete cleaned.locale
  delete cleaned.localizations

  return cleaned
}

// Create an entry in destination Strapi
async function createEntry(endpoint, data, single = false) {
  const url = single ? `${DESTINATION_URL}${endpoint}` : `${DESTINATION_URL}${endpoint}`
  const method = single ? 'PUT' : 'POST'

  const response = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${DESTINATION_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ data })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`${response.status}: ${errorText}`)
  }

  return await response.json()
}

// Import a content type
async function importContentType(contentType, backupFolder) {
  const filename = `${contentType.name}.json`
  const filepath = path.join(backupFolder, filename)

  if (!fs.existsSync(filepath)) {
    console.log(`   ⚠️  ${filename} not found, skipping`)
    return { imported: 0, failed: 0 }
  }

  console.log(`\n📥 Importing ${contentType.name}...`)

  const fileContent = fs.readFileSync(filepath, 'utf8')
  const jsonData = JSON.parse(fileContent)

  let imported = 0
  let failed = 0

  if (contentType.single) {
    // Single type
    try {
      const data = jsonData.data || jsonData
      if (data) {
        console.log(`   Processing single type...`)
        const processedData = await processMediaFields(data, contentType.name)
        const cleanedData = cleanItemForCreate(processedData)
        await createEntry(contentType.endpoint, cleanedData, true)
        console.log(`   ✅ Imported ${contentType.name}`)
        imported = 1
      }
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`)
      failed = 1
    }
  } else {
    // Collection type
    const items = jsonData.data || []
    console.log(`   Found ${items.length} items to import`)

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const itemName = item.Name || item.Title || item.title || item.name || `Item ${i + 1}`

      try {
        console.log(`   [${i + 1}/${items.length}] ${itemName}`)

        // Process media fields (upload files)
        const processedItem = await processMediaFields(item, contentType.name)

        // Clean system fields
        const cleanedItem = cleanItemForCreate(processedItem)

        // Create entry
        await createEntry(contentType.endpoint, cleanedItem, false)
        console.log(`   ✅ Imported: ${itemName}`)
        imported++
      } catch (error) {
        console.log(`   ❌ Failed: ${itemName} - ${error.message}`)
        failed++
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  return { imported, failed }
}

// Main function
async function main() {
  try {
    console.log('🚀 Starting Strapi import...\n')
    console.log(`📍 Destination: ${DESTINATION_URL}\n`)

    // Find backup folder
    const specificFolder = process.argv[2]
    const backupFolder = findBackupFolder(specificFolder)
    console.log(`📁 Using backup: ${backupFolder}\n`)

    const results = {}

    // Import each content type
    for (const contentType of CONTENT_TYPES) {
      const result = await importContentType(contentType, backupFolder)
      results[contentType.name] = result
    }

    // Print summary
    console.log('\n' + '='.repeat(50))
    console.log('✅ Import completed!')
    console.log('='.repeat(50))
    console.log('\n📊 Import summary:')

    let totalImported = 0
    let totalFailed = 0

    for (const [name, result] of Object.entries(results)) {
      console.log(`   ${name}: ${result.imported} imported, ${result.failed} failed`)
      totalImported += result.imported
      totalFailed += result.failed
    }

    console.log(`\n   Total: ${totalImported} imported, ${totalFailed} failed`)

    if (totalFailed > 0) {
      console.log('\n⚠️  Some items failed to import. Check the logs above for details.')
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  }
}

// Run the script
main()
