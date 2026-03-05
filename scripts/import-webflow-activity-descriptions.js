/**
 * Import Webflow activity descriptions into Strapi
 *
 * For MATCHED activities (40): updates Description (blocks) and Title (title-cased)
 * For UNMATCHED activities (11): creates new Strapi entries with all fields
 *
 * Usage:
 *   node scripts/import-webflow-activity-descriptions.js             # dry-run
 *   node scripts/import-webflow-activity-descriptions.js --execute    # write to Strapi
 */

require('dotenv').config({ path: '.env.local' })
const fs = require('fs')

// ─── Config ──────────────────────────────────────────────────────────

const WEBFLOW_API_KEY = 'b0ee3cdeef0fbb691c2e715f5f49ffb970207abd22e73807e5a2e74768a67dd2'
const WEBFLOW_ACTIVITIES_COLLECTION = '63f4dd52c89f6710a864b743'

const STRAPI_URL = process.env.STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN
const EXECUTE = process.argv.includes('--execute')

if (!STRAPI_URL || !STRAPI_API_TOKEN) {
  console.error('STRAPI_URL and STRAPI_API_TOKEN must be set in .env.local')
  process.exit(1)
}

// ─── Title case conversion ───────────────────────────────────────────

function toTitleCase(str) {
  if (!str) return str
  const letters = str.match(/\p{L}/gu) || []
  if (letters.length === 0) return str
  const upperCount = letters.filter(
    c => c === c.toLocaleUpperCase('el') && c !== c.toLocaleLowerCase('el')
  ).length
  const ratio = upperCount / letters.length
  if (ratio < 0.6) return str
  return str
    .toLocaleLowerCase('el')
    .replace(/(^|[\s\-\(\/"«|])\p{L}/gu, char => char.toLocaleUpperCase('el'))
}

// ─── Name normalization ──────────────────────────────────────────────

function normalize(name) {
  if (!name) return ''
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('el')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.,\-_()]/g, '')
}

// ─── Webflow API ─────────────────────────────────────────────────────

async function fetchAllWebflowItems(collectionId) {
  const items = []
  let offset = 0
  const limit = 100
  while (true) {
    const res = await fetch(
      `https://api.webflow.com/v2/collections/${collectionId}/items?limit=${limit}&offset=${offset}`,
      { headers: { Authorization: `Bearer ${WEBFLOW_API_KEY}` } }
    )
    if (!res.ok) throw new Error(`Webflow API ${res.status}: ${await res.text()}`)
    const data = await res.json()
    items.push(...data.items)
    if (offset + limit >= data.pagination.total) break
    offset += limit
    await new Promise(r => setTimeout(r, 1100))
  }
  return items
}

// ─── Strapi API ──────────────────────────────────────────────────────

async function fetchAllStrapiActivities() {
  const items = []
  let page = 1
  while (true) {
    const res = await fetch(
      `${STRAPI_URL}/api/activities?fields[0]=Title&fields[1]=Slug&pagination[page]=${page}&pagination[pageSize]=100`,
      { headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` } }
    )
    const data = await res.json()
    items.push(...data.data)
    if (page >= data.meta.pagination.pageCount) break
    page++
  }
  return items
}

async function uploadImageToStrapi(imageUrl, filename) {
  const imageRes = await fetch(imageUrl)
  if (!imageRes.ok) throw new Error(`Download failed: ${imageRes.statusText}`)
  const imageBuffer = await imageRes.arrayBuffer()
  const contentType = imageRes.headers.get('content-type') || 'image/jpeg'
  let ext = '.jpg'
  if (contentType.includes('png')) ext = '.png'
  else if (contentType.includes('webp')) ext = '.webp'
  else if (contentType.includes('gif')) ext = '.gif'
  const cleanFilename = filename.replace(/[^a-zA-Z0-9_-]/g, '_') + ext
  const blob = new Blob([imageBuffer], { type: contentType })
  const formData = new FormData()
  formData.append('files', blob, cleanFilename)
  const uploadRes = await fetch(`${STRAPI_URL}/api/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
    body: formData
  })
  if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.statusText}`)
  const result = await uploadRes.json()
  return result[0]
}

// ─── HTML → Strapi Blocks conversion ─────────────────────────────────

function decodeEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
}

function parseInline(html) {
  if (!html || !html.trim()) return [{ type: 'text', text: '' }]
  const children = []
  const tokens = html.split(/(<[^>]+>)/g).filter(Boolean)
  const stack = []
  for (const token of tokens) {
    if (/^<(br|hr|img)\b/i.test(token) || token.endsWith('/>')) {
      if (/^<br/i.test(token)) {
        const last = children[children.length - 1]
        if (last && last.type === 'text') last.text += '\n'
        else children.push({ type: 'text', text: '\n' })
      }
      continue
    }
    if (token.startsWith('</')) { stack.pop(); continue }
    if (token.startsWith('<')) {
      const m = token.match(/<(\w+)([^>]*)>/)
      if (!m) continue
      const tag = m[1].toLowerCase()
      const attrs = m[2] || ''
      if (tag === 'a') {
        const href = attrs.match(/href="([^"]*)"/)
        stack.push({ tag: 'a', href: href ? href[1] : '' })
      } else {
        stack.push({ tag })
      }
      continue
    }
    const text = decodeEntities(token)
    if (!text) continue
    const fmt = {}
    let isLink = false
    let linkUrl = ''
    for (const s of stack) {
      if (s.tag === 'strong' || s.tag === 'b') fmt.bold = true
      if (s.tag === 'em' || s.tag === 'i') fmt.italic = true
      if (s.tag === 'u') fmt.underline = true
      if (s.tag === 'a') { isLink = true; linkUrl = s.href }
    }
    if (isLink && linkUrl && (linkUrl.startsWith('http') || linkUrl.startsWith('mailto:') || linkUrl.startsWith('/'))) {
      children.push({ type: 'link', url: linkUrl, children: [{ type: 'text', text, ...fmt }] })
    } else {
      children.push({ type: 'text', text, ...fmt })
    }
  }
  return children.length > 0 ? children : [{ type: 'text', text: '' }]
}

function extractImages(html) {
  const images = []
  let clean = html.replace(/<figure[^>]*>([\s\S]*?)<\/figure>/gi, (_, content) => {
    const m = content.match(/<img[^>]+src="([^"]*)"[^>]*/)
    if (m) {
      const altM = content.match(/alt="([^"]*)"/)
      const idx = images.length
      images.push({ src: m[1], alt: altM ? altM[1] : '' })
      return `<p>__IMG_${idx}__</p>`
    }
    return ''
  })
  clean = clean.replace(/<img[^>]+src="([^"]*)"([^>]*)\/?\s*>/gi, (_, src, rest) => {
    const altM = rest.match(/alt="([^"]*)"/)
    const idx = images.length
    images.push({ src, alt: altM ? altM[1] : '' })
    return `<p>__IMG_${idx}__</p>`
  })
  return { cleanHtml: clean, images }
}

async function htmlToBlocks(html, activityName) {
  const empty = [{ type: 'paragraph', children: [{ type: 'text', text: '' }] }]
  if (!html || !html.trim()) return { blocks: empty, uploadedImageIds: [] }

  const { cleanHtml, images } = extractImages(html)

  // Upload inline images
  const uploaded = []
  const uploadedImageIds = []
  for (let i = 0; i < images.length; i++) {
    if (EXECUTE) {
      try {
        console.log(`      📥 Inline image ${i + 1}/${images.length}...`)
        const result = await uploadImageToStrapi(images[i].src, `activity_${activityName}_inline_${i}`)
        uploaded.push({ ...images[i], strapiUrl: result.url, strapiId: result.id })
        uploadedImageIds.push(result.id)
        await new Promise(r => setTimeout(r, 2000))
      } catch (err) {
        console.log(`      ⚠️ Inline image failed: ${err.message}`)
        uploaded.push({ ...images[i], strapiUrl: null, strapiId: null })
      }
    } else {
      uploaded.push({ ...images[i], strapiUrl: images[i].src, strapiId: null })
    }
  }

  // Parse block-level elements
  const blocks = []
  const blockRe = /<(p|h[1-6]|ul|ol|blockquote|div)(\s[^>]*)?>[\s\S]*?<\/\1>/gi
  let lastIdx = 0
  let match

  while ((match = blockRe.exec(cleanHtml)) !== null) {
    const gap = cleanHtml.substring(lastIdx, match.index).trim()
    if (gap) {
      const plain = decodeEntities(gap.replace(/<[^>]+>/g, '')).trim()
      if (plain) blocks.push({ type: 'paragraph', children: [{ type: 'text', text: plain }] })
    }
    lastIdx = match.index + match[0].length

    const tag = match[1].toLowerCase()
    const full = match[0]
    const openTagEnd = full.indexOf('>') + 1
    const closeTagStart = full.lastIndexOf('</')
    const inner = full.substring(openTagEnd, closeTagStart)

    // Image placeholder
    const imgPh = inner.match(/__IMG_(\d+)__/)
    if (imgPh) {
      const img = uploaded[parseInt(imgPh[1])]
      if (img && img.strapiUrl) {
        const url = img.strapiUrl.startsWith('http') ? img.strapiUrl : `${STRAPI_URL}${img.strapiUrl}`
        blocks.push({
          type: 'paragraph',
          children: [{ type: 'text', text: `[IMAGE: ${url} | ${img.alt || activityName} | medium | center]` }]
        })
      }
      continue
    }

    if (tag === 'p' || tag === 'div') {
      const children = parseInline(inner)
      const hasContent = children.some(c =>
        (c.type === 'text' && c.text.trim()) || c.type === 'link'
      )
      if (hasContent) blocks.push({ type: 'paragraph', children })
    } else if (/^h[1-6]$/.test(tag)) {
      blocks.push({ type: 'heading', level: parseInt(tag[1]), children: parseInline(inner) })
    } else if (tag === 'ul' || tag === 'ol') {
      const items = []
      const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi
      let li
      while ((li = liRe.exec(inner)) !== null) {
        items.push({ type: 'list-item', children: parseInline(li[1]) })
      }
      if (items.length > 0) {
        blocks.push({ type: 'list', format: tag === 'ol' ? 'ordered' : 'unordered', children: items })
      }
    } else if (tag === 'blockquote') {
      blocks.push({ type: 'quote', children: parseInline(inner.replace(/<\/?p[^>]*>/gi, '')) })
    }
  }

  const tail = cleanHtml.substring(lastIdx).trim()
  if (tail) {
    const plain = decodeEntities(tail.replace(/<[^>]+>/g, '')).trim()
    if (plain) blocks.push({ type: 'paragraph', children: [{ type: 'text', text: plain }] })
  }

  if (blocks.length === 0) {
    const plain = decodeEntities(cleanHtml.replace(/<[^>]+>/g, '')).trim()
    blocks.push({ type: 'paragraph', children: [{ type: 'text', text: plain || '' }] })
  }

  return { blocks, uploadedImageIds }
}

// ─── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log(EXECUTE
    ? '🔴 EXECUTE MODE — Changes WILL be written to Strapi\n'
    : '🟡 DRY-RUN MODE — No changes will be made (use --execute to write)\n'
  )

  // 1. Fetch data
  console.log('1. Fetching Webflow activities...')
  const wfActivities = await fetchAllWebflowItems(WEBFLOW_ACTIVITIES_COLLECTION)
  console.log(`   ${wfActivities.length} Webflow activities`)

  console.log('   Fetching Strapi activities...')
  const strapiActivities = await fetchAllStrapiActivities()
  console.log(`   ${strapiActivities.length} Strapi activities`)

  // 2. Build lookup
  const strapiByNorm = {}
  for (const s of strapiActivities) {
    strapiByNorm[normalize(s.Title)] = s
  }

  // 3. Process each Webflow activity
  console.log('\n2. Processing activities...\n')

  let updatedCount = 0
  let createdCount = 0
  let failedCount = 0
  const report = []

  for (const wf of wfActivities) {
    const fd = wf.fieldData
    const wfTitle = fd.name || ''
    const norm = normalize(wfTitle)
    const descHtml = fd.description || ''
    const titleCased = toTitleCase(wfTitle)

    // Try matching
    let strapiMatch = strapiByNorm[norm] || null
    if (!strapiMatch) {
      for (const [key, s] of Object.entries(strapiByNorm)) {
        if (key.length > 5 && (norm.startsWith(key) || key.startsWith(norm))) {
          strapiMatch = s
          break
        }
      }
    }

    if (strapiMatch) {
      // ── MATCHED: Update Description + Title ──
      console.log(`📝 UPDATE: "${titleCased}"`)
      console.log(`   Strapi id: ${strapiMatch.id} | desc HTML: ${descHtml.length} chars`)

      const { blocks, uploadedImageIds } = await htmlToBlocks(descHtml, titleCased)
      console.log(`   → ${blocks.length} blocks, ${uploadedImageIds.length} inline images`)

      if (EXECUTE) {
        try {
          const payload = {
            data: {
              Title: titleCased,
              Description: blocks,
              ImageAltText: titleCased,
            }
          }

          // Strapi v5: Activities PUT uses documentId, not numeric id
          const res = await fetch(`${STRAPI_URL}/api/activities/${strapiMatch.documentId}`, {
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
            failedCount++
            report.push({ title: titleCased, action: 'UPDATE', status: 'FAILED', error: `${res.status}` })
          } else {
            console.log(`   ✅ Updated`)
            updatedCount++
            report.push({ title: titleCased, action: 'UPDATE', status: 'OK', strapiId: strapiMatch.id })
          }

          await new Promise(r => setTimeout(r, 2500))
        } catch (err) {
          console.log(`   ❌ Error: ${err.message}`)
          failedCount++
          report.push({ title: titleCased, action: 'UPDATE', status: 'FAILED', error: err.message })
        }
      } else {
        updatedCount++
        report.push({ title: titleCased, action: 'UPDATE', status: 'DRY-RUN', strapiId: strapiMatch.id })
      }
    } else {
      // ── UNMATCHED: Create new Strapi entry ──
      console.log(`🆕 CREATE: "${titleCased}"`)

      const date = fd.date ? fd.date.split('T')[0] : new Date().toISOString().split('T')[0]
      const slug = fd.slug || ''
      const thumbUrl = fd.thumbnails?.url || null
      console.log(`   date: ${date} | slug: ${slug} | thumb: ${thumbUrl ? 'yes' : 'no'}`)
      console.log(`   desc HTML: ${descHtml.length} chars`)

      // Convert description
      const { blocks, uploadedImageIds } = await htmlToBlocks(descHtml, titleCased)
      console.log(`   → ${blocks.length} blocks, ${uploadedImageIds.length} inline images`)

      // Upload thumbnail as Visuals
      let visualIds = []
      if (thumbUrl && EXECUTE) {
        try {
          console.log(`   📥 Uploading thumbnail...`)
          const uploaded = await uploadImageToStrapi(thumbUrl, `activity_${slug}_thumb`)
          visualIds = [uploaded.id]
          console.log(`   Thumbnail uploaded (id: ${uploaded.id})`)
          await new Promise(r => setTimeout(r, 2000))
        } catch (err) {
          console.log(`   ⚠️ Thumbnail failed: ${err.message}`)
        }
      }

      if (EXECUTE) {
        try {
          const payload = {
            data: {
              Title: titleCased,
              Description: blocks,
              Date: date,
              Slug: slug,
              ImageAltText: titleCased,
              Featured: false,
              publishedAt: new Date().toISOString(),
            }
          }

          if (visualIds.length > 0) {
            payload.data.Visuals = visualIds
          }

          const res = await fetch(`${STRAPI_URL}/api/activities`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${STRAPI_API_TOKEN}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          })

          if (!res.ok) {
            const errText = await res.text()
            console.log(`   ❌ POST failed: ${res.status} ${errText.substring(0, 300)}`)
            failedCount++
            report.push({ title: titleCased, action: 'CREATE', status: 'FAILED', error: `${res.status}` })
          } else {
            const result = await res.json()
            console.log(`   ✅ Created (id: ${result.data.id})`)
            createdCount++
            report.push({ title: titleCased, action: 'CREATE', status: 'OK', strapiId: result.data.id })
          }

          await new Promise(r => setTimeout(r, 2500))
        } catch (err) {
          console.log(`   ❌ Error: ${err.message}`)
          failedCount++
          report.push({ title: titleCased, action: 'CREATE', status: 'FAILED', error: err.message })
        }
      } else {
        createdCount++
        report.push({ title: titleCased, action: 'CREATE', status: 'DRY-RUN' })
      }
    }

    console.log('')
  }

  // 4. Summary
  console.log('─'.repeat(60))
  console.log(`\nResults:`)
  console.log(`  📝 Updated: ${updatedCount}`)
  console.log(`  🆕 Created: ${createdCount}`)
  console.log(`  ❌ Failed: ${failedCount}`)

  // Save report
  fs.writeFileSync('webflow-activity-import-report.json', JSON.stringify(report, null, 2), 'utf-8')
  console.log(`\n📄 Report saved to: webflow-activity-import-report.json`)
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
