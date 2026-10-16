#!/usr/bin/env node
/**
 * ΣΥΜΠΛΗΡΩΝΕΙ τη δράση «ENCC Bridges Makers | Αθήνα 2026» στο Strapi.
 *
 * Η εγγραφή φτιάχτηκε με το χέρι και της έλειπαν: οι περιγραφές, ο χώρος,
 * οι δύο ημέρες ως συνεδρίες, τα τρία πεδία ταυτότητας και η συναίνεση.
 * Είχε επίσης ημερομηνίες 15/10→30/11 και Capacities ['member','other'],
 * που άφηναν στη φόρμα ΜΙΑ επιλογή ιδιότητας.
 *
 * ΑΝΤΙΚΑΘΙΣΤΑ ΦΟΡΜΑ GOOGLE. Τα περιεχόμενα είναι ΑΥΤΟΛΕΞΕΙ από τη φόρμα
 * (στιγμιότυπα 15/10/2026) και από το δελτίο ENCC Bridge Makers Athens 2026.
 * Δύο γλώσσες, όπως και η φόρμα: ελληνικά και αγγλικά στο ίδιο κείμενο.
 *
 * ΧΡΕΙΑΖΕΤΑΙ ΔΙΑΚΡΙΤΙΚΟ ΜΕ ΔΙΚΑΙΩΜΑ ΕΓΓΡΑΦΗΣ. Το .env.local κρατά συνήθως
 * το read-only· βγάλε από σχόλιο το FULL ACCESS, τρέξε, και ξαναβάλ' το.
 *
 * ΧΡΕΙΑΖΕΤΑΙ ΕΠΙΣΗΣ τα νέα κλειδιά μπλοκ (gender/activity/entity) να έχουν
 * φτάσει στο Strapi Cloud: χωρίς αυτά η δημιουργία κόβεται με 400 στο
 * «Key must be one of...». Πρώτα push στο StrapiDBforCforC, μετά αυτό.
 *
 * Είναι ΑΣΦΑΛΕΣ να ξανατρέξει: αν υπάρχει ήδη δράση με το ίδιο Slug,
 * σταματά χωρίς να δημιουργήσει δεύτερη.
 *
 * Usage: node scripts/create-encc-bridge-makers-2026.js
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const envPath = path.join(ROOT, '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    const k = t.slice(0, i).trim()
    if (!process.env[k]) process.env[k] = t.slice(i + 1).trim()
  }
}

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const TOKEN = process.env.STRAPI_API_TOKEN
if (!STRAPI_URL || !TOKEN) {
  console.error('ERROR: λείπει STRAPI_URL ή STRAPI_API_TOKEN στο .env.local')
  process.exit(1)
}

// Το slug της εγγραφής που έφτιαξε ο Γιώργος στο Content Manager — ΔΕΝ αλλάζει:
// η σελίδα είναι ήδη ζωντανή και ο σύνδεσμος μπορεί να έχει μοιραστεί.
const SLUG = 'encc-bridges-makers-athina-2026'

// Το ΙΔΙΟ κείμενο με το προσχέδιο του γράμματος — μία πηγή, δύο προορισμοί
const { BLOCKS: INFO_BLOCKS } = require('./lib/encc-content')

const GREEK = `ENCC Bridge Makers Athens 2026

Ο Πολιτισμός ως Μοχλός Μετασχηματισμού
Καλλιεργώντας την Τοπική Ανθεκτικότητα μέσα από Πολυεπίπεδες Συμμαχίες
Χτίζοντας γέφυρες για την τοπική ανθεκτικότητα

Το Culture for Change συνδιοργανώνει με το ευρωπαϊκό δίκτυο ENCC (European Network of Cultural Centres) τη συνάντηση ENCC Bridge Makers, με θέμα "Culture for Transformation: Cultivating Local Resilience Through Multi-Level Alliances | Building bridges for local resilience".

Το European Network of Cultural Centres (ENCC) είναι το ευρωπαϊκό δίκτυο κοινωνικο-πολιτιστικών κέντρων που εκπροσωπεί πάνω από 3.000 οργανισμούς σε 27 χώρες, προωθώντας την ισότητα στον πολιτισμό, την ενεργό πολιτότητα και τη βιώσιμη ανάπτυξη.

Το ENCC Bridge Makers αποτελεί την πρωτοβουλία συνηγορίας (advocacy) του ENCC, που έχει ως στόχο τη γεφύρωση του χάσματος και την καλλιέργεια διαλόγου μεταξύ τοπικών αρχών, χαρτοφυλακίων πολιτικής και ανεξάρτητων πολιτιστικών φορέων, με σκοπό τη συν-διαμόρφωση βιώσιμων λύσεων για τις τοπικές κοινωνίες.

Ημερομηνία και Χώρος Διεξαγωγής:
13-14 Νοεμβρίου 2026
Πολιτιστικό Κέντρο «Μελίνα» (Ηρακλειδών 66, Αθήνα 118 51)
Γλώσσες εργασίας: Ελληνικά & Αγγλικά

Εστιάζουμε στη μετασχηματιστική δύναμη του πολιτισμού για τη δημιουργία «γεφυρών» ανάμεσα στα πολιτιστικά κέντρα, στις ομάδες της κοινωνίας των πολιτών και στις τοπικές αρχές, στην ενίσχυση της εμπιστοσύνης και στην ανάδειξη των κοινών μας πόρων.

Μέσα από συμμετοχικές τεχνικές, ζυμώσεις και διαδραστικές διαδικασίες, επιδιώκουμε να δημιουργήσουμε ένα ανοικτό, γόνιμο και συμπεριληπτικό κλίμα διαλόγου που θα θέσει τις βάσεις για έναν "Συμμετοχικό Οδικό Χάρτη για Μετασχηματιστικές Τοπικές Δράσεις".

Παράλληλα, θα επισκεφτούμε πολιτιστικούς φορείς του μεταξουργείου με ποικίλα μοντέλα διακυβέρνησης.

Η εκδήλωση απευθύνεται σε:
• Επαγγελματίες του πολιτισμού και εκπροσώπους ανεξάρτητων πολιτιστικών χώρων & εγχειρημάτων
• Ομάδες & οργανώσεις της κοινωνίας των πολιτών, αλληλέγγυες πρωτοβουλίες και αστικά εγχειρήματα
• Στελέχη της τοπικής αυτοδιοίκησης (Δήμων & Περιφερειών) και υπεύθυνους χάραξης πολιτικής στους τομείς του πολιτισμού, της κοινωνικής πολιτικής και της αστικής ανάπτυξης
• Ερευνητές, ακαδημαϊκούς που ασχολούνται με τη συμμετοχική δημοκρατία και την τοπική ανθεκτικότητα
• Ενεργούς πολίτες που ενδιαφέρονται για τα κοινά (commons)
• Επαγγελματίες από τον χώρο του επιχειρείν για συζήτηση και συνδιαμόρφωση μοντέλων κοινωνικής καινοτομίας και χρηματοδότησης πρωτοβουλιών συνεργασίας πολιτιστικών οργανισμών, ΟΚοιΠ και στελεχών ΟΤΑ

Συμμετοχή: δωρεάν, απαραίτητη η εγγραφή.

Για την εγγραφή σας, παρακαλούμε να συμπληρώσετε τα ακόλουθα πεδία (όπου *, το πεδίο είναι υποχρεωτικό).

Περισσότερες πληροφορίες θα σταλούν μερικές μέρες πριν τη διοργάνωση.

Για οποιαδήποτε διευκρίνηση, επικοινωνήστε στο: hello@cultureforchange.net

Θα χαρούμε να σας καλωσορίσουμε!

Η ομάδα του Culture for Change`

const ENGLISH = `ENCC Bridge Makers Athens 2026

Culture for Transformation
Cultivating Local Resilience Through Multi-Level Alliances
Building bridges for local resilience

Culture for Change is co-organizing the ENCC Bridge Makers gathering alongside the ENCC (European Network of Cultural Centres), under the title "Culture for Transformation: Cultivating Local Resilience Through Multi-Level Alliances | Building bridges for local resilience".

Date & Venue:
13–14 November 2026
"Melina" Cultural Centre (Iraklidon 66, Athens 118 51)
Working languages: Greek & English

We focus on the transformative power of culture to build "bridges" among cultural centres, civil society groups, and local authorities, fostering trust and highlighting our shared commons resources.

Through participatory methods, collaborative exchanges, and interactive processes, we aim to create an open, fertile, and inclusive environment for dialogue that will lay the foundation for a "Participatory Roadmap for Transformative Local Actions".

Additionally, we will visit cultural organizations in the Metaxourgeio area that operate under diverse governance models.

Participation: Free (registration required).

To register, please complete the fields below (* indicates a required field).

Further details will be sent a few days prior to the event.

For any further information, please contact: hello@cultureforchange.net

We look forward to welcoming you!

The Culture for Change Team`

/**
 * Η ΣΥΝΑΙΝΕΣΗ ΑΥΤΟΛΕΞΕΙ ΑΠΟ ΤΗ ΦΟΡΜΑ. Αντιγράφεται σε κάθε δήλωση, ώστε μια
 * μελλοντική αλλαγή διατύπωσης να ΜΗΝ αλλοιώνει τι συναίνεσε ο καθένας.
 */
