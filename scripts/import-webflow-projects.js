/**
 * Import projects from old Webflow site into Strapi member profiles
 *
 * Projects are stored as Project1/Project2 fields on Member documents (max 2 per member).
 * If a member already has projects in Strapi, those slots are preserved.
 *
 * Flow:
 * 1. Fetch Webflow projects, members, and tags
 * 2. Match Webflow members → Strapi members (accent-stripped name normalization)
 * 3. Fetch Strapi members to check which project slots are occupied
 * 4. For empty slots, import Webflow project data:
 *    - Download thumbnail → upload to Strapi → set as ProjectNPictures
 *    - Convert HTML description → Strapi blocks (with [IMAGE:] for inline images)
 *    - Map Webflow tags → comma-separated string for ProjectNTags
 * 5. Update member profile via Strapi PUT API
 *
 * Usage:
 *   node scripts/import-webflow-projects.js             # dry-run (default)
 *   node scripts/import-webflow-projects.js --execute    # write to Strapi
 */

require('dotenv').config({ path: '.env.local' })
const fs = require('fs')

// ─── Config ──────────────────────────────────────────────────────────

const WEBFLOW_API_KEY = 'b0ee3cdeef0fbb691c2e715f5f49ffb970207abd22e73807e5a2e74768a67dd2'
const WEBFLOW_SITE_ID = '63cfcf33f1ef1a3c759687cf'
const WEBFLOW_PROJECTS_COLLECTION = '63f4d59f308dec655d86bf35'
const WEBFLOW_MEMBERS_COLLECTION = '63f4ce967f9b1c7e2f4d43b5'

const STRAPI_URL = process.env.STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

const EXECUTE = process.argv.includes('--execute')

// Excluded members (normalized, accent-stripped)
const EXCLUDED_NAMES = ['γιωργος στυλ']

if (!STRAPI_URL || !STRAPI_API_TOKEN) {
  console.error('STRAPI_URL and STRAPI_API_TOKEN must be set in .env.local')
  process.exit(1)
}

// ─── Title case conversion ───────────────────────────────────────────

