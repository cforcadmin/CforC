/**
 * Inspect the 11 unmatched Webflow activities to see full data
 * Usage: node scripts/inspect-unmatched-activities.js
 */
require('dotenv').config({ path: '.env.local' })

const KEY = 'b0ee3cdeef0fbb691c2e715f5f49ffb970207abd22e73807e5a2e74768a67dd2'
const COL = '63f4dd52c89f6710a864b743'

function normalize(s) {
  if (!s) return ''
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

async function run() {
  // Fetch Webflow activities
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

  // Fetch Strapi activities
  const strapiItems = []
  let page = 1
  while (true) {
    const res = await fetch(
      `${process.env.STRAPI_URL}/api/activities?fields[0]=Title&pagination[page]=${page}&pagination[pageSize]=100`,
      { headers: { Authorization: `Bearer ${process.env.STRAPI_API_TOKEN}` } }
    )
    const data = await res.json()
    strapiItems.push(...data.data)
    if (page >= data.meta.pagination.pageCount) break
    page++
  }

  const strapiByNorm = {}
  for (const s of strapiItems) {
    strapiByNorm[normalize(s.Title)] = s
  }

  // Find unmatched
  const unmatched = wfItems.filter(wf => {
    const norm = normalize(wf.fieldData.name || '')
    let match = strapiByNorm[norm] || null
    if (!match) {
      for (const [key] of Object.entries(strapiByNorm)) {
        if (key.length > 5 && (norm.startsWith(key) || key.startsWith(norm))) {
          match = true
          break
        }
      }
    }
    return !match
  })

  console.log(`Unmatched: ${unmatched.length}\n`)
  for (const wf of unmatched) {
    const fd = wf.fieldData
    console.log(`=== ${fd.name} ===`)
    console.log(`  slug: ${fd.slug}`)
    console.log(`  date: ${fd.date}`)
    console.log(`  type: ${fd.type}`)
    console.log(`  thumbnail: ${fd.thumbnails ? fd.thumbnails.url : 'NONE'}`)
    console.log(`  booking-link: ${fd['booking-link'] || 'none'}`)
    console.log(`  desc length: ${(fd.description || '').length}`)
    console.log(`  desc preview: ${(fd.description || '').substring(0, 200)}`)
    console.log('')
  }
}

run().catch(err => { console.error('Error:', err); process.exit(1) })