const CONSENT_TEXT = `Ενημέρωση για την Επεξεργασία Προσωπικών Δεδομένων & τη Φωτογράφιση / Βιντεοσκόπηση

Το Σωματείο με την επωνυμία "Culture for Change" και με τον διακριτικό τίτλο "CforC", το οποίο εδρεύει στην Αθήνα επί της Λεωφόρου Αλεξάνδρας 48, ΤΚ 11473, ΑΦΜ 996788256, ΔΟΥ Δ' Αθηνών (επικοινωνία: hello@cultureforchange.net) και εκπροσωπείται νομίμως, ενεργώντας ως "ΥΠΕΥΘΥΝΟΣ ΕΠΕΞΕΡΓΑΣΙΑΣ", σας ενημερώνει:

- Η δράση πρόκειται να καταγραφεί γραπτά, σε μορφή φωτογραφίας και αρχείου ήχου, να βιντεοσκοπηθεί μερικά και το υλικό αυτό να αξιοποιηθεί για λόγους εκπαιδευτικούς, στατιστικούς, επικοινωνιακούς, αρχειακούς και προωθητικούς.

Κατά τη διάρκεια της εκδήλωσης ο φακός εστιάζει στους ομιλητές και, εφόσον προκύψει διαλογική συζήτηση, στους υποβάλλοντες ερώτημα από το κοινό.

*Εάν υπάρχουν παιδιά στο κοινό, θα φροντίσουμε να μη φωτογραφηθούν χωρίς τη συναίνεση του συνοδού τους.

Το βιντεοληπτικό και φωτογραφικό υλικό θα χρησιμοποιηθεί μόνο για τους σκοπούς του Σωματείου, σε συνάρτηση με το αντικείμενο του εργαστηρίου. Στο "Culture for Change" λαμβάνουμε σοβαρά υπόψη την προστασία των προσωπικών δεδομένων.

Δείτε στο https://www.cultureforchange.net/privacy την Πολιτική Απορρήτου μας.
__________

Notice on Personal Data Processing & Visual/Audio Recording

The non-profit association under the name "Culture for Change" and the distinctive title "CforC", registered in Athens at 48 Alexandra Avenue, PC 11473, Tax Registration No. (AFM) 996788256, Tax Office D' Athens (Contact: hello@cultureforchange.net), legally represented, acting as the "DATA CONTROLLER", hereby informs you:

The event will be recorded in writing, through photography and audio recording, and partially videotaped. This material will be utilized for educational, statistical, communication, archiving, and promotional purposes.

During the event, the cameras will focus primarily on the speakers and, in the event of an open Q&A session, on audience members asking questions.

If children are present in the audience, we will ensure they are not photographed without the explicit consent of their parent or guardian.

The video and photographic material will be used strictly for the purposes of the Association in connection with the objectives of the event. At "Culture for Change", we take the protection of personal data very seriously.

Please consult our Privacy Policy at https://www.cultureforchange.net/privacy`

