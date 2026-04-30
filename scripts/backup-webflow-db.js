/**
 * Full Backup of Webflow CMS Database
 *
 * Downloads ALL collections, ALL items (with full HTML for rich text fields),
 * ALL linked images, and ALL site assets.
 *
 * Output structure in ~/Downloads/Old_website_DB_backup/:
 *   collections/
 *     <CollectionName>/
 *       data.json              — Full raw JSON (preserves HTML, links, formatting)
 *       <CollectionName>.csv   — CSV summary
 *       images/
 *         <itemSlug>__<fieldName>__<filename>  — Downloaded images
 *   assets/
 *     <filename>               — All site assets
 *   image-manifest.json        — Maps every image file to its collection/item/field
 *   backup-summary.json        — Overall backup report
 *
 * Usage: node scripts/backup-webflow-db.js
 */

const fs = require('fs')
const path = require('path')
const https = require('https')
const http = require('http')

// ─── Config ──────────────────────────────────────────────────────────

const WEBFLOW_API_KEY = 'c1fd5d86a2fe3f19b34cba6c6f0a6a1861751512b4ec00841b897f80205f98fb'
const WEBFLOW_SITE_ID = '63cfcf33f1ef1a3c759687cf'
const BACKUP_DIR = path.join(require('os').homedir(), 'Downloads', 'Old_website_DB_backup')

// ─── Helpers ─────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

function sanitizeFilename(name) {
  return (name || 'unnamed').replace(/[^a-zA-Z0-9_\-\u0370-\u03FF\u0400-\u04FF]/g, '_').substring(0, 100)
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

// Download a file from URL to disk
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    if (!url) return reject(new Error('No URL'))

    const proto = url.startsWith('https') ? https : http
    const request = (urlStr, redirectCount = 0) => {
      if (redirectCount > 5) return reject(new Error('Too many redirects'))

      proto.get(urlStr, { headers: { 'User-Agent': 'WebflowBackup/1.0' } }, (res) => {
        // Follow redirects
        if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
          return request(res.headers.location, redirectCount + 1)
        }
        if (res.statusCode !== 200) {
          res.resume()
          return reject(new Error(`HTTP ${res.statusCode} for ${urlStr}`))
        }
        const fileStream = fs.createWriteStream(destPath)
        res.pipe(fileStream)
        fileStream.on('finish', () => { fileStream.close(); resolve() })
        fileStream.on('error', reject)
      }).on('error', reject)
    }
    request(url)
  })
}

// Generic download with retry for both http and https
async function downloadFileRobust(url, destPath, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Use fetch for better redirect/protocol handling
      const res = await fetch(url, { redirect: 'follow' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const buffer = Buffer.from(await res.arrayBuffer())
      fs.writeFileSync(destPath, buffer)
      return true
    } catch (err) {
      if (attempt < retries) {
        await sleep(1000)
        continue
      }
      return false
    }
  }
  return false
}

function getExtFromUrl(url) {
  try {
    const pathname = new URL(url).pathname
    const ext = path.extname(pathname)
    return ext || '.bin'
  } catch {
    return '.bin'
  }
}

function getFilenameFromUrl(url) {
  try {
    const pathname = new URL(url).pathname
    return path.basename(pathname) || 'file'
  } catch {
    return 'file'
  }
}

// ─── Webflow API ─────────────────────────────────────────────────────

async function webflowFetch(url) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${WEBFLOW_API_KEY}`,
      'accept': 'application/json'
    }
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Webflow API ${res.status}: ${text}`)
  }
  return res.json()
}

async function fetchAllCollections() {
  const data = await webflowFetch(
    `https://api.webflow.com/v2/sites/${WEBFLOW_SITE_ID}/collections`
  )
  return data.collections || []
}

async function fetchAllItems(collectionId) {
  const items = []
  let offset = 0
  const limit = 100

  while (true) {
    const data = await webflowFetch(
      `https://api.webflow.com/v2/collections/${collectionId}/items?limit=${limit}&offset=${offset}`
    )
    items.push(...(data.items || []))
    const total = data.pagination?.total || 0
    if (offset + limit >= total) break
    offset += limit
    await sleep(1100) // Rate limit: 60 req/min
  }
  return items
}

