/**
 * Match Webflow activities to Strapi activities by title
 * Usage: node scripts/match-webflow-activities.js
 */
require('dotenv').config({ path: '.env.local' })

const KEY = 'b0ee3cdeef0fbb691c2e715f5f49ffb970207abd22e73807e5a2e74768a67dd2'
const COL = '63f4dd52c89f6710a864b743'

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
      `${process.env.STRAPI_URL}/api/activities?fields[0]=Title&fields[1]=Slug&pagination[page]=${page}&pagination[pageSize]=100`,
      { headers: { Authorization: `Bearer ${process.env.STRAPI_API_TOKEN}` } }
    )
    const data = await res.json()
    strapiItems.push(...data.data)
    if (page >= data.meta.pagination.pageCount) break
    page++
  }

  console.log(`Webflow activities: ${wfItems.length}`)
  console.log(`Strapi activities: ${strapiItems.length}`)
  console.log('')

  // Build normalized title lookup
  const strapiByNorm = {}
  for (const s of strapiItems) {
    strapiByNorm[normalize(s.Title)] = s
  }

  let matched = 0
  let unmatched = 0
  const matchResults = []

  for (const wf of wfItems) {
    const wfTitle = wf.fieldData.name || ''
    const wfSlug = wf.fieldData.slug || ''
    const norm = normalize(wfTitle)
    const descLen = (wf.fieldData.description || '').length

    let strapiMatch = strapiByNorm[norm] || null

    // Partial match: try if webflow title starts with strapi title or vice versa
    if (!strapiMatch) {
      for (const [key, s] of Object.entries(strapiByNorm)) {
        if (key.length > 5 && (norm.startsWith(key) || key.startsWith(norm))) {
          strapiMatch = s
          break
        }
      }
    }

    if (strapiMatch) {
      matched++
      matchResults.push({
        wfTitle, strapiTitle: strapiMatch.Title, strapiId: strapiMatch.id,
        status: 'MATCHED', descLen
      })
    } else {
      unmatched++
      matchResults.push({
        wfTitle, strapiTitle: '', strapiId: null,
        status: 'NO MATCH', descLen
      })
      console.log(`NO MATCH: "${wfTitle}"`)
    }
  }

  console.log('')
  console.log(`Matched: ${matched}`)
  console.log(`Unmatched: ${unmatched}`)

  // Show all matches
  console.log('\n--- All Matches ---')
  for (const r of matchResults.filter(r => r.status === 'MATCHED')) {
    console.log(`  WF: "${r.wfTitle}" → Strapi: "${r.strapiTitle}" (id:${r.strapiId}) [desc: ${r.descLen} chars]`)
  }
}

run().catch(err => { console.error('Error:', err); process.exit(1) })
