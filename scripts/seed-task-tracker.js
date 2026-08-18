/**
 * Μεταφορά του Project Tracker από το Slack στο OC.
 *
 * Τα δεδομένα είναι από export της λίστας «Εκκρεμότητες Ομάδας Συντονισμού».
 * Το τικ ολοκλήρωσης (YES/NO) είναι ΞΕΧΩΡΙΣΤΟ από το Status: αρκετά κλειστά
 * θέματα έμειναν «In progress» ή «Not started» — έτσι δούλευε η ομάδα και
 * δεν το «διορθώνουμε» εμείς.
 *
 *   node scripts/seed-task-tracker.js            (dry-run)
 *   node scripts/seed-task-tracker.js --write
 */

require('dotenv').config({ path: '.env.local' })

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN
const WRITE = process.argv.includes('--write')

const BOARD = {
  Title: 'Project Tracker: Εκκρεμότητες Ομάδας Συντονισμού',
  Scope: 'coordination',
  Description: 'Μεταφέρθηκε από τη λίστα Slack τον Αύγουστο 2026.',
  SortIndex: 0,
}

/** Slack user id → member documentId (επιβεβαιωμένο 18/8/2026) */
const PEOPLE = {
  U02D9BS842H: 'hfxresayxy81nr85mjxera2j',   // Έφη Πρόικου — coordination@
  U01DH3E83C0: 'jofy4hp8jvom0g8xv0rkb78q',   // Σόνια Ντόβα — hello@
  U08D4PA3BDG: 'lkyhsjonyoroap5y6c46eifx',   // Στέλλα Τσιαρβούλα — communication@
  U08EYTPTZGC: 'mqswl7jw67pb1ald7gmmwzic',   // Γιώργος Στυλ — it@ / finance@
  U08EYTM9DQC: 'pqkyyyehjn2aremrc6tjf3kx',   // Κωνσταντίνα Καραμέρη — community@
  U08X5LB6SW: 'a45w7wreidehdsslncny2lf9',    // Δήμητρα Ερμείδου — outreach@
}

const S = { ns: 'not_started', ip: 'in_progress', done: 'done' }

// done · title · status · categories · description · assignees · due
const TASKS = [
  [true, 'GDPR στο μονογιουδη', S.ns],
  [true, 'ενημερωση Βούλγαρη- ερευνας αγορς- αγορας ντουλάπας', S.ip, [], '', ['U08EYTM9DQC', 'U08EYTPTZGC', 'U01DH3E83C0']],
  [true, 'Στρατηγική', S.ip, [], 'Διαδικασία_Όραμα & Στρατηγική | Προτεραιοποίηση_Χρονοδιάγραμμα_CforC 2025-2027'],
  [true, 'επικοινωνια με Μάρω Μάγουλα και Ευα Αναγνωστάκη για λογισμικο', S.done, [], '', ['U02D9BS842H']],
  [true, 'Απολογισμός & Ανατροφοδότηση Εμπειρίας: GA & Annual Forum Reset! 2026', S.ip, [],
    'Απολογισμός & Ανατροφοδότηση Εμπειρίας: GA & Annual Forum Reset! 2026',
    ['U08EYTPTZGC', 'U02D9BS842H', 'U08D4PA3BDG', 'U08EYTM9DQC'], '2026-05-21'],
  [true, 'ΕU Agora letter, check Oμάδα Συνηγορίας', S.ns],
  [true, 'Ηiggs, Mπαρατα', S.done, [], '', ['U01DH3E83C0'], '2026-05-21'],
  [true, 'θεση εργασιας Σ.ημα', S.ip, [], '', [], '2026-06-02'],
  [true, 'Πρόσκληση Εκδήλωσης Ενδιαφέροντος_ CAE HUB', S.ip, [], 'Πρόσκληση Εκδήλωσης Ενδιαφέροντος_ CAE HUB'],
  [true, 'Ημερολόγιο Μελών', S.ns],
  [true, 'Application form — Reset! Staff Exchange 2026', S.ns, [],
    'Application form — Reset! Staff Exchange 2026', [], '2026-06-26',
    'https://reset-network.eu/wp-content/uploads/2026/05/Reset-Open-Call_Staff-Exchange.pdf'],
  [true, 'ΕΣΕΤΕΚ - ΤΕΣ για τη Δημιουργικότητα, την Τέχνη και τον Ανθρωπισμό απο Μαρία Λουίζα', S.ns, [], 'πρόταση δικτύωσης_ ΕΣΕΤΕΚ'],
  [true, 'lizard application', S.ns, [], '', [], null, 'https://www.facebook.com/lazordfoundation'],

  [false, 'Οδηγός Τσέπης: σχόλια', S.ip, ['επικοινωνία'],
    'Σχόλια -Προσθήκες- Αφαιρέσεις_Οδηγός Τσέπης_2026\n\ncanva edit: οδηγός τσέπης_01.2026 (για τα μέλη)\n\ncanva edit no links: οδηγός τσέπης_02.2026 (για την ιστοσελίδα)',
    ['U08D4PA3BDG'], '2026-03-08'],
  [false, 'Οδηγός Τσέπης: Στυλ και αναρτηση', S.ns, ['επικοινωνία', 'ιστοσελίδα'], '', ['U08EYTPTZGC'], '2026-03-15'],
  [false, 'Kειμενο επίτιμων μελών', S.ip, [], 'Ongoing Newsletter', ['U02D9BS842H', 'U08X5LB6SW'], '2026-06-05'],
  [false, 'Πρόταση δικτύωσης με το ΕΣΕΤΕΚ - ΤΕΣ για τη Δημιουργικότητα, την Τέχνη και τον Ανθρωπισμό απο μαρια λουιζα', S.ns],
  [false, 'Νίκο Βανδώρο ΙΚΥ- Erasmus-εκπαίδευση ενηλίκων και creative Europe', S.ns, [], '', ['U08EYTPTZGC', 'U02D9BS842H']],
  [false, 'Ημερολόγιο Δράσεων 2026_27', S.ns, [], 'Draft_CforC_Ημερολόγιο Δράσεων 2026_27'],
]

