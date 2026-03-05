/**
 * Fix "Περισσότερα:" entries in member project descriptions.
 *
 * Scans all members' Project1Description and Project2Description blocks.
 * If a block contains "Περισσότερα:" followed by a URL, removes that line/block
 * and appends the URL(s) to the respective ProjectNLinks field.
 *
 * Usage:
 *   node scripts/fix-perissottera-links.js             # dry-run (default)
 *   node scripts/fix-perissottera-links.js --execute    # write to Strapi
 */

require('dotenv').config({ path: '.env.local' })

const STRAPI_URL = process.env.STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN
const EXECUTE = process.argv.includes('--execute')

if (!STRAPI_URL || !STRAPI_API_TOKEN) {
  console.error('STRAPI_URL and STRAPI_API_TOKEN must be set in .env.local')
  process.exit(1)
}

// URL regex
const URL_RE = /https?:\/\/[^\s<>"',)}\]]+/g

/**
 * Recursively extract all text from a block's children tree
 */
function extractText(children) {
  if (!children || !Array.isArray(children)) return ''
  return children.map(child => {
    if (child.type === 'text') return child.text || ''
    if (child.type === 'link') return child.url || ''
    if (child.children) return extractText(child.children)
    return ''
  }).join(' ')
}

/**
 * Extract URLs from a block's children (from link nodes and text content)
 */
function extractUrls(children) {
  const urls = []
  if (!children || !Array.isArray(children)) return urls

  for (const child of children) {
    if (child.type === 'link' && child.url) {
      urls.push(child.url)
    }
    if (child.type === 'text' && child.text) {
      const matches = child.text.match(URL_RE)
      if (matches) urls.push(...matches)
    }
    if (child.children) {
      urls.push(...extractUrls(child.children))
    }
  }
  return urls
}

/**
 * Check if a block contains "Περισσότερα" pattern
 */
function hasPerissottera(block) {
  const text = extractText(block.children || [])
  return /περισσ[οό]τερα\s*:/i.test(text)
}

/**
 * Process blocks: remove "Περισσότερα:" blocks, return extracted URLs
 */
function processBlocks(blocks) {
  if (!blocks || !Array.isArray(blocks)) return { cleaned: blocks, urls: [] }

  const cleaned = []
  const urls = []

  for (const block of blocks) {
    if (hasPerissottera(block)) {
      // Extract URLs from this block
      const blockUrls = extractUrls(block.children || [])
      urls.push(...blockUrls)

      // Also try to extract URLs from the raw text
      const text = extractText(block.children || [])
      const textUrls = text.match(URL_RE) || []
      for (const u of textUrls) {
        if (!urls.includes(u)) urls.push(u)
      }
    } else {
      cleaned.push(block)
    }
  }

  // Ensure at least one block remains (Strapi requires non-empty blocks)
  if (cleaned.length === 0 && blocks.length > 0) {
    cleaned.push({ type: 'paragraph', children: [{ type: 'text', text: '' }] })
  }

  return { cleaned, urls }
}

async function fetchAllMembers() {
  const members = []
  let page = 1
  const pageSize = 25

  while (true) {
    const fields = [
      'fields[0]=Name',
      'fields[1]=Project1Links',
      'fields[2]=Project2Links',
      'fields[3]=Project1Title',
      'fields[4]=Project2Title',
      'fields[5]=Project1Description',
      'fields[6]=Project2Description',
    ].join('&')

    const res = await fetch(
      `${STRAPI_URL}/api/members?${fields}&pagination[page]=${page}&pagination[pageSize]=${pageSize}`,
      { headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` } }
    )
    const data = await res.json()
    members.push(...data.data)
    if (page >= data.meta.pagination.pageCount) break
    page++
  }
  return members
}

async function main() {
  console.log(EXECUTE
    ? '🔴 EXECUTE MODE — Changes WILL be written to Strapi\n'
    : '🟡 DRY-RUN MODE — No changes will be made (use --execute to write)\n'
  )

  console.log('Fetching all members...')
  const members = await fetchAllMembers()
  console.log(`Found ${members.length} members\n`)

  let totalFixed = 0
  const results = []

  for (const member of members) {
    for (const slot of [1, 2]) {
      const descField = `Project${slot}Description`
      const linksField = `Project${slot}Links`
      const titleField = `Project${slot}Title`

      const blocks = member[descField]
      const title = member[titleField]
      if (!blocks || !Array.isArray(blocks) || blocks.length === 0) continue

      const { cleaned, urls } = processBlocks(blocks)

      if (urls.length === 0) continue

      // Deduplicate URLs
      const uniqueUrls = [...new Set(urls)]

      // Merge with existing links
      const existingLinks = (member[linksField] || '').trim()
      const existingUrlList = existingLinks ? existingLinks.split('\n').map(l => l.trim()).filter(Boolean) : []

      // Only add URLs that aren't already in the links field
      const newUrls = uniqueUrls.filter(u => !existingUrlList.some(existing => existing === u))
      const mergedLinks = [...existingUrlList, ...newUrls].join('\n')

      console.log(`📋 ${member.Name} → Project${slot}: "${title}"`)
      console.log(`   Found "Περισσότερα:" with ${uniqueUrls.length} URL(s):`)
      for (const u of uniqueUrls) {
        const isNew = newUrls.includes(u)
        console.log(`     ${isNew ? '➕' : '⏭️ (already in links)'} ${u}`)
      }
      console.log(`   Blocks: ${blocks.length} → ${cleaned.length} (removed ${blocks.length - cleaned.length})`)

      results.push({
        member: member.Name,
        memberId: member.id,
        slot,
        title,
        urlsFound: uniqueUrls,
        urlsAdded: newUrls,
        blocksRemoved: blocks.length - cleaned.length,
        cleanedBlocks: cleaned,
        mergedLinks,
      })

      if (EXECUTE) {
        const payload = {
          data: {
            [descField]: cleaned,
            [linksField]: mergedLinks,
          }
        }

        const res = await fetch(`${STRAPI_URL}/api/members/${member.id}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${STRAPI_API_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        })

        if (!res.ok) {
          const errText = await res.text()
          console.log(`   ❌ PUT failed: ${res.status} ${errText.substring(0, 200)}`)
        } else {
          console.log(`   ✅ Updated`)
          totalFixed++
        }

        // Rate limit
        await new Promise(r => setTimeout(r, 1500))
      } else {
        totalFixed++
      }

      console.log('')
    }
  }

  console.log('─'.repeat(60))
  console.log(`\nTotal: ${totalFixed} project(s) with "Περισσότερα:" found`)
  if (!EXECUTE && totalFixed > 0) {
    console.log('Run with --execute to apply changes.')
  }
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