function toTitleCase(str) {
  if (!str) return str

  // Count uppercase vs lowercase letters to decide if conversion is needed
  const letters = str.match(/\p{L}/gu) || []
  if (letters.length === 0) return str

  const upperCount = letters.filter(
    c => c === c.toLocaleUpperCase('el') && c !== c.toLocaleLowerCase('el')
  ).length
  const ratio = upperCount / letters.length

  // Only convert names that are predominantly uppercase (>60%)
  // Leave already-mixed names (e.g. "Mind's Eye | Ψηλαφώντας την Τέχνη") as-is
  if (ratio < 0.6) return str

  return str
    .toLocaleLowerCase('el')
    .replace(/(^|[\s\-\(\/"«|])\p{L}/gu, char => char.toLocaleUpperCase('el'))
}

// ─── Name normalization (strips Greek accents, lowercases) ───────────

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

async function webflowFetch(url) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${WEBFLOW_API_KEY}` }
  })
  if (!res.ok) throw new Error(`Webflow API ${res.status}: ${await res.text()}`)
  return res.json()
}

async function fetchAllWebflowItems(collectionId) {
  const items = []
  let offset = 0
  const limit = 100
  while (true) {
    const data = await webflowFetch(
      `https://api.webflow.com/v2/collections/${collectionId}/items?limit=${limit}&offset=${offset}`
    )
    items.push(...data.items)
    if (offset + limit >= data.pagination.total) break
    offset += limit
    await new Promise(r => setTimeout(r, 1100))
  }
  return items
}

async function discoverTagsCollection() {
  const data = await webflowFetch(
    `https://api.webflow.com/v2/sites/${WEBFLOW_SITE_ID}/collections`
  )
  const tagsCol = data.collections.find(c =>
    c.displayName?.toLowerCase().includes('tag') ||
    c.slug?.toLowerCase().includes('tag')
  )
  return tagsCol?.id || null
}

// ─── Strapi API ──────────────────────────────────────────────────────

async function fetchAllStrapiMembers() {
  const members = []
  let page = 1
  const pageSize = 100
  while (true) {
    const res = await fetch(
      `${STRAPI_URL}/api/members?` +
      `fields[0]=Name&fields[1]=Slug&fields[2]=Project1Title&fields[3]=Project2Title` +
      `&pagination[page]=${page}&pagination[pageSize]=${pageSize}`,
      { headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` } }
    )
    const data = await res.json()
    members.push(...data.data)
    if (page >= data.meta.pagination.pageCount) break
    page++
  }
  return members
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
  return result[0] // { id, url, ... }
}

async function updateMemberProject(memberId, slotNum, projectData) {
  const prefix = `Project${slotNum}`
  const payload = {
    data: {
      [`${prefix}Title`]: projectData.title,
      [`${prefix}Description`]: projectData.description,
      [`${prefix}Tags`]: projectData.tags || '',
      [`${prefix}Links`]: projectData.links || '',
      [`${prefix}PicturesAltText`]: projectData.altText || projectData.title,
    }
  }

  if (projectData.pictureIds && projectData.pictureIds.length > 0) {
    payload.data[`${prefix}Pictures`] = projectData.pictureIds
  }

  // Strapi v5: PUT uses numeric id, not documentId
  const res = await fetch(`${STRAPI_URL}/api/members/${memberId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`PUT ${documentId} failed: ${res.status} ${errText}`)
  }
  return await res.json()
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

/**
 * Parse inline HTML (text, <strong>, <em>, <a>, <u>, <br>) into Strapi children.
 */
function parseInline(html) {
  if (!html || !html.trim()) return [{ type: 'text', text: '' }]

  const children = []
  const tokens = html.split(/(<[^>]+>)/g).filter(Boolean)
  const stack = [] // formatting context

  for (const token of tokens) {
    // Self-closing or void tags
    if (/^<(br|hr|img)\b/i.test(token) || token.endsWith('/>')) {
      if (/^<br/i.test(token)) {
        const last = children[children.length - 1]
        if (last && last.type === 'text') {
          last.text += '\n'
        } else {
          children.push({ type: 'text', text: '\n' })
        }
      }
      continue
    }

    // Closing tag
    if (token.startsWith('</')) {
      stack.pop()
      continue
    }

    // Opening tag
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

    // Text content
    const text = decodeEntities(token)
    if (!text) continue

    const fmt = {}
    let isLink = false
    let linkUrl = ''

    for (const s of stack) {
      if (s.tag === 'strong' || s.tag === 'b') fmt.bold = true
      if (s.tag === 'em' || s.tag === 'i') fmt.italic = true
      if (s.tag === 'u') fmt.underline = true
      if (s.tag === 's' || s.tag === 'strike' || s.tag === 'del') fmt.strikethrough = true
      if (s.tag === 'a') { isLink = true; linkUrl = s.href }
    }

    if (isLink) {
      children.push({
        type: 'link',
        url: linkUrl,
        children: [{ type: 'text', text, ...fmt }]
      })
    } else {
      children.push({ type: 'text', text, ...fmt })
    }
  }

  return children.length > 0 ? children : [{ type: 'text', text: '' }]
}

/**
 * Extract <img> and <figure> from HTML, replace with placeholders.
 * Returns { cleanHtml, images: [{src, alt}] }
 */
function extractImages(html) {
  const images = []

  // <figure> containing <img>
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

  // Standalone <img>
  clean = clean.replace(/<img[^>]+src="([^"]*)"([^>]*)\/?\s*>/gi, (_, src, rest) => {
    const altM = rest.match(/alt="([^"]*)"/)
    const idx = images.length
    images.push({ src, alt: altM ? altM[1] : '' })
    return `<p>__IMG_${idx}__</p>`
  })

  return { cleanHtml: clean, images }
}

