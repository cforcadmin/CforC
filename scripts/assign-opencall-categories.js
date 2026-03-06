/**
 * Assign categories to Open Calls in Strapi
 *
 * PREREQUISITE: Add a "Category" field (Short text) to the Open Calls
 * collection type in Strapi Cloud dashboard first.
 *
 * Categories:
 *   1. Χρηματοδοτήσεις & Επιχορηγήσεις (Funding & Grants)
 *   2. Καλλιτεχνικές Προσκλήσεις (Artistic Calls)
 *   3. Εκπαίδευση & Κατάρτιση (Education & Training)
 *   4. Δικτύωση & Συνέδρια (Networking & Conferences)
 *   5. Ψηφιακός Μετασχηματισμός (Digital Transformation)
 *
 * Usage:
 *   node scripts/assign-opencall-categories.js             # dry-run
 *   node scripts/assign-opencall-categories.js --execute    # write to Strapi
 */
require('dotenv').config({ path: '.env.local' })

const STRAPI_URL = process.env.STRAPI_URL
const TOKEN = process.env.STRAPI_API_TOKEN
const EXECUTE = process.argv.includes('--execute')

if (!STRAPI_URL || !TOKEN) {
  console.error('STRAPI_URL and STRAPI_API_TOKEN must be set in .env.local')
  process.exit(1)
}

const CATEGORY_RULES = [
  {
    category: 'Εκπαίδευση & Κατάρτιση',
    keywords: [
      'school', 'training', 'skills', 'fellowship', 'κατάρτιση',
      'καταρτιση', 'εκπαιδευ', 'academy', 'incubator',
      'summer school', 'webinar', 'unschool', 'curating',
      'leader fellowship', 'papers', 'συνεδρι'
    ]
  },
  {
    category: 'Ψηφιακός Μετασχηματισμός',
    keywords: [
      'digital', 'ψηφιακ', 'ai', 'bauhaus', 'changemakerxchange',
      'μετασχηματισμ'
    ]
  },
  {
    category: 'Δικτύωση & Συνέδρια',
    keywords: [
      'forum', 'alforum', 'conference', 'meeting', 'camp',
      'agora', 'pm agora', 'teh camp', 'state of culture',
      'nurturing', 'artivism', 'workshop', 'hands-on',
      'knowledge to action', 'consultant', 'call for ideas',
      'call for interactive'
    ]
  },
  {
    category: 'Καλλιτεχνικές Προσκλήσεις',
    keywords: [
      'residency', 'art ', 'θέατρο', 'θεατρ', 'χειροτεχν',
      'performance', 'exhibition', 'open call', 'ανοιχτή πρόσκληση',
      'ανοιχτη προσκληση', 'αγορά', 'αγορα', 'κυψέλη', 'κυψελη',
      'mataroa', 'performing space', 'dreamscapes',
      'artgate', 'cycladic', 'πολιτισμ', 'πολιτιστικ',
      'culture moves', 'δράσεις συγχρονου', 'ολη η ελλαδα'
    ]
  },
  {
    category: 'Χρηματοδοτήσεις & Επιχορηγήσεις',
    keywords: [
      'grant', 'fund', 'επιχορήγηση', 'επιχορηγηση', 'χρηματοδότηση',
      'χρηματοδοτηση', 'ταμείο', 'ταμειο', 'πράσινο', 'πρασινο',
      'ίδρυμα', 'ιδρυμα', 'neon', 'μποδοσάκη', 'μποδοσακη',
      'κωστοπούλου', 'κωστοπουλου', 'λάτση', 'λατση',
      'creative europe', 'cerv', 'ruractive',
      'up grants', 'bosch', 'anna lindh',
      'σημεία στήριξης', 'σημεια στηριξης',
      'supporting act', 'prince claus', 'ashoka', 'changemaker',
      'grow', 'actionaid', 'επιδότηση', 'επιδοτηση',
      's+t+arts', 'regional activity'
    ]
  }
]

function categorize(title) {
  const lower = title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const lowerOriginal = title.toLowerCase()

  for (const rule of CATEGORY_RULES) {
    for (const keyword of rule.keywords) {
      const kw = keyword.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      if (lower.includes(kw) || lowerOriginal.includes(keyword.toLowerCase())) {
        return rule.category
      }
    }
  }
  return 'Χρηματοδοτήσεις & Επιχορηγήσεις' // default
}

async function fetchAll() {
  const items = []
  let page = 1
  while (true) {
    const res = await fetch(
      `${STRAPI_URL}/api/open-calls?fields[0]=Title&fields[1]=Deadline&fields[2]=Category&fields[3]=ImageAltText&pagination[page]=${page}&pagination[pageSize]=100`,
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    )
    const data = await res.json()
    items.push(...(data.data || []))
    if (page >= (data.meta?.pagination?.pageCount || 1)) break
    page++
  }
  return items
}

async function updateCategory(docId, category, imageAltText) {
  const data = { Category: category }
  // Include ImageAltText to avoid Strapi validation error on entries with null value
  if (!imageAltText) data.ImageAltText = ''
  const res = await fetch(`${STRAPI_URL}/api/open-calls/${docId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ data })
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`PUT ${docId} failed: ${res.status} ${err}`)
  }
}

async function main() {
  console.log(EXECUTE ? 'EXECUTE MODE\n' : 'DRY-RUN MODE\n')

  const calls = await fetchAll()
  console.log(`Found ${calls.length} open calls\n`)

  const stats = {}
  let updated = 0

  for (const c of calls) {
    const newCat = categorize(c.Title)
    if (!stats[newCat]) stats[newCat] = 0
    stats[newCat]++

    const changed = c.Category !== newCat
    const marker = changed ? ' <--' : ''
    console.log(`  [${newCat}] ${c.Title}${marker}`)

    if (changed && EXECUTE) {
      await updateCategory(c.documentId, newCat, c.ImageAltText)
      updated++
      await new Promise(r => setTimeout(r, 500))
    }
  }

  console.log('\n--- Category Distribution ---')
  for (const [cat, count] of Object.entries(stats).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat}: ${count}`)
  }
  console.log(`\n${EXECUTE ? 'Updated' : 'Would update'}: ${updated} open calls`)
}

main().catch(e => { console.error(e); process.exit(1) })
