/**
 * Export Webflow↔Strapi activity matching to CSV for manual verification
 * Usage: node scripts/export-activity-matching.js
 */
require('dotenv').config({ path: '.env.local' })
const fs = require('fs')

const KEY = 'b0ee3cdeef0fbb691c2e715f5f49ffb970207abd22e73807e5a2e74768a67dd2'
const COL = '63f4dd52c89f6710a864b743'
const STRAPI_URL = process.env.STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

function normalize(s) {
  if (!s) return ''
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

async function run() {
  // Fetch all Webflow activities
  const wfItems = []
  let offset = 0
  while (true) {
    const res = await fetch(
      `https://api.webflow.com/v2/collections/${COL}/items?limit=100&offset=${offset}`,
      { headers: { Authorization: `Bearer ${KEY}` } }
    )
    const data = await res.json()
    wfItems.push(...data.items)
    if (offset + 100 >= data.pagination.total) break
    offset += 100
    await new Promise(r => setTimeout(r, 1100))
  }

  // Fetch all Strapi activities
  const strapiItems = []
  let page = 1
  while (true) {
    const res = await fetch(
      `${STRAPI_URL}/api/activities?fields[0]=Title&fields[1]=Slug&pagination[page]=${page}&pagination[pageSize]=100`,
      { headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` } }
    )
    const data = await res.json()
    strapiItems.push(...data.data)
    if (page >= data.meta.pagination.pageCount) break
    page++
  }

  console.log(`Webflow: ${wfItems.length}, Strapi: ${strapiItems.length}`)

  // Build normalized lookup
  const strapiByNorm = {}
  for (const s of strapiItems) {
    strapiByNorm[normalize(s.Title)] = s
  }

  const rows = []
  for (const wf of wfItems) {
    const wfTitle = wf.fieldData.name || ''
    const wfSlug = wf.fieldData.slug || ''
    const norm = normalize(wfTitle)
    const descLen = (wf.fieldData.description || '').length

    let strapiMatch = strapiByNorm[norm] || null

    // Partial: title starts-with match
    if (!strapiMatch) {
      for (const [key, s] of Object.entries(strapiByNorm)) {
        if (key.length > 5 && (norm.startsWith(key) || key.startsWith(norm))) {
          strapiMatch = s
          break
        }
      }
    }

    rows.push({
      wfTitle,
      strapiTitle: strapiMatch ? strapiMatch.Title : '',
      strapiId: strapiMatch ? strapiMatch.id : '',
      status: strapiMatch ? 'MATCHED' : 'NO MATCH',
      descLen,
      wfSlug,
    })
  }

  // Sort: unmatched first, then by title
  rows.sort((a, b) => {
    if (a.status === 'NO MATCH' && b.status !== 'NO MATCH') return -1
    if (a.status !== 'NO MATCH' && b.status === 'NO MATCH') return 1
    return a.wfTitle.localeCompare(b.wfTitle, 'el')
  })

  // Write CSV
  const header = 'Webflow Title,Strapi Title,Strapi ID,Match Status,WF Desc Length,WF Slug'
  const csvRows = rows.map(r =>
    `"${r.wfTitle.replace(/"/g, '""')}","${r.strapiTitle.replace(/"/g, '""')}","${r.strapiId}","${r.status}",${r.descLen},"${r.wfSlug}"`
  )
  const csv = [header, ...csvRows].join('\n')

  const outPath = 'webflow-strapi-activity-matching.csv'
  fs.writeFileSync(outPath, csv, 'utf-8')

  const matched = rows.filter(r => r.status === 'MATCHED').length
  const unmatched = rows.filter(r => r.status === 'NO MATCH').length
  console.log(`\nMatched: ${matched}, Unmatched: ${unmatched}`)
  console.log(`Saved to: ${outPath}`)
}

run().catch(err => { console.error('Error:', err); process.exit(1) })