/**
 * Convert Webflow HTML rich text → Strapi blocks array.
 * Downloads inline images, uploads to Strapi, uses [IMAGE:] convention.
 */
async function htmlToBlocks(html, projectName) {
  const empty = [{ type: 'paragraph', children: [{ type: 'text', text: '' }] }]
  if (!html || !html.trim()) return { blocks: empty, uploadedImageIds: [] }

  const { cleanHtml, images } = extractImages(html)

  // Upload inline images (only in execute mode)
  const uploaded = []
  const uploadedImageIds = []
  for (let i = 0; i < images.length; i++) {
    if (EXECUTE) {
      try {
        console.log(`      📥 Inline image ${i + 1}/${images.length}...`)
        const result = await uploadImageToStrapi(images[i].src, `${projectName}_inline_${i}`)
        uploaded.push({ ...images[i], strapiUrl: result.url, strapiId: result.id })
        uploadedImageIds.push(result.id)
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
    // Text between blocks
    const gap = cleanHtml.substring(lastIdx, match.index).trim()
    if (gap) {
      const plain = decodeEntities(gap.replace(/<[^>]+>/g, '')).trim()
      if (plain) blocks.push({ type: 'paragraph', children: [{ type: 'text', text: plain }] })
    }
    lastIdx = match.index + match[0].length

    const tag = match[1].toLowerCase()
    // Extract inner content (between the opening and closing tag)
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
          children: [{ type: 'text', text: `[IMAGE: ${url} | ${img.alt || projectName} | medium | center]` }]
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
      blocks.push({
        type: 'heading',
        level: parseInt(tag[1]),
        children: parseInline(inner)
      })
    } else if (tag === 'ul' || tag === 'ol') {
      const items = []
      const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi
      let li
      while ((li = liRe.exec(inner)) !== null) {
        items.push({ type: 'list-item', children: parseInline(li[1]) })
      }
      if (items.length > 0) {
        blocks.push({
          type: 'list',
          format: tag === 'ol' ? 'ordered' : 'unordered',
          children: items
        })
      }
    } else if (tag === 'blockquote') {
      blocks.push({
        type: 'quote',
        children: parseInline(inner.replace(/<\/?p[^>]*>/gi, ''))
      })
    }
  }

  // Remaining text after last block
  const tail = cleanHtml.substring(lastIdx).trim()
  if (tail) {
    const plain = decodeEntities(tail.replace(/<[^>]+>/g, '')).trim()
    if (plain) blocks.push({ type: 'paragraph', children: [{ type: 'text', text: plain }] })
  }

  if (blocks.length === 0) {
    const plain = decodeEntities(cleanHtml.replace(/<[^>]+>/g, '')).trim()
    blocks.push({
      type: 'paragraph',
      children: [{ type: 'text', text: plain || '' }]
    })
  }

  return { blocks, uploadedImageIds }
}

// ─── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log(EXECUTE
    ? '🔴 EXECUTE MODE — Changes WILL be written to Strapi\n'
    : '🟡 DRY-RUN MODE — No changes will be made (use --execute to write)\n'
  )

  // 1. Discover tags collection
  console.log('1. Discovering Webflow collections...')
  let tagsCollectionId = null
  try {
    tagsCollectionId = await discoverTagsCollection()
    console.log(tagsCollectionId
      ? `   Tags collection: ${tagsCollectionId}`
      : '   No tags collection found — tags will be empty'
    )
  } catch (err) {
    console.log(`   Could not discover collections: ${err.message}`)
  }

  // 2. Fetch all data
  console.log('\n2. Fetching data...')
  const wfMembers = await fetchAllWebflowItems(WEBFLOW_MEMBERS_COLLECTION)
  console.log(`   ${wfMembers.length} Webflow members`)

  const wfProjects = await fetchAllWebflowItems(WEBFLOW_PROJECTS_COLLECTION)
  console.log(`   ${wfProjects.length} Webflow projects`)

  let wfTags = []
  if (tagsCollectionId) {
    wfTags = await fetchAllWebflowItems(tagsCollectionId)
    console.log(`   ${wfTags.length} Webflow tags`)
  }

  const strapiMembers = await fetchAllStrapiMembers()
  console.log(`   ${strapiMembers.length} Strapi members`)

  // 3. Build lookups
  console.log('\n3. Building lookups...')

  const wfIdToName = {}
  for (const m of wfMembers) {
    wfIdToName[m.id] = m.fieldData.name || ''
  }

  const wfTagIdToName = {}
  for (const t of wfTags) {
    wfTagIdToName[t.id] = t.fieldData.name || t.fieldData['tag-name'] || ''
  }
  if (wfTags.length > 0) {
    console.log(`   Tag mapping: ${Object.values(wfTagIdToName).filter(Boolean).join(', ')}`)
  }

  // Strapi: normalized name → member object
  const strapiByNorm = {}
  for (const m of strapiMembers) {
    strapiByNorm[normalize(m.Name)] = m
  }

  // 4. Group Webflow projects by Strapi member
  console.log('\n4. Matching projects to members...')

  const memberQueue = {} // documentId → { member, projects[] }
  let skippedExcluded = 0
  let skippedUnmatched = 0

  for (const proj of wfProjects) {
    const memberIds = proj.fieldData.members || []

    for (const wfMemberId of memberIds) {
      const wfName = wfIdToName[wfMemberId] || ''
      const norm = normalize(wfName)

      if (EXCLUDED_NAMES.includes(norm)) { skippedExcluded++; continue }

      // Exact match
      let strapiMember = strapiByNorm[norm]

      // Partial match fallback
      if (!strapiMember) {
        const parts = norm.split(' ').filter(Boolean)
        for (const [key, member] of Object.entries(strapiByNorm)) {
          const sp = key.split(' ').filter(Boolean)
          if (parts.length >= 2 && parts.every(p => sp.includes(p))) {
            strapiMember = member
            break
          }
        }
      }

      if (!strapiMember) { skippedUnmatched++; continue }

      const docId = strapiMember.documentId
      if (!memberQueue[docId]) {
        memberQueue[docId] = { member: strapiMember, projects: [] }
      }
      if (!memberQueue[docId].projects.find(p => p.id === proj.id)) {
        memberQueue[docId].projects.push(proj)
      }
    }
  }

  console.log(`   Excluded: ${skippedExcluded} links (Γιώργος Στυλ)`)
  console.log(`   Unmatched: ${skippedUnmatched} links`)
  console.log(`   ${Object.keys(memberQueue).length} members with importable projects`)

  // 5. Process each member
  console.log('\n5. Importing projects...\n')
  console.log('='.repeat(60))

  let imported = 0
  let skippedSlotsFull = 0
  let failed = 0
  const report = []

  const sortedEntries = Object.entries(memberQueue).sort((a, b) =>
    a[1].member.Name.localeCompare(b[1].member.Name, 'el')
  )

  for (const [docId, { member, projects }] of sortedEntries) {
    console.log(`\n👤 ${member.Name}`)

    const hasP1 = !!member.Project1Title
    const hasP2 = !!member.Project2Title

    if (hasP1) console.log(`   Slot 1 occupied: "${member.Project1Title}"`)
    if (hasP2) console.log(`   Slot 2 occupied: "${member.Project2Title}"`)

    if (hasP1 && hasP2) {
      console.log(`   ⏭️ Both slots full — skipping ${projects.length} Webflow project(s)`)
      skippedSlotsFull += projects.length
      report.push({
        member: member.Name,
        status: 'SKIPPED_SLOTS_FULL',
        webflowProjects: projects.map(p => p.fieldData.name)
      })
      continue
    }

    let nextSlot = hasP1 ? 2 : 1

    for (const proj of projects) {
      if (nextSlot > 2) {
        console.log(`   ⏭️ No more slots for: "${proj.fieldData.name}"`)
        skippedSlotsFull++
        report.push({ member: member.Name, project: proj.fieldData.name, status: 'SKIPPED_NO_SLOT' })
        continue
      }

      const rawName = proj.fieldData.name || 'Untitled'
      const projName = toTitleCase(rawName)
      if (projName !== rawName) {
        console.log(`\n   📋 "${rawName}" → "${projName}" → Slot ${nextSlot}`)
      } else {
        console.log(`\n   📋 "${projName}" → Slot ${nextSlot}`)
      }

      try {
        // ── Thumbnail ──
        const thumbUrl = proj.fieldData.thumbnail?.url || null
        const pictureIds = []

        if (thumbUrl) {
          if (EXECUTE) {
            console.log(`      📥 Downloading thumbnail...`)
            const up = await uploadImageToStrapi(thumbUrl, `${member.Name}_project${nextSlot}`)
            pictureIds.push(up.id)
            console.log(`      ✅ Uploaded (ID: ${up.id})`)
          } else {
            console.log(`      🖼️ Thumbnail: ${thumbUrl}`)
          }
        } else {
          console.log(`      (no thumbnail)`)
        }

        // ── Description HTML → Strapi blocks ──
        const descHtml = proj.fieldData.description || ''
        let descBlocks = [{ type: 'paragraph', children: [{ type: 'text', text: '' }] }]

        if (descHtml) {
          if (EXECUTE) {
            console.log(`      📝 Converting description (${descHtml.length} chars)...`)
            const result = await htmlToBlocks(descHtml, projName)
            descBlocks = result.blocks
            console.log(`      ✅ ${descBlocks.length} blocks, ${result.uploadedImageIds.length} inline images`)
          } else {
            const imgCount = (descHtml.match(/<img/gi) || []).length
            console.log(`      📝 Description: ${descHtml.length} chars, ${imgCount} inline image(s)`)
          }
        }

        // ── Tags ──
        const tagIds = proj.fieldData.tags || []
        const tagNames = tagIds.map(id => wfTagIdToName[id]).filter(Boolean)
        const tagsStr = tagNames.join(', ')
        if (tagsStr) console.log(`      🏷️ Tags: ${tagsStr}`)

        // ── Write to Strapi ──
        if (EXECUTE) {
          await updateMemberProject(member.id, nextSlot, {
            title: projName,
            description: descBlocks,
            tags: tagsStr,
            links: '',
            altText: projName,
            pictureIds
          })
          console.log(`      ✅ Written to Project ${nextSlot}`)
          await new Promise(r => setTimeout(r, 2500))
        } else {
          console.log(`      🟡 Would write to Slot ${nextSlot}`)
        }

        imported++
        report.push({
          member: member.Name,
          project: projName,
          slot: nextSlot,
          status: EXECUTE ? 'IMPORTED' : 'DRY_RUN',
          tags: tagsStr,
          hasThumbnail: !!thumbUrl,
          descLength: descHtml.length,
          inlineImages: (descHtml.match(/<img/gi) || []).length
        })

        nextSlot++

      } catch (err) {
        console.log(`      ❌ Error: ${err.message}`)
        failed++
        report.push({
          member: member.Name,
          project: proj.fieldData.name,
          slot: nextSlot,
          status: 'FAILED',
          error: err.message
        })
        nextSlot++
      }
    }
  }

  // Summary
  console.log('\n\n' + '='.repeat(60))
  console.log('📊 SUMMARY')
  console.log('='.repeat(60))
  console.log(`${EXECUTE ? '✅ Imported' : '🟡 Would import'}: ${imported}`)
  console.log(`⏭️  Skipped (slots full): ${skippedSlotsFull}`)
  console.log(`❌ Failed: ${failed}`)

  const reportPath = 'webflow-import-report.json'
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8')
  console.log(`\n📄 Report saved to: ${reportPath}`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