async function strapi(path, method = 'GET', data) {
  const res = await fetch(`${STRAPI_URL}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${STRAPI_API_TOKEN}` },
    ...(data !== undefined && { body: JSON.stringify({ data }) }),
  })
  let json = null
  try { json = await res.json() } catch { /* κενό σώμα */ }
  return { ok: res.ok, status: res.status, json }
}

async function main() {
  // 1) Ο πίνακας — δεν ξαναδημιουργείται αν υπάρχει
  const found = await strapi(`/oc-task-boards?filters[Title][$eq]=${encodeURIComponent(BOARD.Title)}&pagination[limit]=1`)
  if (!found.ok) throw new Error(`oc-task-boards ${found.status} — έχουν δοθεί δικαιώματα στο API token;`)
  let board = found.json?.data?.[0] || null

  if (!board) {
    console.log(`Πίνακας «${BOARD.Title}» → ${WRITE ? 'δημιουργία' : 'θα δημιουργηθεί'}`)
    if (WRITE) {
      const c = await strapi('/oc-task-boards', 'POST', BOARD)
      if (!c.ok) throw new Error(`board create ${c.status}: ${JSON.stringify(c.json?.error?.message || '')}`)
      board = c.json.data
    }
  } else {
    console.log(`Πίνακας υπάρχει ήδη (${board.documentId})`)
  }

  // 2) Τι υπάρχει ήδη — κλειδί ο τίτλος
  const existing = board
    ? await strapi(`/oc-tasks?filters[board][documentId][$eq]=${board.documentId}&pagination[limit]=200&fields[0]=Title`)
    : { json: { data: [] } }
  const seen = new Set((existing.json?.data || []).map(t => String(t.Title).trim()))

  let created = 0, skipped = 0, failed = 0
  for (const [i, row] of TASKS.entries()) {
    const [done, title, status, cats = [], desc = '', people = [], due = null, link = null] = row
    if (seen.has(title.trim())) { skipped++; continue }
    const assignees = people.map(p => PEOPLE[p]).filter(Boolean)
    if (assignees.length !== people.length) {
      console.warn(`  ⚠ «${title.slice(0, 40)}»: άγνωστο slack id — ${people.join(',')}`)
    }
    const payload = {
      Title: title,
      Completed: done,
      Status: status,
      Categories: cats.length ? cats : null,
      Description: desc || null,
      Links: link,
      DueDate: due,
      Priority: 'normal',
      SortIndex: i,
      CompletedAt: done ? new Date('2026-08-18T00:00:00.000Z').toISOString() : null,
      CreatedBy: 'import (Slack list)',
      LegacyAssignees: people.length ? people : null,
      ...(board && { board: board.documentId }),
      ...(assignees.length && { assignees }),
    }
    if (!WRITE) { created++; continue }
    const c = await strapi('/oc-tasks', 'POST', payload)
    if (c.ok) created++
    else { failed++; console.error(`  ✗ ${title.slice(0, 44)}: ${c.status} ${JSON.stringify(c.json?.error?.message || '')}`) }
  }

  const open = TASKS.filter(t => !t[0]).length
  console.log(`\nΕκκρεμότητες → ${WRITE ? 'γράφτηκαν' : 'θα γράφονταν'}: ${created} · υπήρχαν: ${skipped}${failed ? ` · αποτυχίες: ${failed}` : ''}`)
  console.log(`Από αυτές: ${open} ανοιχτές · ${TASKS.length - open} ολοκληρωμένες`)
  if (!WRITE) console.log('\nDry-run. Ξανατρέξε με --write.')
}

main().catch(err => { console.error(err.message || err); process.exit(1) })
