/**
 * Backfill Ιανουαρίου–Ιουλίου 2026 από το ζωντανό ΕΣΟΔΑ-ΕΞΟΔΑ.
 *
 * Γράφει στο Strapi όσα έγιναν πριν υπάρξει το OC:
 *   - expense            : οι γραμμές του ΕΞΟΔΑ (State: approved)
 *   - income-record      : τα έσοδα χωρίς απόδειξη (IAC, ARTY FARTY)
 *   - monthly-close      : τα 7 κλεισίματα, ως ήδη απεσταλμένα στο λογιστήριο
 *
 * Όλα σημαίνονται «backfill (Excel 2026)» ώστε να ξεχωρίζουν από όσα
 * περνούν κανονικά μέσα από το OC. Idempotent: παραλείπει ό,τι υπάρχει ήδη
 * (κλειδί: Month + Aa), οπότε μπορεί να ξανατρέξει με ασφάλεια.
 *
 *   node scripts/backfill-2026-h1.js            (dry-run)
 *   node scripts/backfill-2026-h1.js --write
 */

const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN
const WRITE = process.argv.includes('--write')
const MARK = 'backfill (Excel 2026)'

const EXPENSES_FILE = process.argv[2] && !process.argv[2].startsWith('--')
  ? process.argv[2]
  : path.join(__dirname, 'data', 'exoda-2026-h1.json')

/** Έσοδα χωρίς απόδειξη, από το φύλλο ΕΣΟΔΑ (στήλες ΧΟΡΗΓΙΕΣ / ΕΠΙΧΕΙΡΗΜΑΤΙΚΗ) */
const INCOME_RECORDS = [
  { month: '2026-01', aa: '1.4',  date: '2026-01-13', docRef: 'ΕΝΤ.260113949213Ξ847',  payer: 'IAC BERLIN',              amount: 10100, category: 'grant',    description: 'ΕΠΙΧΟΡΗΓΗΣΗ' },
  { month: '2026-03', aa: '3.24', date: '2026-03-31', docRef: '2.1/5/400012867322602',  payer: 'ASSOCIATION ARTY FARTY',  amount: 4962,  category: 'business', description: 'Reset! GS/FORUM πρώτη δόση' },
  { month: '2026-04', aa: '4.1',  date: '2026-04-22', docRef: '2.1/5/400012867322602',  payer: 'ASSOCIATION ARTY FARTY',  amount: 3308,  category: 'business', description: 'Reset! GS/FORUM δεύτερη δόση' },
  { month: '2026-05', aa: '5.8',  date: '2026-05-25', docRef: '2.1/6/400013388623376',  payer: 'ASSOCIATION ARTY FARTY',  amount: 400,   category: 'business', description: 'Reset! GS/FORUM μεταφορικά' },
]

const MONTHS = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07']

async function strapi(p, method = 'GET', data) {
  const res = await fetch(`${STRAPI_URL}/api${p}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${STRAPI_API_TOKEN}` },
    ...(data !== undefined && { body: JSON.stringify({ data }) }),
  })
  let json = null
  try { json = await res.json() } catch { /* κενό σώμα */ }
  return { ok: res.ok, status: res.status, json }
}

/** «2.1/1000064383/400012192676911» → {docNumber, mark} */
function splitDocRef(ref) {
  const out = { docNumber: null, mark: null }
  if (!ref) return out
  const parts = String(ref).split('/').map(s => s.trim()).filter(Boolean)
  for (const p of parts) {
    if (/^4000\d{11}$/.test(p)) out.mark = p
    else if (p !== '2.1' && !out.docNumber) out.docNumber = p
  }
  return out
}

/** Κλείσιμο μήνα: 10 του επόμενου, μεσημέρι Αθήνας */
function closeStamp(month) {
  const [y, m] = month.split('-').map(Number)
  const next = m === 12 ? { y: y + 1, m: 1 } : { y, m: m + 1 }
  return new Date(Date.UTC(next.y, next.m - 1, 10, 9, 0, 0)).toISOString()
}

