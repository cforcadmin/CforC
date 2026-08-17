/**
 * Backfill του Α/Α του φύλλου ΕΣΟΔΑ στις αποδείξεις του Strapi.
 *
 * Το Α/Α («9.1») είναι ο αριθμός με τον οποίο μιλάει το λογιστήριο και η
 * σειρά με την οποία διαβάζεται ο μήνας· ο ΑΠ. ΕΙΣ. τρέχει χωριστά. Οι
 * αποδείξεις που εισήχθησαν από το Excel δεν τον κράτησαν — τον διαβάζουμε
 * από το ίδιο CSV export και τον γράφουμε πίσω.
 *
 *   node scripts/backfill-receipt-aa.js <csv>            (dry-run)
 *   node scripts/backfill-receipt-aa.js <csv> --write
 */

const fs = require('fs')
require('dotenv').config({ path: '.env.local' })

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN
const WRITE = process.argv.includes('--write')
const CSV = process.argv[2]

if (!CSV || !fs.existsSync(CSV)) {
  console.error('Χρήση: node scripts/backfill-receipt-aa.js <αρχείο.csv> [--write]')
  process.exit(1)
}

/** Ελάχιστος CSV parser — τα κελιά του ΕΣΟΔΑ έχουν κόμματα και newlines */
function parseCsv(text) {
  const rows = []
  let row = [], cell = '', quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++ } else quoted = false
      } else cell += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(cell); cell = '' }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = '' }
    else if (c !== '\r') cell += c
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  return rows
}

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
  const rows = parseCsv(fs.readFileSync(CSV, 'utf8'))
  const header = rows.find(r => r.includes('Α/Α') && r.includes('ΠΑΡΑΣΤΑΤΙΚΟ'))
  if (!header) throw new Error('Δεν βρέθηκε γραμμή κεφαλίδων με Α/Α και ΠΑΡΑΣΤΑΤΙΚΟ')
  const iAa = header.indexOf('Α/Α')
  const iDoc = header.indexOf('ΠΑΡΑΣΤΑΤΙΚΟ')

  // ΑΠ. ΕΙΣ. N → Α/Α
  const map = new Map()
  for (const r of rows) {
    const aa = String(r[iAa] || '').trim()
    const doc = String(r[iDoc] || '').trim()
    if (!/^\d+\.\d+$/.test(aa)) continue
    const m = /ΑΠ\.\s*ΕΙΣ\.\s*(\d+)/i.exec(doc)
    if (!m) continue
    const number = Number(m[1])
    if (map.has(number) && map.get(number) !== aa) {
      console.warn(`⚠ ΑΠ. ΕΙΣ. ${number}: δύο διαφορετικά Α/Α (${map.get(number)} και ${aa}) — κρατώ το πρώτο`)
      continue
    }
    map.set(number, aa)
  }
  console.log(`Από το CSV: ${map.size} αντιστοιχίες ΑΠ. ΕΙΣ. → Α/Α`)

  // Χωρίς περιορισμό πεδίων: το Aa μπορεί να μην έχει φτάσει ακόμη στο
  // Strapi Cloud, και το ?fields[]=Aa θα γύριζε 400 πριν το deploy.
  const res = await strapi('/receipts?pagination[limit]=1000&sort=Number:asc')
  if (!res.ok) throw new Error(`Strapi ${res.status} — έχει γίνει deploy το πεδίο Aa;`)
  const receipts = res.json?.data || []
  console.log(`Στο Strapi: ${receipts.length} αποδείξεις`)

  let updated = 0, already = 0, missing = 0, failed = 0
  for (const r of receipts) {
    const aa = map.get(r.Number)
    if (!aa) { missing++; continue }
    if (r.Aa === aa) { already++; continue }
    if (!WRITE) { console.log(`  ΑΠ. ΕΙΣ. ${r.Number} → ${aa}${r.Aa ? ` (ήταν ${r.Aa})` : ''}`); updated++; continue }
    const u = await strapi(`/receipts/${r.documentId}`, 'PUT', { Aa: aa })
    if (u.ok) { updated++ } else { failed++; console.error(`  ✗ ΑΠ. ΕΙΣ. ${r.Number}: ${u.status}`) }
  }

  console.log(`\n${WRITE ? 'Γράφτηκαν' : 'Θα γράφονταν'}: ${updated} · ήδη σωστές: ${already} · χωρίς αντιστοιχία στο CSV: ${missing}${failed ? ` · αποτυχίες: ${failed}` : ''}`)
  if (!WRITE) console.log('Dry-run. Ξανατρέξε με --write για να γραφτούν.')
}

main().catch(err => { console.error(err); process.exit(1) })
