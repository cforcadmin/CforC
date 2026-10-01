#!/usr/bin/env node
/**
 * Δημιουργεί τη δράση «5ο CforC Midterm & ReStart 2026» στο Strapi.
 *
 * ΧΡΕΙΑΖΕΤΑΙ ΔΙΑΚΡΙΤΙΚΟ ΜΕ ΔΙΚΑΙΩΜΑ ΕΓΓΡΑΦΗΣ. Το .env.local κρατά συνήθως
 * το read-only· βγάλε από σχόλιο το FULL ACCESS, τρέξε, και ξαναβάλ' το.
 *
 * Είναι ΑΣΦΑΛΕΣ να ξανατρέξει: αν υπάρχει ήδη δράση με το ίδιο Slug,
 * σταματά χωρίς να δημιουργήσει δεύτερη.
 *
 * Τα περιεχόμενα είναι από τη φόρμα και το γράμμα της πρόσκλησης (1/10/2026).
 * Ό,τι δεν ταιριάζει διορθώνεται μετά από το Content Manager — τα πάντα εδώ
 * είναι δεδομένα, όχι κώδικας.
 *
 * Usage: node scripts/create-midterm-2026.js
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

const SLUG = 'midterm-2026'

const GREEK_INVITATION = `Αγαπητές, Αγαπητοί, Αγαπητά,

Mε μεγάλη χαρά σας προσκαλούμε να επιβεβαιώσετε τη συμμετοχή στη μεγάλη μας φθινοπωρινή συνάντηση, η οποία θα πραγματοποιηθεί από τις 20 έως τις 22 Νοεμβρίου 2026 στη Θεσσαλονίκη, με την ευγενική φιλοξενία του Goethe-Institut Θεσσαλονίκης!

Φέτος, η συνάντησή μας είναι διπλή. Μαζί με το καθιερωμένο μας CforC Μidterm αναζητούμε την ιστορία του δικτύου στο πρόγραμμα Start Create Cultural Change και συνδιοργανώνουμε το START Reunion (σε συνεργασία με το μέλος μας Ίρις Περουλιού Σεργάκη και με τη συγχρηματοδότηση του Bosch Alumni Network που εξασφάλισε). Μας περιμένει ένα τριήμερο γεμάτο δράσεις!

Στις δράσεις προσκαλούμε όλα τα μέλη του CforC είτε προέρχονται από το πρόγραμμα Start είτε όχι αλλά και όλους τους υποτρόφους Start είτε είναι μέλη του CforC είτε όχι. Στις δράσεις μπορείτε να συμμετάσχετε δια ζώσης στη Θεσσαλονίκη είτε σε κάποιες διαδικτυακά (ο σύνδεσμος θα σας σταλεί προσεχώς).

20–21 Νοεμβρίου: ReStart - Bring the START Alumni Back Together (Από το Start στο Culture for Change. Συνάντηση υποτρόφων START / Bosch Alumni Network - BAN και μελών Culture For Change).

21–22 Νοεμβρίου: 5ο CforC Midterm. Ετήσια συνάντηση μελών Culture for Change.

Για να οργανώσουμε με τον καλύτερο τρόπο το πρόγραμμα και τα πρακτικά ζητήματα, παρακαλούμε συμπληρώστε την παρακάτω φόρμα.

⏱️ Προθεσμία υποβολής: έως Παρασκευή 20 Οκτωβρίου 2026.

Για απορίες/διευκρινίσεις: hello@cultureforchange.net ή στο 6976225704

Ανυπομονούμε να σμίξουμε ξανά!

Mε εκτίμηση,
Η Ομάδα Συντονισμού του CforC`

const ENGLISH_INVITATION = `Dear friends and colleagues,

We are delighted to invite you to confirm your participation in our major autumn meeting, taking place from November 20 to 22, 2026, in Thessaloniki, kindly hosted by the Goethe-Institut Thessaloniki!

This year, our gathering is a double celebration. Alongside our standard CforC Midterm, we are tracing the history of the network within the Start Create Cultural Change program and co-organizing the START Reunion (in collaboration with our member Iris Perouliou Sergaki and co-funded by the Bosch Alumni Network). A three-day program packed with activities awaits us!

We invite all CforC members—whether you originated from the Start program or not—as well as all Start fellows, regardless of CforC membership. You can participate either in person in Thessaloniki or online for selected sessions (the link will be sent to you soon).

November 20–21: ReStart - Bring the START Alumni Back Together (From Start to Culture for Change: Meeting of START / Bosch Alumni Network - BAN fellows and Culture For Change members).

November 21–22: 5th CforC Midterm: Annual meeting of Culture for Change members.

To help us organize the schedule and logistics in the best possible way, please fill out the form below.

Submission deadline: Friday, October 20, 2026.

For questions or clarifications: hello@cultureforchange.net or at +30 6976225704

We look forward to reconnecting!

Warm regards,
The CforC Coordination Team`

const CONSENT_TEXT = `Κρατάμε τα στοιχεία σου για να οργανώσουμε τη συμμετοχή σου: πρόγραμμα, εστίαση, διαμονή και αποστολή του συνδέσμου. Τα βλέπει η Ομάδα Συντονισμού του CforC.

Όπου χρειάζεται, δίνουμε μόνο το όνομα: στο ξενοδοχείο για την κράτηση και στον χώρο διεξαγωγής για την είσοδο. Ποτέ δεν πωλούνται, δεν δίνονται σε διαφημιστές και δεν χρησιμοποιούνται για άλλο σκοπό. Τυχόν στατιστικά βγαίνουν μόνο συγκεντρωτικά, χωρίς ονόματα.

Οι διατροφικές ιδιαιτερότητες κρατούνται μόνο με τη ρητή συγκατάθεσή σου και διαγράφονται αμέσως μετά τη δράση.

Μπορείς να ζητήσεις πρόσβαση, διόρθωση ή διαγραφή στο hello@cultureforchange.net.`

const ALL = ['member', 'member-ban', 'non-member-ban', 'non-member']
const MEMBERS_ONLY = ['member', 'member-ban']

const EVENT = {
  Title: '5ο CforC Midterm & ReStart 2026',
  Slug: SLUG,
  Subtitle: 'Από το Start στο Culture for Change — Bring the START Alumni Back Together',
  Description: GREEK_INVITATION,
  DescriptionEn: ENGLISH_INVITATION,
  StartDate: '2026-11-20',
  EndDate: '2026-11-22',
  RegistrationDeadline: '2026-10-20',
  Venue: 'Goethe-Institut Θεσσαλονίκης',
  City: 'Θεσσαλονίκη',
  HostedBy: 'Goethe-Institut Θεσσαλονίκης',
  // Ανοιχτή: καλούνται και υπότροφοι START που ΔΕΝ είναι μέλη
  Audience: 'non-member',
  Capacities: ALL,
  RegistrationOpen: true,
  ConsentText: CONSENT_TEXT,
  ConsentVersion: '2026-10-01',
  // ΠΡΟΣΩΡΙΝΑ, εν αναμονή DPO — αλλάζουν από το Content Manager
  PersonalDataMonths: 12,
  DietaryPurgeDays: 0,

  Sessions: [
    {
      Title: '1.α ΣΥΜΜΕΤΟΧΗ ΣΤΗ ΔΡΑΣΗ',
      Subtitle: 'Παρασκευή 20 Νοεμβρίου 2026, 18.00–21.00 — Από το Start στο Culture for Change',
      StartsAt: '2026-11-20T18:00:00.000Z', EndsAt: '2026-11-20T21:00:00.000Z',
      AllowInPerson: true, AllowOnline: true, VisibleFor: ALL, SortOrder: 1,
    },
    {
      Title: '1.β ΣΥΜΜΕΤΟΧΗ ΣΤΗ ΔΡΑΣΗ',
      Subtitle: 'Σάββατο 21 Νοεμβρίου 2026, 10.00–14.00 — Από το Start στο Culture for Change',
      StartsAt: '2026-11-21T10:00:00.000Z', EndsAt: '2026-11-21T14:00:00.000Z',
      // ΧΩΡΙΣ διαδικτυακή επιλογή — έτσι είναι στη φόρμα
      AllowInPerson: true, AllowOnline: false, VisibleFor: ALL, SortOrder: 2,
    },
    {
      Title: '1.γ ΣΥΜΜΕΤΟΧΗ ΣΤΗ ΔΡΑΣΗ',
      Subtitle: 'Σάββατο 21 Νοεμβρίου 2026, 16.00–20.00 — CforC Midterm',
      StartsAt: '2026-11-21T16:00:00.000Z', EndsAt: '2026-11-21T20:00:00.000Z',
      AllowInPerson: true, AllowOnline: true, VisibleFor: ALL, SortOrder: 3,
    },
    {
      Title: '1.δ ΣΥΜΜΕΤΟΧΗ ΣΤΗ ΔΡΑΣΗ',
      Subtitle: 'Κυριακή 22 Νοεμβρίου 2026, 10.00–14.00 — CforC Midterm',
      StartsAt: '2026-11-22T10:00:00.000Z', EndsAt: '2026-11-22T14:00:00.000Z',
      AllowInPerson: true, AllowOnline: true, VisibleFor: ALL, SortOrder: 4,
    },
  ],

  Options: [
    {
      Key: 'travel',
      Title: 'ΚΑΛΥΨΗ ΕΞΟΔΩΝ ΜΕΤΑΚΙΝΗΣΗΣ',
      Description: 'Το δίκτυο καλύπτει το 50% των εξόδων μετακίνησης.',
      Required: true, VisibleFor: ALL, SortOrder: 1,
      Choices: [
        { value: 'no', label: 'Δεν θα χρειαστώ κάλυψη εξόδων μετακίνησης.' },
        { value: 'yes', label: 'Θα χρειαστώ κάλυψη εξόδων μετακίνησης.' },
      ],
    },
    {
      Key: 'accommodation',
      Title: 'ΔΙΑΜΟΝΗ',
      Description: 'Το δίκτυο καλύπτει τη διαμονή των μελών για δύο (2) διανυκτερεύσεις.',
      Required: false, VisibleFor: ALL, SortOrder: 2,
      Choices: [
        { value: 'single', label: 'Μονόκλινο (με δική μου επιβάρυνση για το επιπλέον κόστος)' },
        { value: 'shared', label: 'Δίκλινο ή τρίκλινο (κάλυψη από το δίκτυο)' },
        { value: 'host', label: 'Φιλοξενία από μέλος του δικτύου στη Θεσσαλονίκη' },
        { value: 'none', label: 'Δε θα χρειαστώ κάλυψη διαμονής από το δίκτυο' },
      ],
    },
    {
      Key: 'lunch',
      Title: 'ΜΕΣΗΜΕΡΙΑΝΟ ΓΕΥΜΑ (Σάββατο 21 Νοεμβρίου)',
      Description: 'Το μεσημεριανό γεύμα του Σαββάτου καλύπτεται από το δίκτυο. '
        + 'Δήλωσέ το για να οργανωθούν οι παραγγελίες.',
      Required: true, VisibleFor: ALL, SortOrder: 3,
      Choices: [{ value: 'yes', label: 'Ναι' }, { value: 'no', label: 'Όχι' }],
    },
    {
      Key: 'dinner',
      Title: 'ΔΕΙΠΝΟ (Σάββατο 21 Νοεμβρίου)',
      Description: 'Κοινή έξοδος το βράδυ του Σαββάτου. Το CforC φροντίζει για την οργάνωση και '
        + 'την κράτηση· το κόστος του γεύματος καλύπτεται από κάθε συμμετέχοντα/ουσα. '
        + 'Το μενού θα ανακοινωθεί σε επόμενη φάση.',
      Required: false, VisibleFor: ALL, SortOrder: 4,
      Choices: [
        { value: 'yes', label: 'Ναι, θα συμμετέχω (fixed menu ~20€/άτομο, με δική μου επιβάρυνση)' },
        { value: 'no', label: 'Όχι, δεν θα παρευρεθώ' },
      ],
    },
    {
      Key: 'dietary',
      Title: 'ΔΙΑΤΡΟΦΙΚΕΣ ΙΔΙΑΙΤΕΡΟΤΗΤΕΣ',
      Description: 'Προβλέπεται τουλάχιστον ένα γεύμα από το δίκτυο το μεσημέρι του Σαββάτου 21 '
        + 'Νοεμβρίου στον χώρο του Goethe-Institut, το οποίο καλύπτεται εξ ολοκλήρου από το CforC.\n\n'
        + 'Ενημέρωσέ μας για διατροφικές συνήθειες ή αλλεργίες (vegan, vegetarian, χωρίς γλουτένη, '
        + 'αλλεργία σε ξηρούς καρπούς κ.λπ.).',
      Required: false, VisibleFor: ALL, SortOrder: 5, Choices: null,
    },
    {
      Key: 'agenda',
      Title: 'ΘΕΜΑΤΑ ΜΕΛΩΝ & ΣΥΝ-ΔΙΑΜΟΡΦΩΣΗ ΑΤΖΕΝΤΑΣ',
      Description: 'Η ατζέντα των συζητήσεων του Σαββάτου και της Κυριακής διαμορφώνεται bottom-up '
        + 'και από τις δικές σου προτάσεις. Θέλεις να υποβάλεις θέμα;',
      // ΜΟΝΟ μέλη CforC — έτσι το ορίζει και η φόρμα
      Required: false, VisibleFor: MEMBERS_ONLY, SortOrder: 6,
      Choices: [{ value: 'yes', label: 'Ναι' }, { value: 'no', label: 'Όχι' }],
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
    console.error('Έχει γίνει deploy το Strapi με τις νέες συλλογές;')
    process.exit(1)
  }
  if (existing.json?.data?.length) {
    console.log(`Υπάρχει ήδη δράση με slug "${SLUG}" — δεν δημιουργήθηκε δεύτερη.`)
    console.log(`  documentId: ${existing.json.data[0].documentId}`)
    process.exit(0)
  }

  const created = await api('/events', 'POST', EVENT)
  if (!created.ok) {
    console.error(`ERROR: HTTP ${created.status}`)
    console.error(JSON.stringify(created.json?.error || created.json, null, 2).slice(0, 1200))
    if (created.status === 403) {
      console.error('\n→ 403: το διακριτικό είναι ΜΟΝΟ ΑΝΑΓΝΩΣΗΣ. Βγάλε από σχόλιο το FULL ACCESS στο .env.local.')
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
})()