/**
 * ΜΙΑ ΙΔΙΟΤΗΤΑ ΑΝΑ ΠΛΕΥΡΑ — ΚΑΙ ΕΤΣΙ Η ΕΡΩΤΗΣΗ ΕΞΑΦΑΝΙΖΕΤΑΙ.
 *
 * Η δράση είναι ανοιχτή και δεν ξεχωρίζει υποτρόφους START, όπως το Midterm.
 * Με μία μόνο δυνατή απάντηση σε κάθε διαδρομή — ο συνδεδεμένος είναι μέλος,
 * ο επισκέπτης δεν είναι — η φόρμα τη συμπληρώνει μόνη της και δεν ρωτά
 * τίποτα. Ο έλεγχος μένει εκεί που αξίζει: στην πύλη πριν τη φόρμα, που
 * προσφέρει σύνδεση ώστε τα στοιχεία να έρθουν έτοιμα.
 */
const ALL = ['member', 'non-member']

const EVENT = {
  // Η διατύπωση είναι του Γιώργου· διορθώνεται μόνο το ΛΑΤΙΝΙΚΟ «A» στο «Αθήνα»,
  // που σπάει αναζήτηση και ταξινόμηση.
  Title: 'ENCC Bridges Makers | Αθήνα 2026',
  Slug: SLUG,
  Subtitle: 'Ο Πολιτισμός ως Μοχλός Μετασχηματισμού — Καλλιεργώντας την Τοπική Ανθεκτικότητα μέσα από Πολυεπίπεδες Συμμαχίες',
  Description: GREEK,
  DescriptionEn: ENGLISH,
  StartDate: '2026-11-13',
  EndDate: '2026-11-14',
  // Από το δελτίο: «Προθεσμία εγγραφών: 6 Νοεμβρίου»
  RegistrationDeadline: '2026-11-06',
  Venue: 'Πολιτιστικό Κέντρο «Μελίνα»',
  City: 'Αθήνα',
  HostedBy: 'Culture for Change & ENCC (European Network of Cultural Centres)',
  // Ανοιχτή σε όλους — δεν είναι εσωτερική δράση μελών
  Audience: 'non-member',
  Capacities: ALL,
  RegistrationOpen: true,
  /**
   * ΓΥΡΙΣΕ ΠΙΣΩ (15/10/2026). Δοκιμάστηκε με τις τέσσερις ορατές και ο
   * Γιώργος προτίμησε τον διαχωρισμό: δύο επιλογές στον συνδεδεμένο, δύο
   * στον επισκέπτη. Ο λόγος φάνηκε στην πράξη — με όλες ορατές, όποιος δεν
   * είναι συνδεδεμένος και πατούσε «Μέλος CforC» έπεφτε σε τοίχο σύνδεσης
   * αντί να συμπληρώσει τη φόρμα.
   */
  ShowAllCapacities: false,
  // Η σελίδα «Περισσότερες πληροφορίες» αυτής της δράσης
  InfoBlocks: INFO_BLOCKS,
  ConsentText: CONSENT_TEXT,
  ConsentVersion: '2026-10-15',
  PersonalDataMonths: 12,
  DietaryPurgeDays: 0,

  /**
   * «Συμμετοχή σε / Attending» — τα δύο κουτάκια της φόρμας. Στο σύστημά μας
   * είναι ΣΥΝΕΔΡΙΕΣ, όχι μπλοκ ερωτήσεων: έτσι μετριούνται ανά ημέρα και
   * φαίνονται στη στήλη «Συνεδρίες» του OC χωρίς καμία επιπλέον δουλειά.
   */
  Sessions: [
    {
      Title: 'Παρασκευή 13 Νοεμβρίου | Κεντρική Εκδήλωση & Στρογγυλά Τραπέζια',
      Subtitle: 'Πολιτιστικό Κέντρο «Μελίνα» — Friday, 13 November | Main Event & Round Tables',
      // ΩΡΑ ΑΘΗΝΑΣ 10.00–19.00. Το πεδίο είναι UTC και ο Νοέμβριος είναι EET
      // (UTC+2): ό,τι γράφεται εδώ εμφανίζεται ΔΥΟ ΩΡΕΣ ΑΡΓΟΤΕΡΑ στη σελίδα.
      StartsAt: '2026-11-13T08:00:00.000Z', EndsAt: '2026-11-13T17:00:00.000Z',
      AllowInPerson: true, AllowOnline: false, VisibleFor: ALL, SortOrder: 1,
    },
    {
      Title: 'Σάββατο 14 Νοεμβρίου | Επισκέψεις Πεδίου',
      Subtitle: 'Πολιτιστικοί φορείς του Μεταξουργείου — Saturday, 14 November | Study Visits / Field Visits',
      // ΩΡΑ ΑΘΗΝΑΣ 10.00–14.00
      StartsAt: '2026-11-14T08:00:00.000Z', EndsAt: '2026-11-14T12:00:00.000Z',
      AllowInPerson: true, AllowOnline: false, VisibleFor: ALL, SortOrder: 2,
    },
  ],

  /**
   * Τα πεδία ταυτότητας της φόρμας. Ονοματεπώνυμο, email και τηλέφωνο είναι
   * ήδη πεδία της δήλωσης — δεν ξαναζητιούνται εδώ.
   */
  Options: [
    {
      Key: 'activity',
      Title: 'ΕΠΑΓΓΕΛΜΑΤΙΚΗ ΔΡΑΣΤΗΡΙΟΤΗΤΑ / FIELD OF ACTIVITY',
      Description: null,
      Required: true, VisibleFor: ALL, SortOrder: 1, Choices: null,
    },
    {
      Key: 'gender',
      Title: 'ΦΥΛΟ / GENDER',
      Description: null,
      Required: true, VisibleFor: ALL, SortOrder: 2,
      Choices: [
        { value: 'female', label: 'Γυναίκα / Female' },
        { value: 'male', label: 'Άνδρας / Male' },
        { value: 'nonbinary', label: 'Άλλο / Μη δυαδικό (Non-binary)' },
        { value: 'na', label: 'Προτιμώ να μην απαντήσω / Rather not to answer' },
      ],
    },
    {
      Key: 'entity',
      Title: 'ΦΟΡΕΑΣ ΠΟΥ ΕΚΠΡΟΣΩΠΕΙΤΕ / ENTITY YOU REPRESENT',
      Description: null,
      Required: true, VisibleFor: ALL, SortOrder: 3, Choices: null,
    },
  ],
}