async function main() {
  if (!STRAPI_URL || !STRAPI_API_TOKEN) throw new Error('Λείπει STRAPI_URL / STRAPI_API_TOKEN')
  const rows = JSON.parse(fs.readFileSync(EXPENSES_FILE, 'utf8'))
    .filter(r => MONTHS.includes(r.month))

  // Τι υπάρχει ήδη — δεν ξαναγράφουμε
  const existing = await strapi('/expenses?pagination[limit]=1000&fields[0]=Month&fields[1]=Aa')
  if (!existing.ok) throw new Error(`expenses query ${existing.status}`)
  const seen = new Set((existing.json?.data || []).map(e => `${e.Month}|${e.Aa}`))
  const incRes = await strapi('/income-records?pagination[limit]=500&fields[0]=Month&fields[1]=Aa')
  const seenInc = new Set((incRes.json?.data || []).map(e => `${e.Month}|${e.Aa}`))
  const closeRes = await strapi('/monthly-closes?pagination[limit]=100&fields[0]=Month&fields[1]=SentAt')
  const seenClose = new Map((closeRes.json?.data || []).map(c => [c.Month, c]))

  console.log(`Πηγή: ${rows.length} γραμμές ΕΞΟΔΑ · ήδη στο Strapi: ${seen.size}`)

  // ---- 1) Έξοδα ----
  let created = 0, skipped = 0, failed = 0
  for (const r of rows) {
    const key = `${r.month}|${r.aa}`
    if (seen.has(key)) { skipped++; continue }
    const { docNumber, mark } = splitDocRef(r.docRef)
    const payload = {
      Month: r.month,
      Aa: r.aa,
      IssueDate: r.issueDate,
      DocRef: r.docRef,
      DocNumber: docNumber,
      Mark: mark,
      SupplierName: r.supplierName,
      SupplierTaxId: r.supplierTaxId,
      Category: r.category,
      NetAmount: r.gross,
      Withholding: r.withholding || null,
      PayableAmount: r.payable,
      PaymentMethod: r.paymentMethod,
      PaymentDate: r.paymentDate,
      Notes: r.notes,
      State: 'approved',
      SheetSynced: true,
      ApprovedAt: closeStamp(r.month),
      ApprovedBy: MARK,
    }
    if (!WRITE) { created++; continue }
    const c = await strapi('/expenses', 'POST', payload)
    if (c.ok) created++
    else { failed++; console.error(`  ✗ ${r.aa} ${r.supplierName}: ${c.status} ${JSON.stringify(c.json?.error?.message || '')}`) }
  }
  console.log(`Έξοδα → ${WRITE ? 'γράφτηκαν' : 'θα γράφονταν'}: ${created} · υπήρχαν: ${skipped}${failed ? ` · αποτυχίες: ${failed}` : ''}`)

  // ---- 2) Έσοδα χωρίς απόδειξη ----
  let incCreated = 0, incSkipped = 0
  for (const g of INCOME_RECORDS) {
    if (seenInc.has(`${g.month}|${g.aa}`)) { incSkipped++; continue }
    if (!WRITE) { incCreated++; continue }
    const c = await strapi('/income-records', 'POST', {
      Month: g.month, Aa: g.aa, DocRef: g.docRef, PayerName: g.payer,
      Description: g.description, Category: g.category, Amount: g.amount,
      PaymentDate: g.date, PaymentMethod: 'bank', SheetSynced: true, CreatedBy: MARK,
    })
    if (c.ok) incCreated++
    else console.error(`  ✗ income ${g.aa}: ${c.status}`)
  }
  console.log(`Έσοδα χωρίς απόδειξη → ${WRITE ? 'γράφτηκαν' : 'θα γράφονταν'}: ${incCreated} · υπήρχαν: ${incSkipped}`)

  // ---- 3) Κλεισίματα μήνα ----
  let clCreated = 0, clUpdated = 0, clSkipped = 0
  for (const m of MONTHS) {
    const stamp = closeStamp(m)
    const cur = seenClose.get(m)
    if (cur?.SentAt) { clSkipped++; continue }
    const payload = { Month: m, ReadyAt: stamp, ReadyBy: MARK, SentAt: stamp, SentBy: MARK,
      Notes: 'Στάλθηκε στο λογιστήριο εκτός συστήματος· καταχωρήθηκε αναδρομικά από το φύλλο.' }
    if (!WRITE) { cur ? clUpdated++ : clCreated++; continue }
    const c = cur
      ? await strapi(`/monthly-closes/${cur.documentId}`, 'PUT', payload)
      : await strapi('/monthly-closes', 'POST', payload)
    if (c.ok) { cur ? clUpdated++ : clCreated++ }
    else console.error(`  ✗ close ${m}: ${c.status}`)
  }
  console.log(`Κλεισίματα → νέα: ${clCreated} · ενημερώθηκαν: ${clUpdated} · υπήρχαν σταλμένα: ${clSkipped}`)

  if (!WRITE) console.log('\nDry-run. Ξανατρέξε με --write.')
}

main().catch(err => { console.error(err); process.exit(1) })
