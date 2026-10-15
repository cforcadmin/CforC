#!/usr/bin/env node
/**
 * Φτιάχνει ΠΡΟΣΧΕΔΙΟ μηνύματος στο γραφείο της Διαχείρισης για το
 * «5ο CforC Midterm & ReStart 2026».
 *
 * ΤΟ ΚΕΙΜΕΝΟ ΕΙΝΑΙ Η ΙΔΙΑ Η ΠΡΟΣΚΛΗΣΗ ΤΗΣ ΔΡΑΣΗΣ, αυτολεξεί από το πεδίο
 * Description της δράσης midterm-2026 — όχι νέα διατύπωση. Αλλάζει μόνο η
 * μορφή: παράγραφοι σε μπλοκ, οι δύο ημερίδες σε ατζέντα, η φόρμα σε κουμπί.
 *
 * Μένει σε κατάσταση «draft»: ΔΕΝ φεύγει τίποτα. Ανοίγει από
 * Επικοινωνία → Μηνύματα → Προσχέδια, διαλέγεις παραλήπτες και στέλνεις.
 *
 * Είναι ΑΣΦΑΛΕΣ να ξανατρέξει: ενημερώνει το ίδιο προσχέδιο, και σταματά
 * χωρίς να αγγίξει τίποτα αν η καμπάνια έχει πάψει να είναι προσχέδιο.
 *
 * Usage: node scripts/create-midterm-campaign-draft.js
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

const SUBJECT = '5ο CforC Midterm & ReStart 2026 — 20 έως 22 Νοεμβρίου, Θεσσαλονίκη'
/** Με τι ταιριάζει το υπάρχον προσχέδιο — ΧΩΡΙΣ «&», που σπάει το query */
const MATCH = 'CforC Midterm & ReStart 2026'
const DESK = 'admin'
const FORM_URL = 'https://www.cultureforchange.net/events/midterm-2026/register'
const INFO_URL = 'https://www.cultureforchange.net/events/midterm-2026/info'

const BLOCKS = [
  { type: 'greeting', html: '<p>Αγαπητές, Αγαπητοί, Αγαπητά,</p>' },
  {
    type: 'text',
    html: '<p>Mε μεγάλη χαρά σας προσκαλούμε να επιβεβαιώσετε τη συμμετοχή στη μεγάλη μας φθινοπωρινή '
      + 'συνάντηση, η οποία θα πραγματοποιηθεί <strong>από τις 20 έως τις 22 Νοεμβρίου 2026 στη '
      + 'Θεσσαλονίκη</strong>, με την ευγενική φιλοξενία του <strong>Goethe-Institut Θεσσαλονίκης</strong>!</p>',
  },
  {
    type: 'text',
    html: '<p>Φέτος, η συνάντησή μας είναι διπλή. Μαζί με το καθιερωμένο μας CforC Midterm αναζητούμε την '
      + 'ιστορία του δικτύου στο πρόγραμμα <em>Start Create Cultural Change</em> και συνδιοργανώνουμε το '
      + '<em>START Reunion</em> (σε συνεργασία με το μέλος μας Ίρις Περουλιού Σεργάκη και με τη '
      + 'συγχρηματοδότηση του Bosch Alumni Network που εξασφάλισε). Μας περιμένει ένα τριήμερο γεμάτο δράσεις!</p>',
  },
  {
    type: 'text',
    html: '<p>Στις δράσεις προσκαλούμε <strong>όλα τα μέλη του CforC</strong>, είτε προέρχονται από το '
      + 'πρόγραμμα Start είτε όχι, αλλά και <strong>όλους τους υποτρόφους Start</strong>, είτε είναι μέλη '
      + 'του CforC είτε όχι. Μπορείτε να συμμετάσχετε δια ζώσης στη Θεσσαλονίκη ή, σε κάποιες από τις '
      + 'δράσεις, διαδικτυακά (ο σύνδεσμος θα σας σταλεί προσεχώς).</p>',
  },
  { type: 'section', title: 'Το τριήμερο', look: 'coral' },
  {
    type: 'agenda',
    rows: [
      {
        date: '20–21 Νοεμβρίου',
        title: 'ReStart — Bring the START Alumni Back Together',
        place: 'Από το Start στο Culture for Change. Συνάντηση υποτρόφων START / Bosch Alumni Network (BAN) και μελών Culture for Change.',
      },
      {
        date: '21–22 Νοεμβρίου',
        title: '5ο CforC Midterm',
        place: 'Ετήσια συνάντηση μελών Culture for Change.',
      },
    ],
  },
  {
    type: 'box',
    tone: 'cream',
    title: 'Πληροφορίες',
    html: '<p><strong>Ημερομηνίες:</strong> 20–22 Νοεμβρίου 2026<br />'
      + '<strong>Χώρος:</strong> Goethe-Institut Θεσσαλονίκης<br />'
      + '<strong>Συμμετοχή:</strong> δια ζώσης ή διαδικτυακά σε επιλεγμένες δράσεις<br />'
      + '<strong>Προθεσμία υποβολής:</strong> έως Παρασκευή 20 Οκτωβρίου 2026<br />'
      + '<strong>Απορίες:</strong> <a href="mailto:hello@cultureforchange.net">hello@cultureforchange.net</a> ή στο 6976225704</p>',
  },
  {
    type: 'text',
    html: '<p>Για να οργανώσουμε με τον καλύτερο τρόπο το πρόγραμμα και τα πρακτικά ζητήματα, παρακαλούμε '
      + 'συμπληρώστε τη φόρμα συμμετοχής.</p>',
  },
  { type: 'button', label: 'Συμπλήρωσε τη φόρμα — έως 20 Οκτωβρίου', href: FORM_URL, style: 'coral' },
  { type: 'button', label: 'Περισσότερες πληροφορίες για τη δράση', href: INFO_URL, style: 'outline' },
  { type: 'divider', style: 'line' },
  { type: 'text', html: '<p>Ανυπομονούμε να σμίξουμε ξανά!</p>' },
]