async function fetchCollectionSchema(collectionId) {
  return await webflowFetch(
    `https://api.webflow.com/v2/collections/${collectionId}`
  )
}

// Fetch all site assets (paginated)
async function fetchAllAssets() {
  const assets = []
  let offset = 0
  const limit = 100

  while (true) {
    const data = await webflowFetch(
      `https://api.webflow.com/v2/sites/${WEBFLOW_SITE_ID}/assets?limit=${limit}&offset=${offset}`
    )
    assets.push(...(data.assets || []))
    const total = data.pagination?.total || assets.length
    if (offset + limit >= total || (data.assets || []).length === 0) break
    offset += limit
    await sleep(1100)
  }
  return assets
}

// ─── CSV Generation ──────────────────────────────────────────────────

function escapeCsvField(value) {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

function flattenFieldData(fieldData, schema) {
  const flat = {}
  if (!fieldData) return flat

  for (const [key, value] of Object.entries(fieldData)) {
    if (value === null || value === undefined) {
      flat[key] = ''
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      // Image/file objects — store URL
      if (value.url) {
        flat[key] = value.url
        if (value.alt) flat[`${key}_alt`] = value.alt
      } else {
        flat[key] = JSON.stringify(value)
      }
    } else if (Array.isArray(value)) {
      // Reference arrays or multi-image — store as JSON
      flat[key] = JSON.stringify(value)
    } else {
      flat[key] = value
    }
  }
  return flat
}

function generateCsv(items, collectionName) {
  if (!items || items.length === 0) return 'No items'

  // Collect all field keys
  const allKeys = new Set(['id', 'cmsLocaleId'])
  for (const item of items) {
    if (item.fieldData) {
      for (const key of Object.keys(item.fieldData)) {
        allKeys.add(key)
      }
    }
  }

  const headers = Array.from(allKeys)
  const headerRow = headers.map(h => escapeCsvField(h)).join(',')

  const dataRows = items.map(item => {
    const flat = flattenFieldData(item.fieldData || {})
    return headers.map(h => {
      if (h === 'id') return escapeCsvField(item.id)
      if (h === 'cmsLocaleId') return escapeCsvField(item.cmsLocaleId || '')
      return escapeCsvField(flat[h] || '')
    }).join(',')
  })

  return [headerRow, ...dataRows].join('\n')
}

// ─── Image Extraction from Items ─────────────────────────────────────

function extractImageUrls(fieldData, itemSlug) {
  const images = []
  if (!fieldData) return images

  for (const [key, value] of Object.entries(fieldData)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Single image/file field
      if (value.url) {
        images.push({
          field: key,
          url: value.url,
          alt: value.alt || '',
          itemSlug: itemSlug || 'unknown'
        })
      }
    } else if (Array.isArray(value)) {
      // Multi-image field
      for (let i = 0; i < value.length; i++) {
        const v = value[i]
        if (v && typeof v === 'object' && v.url) {
          images.push({
            field: `${key}_${i}`,
            url: v.url,
            alt: v.alt || '',
            itemSlug: itemSlug || 'unknown'
          })
        }
      }
    }
    // Also catch image URLs in rich text HTML
    if (typeof value === 'string' && value.includes('<img')) {
      const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/gi
      let match
      let idx = 0
      while ((match = imgRegex.exec(value)) !== null) {
        images.push({
          field: `${key}_inline_${idx}`,
          url: match[1],
          alt: '',
          itemSlug: itemSlug || 'unknown'
        })
        idx++
      }
    }
  }
  return images
}

