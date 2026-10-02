#!/usr/bin/env node
/**
 * Η ανοιχτή πρόσκληση του Midterm 2026, και η ερώτηση της ατζέντας
 * υποχρεωτική.
 *
 * ΓΙΑΤΙ ΣΕ SCRIPT: η ΟΣ δεν χρειάζεται να μπει στο Content Manager. Τα πεδία
 * μένουν φυσικά επεξεργάσιμα από εκεί, αν ποτέ θελήσει κάποιος να αλλάξει
 * προθεσμία ή επιλογές — απλώς κανείς ΔΕΝ είναι υποχρεωμένος να το κάνει για
 * να δουλέψει η πρόσκληση.
 *
 * ΧΡΕΙΑΖΕΤΑΙ: να έχει γίνει deploy το schema (component event.open-call) και
 * δικαίωμα update στο event. Ασφαλές να ξανατρέξει: ξαναγράφει τις ίδιες
 * τιμές, δεν προσθέτει δεύτερη πρόσκληση.
 *
 * Usage: node scripts/add-midterm-open-call.js
 * Διάρκεια: ~3 δευτερόλεπτα.
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

const OPEN_CALL = {
  Title: 'OPEN CALL: ΠΟΛΙΤΙΣΤΙΚΗ ΔΡΑΣΗ / ΔΡΩΜΕΝΟ',
  Intro:
    'Το απόγευμα ή βράδυ του Σαββάτου 21 Νοεμβρίου ή το πρωί της Κυριακής 22 Νοεμβρίου 2026 '
    + 'θα ενταχθεί στο πρόγραμμα τουλάχιστον μία πολιτιστική δράση (παράσταση, ξενάγηση, '
    + 'δρώμενο, δράση bonding κ.λπ.). Συμπλήρωσε την πρότασή σου εδώ — δεν χρειάζεται να '
    + 'στείλεις τίποτα με email.',
  Question: 'Έχεις να προτείνεις κάποια δράση;',
  TimeSlots: [
    'Σάββατο 21/11, απόγευμα ή βράδυ',
    'Κυριακή 22/11, πρωί',
    'Ελαστικότητα στην μέρα/ώρα διεξαγωγής',
  ].join('\n'),
  TypeOptions: [
    'Δωρεάν δράση',
    'Δράση με εισιτήριο',
    'Δράση με συνολικό κόστος μέχρι 300€ (πληρωμή με έκδοση παραστατικού ή τίτλου κτήσης)',
  ].join('\n'),
  FreeTypeLabel: 'Δωρεάν δράση',
  Deadline: '2026-10-23',
  ContactEmail: 'hello@cultureforchange.net',
  VisibleFor: ['member', 'member-ban'],
  CollectInForm: true,
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
  if (!STRAPI_URL || !TOKEN) {
    console.error('ERROR: λείπει STRAPI_URL ή STRAPI_API_TOKEN από το .env.local')
    process.exit(1)
  }

  const got = await api(
    `/events?filters[Slug][$eq]=${SLUG}&populate[Options]=true&populate[OpenCall]=true&pagination[limit]=1`)
  const ev = got.json?.data?.[0]
  if (!ev) { console.error('ERROR: δεν βρέθηκε η δράση'); process.exit(1) }

  // Τα repeatable components αντικαθίστανται ΟΛΑ μαζί — το Strapi δεν κάνει
  // merge. Στέλνουμε ολόκληρη τη λίστα, με το 'agenda' υποχρεωτικό.
  const options = (ev.Options || []).map(o => {
    const { id, ...rest } = o
    if (o.Key === 'agenda') rest.Required = true
    return rest
  })
  const hadAgenda = options.some(o => o.Key === 'agenda')
  if (!hadAgenda) console.warn('ΠΡΟΣΟΧΗ: δεν υπάρχει μπλοκ «agenda» σε αυτή τη δράση')

  const upd = await api(`/events/${ev.documentId}`, 'PUT', { Options: options, OpenCall: OPEN_CALL })
  if (!upd.ok) {
    console.error(`ERROR: HTTP ${upd.status}`)
    console.error(JSON.stringify(upd.json?.error || upd.json, null, 2).slice(0, 900))
    if (upd.status === 400) {
      console.error('\n→ 400: μάλλον δεν έχει γίνει ακόμη deploy το component event.open-call.')
    }
    if (upd.status === 403) console.error('\n→ 403: χρειάζεται δικαίωμα update στο event.')
    process.exit(1)
  }

  const after = await api(
    `/events?filters[Slug][$eq]=${SLUG}&populate[Options]=true&populate[OpenCall]=true&pagination[limit]=1`)
  const e = after.json?.data?.[0]
  const oc = e?.OpenCall
  console.log('Ενημερώθηκε.\n')
  console.log(`  Πρόσκληση: ${oc?.Title || '—'}`)
  console.log(`  Προθεσμία: ${oc?.Deadline || '—'}`)
  console.log(`  Βλέπουν:   ${(oc?.VisibleFor || []).join(', ') || 'όλοι'}`)
  console.log(`  Πότε:      ${String(oc?.TimeSlots || '').split('\n').length} επιλογές`)
  console.log(`  Είδος:     ${String(oc?.TypeOptions || '').split('\n').length} επιλογές`)
  const ag = (e?.Options || []).find(o => o.Key === 'agenda')
  console.log(`  Ατζέντα:   ${ag ? (ag.Required ? 'υποχρεωτική ✓' : 'ΟΧΙ υποχρεωτική ✗') : 'δεν υπάρχει'}`)
})()
