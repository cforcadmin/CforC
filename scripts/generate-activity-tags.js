/**
 * Assign 5 tags to each activity in Strapi based on content analysis
 *
 * Tags are from a unified vocabulary of 25 Greek tags, reused across entries.
 * Each activity gets exactly 5 tags stored as a comma-separated string.
 *
 * Usage:
 *   node scripts/generate-activity-tags.js --dry-run   (preview)
 *   node scripts/generate-activity-tags.js              (apply)
 */

require('dotenv').config({ path: '.env.local' })

const STRAPI_URL = process.env.STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN
const DRY_RUN = process.argv.includes('--dry-run')

if (!STRAPI_URL || !STRAPI_API_TOKEN) {
  console.error('Error: STRAPI_URL and STRAPI_API_TOKEN must be set in .env.local')
  process.exit(1)
}

// Unified tag vocabulary (25 tags)
// πολιτισμός, δικτύωση, εκδήλωση, εργαστήριο, συνέδριο,
// τεχνητή νοημοσύνη, κοινωνία πολιτών, συνηγορία, ευρωπαϊκή συνεργασία, plato,
// bulletin, εκπαίδευση, κοινωνικός αντίκτυπος, περιβάλλον, πολιτιστική πολιτική,
// ένταξη, αλληλεγγύη, δημιουργικές βιομηχανίες, χρηματοδότηση, θέση εργασίας,
// νομοθεσία, διαφάνεια, γενική συνέλευση, ανοιχτό κάλεσμα, καινοτομία