async function api(path, method = 'GET', data) {
  const res = await fetch(`${STRAPI_URL}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
    ...(data !== undefined && { body: JSON.stringify({ data }) }),
  })
  let json = null
  try { json = await res.json() } catch { /* 204 */ }
  return { ok: res.ok, status: res.status, json }
}

;(async () => {
  const existing = await api(`/events?filters[Slug][$eq]=${SLUG}&pagination[limit]=1`)
  if (!existing.ok) {
    console.error(`ERROR: δεν διαβάζεται η συλλογή events (HTTP ${existing.status}).`)
    process.exit(1)
  }

  // Υπάρχει ήδη ⇒ ΣΥΜΠΛΗΡΩΝΕΤΑΙ. Το Slug δεν ξαναγράφεται: είναι η διεύθυνση.
  const row = existing.json?.data?.[0]
  if (row) {
    const { Slug, ...patch } = EVENT
    const upd = await api(`/events/${row.documentId}`, 'PUT', patch)
    if (!upd.ok) {
      console.error(`ERROR στην ενημέρωση: HTTP ${upd.status}`)
      console.error(JSON.stringify(upd.json?.error || upd.json, null, 2).slice(0, 1200))
      if (upd.status === 400) {
        console.error('\n→ 400 στο «Key»: τα gender/activity/entity δεν έχουν φτάσει ακόμη στο Strapi Cloud.')
      }
      process.exit(1)
    }
    console.log('Η δράση ΣΥΜΠΛΗΡΩΘΗΚΕ.')
    console.log(`  documentId: ${row.documentId}  ·  slug: ${SLUG}`)
    console.log(`  ημερομηνίες: ${EVENT.StartDate} → ${EVENT.EndDate}  ·  προθεσμία: ${EVENT.RegistrationDeadline}`)
    console.log(`  ιδιότητες: ${EVENT.Capacities.join(', ')}`)
    console.log(`  συνεδρίες: ${EVENT.Sessions.length}  ·  μπλοκ: ${EVENT.Options.length}`)
    console.log('')
    console.log(`Φόρμα: https://www.cultureforchange.net/events/${SLUG}/register`)
    process.exit(0)
  }

  const created = await api('/events', 'POST', EVENT)
  if (!created.ok) {
    console.error(`ERROR: HTTP ${created.status}`)
    console.error(JSON.stringify(created.json?.error || created.json, null, 2).slice(0, 1200))
    if (created.status === 403) {
      console.error('\n→ 403: το διακριτικό είναι ΜΟΝΟ ΑΝΑΓΝΩΣΗΣ. Βγάλε από σχόλιο το FULL ACCESS στο .env.local.')
    }
    if (created.status === 400) {
      console.error('\n→ 400 στο «Key»: τα gender/activity/entity δεν έχουν φτάσει ακόμη στο Strapi Cloud.')
      console.error('   Κάνε push το StrapiDBforCforC και περίμενε το redeploy.')
    }
    process.exit(1)
  }

  const d = created.json?.data
  console.log('Η δράση δημιουργήθηκε.')
  console.log(`  documentId: ${d?.documentId}`)
  console.log(`  slug:       ${SLUG}`)
  console.log(`  συνεδρίες:  ${EVENT.Sessions.length}  ·  μπλοκ: ${EVENT.Options.length}`)
  console.log('')
  console.log('ΠΡΟΣΟΧΗ: είναι ΠΡΟΧΕΙΡΟ (draft). Δημοσίευσέ το από το Content Manager για να φανεί.')
  console.log(`Φόρμα: https://www.cultureforchange.net/events/${SLUG}/register`)
})()
