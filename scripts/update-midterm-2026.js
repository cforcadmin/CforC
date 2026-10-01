#!/usr/bin/env node
/**
 * Διορθώσεις στη δράση «5ο CforC Midterm & ReStart 2026» (1/10/2026):
 *
 *  1. Επιστρέφει η πρόταση «Δες λεπτομέρειες στο info note.» σε μετακίνηση
 *     ΚΑΙ διαμονή — είχε χαθεί όταν δημιουργήθηκε η δράση. Σε ενικό, όπως
 *     μιλά το υπόλοιπο site («Δήλωσε», «Γράψε μας»).
 *  2. Νέα ερώτηση: ΜΕΣΟ ΜΕΤΑΚΙΝΗΣΗΣ. Η διάκριση οδηγός/συνεπιβάτης δεν
 *     είναι καλλωπισμός — συνδέεται με τον κανόνα «ένα εξοδολόγιο ανά
 *     όχημα» και δείχνει ποιοι μπορούν να πάνε μαζί.
 *
 * ΧΡΕΙΑΖΕΤΑΙ δικαίωμα update στο event. Ασφαλές να ξανατρέξει: ξαναγράφει
 * τα ίδια μπλοκ, δεν προσθέτει δεύτερο «transport».
 *
 * Usage: node scripts/update-midterm-2026.js
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
const SLUG = 'midterm-2026'
const INFO_NOTE = 'Δες λεπτομέρειες στο info note.'

const TRANSPORT_BLOCK = {
  Key: 'transport',
  Title: 'ΜΕΣΟ ΜΕΤΑΚΙΝΗΣΗΣ',
  Description: 'Πώς σκοπεύεις να έρθεις; Μας βοηθά να συντονίσουμε κοινές μετακινήσεις '
    + 'και να υπολογίσουμε τις αφίξεις.',
  Required: false,
  SortOrder: 2,
  VisibleFor: ['member', 'member-ban', 'non-member-ban', 'non-member'],
  Choices: [
    { value: 'bus', label: 'ΚΤΕΛ / λεωφορείο' },
    { value: 'train', label: 'Τρένο' },
    { value: 'plane', label: 'Αεροπλάνο' },
    { value: 'boat', label: 'Πλοίο' },
    { value: 'car-driver', label: 'ΙΧ αυτοκίνητο — οδηγός' },
    { value: 'car-passenger', label: 'ΙΧ αυτοκίνητο — συνεπιβάτης' },
    { value: 'other', label: 'Άλλο' },
  ],
}

async function api(p, method = 'GET', data) {
  const res = await fetch(`${STRAPI_URL}/api${p}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
    ...(data !== undefined && { body: JSON.stringify({ data }) }),
  })
  let json = null
  try { json = await res.json() } catch { /* 204 */ }
  return { ok: res.ok, status: res.status, json }
}

;(async () => {
  const got = await api(`/events?filters[Slug][$eq]=${SLUG}&populate[Options]=true&populate[Sessions]=true&pagination[limit]=1`)
  const ev = got.json?.data?.[0]
  if (!ev) { console.error('ERROR: δεν βρέθηκε η δράση'); process.exit(1) }

  // Τα components αντικαθίστανται ΟΛΑ μαζί: το Strapi δεν κάνει merge σε
  // repeatable component, οπότε στέλνουμε ολόκληρη τη λίστα.
  const options = (ev.Options || []).map(o => {
    const { id, ...rest } = o
    if (o.Key === 'travel' && !String(o.Description || '').includes('info note')) {
      rest.Description = `${o.Description} ${INFO_NOTE}`.trim()
    }
    if (o.Key === 'accommodation' && !String(o.Description || '').includes('info note')) {
      rest.Description = `${o.Description} ${INFO_NOTE}`.trim()
    }
    // Κάνουμε χώρο: ό,τι ήταν 2 και πάνω κατεβαίνει μία θέση
    if (o.Key !== 'travel' && (rest.SortOrder ?? 0) >= 2) rest.SortOrder = (rest.SortOrder ?? 0) + 1
    return rest
  })

  if (!options.some(o => o.Key === 'transport')) options.push(TRANSPORT_BLOCK)
  else console.log('  (το μπλοκ transport υπήρχε ήδη — δεν προστέθηκε δεύτερο)')

  const upd = await api(`/events/${ev.documentId}`, 'PUT', { Options: options })
  if (!upd.ok) {
    console.error(`ERROR: HTTP ${upd.status}`)
    console.error(JSON.stringify(upd.json?.error || upd.json, null, 2).slice(0, 900))
    if (upd.status === 403) console.error('\n→ 403: χρειάζεται δικαίωμα update στο event για το διακριτικό.')
    process.exit(1)
  }

  const after = await api(`/events?filters[Slug][$eq]=${SLUG}&populate[Options]=true&pagination[limit]=1`)
  console.log('Ενημερώθηκε.\n')
  for (const o of (after.json?.data?.[0]?.Options || []).sort((a, b) => (a.SortOrder ?? 0) - (b.SortOrder ?? 0))) {
    const n = (o.Choices || []).length
    console.log(`  ${String(o.SortOrder ?? 0).padStart(2)}. ${o.Key.padEnd(14)} ${n ? `${n} επιλογές` : 'ελεύθερο κείμενο'}`)
    if (o.Description && o.Description.includes('info note')) console.log(`      → «…${INFO_NOTE}»`)
  }
})()
