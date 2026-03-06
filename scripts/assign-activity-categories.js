/**
 * Assign categories to Activities in Strapi
 *
 * Categories:
 *   1. Εκδηλώσεις & Συναντήσεις (Events & Meetings)
 *   2. Δικτύωση & Συνεργασίες (Networking & Partnerships)
 *   3. Εκπαίδευση & Εργαστήρια (Training & Workshops)
 *   4. Συνηγορία & Δράσεις (Advocacy & Actions)
 *   5. Ενημέρωση & Δημοσιεύσεις (News & Publications)
 *
 * Usage:
 *   node scripts/assign-activity-categories.js             # dry-run
 *   node scripts/assign-activity-categories.js --execute    # write to Strapi
 */
require('dotenv').config({ path: '.env.local' })

const STRAPI_URL = process.env.STRAPI_URL
const TOKEN = process.env.STRAPI_API_TOKEN
const EXECUTE = process.argv.includes('--execute')

if (!STRAPI_URL || !TOKEN) {
  console.error('STRAPI_URL and STRAPI_API_TOKEN must be set in .env.local')
  process.exit(1)
}

// Category mapping rules — ordered by priority (first match wins)
const CATEGORY_RULES = [
  {
    category: 'Εκπαίδευση & Εργαστήρια',
    keywords: [
      'εργαστήρι', 'εργαστηρι', 'σεμινάρι', 'σεμιναρι', 'academy',
      'workshop', 'lab', 'school', 'futures literacy', 'κατάρτιση',
      'καταρτιση', 'εκπαιδευ', 'μετρηση κοινωνικου', 'καταμετρηση',
      'design school', 'creative skills', 'webinar'
    ]
  },
  {
    category: 'Συνηγορία & Δράσεις',
    keywords: [
      'απεργία', 'απεργι', 'σχέδιο δράσης', 'σχεδιο δρασης',
      'ανακοίνωση', 'ανακοινωση', 'επιστολή', 'επιστολη',
      'συνηγορία', 'συνηγορι', 'νόμο', 'νομο', 'φοροδιαφυγ',
      'advocacy', 'γάζα', 'gaza', 'gdpr', 'νομικ',
      'against the tide', 'ψηφιακ'
    ]
  },
  {
    category: 'Ενημέρωση & Δημοσιεύσεις',
    keywords: [
      'bulletin', 'ημερολόγιο', 'ημερολογιο', 'θέση εργασίας',
      'θεση εργασιας', 'διακρίσεις', 'διακρισεις', 'βραβεί',
      'βραβει', 'ανοιχτό κάλεσμα', 'ανοιχτο καλεσμα',
      'administrative officer', 'κληρωσ', 'πρόγραμμα', 'χρηματοδοτ',
      'plato'
    ]
  },
  {
    category: 'Δικτύωση & Συνεργασίες',
    keywords: [
      'encc', 'anna lindh', 'bosch', 'teh meeting', 'teh camp',
      'elia', 'pearle', 'network', 'culture action europe',
      'global cultural', 'tale x cities', 'river//cities',
      'δίκτυο πολιτιστικών', 'δικτυο πολιτιστικ', 'comuseum',
      'pm agora', 'cci2024', 'cci 2024', 'συνεδρι',
      'action group', 'εθνική συνάντηση', 'εθνικη συναντηση',
      'connecting networks', 'μέλος', 'μελος'
    ]
  },
  {
    category: 'Εκδηλώσεις & Συναντήσεις',
    keywords: [
      'γενική συνέλευση', 'γενικη συνελευση', 'συνάντηση', 'συναντηση',
      'εκδήλωση', 'εκδηλωση', 'ανασχηματισμ', 'midterm',
      'εκλογ', 'διοικητικ', 'υποψηφιοτ', 'εναρκτ',
      'σ.η.μα', 'σημα'
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
  return 'Εκδηλώσεις & Συναντήσεις' // default
}

async function fetchAll() {
  const items = []
  let page = 1
  while (true) {
    const res = await fetch(
      `${STRAPI_URL}/api/activities?fields[0]=Title&fields[1]=Category&pagination[page]=${page}&pagination[pageSize]=100`,
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    )
    const data = await res.json()
    items.push(...(data.data || []))
    if (page >= (data.meta?.pagination?.pageCount || 1)) break
    page++
  }
  return items
}

async function updateCategory(docId, category) {
  const res = await fetch(`${STRAPI_URL}/api/activities/${docId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ data: { Category: category } })
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`PUT ${docId} failed: ${res.status} ${err}`)
  }
}

async function main() {
  console.log(EXECUTE ? 'EXECUTE MODE\n' : 'DRY-RUN MODE\n')

  const activities = await fetchAll()
  console.log(`Found ${activities.length} activities\n`)

  const stats = {}
  let updated = 0

  for (const a of activities) {
    const newCat = categorize(a.Title)
    if (!stats[newCat]) stats[newCat] = 0
    stats[newCat]++

    const changed = a.Category !== newCat
    const marker = changed ? ' <--' : ''
    console.log(`  [${newCat}] ${a.Title}${marker}`)

    if (changed && EXECUTE) {
      await updateCategory(a.documentId, newCat)
      updated++
      await new Promise(r => setTimeout(r, 500))
    }
  }

  console.log('\n--- Category Distribution ---')
  for (const [cat, count] of Object.entries(stats).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat}: ${count}`)
  }
  console.log(`\n${EXECUTE ? 'Updated' : 'Would update'}: ${updated} activities`)
}

main().catch(e => { console.error(e); process.exit(1) })