const TAG_ASSIGNMENTS = {
  // Εναρκτήρια Εκδήλωση Σ.Η.μα – AI ethics, PLATO, civil society
  'f2atvgs3oo41uyko8hjingpi': ['εκδήλωση', 'τεχνητή νοημοσύνη', 'plato', 'κοινωνία πολιτών', 'καινοτομία'],

  // CoMuseum 2025 – museums, networking, conference
  'fdxh51y0g5jwecv28rf1fvub': ['συνέδριο', 'δικτύωση', 'πολιτισμός', 'ευρωπαϊκή συνεργασία', 'κοινωνικός αντίκτυπος'],

  // Νέο Πρόγραμμα PLATO – funding, civil society, EU
  'dzl4cm3hgf459avcan7lolod': ['plato', 'χρηματοδότηση', 'κοινωνία πολιτών', 'ευρωπαϊκή συνεργασία', 'πολιτισμός'],

  // ELIA x CAN Webinar – arts education, international
  'mwrxk9n60w8ziv5voo6s10k2': ['εκπαίδευση', 'δικτύωση', 'ευρωπαϊκή συνεργασία', 'πολιτισμός', 'ένταξη'],

  // Ανοιχτό Κάλεσμα GDPR – legal, data protection
  'vr644i4zsu4y3769wjdpusk2': ['ανοιχτό κάλεσμα', 'νομοθεσία', 'διαφάνεια', 'κοινωνία πολιτών', 'πολιτισμός'],

  // PM Agora Λάρνακα – conference, project management, networking
  'vkqxzudlxbfoso995x5dsha5': ['συνέδριο', 'δικτύωση', 'ευρωπαϊκή συνεργασία', 'καινοτομία', 'πολιτισμός'],

  // Futures Literacy workshops (2 duplicates)
  'pl321mduhvdqv8fy1oc0b5xe': ['εργαστήριο', 'δικτύωση', 'καινοτομία', 'εκπαίδευση', 'πολιτισμός'],
  'vkwxbzdshapxnu15rd1ayuol': ['εργαστήριο', 'δικτύωση', 'καινοτομία', 'εκπαίδευση', 'πολιτισμός'],

  // Bulletin #4 – AI & Tech (2 duplicates)
  'qenepa9sjb3zz2wju9c1067a': ['bulletin', 'τεχνητή νοημοσύνη', 'πολιτισμός', 'καινοτομία', 'εκπαίδευση'],
  'kgf94r6vbezag4s86n0c9zzg': ['bulletin', 'τεχνητή νοημοσύνη', 'πολιτισμός', 'καινοτομία', 'εκπαίδευση'],

  // Creative Skills Week 2025 Prague – creative skills, education
  'caelrabglpevdqe772k8s8f6': ['συνέδριο', 'δικτύωση', 'εκπαίδευση', 'δημιουργικές βιομηχανίες', 'ευρωπαϊκή συνεργασία'],

  // Against The Tide ENCC – marginalised voices, Montenegro
  'kz9vnft7jjapmn8zewwr44cw': ['συνέδριο', 'ένταξη', 'ευρωπαϊκή συνεργασία', 'δικτύωση', 'αλληλεγγύη'],

  // Bulletin #3 – Environment
  'no0l9bnr3bkklqo23tivvgtd': ['bulletin', 'περιβάλλον', 'πολιτισμός', 'κοινωνικός αντίκτυπος', 'καινοτομία'],

  // Gaza solidarity
  'hub03qylo08sd0vrp18s1xnq': ['αλληλεγγύη', 'συνηγορία', 'κοινωνία πολιτών', 'πολιτισμός', 'ένταξη'],

  // Pearle Live Performance Europe – UNESCO, cultural policy
  'gp7szebda9fr3phlqv7qxavv': ['συνέδριο', 'πολιτιστική πολιτική', 'ευρωπαϊκή συνεργασία', 'δικτύωση', 'πολιτισμός'],

  // ENCC General Assembly – European cultural centres
  'ldm5pxr3fnxae2v0fy5uog87': ['δικτύωση', 'ευρωπαϊκή συνεργασία', 'γενική συνέλευση', 'πολιτισμός', 'πολιτιστική πολιτική'],

  // River//Cities – urban culture, environment
  'mqcs02366e3gahhyewz3xztg': ['δικτύωση', 'ευρωπαϊκή συνεργασία', 'πολιτισμός', 'περιβάλλον', 'καινοτομία'],

  // Anna Lindh Foundation Thessaloniki
  'l597htng34p04f9evl0pd8jc': ['δικτύωση', 'ευρωπαϊκή συνεργασία', 'πολιτισμός', 'κοινωνία πολιτών', 'εκδήλωση'],

  // Bulletin #2 – Sustainable Regional Development
  'gypqi8tfh46iu0vne359uyjg': ['bulletin', 'πολιτισμός', 'κοινωνικός αντίκτυπος', 'δημιουργικές βιομηχανίες', 'περιβάλλον'],

  // 5η Γενική Συνέλευση – elections, new board
  'cnn2ngizd8ydouqj2aiub37i': ['γενική συνέλευση', 'εκδήλωση', 'κοινωνία πολιτών', 'δικτύωση', 'πολιτισμός'],

  // Απεργία 28/2/2025 – Τέμπη, solidarity
  'f2v2iioiz5liyq11cykpn3uc': ['αλληλεγγύη', 'συνηγορία', 'κοινωνία πολιτών', 'πολιτισμός', 'εκδήλωση'],

  // 5η ΓΣ Υποψηφιότητες (2 duplicates)
  'dy9jn54c2wtz7j5k6lmlj1zv': ['γενική συνέλευση', 'ανοιχτό κάλεσμα', 'κοινωνία πολιτών', 'δικτύωση', 'πολιτισμός'],
  'z0s709852cvatyigkxz8m7xn': ['γενική συνέλευση', 'ανοιχτό κάλεσμα', 'κοινωνία πολιτών', 'δικτύωση', 'πολιτισμός'],

  // Σεμινάριο ΕΕ πολιτιστική πολιτική (2 duplicates)
  'd4xsl6nh5osel0grcdulv35u': ['εργαστήριο', 'πολιτιστική πολιτική', 'ευρωπαϊκή συνεργασία', 'εκπαίδευση', 'πολιτισμός'],
  'v1ygnswcm9e7u1xwhyjt0wek': ['εργαστήριο', 'πολιτιστική πολιτική', 'ευρωπαϊκή συνεργασία', 'εκπαίδευση', 'πολιτισμός'],

  // Midterm Πάτρα – social innovation, CCI
  'u9k6cty9yt67l589nz5cujok': ['εκδήλωση', 'δικτύωση', 'καινοτομία', 'δημιουργικές βιομηχανίες', 'κοινωνικός αντίκτυπος'],

  // Midterm Πάτρα CCI2024 (2 duplicates)
  'szzz6nwj0fucjrtp7oi7p7zj': ['συνέδριο', 'δικτύωση', 'δημιουργικές βιομηχανίες', 'πολιτισμός', 'εκδήλωση'],
  'divfb05fd1ratai7uhy2tj8j': ['συνέδριο', 'δικτύωση', 'δημιουργικές βιομηχανίες', 'πολιτισμός', 'εκδήλωση'],

  // Σχέδιο Δράσης ΚτΠ – advocacy, civil society
  'lccnu2r6c5x10mnv4tgeupg7': ['συνηγορία', 'κοινωνία πολιτών', 'πολιτιστική πολιτική', 'διαφάνεια', 'πολιτισμός'],

  // Bulletin #1 – Inclusion
  'jpinp159jhky2l4od31nmhuv': ['bulletin', 'ένταξη', 'πολιτισμός', 'κοινωνικός αντίκτυπος', 'καινοτομία'],

  // Systems Change Academy Bosch – systems change, social innovation
  'k7tnmijbevvoezrr1jc542te': ['εργαστήριο', 'καινοτομία', 'δικτύωση', 'κοινωνικός αντίκτυπος', 'εκπαίδευση'],

  // 2ο Εργαστήριο Κοινωνικού Αντίκτυπου
  'g3s4eu0dp2nhilayxf293s3z': ['εργαστήριο', 'κοινωνικός αντίκτυπος', 'εκπαίδευση', 'πολιτισμός', 'καινοτομία'],

  // Anna Lindh Foundation Κομοτηνή
  'h5fipfair8tzttvd68wfqwuc': ['δικτύωση', 'ευρωπαϊκή συνεργασία', 'κοινωνία πολιτών', 'πολιτισμός', 'εκδήλωση'],

  // ENCC membership – European cultural centres
  'v6l1av9tsse2nvyqss6gydj3': ['δικτύωση', 'ευρωπαϊκή συνεργασία', 'πολιτισμός', 'πολιτιστική πολιτική', 'καινοτομία'],

  // Action Group Digital Art & AI CAE (2 duplicates)
  'de811u0odzuqixypt7eonmm3': ['τεχνητή νοημοσύνη', 'ευρωπαϊκή συνεργασία', 'πολιτιστική πολιτική', 'δικτύωση', 'πολιτισμός'],
  'lqdfnnh2u3m08uk8jgzfri3j': ['τεχνητή νοημοσύνη', 'ευρωπαϊκή συνεργασία', 'πολιτιστική πολιτική', 'δικτύωση', 'πολιτισμός'],

  // Εγγραφή σωματείων στα μητρώα – legislation, advocacy
  'kgqafygzp2enufqzhf2lzn0g': ['νομοθεσία', 'συνηγορία', 'κοινωνία πολιτών', 'διαφάνεια', 'πολιτισμός'],

  // TEH Meeting 98 – Trans Europe Halles, creative spaces
  'e4nai791fkmdb4cob22sjfs6': ['δικτύωση', 'ευρωπαϊκή συνεργασία', 'πολιτισμός', 'δημιουργικές βιομηχανίες', 'εκδήλωση'],

  // Σχέδιο Δράσης ΚτΠ (shorter version)
  'runyz0g29g5z61em63xvtnbv': ['συνηγορία', 'κοινωνία πολιτών', 'πολιτιστική πολιτική', 'διαφάνεια', 'πολιτισμός'],

  // Κλήρωση μελών σε διοργανώσεις
  'qlixr0l6mybo3clsvjaniijw': ['δικτύωση', 'εκδήλωση', 'πολιτισμός', 'ευρωπαϊκή συνεργασία', 'εκπαίδευση'],

  // Ημερολόγιο 2024 Δ' Τρίμηνο (2 duplicates)
  'pcq31slnc3rzfru7g5i17de0': ['εκδήλωση', 'δικτύωση', 'πολιτισμός', 'εκπαίδευση', 'κοινωνικός αντίκτυπος'],
  'sphhukrlzdprlfytmkodd5x8': ['εκδήλωση', 'δικτύωση', 'πολιτισμός', 'εκπαίδευση', 'κοινωνικός αντίκτυπος'],

  // Θέση εργασίας Administrative Officer
  'cwbj0yqchnx20aubg5vc8wyh': ['θέση εργασίας', 'ανοιχτό κάλεσμα', 'κοινωνία πολιτών', 'πολιτισμός', 'καινοτομία'],

  // Διακρίσεις μελών – awards, Europa Nostra
  'tlw9cgjum3v8oc0z8hr4w0cz': ['πολιτισμός', 'ευρωπαϊκή συνεργασία', 'δικτύωση', 'καινοτομία', 'κοινωνικός αντίκτυπος'],

  // Ανασχηματισμός ΔΣ
  'uyn7ly1mxuf1qmrkyeqwlh1n': ['γενική συνέλευση', 'δικτύωση', 'κοινωνία πολιτών', 'πολιτισμός', 'διαφάνεια'],

  // Tale X Cities – cultural policy, urban, Thessaloniki
  'fmf115l42xsh3c4vebhuogd7': ['πολιτιστική πολιτική', 'δικτύωση', 'πολιτισμός', 'καινοτομία', 'εκδήλωση'],

  // GCDN Athens – cultural districts, governance
  'vdcxizbridr6l9dhygg6gyo2': ['δικτύωση', 'πολιτιστική πολιτική', 'πολιτισμός', 'ευρωπαϊκή συνεργασία', 'καινοτομία'],

  // 4η ΓΣ Ελευσίνα (2 duplicates)
  'a8szb2s9sb6kt83aaarer2ou': ['γενική συνέλευση', 'εκδήλωση', 'δικτύωση', 'κοινωνία πολιτών', 'πολιτισμός'],
  'ikvcheqjm48zuxc8z6tsy48r': ['γενική συνέλευση', 'εκδήλωση', 'δικτύωση', 'κοινωνία πολιτών', 'πολιτισμός'],

  // 2023 Ελευσίς workshops – professional solidarity (2 duplicates)
  'jrdi09ilp96vnvh3pl6i9ezt': ['εργαστήριο', 'εκδήλωση', 'πολιτισμός', 'αλληλεγγύη', 'δικτύωση'],
  'sxnickri1p2lys8qe8n1ecue': ['εργαστήριο', 'εκδήλωση', 'πολιτισμός', 'αλληλεγγύη', 'δικτύωση'],

  // 1ο Εργαστήριο Κοινωνικού Αντίκτυπου
  'jlq7gmx96x853x0aqrfsjql9': ['εργαστήριο', 'κοινωνικός αντίκτυπος', 'εκπαίδευση', 'πολιτισμός', 'καινοτομία'],

  // Θέση εργασίας Χαρτογράφηση Χρηματοδότησης
  'i5v3nf4wrkbhctgdatwstlij': ['θέση εργασίας', 'χρηματοδότηση', 'ανοιχτό κάλεσμα', 'κοινωνία πολιτών', 'πολιτισμός'],

  // Σχέδιο Νόμου Φοροδιαφυγή (2 duplicates)
  'xprelcpp56wr9tfbj3wvssls': ['νομοθεσία', 'συνηγορία', 'κοινωνία πολιτών', 'πολιτισμός', 'δημιουργικές βιομηχανίες'],
  'huk61sfedeafhcfhfji4m352': ['νομοθεσία', 'συνηγορία', 'κοινωνία πολιτών', 'πολιτισμός', 'δημιουργικές βιομηχανίες'],

  // Learning Lab Oxford – ecosystem catalyzation
  'y6vrkqynl0yvha24yqohnnk3': ['εκπαίδευση', 'δικτύωση', 'καινοτομία', 'κοινωνικός αντίκτυπος', 'ευρωπαϊκή συνεργασία'],

  // Transparency International – WeOpenGov
  'tixeg1lld0ee038fubwk64w8': ['διαφάνεια', 'εκπαίδευση', 'κοινωνία πολιτών', 'δικτύωση', 'πολιτισμός'],

  // Επιστολή Αρχαιολόγων – solidarity, advocacy
  'iajdfdjcpb6rxuoc534bwszk': ['αλληλεγγύη', 'συνηγορία', 'πολιτισμός', 'κοινωνία πολιτών', 'πολιτιστική πολιτική'],

  // 3η ΓΣ – new board
  'frdcw9y1uabe62xa8pu426ys': ['γενική συνέλευση', 'εκδήλωση', 'δικτύωση', 'κοινωνία πολιτών', 'πολιτισμός'],

  // Πρέβεζα mid-term (2 duplicates)
  'g6kzt3dotf9s4hgqotdzo6b8': ['εκδήλωση', 'δικτύωση', 'πολιτισμός', 'κοινωνία πολιτών', 'καινοτομία'],
  'lcf9kfjco1vcvorem1dkemyk': ['εκδήλωση', 'δικτύωση', 'πολιτισμός', 'κοινωνία πολιτών', 'καινοτομία'],

  // 2η ΓΣ – post-pandemic
  'itlni5ib12zifi1ck8ukzdt8': ['γενική συνέλευση', 'εκδήλωση', 'δικτύωση', 'κοινωνία πολιτών', 'πολιτισμός'],

  // Βόλος mid-term – identity
  'yvgwi7ztudsnsaktecsnks9i': ['εκδήλωση', 'δικτύωση', 'πολιτισμός', 'κοινωνία πολιτών', 'καινοτομία'],
}