const RECORD = {
  Desk: DESK,
  Kind: 'message',
  Subject: SUBJECT,
  Preheader: '20–22 Νοεμβρίου 2026 · Goethe-Institut Θεσσαλονίκης · δήλωση συμμετοχής έως 20 Οκτωβρίου',
  Blocks: BLOCKS,
  // Υποχρεωτικά από το σχήμα, άδεια σε προσχέδιο: τους παραλήπτες τους
  // διαλέγει ο συντάκτης στην οθόνη πριν στείλει.
  Recipients: [],
  Selection: {},
  Groups: [],
  TotalCount: 0,
  Cc: null,
  FooterStyle: 'signature',
  FooterLook: 'cream',
  FooterLogo: true,
  HeaderStyle: 'coral',
  HeaderLogo: true,
  State: 'draft',
  CreatedByName: 'Σενάριο Midterm 2026',
  Notes: 'Προσχέδιο από την πρόσκληση της δράσης midterm-2026. Ο σύνδεσμος της φόρμας δείχνει '
    + 'στη δική μας σελίδα εγγραφής.',
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
  // Ταιριάζει σε «ENCC Bridge Makers Athens 2026», ώστε να βρεθεί και το
  // προσχέδιο που γράφτηκε με προηγούμενη διατύπωση θέματος.
  const q = `/oc-campaigns?filters[Subject][$containsi]=${encodeURIComponent(MATCH)}`
    + `&filters[Desk][$eq]=${DESK}&pagination[limit]=1`
  const existing = await api(q)
  if (!existing.ok) {
    console.error(`ERROR: δεν διαβάζεται η συλλογή oc-campaigns (HTTP ${existing.status}).`)
    process.exit(1)
  }
  /**
   * ΑΝ ΥΠΑΡΧΕΙ ΗΔΗ: ενημερώνεται, δεν διπλασιάζεται — αλλά ΜΟΝΟ όσο είναι
   * προσχέδιο. Καμπάνια που έχει φύγει (ή φεύγει) δεν την αγγίζει κανένα
   * σενάριο: το αρχείο πρέπει να δείχνει ό,τι στάλθηκε.
   */
  const row = existing.json?.data?.[0]
  if (row) {
    if (row.State !== 'draft') {
      console.log(`Η καμπάνια υπάρχει και είναι «${row.State}» — δεν αγγίζεται.`)
      console.log(`  documentId: ${row.documentId}`)
      process.exit(0)
    }
    const upd = await api(`/oc-campaigns/${row.documentId}`, 'PUT', RECORD)
    if (!upd.ok) {
      console.error(`ERROR στην ενημέρωση: HTTP ${upd.status}`)
      console.error(JSON.stringify(upd.json?.error || upd.json, null, 2).slice(0, 800))
      process.exit(1)
    }
    console.log('Το υπάρχον προσχέδιο ΕΝΗΜΕΡΩΘΗΚΕ.')
    console.log(`  documentId: ${row.documentId}  ·  μπλοκ: ${BLOCKS.length}`)
    process.exit(0)
  }

  const created = await api('/oc-campaigns', 'POST', RECORD)
  if (!created.ok) {
    console.error(`ERROR: HTTP ${created.status}`)
    console.error(JSON.stringify(created.json?.error || created.json, null, 2).slice(0, 1200))
    process.exit(1)
  }

  console.log('Το προσχέδιο δημιουργήθηκε.')
  console.log(`  documentId: ${created.json?.data?.documentId}`)
  console.log(`  γραφείο:    Διαχείριση  ·  μπλοκ: ${BLOCKS.length}  ·  κατάσταση: draft`)
  console.log('')
  console.log('Άνοιξέ το: OC → Επικοινωνία → Μηνύματα → Προσχέδια')
})()
