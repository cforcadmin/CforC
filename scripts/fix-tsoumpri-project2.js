/**
 * Fix Τσούμπρη Τζέννυ (Ιωάννα)'s 2nd project that failed with Gateway Timeout
 * during the bulk import.
 *
 * Usage: node scripts/fix-tsoumpri-project2.js
 */

require('dotenv').config({ path: '.env.local' })

const WEBFLOW_API_KEY = 'b0ee3cdeef0fbb691c2e715f5f49ffb970207abd22e73807e5a2e74768a67dd2'
const WEBFLOW_PROJECTS_COLLECTION = '63f4d59f308dec655d86bf35'

const STRAPI_URL = process.env.STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

if (!STRAPI_URL || !STRAPI_API_TOKEN) {
  console.error('STRAPI_URL and STRAPI_API_TOKEN must be set in .env.local')
  process.exit(1)
}

// ─── Helpers (copied from import script) ─────────────────────────────

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
    if (isLink) {
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

async function htmlToBlocks(html, projectName) {
  const empty = [{ type: 'paragraph', children: [{ type: 'text', text: '' }] }]
  if (!html || !html.trim()) return { blocks: empty, uploadedImageIds: [] }
  const { cleanHtml, images } = extractImages(html)
  const uploaded = []
  const uploadedImageIds = []
  for (let i = 0; i < images.length; i++) {
    try {
      console.log(`  Uploading inline image ${i + 1}/${images.length}...`)
      const result = await uploadImageToStrapi(images[i].src, `${projectName}_inline_${i}`)
      uploaded.push({ ...images[i], strapiUrl: result.url, strapiId: result.id })
      uploadedImageIds.push(result.id)
      await new Promise(r => setTimeout(r, 2000))
    } catch (err) {
      console.log(`  Warning: Inline image failed: ${err.message}`)
      uploaded.push({ ...images[i], strapiUrl: null, strapiId: null })
    }
  }
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
    const imgPh = inner.match(/__IMG_(\d+)__/)
    if (imgPh) {
      const img = uploaded[parseInt(imgPh[1])]
      if (img && img.strapiUrl) {
        const url = img.strapiUrl.startsWith('http') ? img.strapiUrl : `${STRAPI_URL}${img.strapiUrl}`
        blocks.push({
          type: 'paragraph',
          children: [{ type: 'text', text: `[IMAGE: ${url} | ${img.alt || projectName} | medium | center]` }]
        })
      }
      continue
    }
    if (tag === 'p' || tag === 'div') {
      const children = parseInline(inner)
      const hasContent = children.some(c => (c.type === 'text' && c.text.trim()) || c.type === 'link')
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
  console.log('Fixing Τσούμπρη Τζέννυ (Ιωάννα) - Project 2\n')

  // 1. Find the Webflow project
  console.log('1. Fetching Webflow projects...')
  const items = []
  let offset = 0
  while (true) {
    const res = await fetch(
      `https://api.webflow.com/v2/collections/${WEBFLOW_PROJECTS_COLLECTION}/items?limit=100&offset=${offset}`,
      { headers: { Authorization: `Bearer ${WEBFLOW_API_KEY}` } }
    )
    if (!res.ok) {
      console.error(`   Webflow API error: ${res.status} ${await res.text()}`)
      process.exit(1)
    }
    const data = await res.json()
    console.log(`   Fetched ${data.items.length} items (offset ${offset}, total ${data.pagination.total})`)
    items.push(...data.items)
    if (offset + 100 >= data.pagination.total) break
    offset += 100
    await new Promise(r => setTimeout(r, 1100))
  }
  console.log(`   Total items: ${items.length}`)

  // Find the specific project by searching for keywords in the name
  const targetProject = items.find(p => {
    const name = (p.fieldData.name || '')
    return name.includes('ΣΥΝΗΘΙΣΕΙ') || name.includes('ΕΙΚΟΝΕΣ')
  })

  if (!targetProject) {
    console.error('Could not find the Webflow project')
    // Show first 5 names for debugging
    for (let i = 0; i < Math.min(5, items.length); i++) {
      console.log(`   [${i}] "${items[i].fieldData.name}"`)
    }
    process.exit(1)
  }

  console.log(`   Found: "${targetProject.fieldData.name}"`)

  // 2. Find Strapi member
  console.log('\n2. Finding Strapi member...')
  const strapiRes = await fetch(
    `${STRAPI_URL}/api/members?filters[Name][$containsi]=Τσούμπρη&fields[0]=Name&fields[1]=Project2Title`,
    { headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` } }
  )
  const strapiData = await strapiRes.json()

  if (!strapiData.data || strapiData.data.length === 0) {
    console.error('Could not find Τσούμπρη in Strapi')
    process.exit(1)
  }

  const member = strapiData.data[0]
  console.log(`   Found: "${member.Name}" (id: ${member.id})`)

  if (member.Project2Title && member.Project2Title !== 'TEST_DELETE_ME') {
    console.log(`   Project2 already has: "${member.Project2Title}"`)
    console.log('   Aborting to avoid overwriting.')
    process.exit(0)
  }

  // 3. Process project data
  const fd = targetProject.fieldData
  const projectTitle = toTitleCase(fd.name || '')
  console.log(`\n3. Processing project: "${projectTitle}"`)

  // Upload thumbnail
  let pictureIds = []
  const thumbUrl = fd['main-image']?.url || fd['thumbnail']?.url || fd['project-thumbnail']?.url
  if (thumbUrl) {
    console.log('   Uploading thumbnail...')
    try {
      const uploaded = await uploadImageToStrapi(thumbUrl, 'tsoumpri_project2_thumb')
      pictureIds = [uploaded.id]
      console.log(`   Thumbnail uploaded (id: ${uploaded.id})`)
    } catch (err) {
      console.log(`   Thumbnail upload failed: ${err.message}`)
      console.log('   Continuing without thumbnail...')
    }
  }

  // Convert description
  const descHtml = fd['description-of-project'] || fd['project-description'] || fd['description'] || ''
  console.log(`   Description HTML length: ${descHtml.length}`)

  const { blocks, uploadedImageIds } = await htmlToBlocks(descHtml, projectTitle)
  console.log(`   Converted to ${blocks.length} blocks, ${uploadedImageIds.length} inline images`)

  // All picture IDs (thumbnail + inline)
  const allPictureIds = [...pictureIds, ...uploadedImageIds]

  // Links
  const links = fd['project-link'] || fd['link'] || ''

  // 4. Update Strapi
  console.log('\n4. Updating Strapi...')
  const payload = {
    data: {
      Project2Title: projectTitle,
      Project2Description: blocks,
      Project2Tags: '',
      Project2Links: links,
      Project2PicturesAltText: projectTitle,
    }
  }

  if (allPictureIds.length > 0) {
    payload.data.Project2Pictures = allPictureIds
  }

  const updateRes = await fetch(`${STRAPI_URL}/api/members/${member.id}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!updateRes.ok) {
    const errText = await updateRes.text()
    console.error(`   PUT failed: ${updateRes.status} ${errText}`)
    process.exit(1)
  }

  const result = await updateRes.json()
  console.log(`   Success! Project2Title set to: "${result.data.Project2Title}"`)
  console.log('\nDone!')
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
