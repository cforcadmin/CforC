/**
 * Script to translate FieldsOfWork from English to Greek for all members
 *
 * Usage:
 * 1. npm install translate (if not installed)
 * 2. node scripts/translate-fields-of-work.js
 *
 * Options:
 *   --dry-run    Preview translations without updating the database
 */

const fs = require('fs')
const path = require('path')

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' })

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN || process.env.NEXT_PUBLIC_STRAPI_API_TOKEN

if (!STRAPI_URL || !STRAPI_API_TOKEN) {
  console.error('❌ Error: STRAPI_URL and STRAPI_API_TOKEN must be set in .env.local')
  process.exit(1)
}

const DRY_RUN = process.argv.includes('--dry-run')

// Manual translation map for common fields of work (more accurate than auto-translate)
const TRANSLATION_MAP = {
  // Arts & Culture
  'visual arts': 'εικαστικές τέχνες',
  'performing arts': 'παραστατικές τέχνες',
  'theater': 'θέατρο',
  'theatre': 'θέατρο',
  'dance': 'χορός',
  'music': 'μουσική',
  'film': 'κινηματογράφος',
  'cinema': 'κινηματογράφος',
  'photography': 'φωτογραφία',
  'sculpture': 'γλυπτική',
  'painting': 'ζωγραφική',
  'illustration': 'εικονογράφηση',
  'graphic design': 'γραφιστική',
  'design': 'σχεδιασμός',
  'architecture': 'αρχιτεκτονική',
  'crafts': 'χειροτεχνία',
  'ceramics': 'κεραμική',
  'textile': 'υφαντική',
  'fashion': 'μόδα',
  'jewelry': 'κοσμήματα',

  // Cultural Management
  'cultural management': 'πολιτιστική διαχείριση',
  'cultural policy': 'πολιτιστική πολιτική',
  'arts management': 'διαχείριση τεχνών',
  'project management': 'διαχείριση έργων',
  'event management': 'διαχείριση εκδηλώσεων',
  'festival management': 'διαχείριση φεστιβάλ',
  'museum management': 'διαχείριση μουσείων',
  'heritage management': 'διαχείριση πολιτιστικής κληρονομιάς',
  'cultural heritage': 'πολιτιστική κληρονομιά',

  // Education & Research
  'education': 'εκπαίδευση',
  'art education': 'εκπαίδευση στην τέχνη',
  'cultural education': 'πολιτιστική εκπαίδευση',
  'research': 'έρευνα',
  'academic': 'ακαδημαϊκά',
  'teaching': 'διδασκαλία',
  'training': 'κατάρτιση',
  'workshops': 'εργαστήρια',

  // Communication & Media
  'communication': 'επικοινωνία',
  'marketing': 'μάρκετινγκ',
  'public relations': 'δημόσιες σχέσεις',
  'social media': 'κοινωνικά δίκτυα',
  'journalism': 'δημοσιογραφία',
  'writing': 'συγγραφή',
  'editing': 'επιμέλεια',
  'publishing': 'εκδόσεις',
  'media': 'μέσα ενημέρωσης',
  'digital media': 'ψηφιακά μέσα',

  // Technology
  'technology': 'τεχνολογία',
  'digital': 'ψηφιακό',
  'web development': 'ανάπτυξη ιστοσελίδων',
  'software': 'λογισμικό',
  'multimedia': 'πολυμέσα',
  'interactive': 'διαδραστικό',
  'virtual reality': 'εικονική πραγματικότητα',
  'augmented reality': 'επαυξημένη πραγματικότητα',

  // Social & Community
  'community': 'κοινότητα',
  'community development': 'ανάπτυξη κοινότητας',
  'social work': 'κοινωνική εργασία',
  'social innovation': 'κοινωνική καινοτομία',
  'activism': 'ακτιβισμός',
  'advocacy': 'συνηγορία',
  'volunteering': 'εθελοντισμός',
  'nonprofit': 'μη κερδοσκοπικό',
  'ngo': 'μκο',

  // Business & Strategy
  'consulting': 'συμβουλευτική',
  'strategy': 'στρατηγική',
  'fundraising': 'συγκέντρωση πόρων',
  'finance': 'χρηματοοικονομικά',
  'administration': 'διοίκηση',
  'management': 'διαχείριση',
  'entrepreneurship': 'επιχειρηματικότητα',

  // Specific Roles
  'curator': 'επιμελητής',
  'curating': 'επιμέλεια',
  'curation': 'επιμέλεια',
  'artist': 'καλλιτέχνης',
  'producer': 'παραγωγός',
  'director': 'σκηνοθέτης',
  'coordinator': 'συντονιστής',
  'facilitator': 'διευκολυντής',
  'mediator': 'διαμεσολαβητής',

  // Other
  'sustainability': 'βιωσιμότητα',
  'environment': 'περιβάλλον',
  'urban': 'αστικό',
  'rural': 'αγροτικό',
  'tourism': 'τουρισμός',
  'cultural tourism': 'πολιτιστικός τουρισμός',
  'accessibility': 'προσβασιμότητα',
  'inclusion': 'ένταξη',
  'diversity': 'διαφορετικότητα',
  'international': 'διεθνές',
  'european': 'ευρωπαϊκό',
  'local': 'τοπικό',
  'regional': 'περιφερειακό',
  'national': 'εθνικό',
}

