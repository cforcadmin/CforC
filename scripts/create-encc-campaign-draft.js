#!/usr/bin/env node
/**
 * Φτιάχνει ΠΡΟΣΧΕΔΙΟ μηνύματος στο γραφείο της Διαχείρισης για το
 * «ENCC Bridge Makers | Athens 2026».
 *
 * ΤΟ ΠΕΡΙΕΧΟΜΕΝΟ ΕΙΝΑΙ ΤΟΥ ΔΕΛΤΙΟΥ, ΟΧΙ ΔΙΚΟ ΜΟΥ: μεταφέρεται αυτολεξεί από
 * το ENCC Bridge Makers Athens 2026_externalnewsletter.pdf. Ό,τι άλλαξε
 * σημειώνεται με σχόλιο ακριβώς από πάνω.
 *
 * Μένει σε κατάσταση «draft»: ΔΕΝ φεύγει τίποτα. Ανοίγει από
 * Επικοινωνία → Μηνύματα → Προσχέδια, διαλέγεις παραλήπτες και στέλνεις.
 *
 * Είναι ΑΣΦΑΛΕΣ να ξανατρέξει: αν υπάρχει ήδη προσχέδιο με το ίδιο θέμα στο
 * ίδιο γραφείο, σταματά χωρίς να φτιάξει δεύτερο.
 *
 * Usage: node scripts/create-encc-campaign-draft.js
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

const { SUBJECT, DESK, FORM_URL, BLOCKS } = require('./lib/encc-content')

const RECORD = {
  Desk: DESK,
  Kind: 'message',
  Subject: SUBJECT,
  Preheader: '13 & 14 Νοεμβρίου 2026 · Πολιτιστικό Κέντρο «Μελίνα», Αθήνα · Δωρεάν με εγγραφή',
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
  CreatedByName: 'Σενάριο ENCC Bridge Makers',
  Notes: 'Προσχέδιο από το δελτίο ENCC Bridge Makers Athens 2026 (externalnewsletter). '
    + 'Ο σύνδεσμος της φόρμας δείχνει στη δική μας σελίδα εγγραφής, όχι σε Google Form.',
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
  const q = `/oc-campaigns?filters[Subject][$containsi]=${encodeURIComponent('ENCC Bridge Makers Athens 2026')}`
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
