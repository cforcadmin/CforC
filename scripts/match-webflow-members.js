/**
 * Match Webflow project members to Strapi members
 * Outputs a CSV with: Webflow Name (CAPS) | Strapi Name | Match Status
 *
 * Usage: node scripts/match-webflow-members.js
 */

require('dotenv').config({ path: '.env.local' })

const WEBFLOW_API_KEY = 'b0ee3cdeef0fbb691c2e715f5f49ffb970207abd22e73807e5a2e74768a67dd2'
const WEBFLOW_MEMBERS_COLLECTION = '63f4ce967f9b1c7e2f4d43b5'
const WEBFLOW_PROJECTS_COLLECTION = '63f4d59f308dec655d86bf35'

const STRAPI_URL = process.env.STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

const fs = require('fs')

if (!STRAPI_URL || !STRAPI_API_TOKEN) {
  console.error('STRAPI_URL and STRAPI_API_TOKEN must be set in .env.local')
  process.exit(1)
}

// Normalize Greek text for comparison — strips accents and lowercases
function normalize(name) {
  if (!name) return ''
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents/diacritics
    .toLocaleLowerCase('el')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.,\-_()]/g, '')
}

async function fetchAllWebflowItems(collectionId) {
  const items = []
  let offset = 0
  const limit = 100

  while (true) {
    const res = await fetch(
      `https://api.webflow.com/v2/collections/${collectionId}/items?limit=${limit}&offset=${offset}`,
      { headers: { Authorization: `Bearer ${WEBFLOW_API_KEY}` } }
    )
    const data = await res.json()
    items.push(...data.items)

    if (offset + limit >= data.pagination.total) break
    offset += limit

    // Rate limit: 60 req/min
    await new Promise(r => setTimeout(r, 1100))
  }

  return items
}

async function fetchAllStrapiMembers() {
  const members = []
  let page = 1
  const pageSize = 100

  while (true) {
    const res = await fetch(
      `${STRAPI_URL}/api/members?fields[0]=Name&fields[1]=Slug&pagination[page]=${page}&pagination[pageSize]=${pageSize}`,
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
  console.log('Fetching Webflow members...')
  const wfMembers = await fetchAllWebflowItems(WEBFLOW_MEMBERS_COLLECTION)
  console.log(`  Found ${wfMembers.length} Webflow members`)

  console.log('Fetching Webflow projects...')
  const wfProjects = await fetchAllWebflowItems(WEBFLOW_PROJECTS_COLLECTION)
  console.log(`  Found ${wfProjects.length} Webflow projects`)

  console.log('Fetching Strapi members...')
  const strapiMembers = await fetchAllStrapiMembers()
  console.log(`  Found ${strapiMembers.length} Strapi members`)

  // Build Webflow ID → name map
  const wfIdToName = {}
  for (const m of wfMembers) {
    wfIdToName[m.id] = m.fieldData.name || ''
  }

  // Build normalized Strapi name lookup
  const strapiByNormalized = {}
  for (const m of strapiMembers) {
    const key = normalize(m.Name)
    strapiByNormalized[key] = m.Name
  }

  // Collect unique member IDs from projects
  const uniqueMemberIds = new Set()
  for (const p of wfProjects) {
    const memberIds = p.fieldData.members || []
    for (const id of memberIds) {
      uniqueMemberIds.add(id)
    }
  }

  console.log(`\n${uniqueMemberIds.size} unique members referenced in projects`)

  // Build matching rows
  const rows = []
  let matched = 0
  let unmatched = 0

  for (const wfId of uniqueMemberIds) {
    const wfName = wfIdToName[wfId] || `UNKNOWN (ID: ${wfId})`
    const normalizedWf = normalize(wfName)

    // Try exact normalized match
    let strapiName = strapiByNormalized[normalizedWf] || null
    let status = 'MATCHED'

    if (!strapiName) {
      // Try partial match (first + last name)
      const wfParts = normalizedWf.split(' ').filter(Boolean)
      for (const [key, name] of Object.entries(strapiByNormalized)) {
        const strapiParts = key.split(' ').filter(Boolean)
        // Match if all Webflow name parts appear in Strapi name
        if (wfParts.length >= 2 && wfParts.every(p => strapiParts.includes(p))) {
          strapiName = name
          status = 'PARTIAL MATCH'
          break
        }
      }
    }

    if (!strapiName) {
      status = 'NO MATCH'
      unmatched++
    } else {
      matched++
    }

    // Count projects for this member
    const projectCount = wfProjects.filter(p =>
      (p.fieldData.members || []).includes(wfId)
    ).length

    rows.push({
      webflowName: wfName,
      strapiName: strapiName || '',
      status,
      projectCount,
      webflowId: wfId,
    })
  }

  // Sort: unmatched first, then by name
  rows.sort((a, b) => {
    if (a.status === 'NO MATCH' && b.status !== 'NO MATCH') return -1
    if (a.status !== 'NO MATCH' && b.status === 'NO MATCH') return 1
    return a.webflowName.localeCompare(b.webflowName, 'el')
  })

  // Write CSV
  const csvHeader = 'Webflow Name (CAPS),Strapi Name,Match Status,Projects Count,Webflow ID'
  const csvRows = rows.map(r =>
    `"${r.webflowName}","${r.strapiName}","${r.status}",${r.projectCount},"${r.webflowId}"`
  )
  const csv = [csvHeader, ...csvRows].join('\n')

  const outputPath = 'webflow-strapi-member-matching.csv'
  fs.writeFileSync(outputPath, csv, 'utf-8')

  console.log(`\nResults:`)
  console.log(`  ✅ Matched: ${matched}`)
  console.log(`  ❌ No match: ${unmatched}`)
  console.log(`  📄 Saved to: ${outputPath}`)
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
