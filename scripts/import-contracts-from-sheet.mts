/**
 * Μεταφορά του «Μητρώου Συμβάσεων & Πληρωμών Συνεργατών» από το Google Sheet
 * στο Strapi (συλλογή oc-contract) — μία φορά, στην αρχή.
 *
 * Από εκεί και πέρα η αυθεντία είναι το Strapi και το φύλλο γίνεται καθρέφτης:
 * το OC γράφει πρώτα στη βάση και μετά ξαναγράφει το φύλλο.
 *
 *   node --experimental-strip-types --env-file=.env.local \
 *     scripts/import-contracts-from-sheet.mts            # δοκιμή, δεν γράφει
 *   node --experimental-strip-types --env-file=.env.local \
 *     scripts/import-contracts-from-sheet.mts --apply    # γράφει στο Strapi
 *
 * ⚠ ΜΙΑ ΦΟΡΑ, ΠΡΙΝ αρχίσει το καθρέφτισμα. Μόλις το OC γράψει το φύλλο, το
 * φύλλο ΔΕΝ είναι πια πηγή: μια δεύτερη εισαγωγή θα ξαναδιάβαζε ό,τι έγραψε
 * το ίδιο το σύστημα και θα κλείδωνε τυχόν λάθος σειρά (συνέβη 31/8 — η σειρά
 * δύο γραμμών είχε εναλλαγή και η επανεισαγωγή τη μονιμοποίησε αντί να τη λύσει).
 * Η σειρά διορθώνεται στη ΒΑΣΗ (SortIndex), όχι στο φύλλο.
 *
 * Είναι επαναλήψιμο: ταιριάζει με Ονοματεπώνυμο + ημερομηνία έναρξης, ώστε μια
 * δεύτερη εκτέλεση να ενημερώνει αντί να διπλογράφει. ΟΧΙ μόνο με το όνομα:
 * ο ίδιος άνθρωπος μπορεί να έχει δύο συμβάσεις (μία που έληξε και μία νέα) —
 * υπάρχει ήδη τέτοια περίπτωση στο φύλλο.
 */

import { getAccessToken, SCOPES } from '../lib/googleAuth.ts'

const SHEET_ID = '1xjl_u5pcFqYgmbYmhZV1Pw8VJXNDibOHC04mPcytxuU'
const RANGE = 'Sheet1!A1:Z1000'
const APPLY = process.argv.includes('--apply')
const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN

/** «01/07/2026» → «2026-07-01». Ό,τι δεν είναι καθαρή ημερομηνία → null */
function isoDate(raw: string): string | null {
  const t = String(raw || '').trim()
  if (!t) return null
  const m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(t)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t)
  return iso ? t : null
}

/** «6.600,00» → 6600 · «595,20» → 595.2 */
function num(raw: string): number | null {
  const t = String(raw || '').replace(/[€\s]/g, '').trim()
  if (!t) return null
  const v = parseFloat(t.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(v) ? v : null
}

const txt = (raw: string): string | null => {
  const t = String(raw ?? '').trim()
  return t || null
}

async function strapi(path: string, method = 'GET', data?: any) {
  const res = await fetch(`${STRAPI_URL}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${STRAPI_TOKEN}` },
    ...(data !== undefined && { body: JSON.stringify({ data }) }),
  })
  let json: any = null
  try { json = await res.json() } catch { /* 204 */ }
  return { ok: res.ok, status: res.status, json }
}

const token = await getAccessToken(SCOPES.sheets)
if (!token) { console.error('Λείπουν τα credentials του service account'); process.exit(1) }
if (!STRAPI_URL || !STRAPI_TOKEN) { console.error('Λείπει STRAPI_URL ή STRAPI_API_TOKEN'); process.exit(1) }

const r = await fetch(
  `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(RANGE)}?majorDimension=ROWS`,
  { headers: { Authorization: `Bearer ${token}` } },
)
const j = await r.json()
if (!r.ok) { console.error('Αποτυχία ανάγνωσης φύλλου:', j?.error?.message); process.exit(1) }
const rows: string[][] = j.values || []
const body = rows.slice(1).filter(row => String(row?.[1] ?? '').trim())   // στήλη B = Ονοματεπώνυμο

console.log(`${body.length} γραμμές με συνεργάτη στο φύλλο\n`)