async function fetchAllActivities() {
  const activities = []
  let page = 1
  while (true) {
    const res = await fetch(
      `${STRAPI_URL}/api/activities?fields[0]=Title&fields[1]=Tags&pagination[page]=${page}&pagination[pageSize]=25&sort=Date:desc`,
      { headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` } }
    )
    if (!res.ok) {
      console.error('Failed to fetch activities:', await res.text())
      break
    }
    const data = await res.json()
    activities.push(...data.data)
    if (data.meta.pagination.page >= data.meta.pagination.pageCount) break
    page++
  }
  return activities
}

async function updateTags(documentId, tags) {
  const res = await fetch(`${STRAPI_URL}/api/activities/${documentId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
    },
    body: JSON.stringify({ data: { Tags: tags.join(', ') } }),
  })
  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(errorText)
  }
  return await res.json()
}

async function main() {
  if (DRY_RUN) console.log('=== DRY RUN MODE ===\n')

  console.log('Fetching activities from Strapi...')
  const activities = await fetchAllActivities()
  console.log(`Found ${activities.length} activities\n`)

  let updated = 0
  let skipped = 0
  let errors = 0
  const tagUsage = {}

  for (const activity of activities) {
    const tags = TAG_ASSIGNMENTS[activity.documentId]

    if (!tags) {
      console.log(`[SKIP] No tags mapped for: ${activity.Title} (${activity.documentId})`)
      skipped++
      continue
    }

    for (const tag of tags) {
      tagUsage[tag] = (tagUsage[tag] || 0) + 1
    }

    const tagStr = tags.join(', ')

    if (DRY_RUN) {
      console.log(`[${updated + 1}] ${activity.Title}`)
      console.log(`  NEW: ${tagStr}`)
      if (activity.Tags) console.log(`  OLD: ${activity.Tags}`)
      console.log()
      updated++
    } else {
      try {
        await updateTags(activity.documentId, tags)
        console.log(`[OK] ${activity.Title} -> ${tagStr}`)
        updated++
      } catch (err) {
        console.log(`[ERROR] ${activity.Title}: ${err.message}`)
        errors++
      }
      await new Promise(r => setTimeout(r, 150))
    }
  }

  console.log('\n--- Summary ---')
  console.log(`Updated: ${updated}`)
  console.log(`Skipped (unmapped): ${skipped}`)
  if (errors > 0) console.log(`Errors: ${errors}`)

  console.log('\nTag usage across all activities:')
  const sorted = Object.entries(tagUsage).sort((a, b) => b[1] - a[1])
  for (const [tag, count] of sorted) {
    console.log(`  ${tag}: ${count}`)
  }

  if (DRY_RUN) console.log('\n(Dry run - no changes were made)')
}

main().catch(err => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