// Translate a single term using the map or Google Translate API
async function translateTerm(term, translator) {
  if (!term || term.trim() === '') return term

  const lowerTerm = term.toLowerCase().trim()

  // Check if we have a manual translation
  if (TRANSLATION_MAP[lowerTerm]) {
    return TRANSLATION_MAP[lowerTerm]
  }

  // Try to find partial matches
  for (const [eng, gr] of Object.entries(TRANSLATION_MAP)) {
    if (lowerTerm.includes(eng)) {
      return lowerTerm.replace(eng, gr)
    }
  }

  // Use Google Translate for unknown terms
  try {
    const result = await translator(term, { to: 'el' })
    return result.text || term
  } catch (error) {
    console.log(`      ⚠️  Could not translate: "${term}"`)
    return term
  }
}

// Translate FieldsOfWork (comma-separated string)
async function translateFieldsOfWork(fieldsOfWork, translator) {
  if (!fieldsOfWork || fieldsOfWork.trim() === '') return fieldsOfWork

  // Split by comma, translate each, rejoin
  const fields = fieldsOfWork.split(',').map(f => f.trim()).filter(f => f)
  const translatedFields = []

  for (const field of fields) {
    const translated = await translateTerm(field, translator)
    translatedFields.push(translated)
  }

  return translatedFields.join(', ')
}

// Fetch all members
async function fetchMembers() {
  console.log('📡 Fetching members from Strapi...')

  let allMembers = []
  let page = 1
  const pageSize = 100
  let hasMore = true

  while (hasMore) {
    const url = `${STRAPI_URL}/api/members?pagination[page]=${page}&pagination[pageSize]=${pageSize}&fields[0]=Name&fields[1]=FieldsOfWork`

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${STRAPI_API_TOKEN}`
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (data.data && data.data.length > 0) {
      allMembers = allMembers.concat(data.data)
      console.log(`   Page ${page}: ${data.data.length} members (total: ${allMembers.length})`)
    }

    if (data.meta && data.meta.pagination) {
      hasMore = page < data.meta.pagination.pageCount
      page++
    } else {
      hasMore = false
    }
  }

  console.log(`✅ Fetched ${allMembers.length} members\n`)
  return allMembers
}

// Update member FieldsOfWork
async function updateMember(member, translatedFieldsOfWork) {
  const url = `${STRAPI_URL}/api/members/${member.documentId || member.id}`

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${STRAPI_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      data: {
        FieldsOfWork: translatedFieldsOfWork
      }
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`${response.status}: ${errorText}`)
  }

  return await response.json()
}

// Main function
async function main() {
  try {
    console.log('🚀 Starting FieldsOfWork translation...\n')
    console.log(`📍 Strapi: ${STRAPI_URL}`)
    console.log(`🔄 Mode: ${DRY_RUN ? 'DRY RUN (no changes will be made)' : 'LIVE (will update database)'}\n`)

    // Try to load the translate package
    let translator
    try {
      const translate = require('translate')
      translate.engine = 'google'
      translator = translate
      console.log('✅ Google Translate loaded\n')
    } catch (e) {
      console.log('📦 Installing translate package...')
      const { execSync } = require('child_process')
      execSync('npm install translate', { stdio: 'inherit' })
      const translate = require('translate')
      translate.engine = 'google'
      translator = translate
      console.log('')
    }

    // Fetch members
    const members = await fetchMembers()

    // Filter members with FieldsOfWork
    const membersWithFields = members.filter(m => m.FieldsOfWork && m.FieldsOfWork.trim() !== '')
    console.log(`📝 Found ${membersWithFields.length} members with FieldsOfWork\n`)

    // Translate and update
    let translated = 0
    let skipped = 0
    let failed = 0

    const results = []

    for (let i = 0; i < membersWithFields.length; i++) {
      const member = membersWithFields[i]
      const name = member.Name || `Member ${member.id}`
      const original = member.FieldsOfWork

      console.log(`[${i + 1}/${membersWithFields.length}] ${name}`)
      console.log(`   Original: ${original}`)

      try {
        const translatedFields = await translateFieldsOfWork(original, translator)
        console.log(`   Translated: ${translatedFields}`)

        // Check if translation is different
        if (translatedFields === original) {
          console.log(`   ⏭️  Skipped (no change needed)`)
          skipped++
        } else if (DRY_RUN) {
          console.log(`   🔍 Would update (dry run)`)
          translated++
        } else {
          await updateMember(member, translatedFields)
          console.log(`   ✅ Updated`)
          translated++
        }

        results.push({
          name,
          original,
          translated: translatedFields,
          status: translatedFields === original ? 'skipped' : 'translated'
        })

      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`)
        failed++
        results.push({
          name,
          original,
          error: error.message,
          status: 'failed'
        })
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    // Save results to file
    const timestamp = new Date().toISOString().split('T')[0]
    const resultsFile = `fields-of-work-translations-${timestamp}.json`
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2), 'utf8')

    console.log('\n' + '='.repeat(50))
    console.log('✅ Translation completed!')
    console.log('='.repeat(50))
    console.log(`\n📊 Summary:`)
    console.log(`   Translated: ${translated}`)
    console.log(`   Skipped: ${skipped}`)
    console.log(`   Failed: ${failed}`)
    console.log(`\n📁 Results saved to: ${resultsFile}`)

    if (DRY_RUN) {
      console.log('\n💡 This was a dry run. Run without --dry-run to apply changes.')
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  }
}

main()