const problems: string[] = []
const entries = body.map((row, i) => {
  const cell = (n: number) => String(row[n] ?? '')
  const aa = parseInt(cell(0).trim(), 10)
  for (const [n, label] of [[8, 'Έναρξη'], [9, 'Λήξη'], [18, 'Επόμενη πληρωμή']] as Array<[number, string]>) {
    if (cell(n).trim() && !isoDate(cell(n))) problems.push(`γραμμή ${i + 2}: «${label}» δεν διαβάζεται ως ημερομηνία («${cell(n).trim().slice(0, 24)}»)`)
  }
  if (cell(14).trim() && num(cell(14)) === null) problems.push(`γραμμή ${i + 2}: «Αμοιβή» δεν διαβάζεται ως ποσό`)
  return {
    Aa: Number.isFinite(aa) ? aa : null,
    Name: cell(1).trim(),
    Role: txt(cell(2)),
    Email: txt(cell(3)),
    Phone: txt(cell(4)),
    TaxId: txt(cell(5)),
    ContractType: txt(cell(6)),
    Project: txt(cell(7)),
    StartDate: isoDate(cell(8)),
    EndDate: isoDate(cell(9)),
    ContractStatus: txt(cell(10)),
    ContractFile: txt(cell(11)),
    ContractNotes: txt(cell(12)),
    Amount: num(cell(14)),
    PaymentMethod: txt(cell(15)),
    PaymentFrequency: txt(cell(16)),
    PaymentSchedule: txt(cell(17)),
    NextPaymentDate: isoDate(cell(18)),
    NextPaymentStatus: txt(cell(19)),
    PaymentHistory: txt(cell(20)),
    BankIban: txt(cell(21)),
    PaymentStatus: txt(cell(22)),
    PaymentNotes: txt(cell(23)),
    ExpenseDocsLink: txt(cell(24)),
    ExpenseListLink: txt(cell(25)),
    // Η σειρά του φύλλου, ΟΧΙ το Α/Α: το Α/Α δεν είναι θέση (η Τσέλιου έχει
    // Α/Α 5 αλλά είναι 6η) και μια σύμβαση χωρίς Α/Α θα συγκρουόταν με άλλη.
    SortIndex: i + 1,
    CreatedByName: 'Εισαγωγή από το φύλλο',
  }
})

// Σύνοψη χωρίς προσωπικά δεδομένα στην οθόνη
for (const e of entries) {
  const masked = e.Name.split(/\s+/).map((w, i) => (i === 0 ? w : w[0] + '.')).join(' ')
  console.log(
    `  ${String(e.Aa ?? '—').padStart(2)} ${masked.padEnd(22)} ${(e.ContractType || '—').padEnd(16)}` +
    ` ${(e.StartDate || '—')} → ${(e.EndDate || '—')}  ${e.Amount !== null ? e.Amount.toFixed(2) + ' €' : '—'}` +
    `  ${(e.ContractStatus || '—')} / ${(e.PaymentStatus || '—')}`,
  )
}

if (problems.length) {
  console.log('\nΠΡΟΣΟΧΗ — πεδία που δεν διαβάστηκαν:')
  for (const p of problems) console.log('  · ' + p)
}

if (!APPLY) {
  console.log('\nΔΟΚΙΜΗ — δεν γράφτηκε τίποτα. Ξανατρέξε με --apply όταν η συλλογή υπάρχει στο Strapi Cloud.')
  process.exit(0)
}

const existing = await strapi('/oc-contracts?pagination[limit]=200&fields[0]=Name&fields[1]=StartDate')
if (!existing.ok) {
  console.error('Η συλλογή δεν απαντά:', existing.status, JSON.stringify(existing.json?.error?.message || '').slice(0, 200))
  console.error('Έλεγξε ότι έγινε deploy στο Strapi Cloud και ότι το API token έχει δικαιώματα στη νέα συλλογή.')
  process.exit(1)
}
/** Κλειδί ταυτότητας σύμβασης: όνομα + έναρξη (δύο συμβάσεις ίδιου ανθρώπου) */
const keyOf = (name: string, start: string | null) => `${String(name).trim()}|${start || ''}`
const byKey = new Map<string, string>()
for (const e of existing.json?.data || []) byKey.set(keyOf(e.Name, e.StartDate || null), e.documentId)

let created = 0, updated = 0, failed = 0
for (const e of entries) {
  const docId = byKey.get(keyOf(e.Name, e.StartDate))
  const res = docId ? await strapi(`/oc-contracts/${docId}`, 'PUT', e) : await strapi('/oc-contracts', 'POST', e)
  if (res.ok) { docId ? updated++ : created++ }
  else {
    failed++
    console.error(`  ✗ ${e.Aa ?? '—'}: ${res.status} ${JSON.stringify(res.json?.error?.message || '').slice(0, 160)}`)
  }
}
console.log(`\nΝέες: ${created} · Ενημερώθηκαν: ${updated} · Απέτυχαν: ${failed}`)