// ─── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗')
  console.log('║        WEBFLOW CMS FULL DATABASE BACKUP                 ║')
  console.log('╚══════════════════════════════════════════════════════════╝')
  console.log(`\nBackup directory: ${BACKUP_DIR}\n`)

  ensureDir(BACKUP_DIR)
  ensureDir(path.join(BACKUP_DIR, 'collections'))
  ensureDir(path.join(BACKUP_DIR, 'assets'))

  const imageManifest = [] // Track all downloaded images
  const summary = {
    backupDate: new Date().toISOString(),
    siteId: WEBFLOW_SITE_ID,
    collections: [],
    totalItems: 0,
    totalImages: 0,
    totalAssets: 0,
    errors: []
  }

  // ─── Step 1: Discover all collections ───────────────────────────
  console.log('1. Discovering collections...')
  let collections
  try {
    collections = await fetchAllCollections()
    console.log(`   Found ${collections.length} collections:`)
    for (const col of collections) {
      console.log(`   - ${col.displayName || col.slug} (${col.id})`)
    }
  } catch (err) {
    console.error(`   FATAL: Cannot fetch collections: ${err.message}`)
    process.exit(1)
  }

  // Save collections metadata
  fs.writeFileSync(
    path.join(BACKUP_DIR, 'collections-metadata.json'),
    JSON.stringify(collections, null, 2),
    'utf-8'
  )

  // ─── Step 2: Backup each collection ─────────────────────────────
  console.log('\n2. Backing up collections...\n')

  for (const col of collections) {
    const colName = col.displayName || col.slug || col.id
    const colDir = path.join(BACKUP_DIR, 'collections', sanitizeFilename(colName))
    const imgDir = path.join(colDir, 'images')
    ensureDir(colDir)
    ensureDir(imgDir)

    console.log(`\n   ━━━ ${colName} (${col.id}) ━━━`)

    // Fetch schema
    let schema = null
    try {
      schema = await fetchCollectionSchema(col.id)
      fs.writeFileSync(
        path.join(colDir, 'schema.json'),
        JSON.stringify(schema, null, 2),
        'utf-8'
      )
      console.log(`   Schema saved (${(schema.fields || []).length} fields)`)
      await sleep(1100)
    } catch (err) {
      console.log(`   ⚠️ Could not fetch schema: ${err.message}`)
      summary.errors.push({ collection: colName, error: `Schema: ${err.message}` })
    }

    // Fetch all items
    let items = []
    try {
      items = await fetchAllItems(col.id)
      console.log(`   ${items.length} items fetched`)
    } catch (err) {
      console.log(`   ❌ Failed to fetch items: ${err.message}`)
      summary.errors.push({ collection: colName, error: `Items: ${err.message}` })
      continue
    }

    // Save full raw JSON (preserves ALL HTML, links, formatting)
    fs.writeFileSync(
      path.join(colDir, 'data.json'),
      JSON.stringify(items, null, 2),
      'utf-8'
    )
    console.log(`   data.json saved (raw HTML preserved)`)

    // Generate and save CSV
    const csv = generateCsv(items, colName)
    fs.writeFileSync(
      path.join(colDir, `${sanitizeFilename(colName)}.csv`),
      csv,
      'utf-8'
    )
    console.log(`   CSV saved`)

    // Download images from items
    let imgCount = 0
    for (const item of items) {
      const itemSlug = item.fieldData?.slug || item.fieldData?.name || item.id
      const images = extractImageUrls(item.fieldData, itemSlug)

      for (const img of images) {
        const ext = getExtFromUrl(img.url)
        const safeSlug = sanitizeFilename(itemSlug)
        const safeField = sanitizeFilename(img.field)
        const filename = `${safeSlug}__${safeField}${ext}`
        const destPath = path.join(imgDir, filename)

        try {
          const ok = await downloadFileRobust(img.url, destPath)
          if (ok) {
            imgCount++
            imageManifest.push({
              collection: colName,
              collectionId: col.id,
              itemId: item.id,
              itemSlug: String(itemSlug),
              itemName: item.fieldData?.name || item.fieldData?.slug || '',
              field: img.field,
              originalUrl: img.url,
              alt: img.alt,
              localPath: path.relative(BACKUP_DIR, destPath)
            })
          } else {
            summary.errors.push({
              collection: colName,
              item: String(itemSlug),
              field: img.field,
              error: `Download failed: ${img.url}`
            })
          }
        } catch (err) {
          summary.errors.push({
            collection: colName,
            item: String(itemSlug),
            field: img.field,
            error: err.message
          })
        }

        await sleep(200) // Don't hammer servers
      }
    }

    console.log(`   ${imgCount} images downloaded`)

    summary.collections.push({
      name: colName,
      id: col.id,
      itemCount: items.length,
      imageCount: imgCount,
      fields: (schema?.fields || []).map(f => ({
        slug: f.slug,
        displayName: f.displayName,
        type: f.type
      }))
    })
    summary.totalItems += items.length
    summary.totalImages += imgCount
  }

  // ─── Step 3: Download all site assets ───────────────────────────
  console.log('\n\n3. Downloading site assets...')

  let assets = []
  try {
    assets = await fetchAllAssets()
    console.log(`   Found ${assets.length} assets`)
  } catch (err) {
    console.log(`   ⚠️ Could not fetch assets: ${err.message}`)
    summary.errors.push({ section: 'assets', error: err.message })
  }

  // Save assets metadata
  fs.writeFileSync(
    path.join(BACKUP_DIR, 'assets', 'assets-metadata.json'),
    JSON.stringify(assets, null, 2),
    'utf-8'
  )

  let assetCount = 0
  for (const asset of assets) {
    const url = asset.hostedUrl || asset.url || asset.originalFileName
    if (!url || !url.startsWith('http')) continue

    const origName = asset.fileName || asset.originalFileName || getFilenameFromUrl(url)
    const safeName = `${asset.id || assetCount}__${sanitizeFilename(path.parse(origName).name)}${path.extname(origName) || getExtFromUrl(url)}`
    const destPath = path.join(BACKUP_DIR, 'assets', safeName)

    try {
      const ok = await downloadFileRobust(url, destPath)
      if (ok) {
        assetCount++
        imageManifest.push({
          collection: '__SITE_ASSET__',
          itemId: asset.id,
          itemName: origName,
          field: 'asset',
          originalUrl: url,
          alt: asset.alt || '',
          localPath: path.relative(BACKUP_DIR, destPath)
        })
      }
    } catch (err) {
      summary.errors.push({ section: 'assets', asset: origName, error: err.message })
    }

    await sleep(200)

    if (assetCount % 10 === 0 && assetCount > 0) {
      process.stdout.write(`   ${assetCount} assets downloaded...\r`)
    }
  }

  console.log(`   ${assetCount} assets downloaded`)
  summary.totalAssets = assetCount

  // ─── Step 4: Save manifests and summary ─────────────────────────
  console.log('\n4. Saving manifests...')

  fs.writeFileSync(
    path.join(BACKUP_DIR, 'image-manifest.json'),
    JSON.stringify(imageManifest, null, 2),
    'utf-8'
  )
  console.log(`   image-manifest.json (${imageManifest.length} entries)`)

  fs.writeFileSync(
    path.join(BACKUP_DIR, 'backup-summary.json'),
    JSON.stringify(summary, null, 2),
    'utf-8'
  )
  console.log(`   backup-summary.json`)

  // ─── Final report ──────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════════════════╗')
  console.log('║                    BACKUP COMPLETE                       ║')
  console.log('╚══════════════════════════════════════════════════════════╝')
  console.log(`\n   Collections: ${summary.collections.length}`)
  for (const c of summary.collections) {
    console.log(`     - ${c.name}: ${c.itemCount} items, ${c.imageCount} images`)
  }
  console.log(`\n   Total items:  ${summary.totalItems}`)
  console.log(`   Total images: ${summary.totalImages}`)
  console.log(`   Total assets: ${summary.totalAssets}`)
  console.log(`   Errors:       ${summary.errors.length}`)
  if (summary.errors.length > 0) {
    console.log(`\n   Errors:`)
    for (const e of summary.errors.slice(0, 20)) {
      console.log(`     - ${e.collection || e.section}: ${e.error}`)
    }
    if (summary.errors.length > 20) {
      console.log(`     ... and ${summary.errors.length - 20} more (see backup-summary.json)`)
    }
  }
  console.log(`\n   Backup location: ${BACKUP_DIR}`)
}

main().catch(err => {
  console.error('\nFATAL ERROR:', err)
  process.exit(1)
})
