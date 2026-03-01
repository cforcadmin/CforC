/**
 * Fix HTML entities in Activities and Open Calls
 *
 * Decodes &amp; → &, &quot; → ", &#x27; → ' in:
 * - Title (plain text)
 * - Description / EngDescription (rich text block children)
 * - Link (plain text URL)
 *
 * Run: node scripts/fix-html-entities.js
 * Dry run (no writes): node scripts/fix-html-entities.js --dry-run
 */

require('dotenv').config({ path: '.env.local' })

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN || process.env.NEXT_PUBLIC_STRAPI_API_TOKEN
const DRY_RUN = process.argv.includes('--dry-run')

if (!STRAPI_URL || !STRAPI_TOKEN) {
  console.error('Missing STRAPI_URL or STRAPI_API_TOKEN in .env.local')
  process.exit(1)
}

const ENTITY_MAP = {
  '&amp;': '&',
  '&quot;': '"',
  '&#x27;': "'",
  '&#39;': "'",
  '&lt;': '<',
  '&gt;': '>',
  '&nbsp;': ' ',
}

const ENTITY_REGEX = /&amp;|&quot;|&#x27;|&#39;|&lt;|&gt;|&nbsp;/g

function decodeEntities(str) {
  if (!str || typeof str !== 'string') return str
  return str.replace(ENTITY_REGEX, (match) => ENTITY_MAP[match] || match)
}

function hasEntities(str) {
  if (!str || typeof str !== 'string') return false
  return ENTITY_REGEX.test(str)
}

/**
 * Deep-scan and fix rich text blocks. Returns [fixedBlocks, changesMade[]]
 */
function fixRichTextBlocks(blocks, fieldName) {
  if (!blocks || !Array.isArray(blocks)) return [blocks, []]
  const changes = []
  let modified = false

  const fixedBlocks = blocks.map((block, blockIdx) => {
    if (!block.children) return block

    const fixedChildren = block.children.map((child, childIdx) => {
      // Fix text in direct children
      if (child.text && hasEntities(child.text)) {
        const original = child.text
        const fixed = decodeEntities(child.text)
        changes.push({
          field: `${fieldName}[${blockIdx}].children[${childIdx}].text`,
          original,
          fixed,
        })
        modified = true
        return { ...child, text: fixed }
      }

      // Fix text in nested children (e.g., list items, links)
      if (child.children) {
        const fixedNestedChildren = child.children.map((nested, nestedIdx) => {
          if (nested.text && hasEntities(nested.text)) {
            const original = nested.text
            const fixed = decodeEntities(nested.text)
            changes.push({
              field: `${fieldName}[${blockIdx}].children[${childIdx}].children[${nestedIdx}].text`,
              original,
              fixed,
            })
            modified = true
            return { ...nested, text: fixed }
          }
          return nested
        })
        return { ...child, children: fixedNestedChildren }
      }

      return child
    })

    return { ...block, children: fixedChildren }
  })

  return [modified ? fixedBlocks : blocks, changes]
}

async function fetchAll(collection) {
  const url = `${STRAPI_URL}/api/${collection}?populate=*&pagination[limit]=1000`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${STRAPI_TOKEN}` },
  })
  if (!res.ok) throw new Error(`Failed to fetch ${collection}: ${res.status}`)
  const json = await res.json()
  return json.data || []
}

async function updateEntry(collection, documentId, data) {
  const url = `${STRAPI_URL}/api/${collection}/${documentId}`
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${STRAPI_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ data }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to update ${collection}/${documentId}: ${res.status} - ${text}`)
  }
  return res.json()
}

async function processCollection(collectionName, collectionSlug) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`Processing: ${collectionName}`)
  console.log('='.repeat(60))

  const entries = await fetchAll(collectionSlug)
  console.log(`Fetched ${entries.length} entries\n`)

  let totalFixed = 0

  for (const entry of entries) {
    const updateData = {}
    const allChanges = []

    // Check plain text fields: Title, EngTitle, Link
    for (const field of ['Title', 'EngTitle', 'Link']) {
      if (entry[field] && hasEntities(entry[field])) {
        const original = entry[field]
        const fixed = decodeEntities(entry[field])
        allChanges.push({ field, original, fixed })
        updateData[field] = fixed
      }
    }

    // Check rich text fields: Description, EngDescription
    for (const field of ['Description', 'EngDescription']) {
      if (entry[field] && Array.isArray(entry[field])) {
        const [fixedBlocks, changes] = fixRichTextBlocks(entry[field], field)
        if (changes.length > 0) {
          allChanges.push(...changes)
          updateData[field] = fixedBlocks
        }
      }
    }

    if (allChanges.length === 0) continue

    // Preserve ImageAltText to avoid Strapi validation error
    if (entry.ImageAltText !== undefined) {
      updateData.ImageAltText = entry.ImageAltText || ''
    }

    totalFixed += allChanges.length
    console.log(`--- Entry ID ${entry.id} | ${entry.Title || entry.title || '(no title)'}`)
    for (const change of allChanges) {
      const snippet = change.original.length > 80
        ? change.original.substring(0, 80) + '...'
        : change.original
      console.log(`  [${change.field}]`)
      console.log(`    Before: ${snippet}`)
      console.log(`    After:  ${change.fixed.length > 80 ? change.fixed.substring(0, 80) + '...' : change.fixed}`)
    }

    if (!DRY_RUN) {
      try {
        await updateEntry(collectionSlug, entry.documentId, updateData)
        console.log(`  ✓ Updated successfully`)
      } catch (err) {
        console.error(`  ✗ FAILED: ${err.message}`)
      }
    } else {
      console.log(`  (dry run — no changes written)`)
    }
  }

  console.log(`\n${collectionName}: ${totalFixed} entities fixed across ${entries.length} entries`)
  return totalFixed
}

async function main() {
  console.log(`HTML Entity Fix Script`)
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE (writing to database)'}`)
  console.log(`Strapi: ${STRAPI_URL}`)

  let total = 0
  total += await processCollection('Activities', 'activities')
  total += await processCollection('Open Calls', 'open-calls')

  console.log(`\n${'='.repeat(60)}`)
  console.log(`DONE — ${total} total entities fixed`)
  if (DRY_RUN) console.log('(Dry run — re-run without --dry-run to apply changes)')
  console.log('='.repeat(60))
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
