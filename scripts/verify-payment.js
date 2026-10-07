/**
 * ΕΛΕΓΧΟΣ ΟΤΙ ΜΙΑ ΠΛΗΡΩΜΗ ΟΛΟΚΛΗΡΩΘΗΚΕ — ΟΛΑ τα βήματα, όχι μόνο το πρώτο.
 *
 *   node --env-file=.env.local scripts/verify-payment.js <email>
 *
 * ΓΙΑΤΙ ΥΠΑΡΧΕΙ: στις 7/10/2026 το «Πληρώθηκε» προήγαγε το Μητρώο και
 * σκοτώθηκε στα 60 δευτερόλεπτα. Μέλος, απόδειξη, ΕΣΟΔΑ, Drive και δύο email
 * δεν έγιναν ΠΟΤΕ — και η οθόνη δεν είπε τίποτα, γιατί η απάντηση δεν γύρισε.
 * Η μισοτελειωμένη εγγραφή βρέθηκε μόνο επειδή την πρόσεξε άνθρωπος.
 *
 * Διαβάζει ΜΟΝΟ — δεν αλλάζει τίποτα.
 */
const EMAIL = (process.argv[2] || '').trim().toLowerCase()
if (!EMAIL) {
  console.error('Χρήση: node --env-file=.env.local scripts/verify-payment.js <email>')
  process.exit(1)
}

const U = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const T = process.env.STRAPI_API_TOKEN
if (!U || !T) { console.error('Λείπει STRAPI_URL ή STRAPI_API_TOKEN'); process.exit(1) }

const get = async p => {
  const r = await fetch(`${U}/api${p}`, { headers: { Authorization: `Bearer ${T}` }, cache: 'no-store' })
  return r.ok ? r.json() : null
}
const mark = ok => (ok ? '✅' : '❌')

;(async () => {
  const q = encodeURIComponent(EMAIL)
  const app = (await get(`/membership-applications?filters[Email][$eqi]=${q}`))?.data?.[0] || null
  const mem = (await get(
    `/members?filters[Email][$eqi]=${q}&fields[0]=Name&fields[1]=AM&fields[2]=Payments&fields[3]=HideProfile`
  ))?.data?.[0] || null

  const year = new Date().getFullYear()
  const rec = mem ? (await get(
    `/receipts?filters[member][documentId][$eq]=${mem.documentId}`
    + `&filters[SubscriptionYear][$eq]=${year}&sort=Number:desc&pagination[limit]=1`
    + '&fields[0]=Number&fields[1]=Amount&fields[2]=SentAt&fields[3]=SheetSynced&fields[4]=IssueDate'
  ))?.data?.[0] || null : null

  console.log(`\n${EMAIL}\n${'─'.repeat(52)}`)
  console.log(`${mark(!!mem?.AM)} Μητρώο (ΑΜ)         ${mem?.AM ?? '—'}`)
  console.log(`${mark(!!mem)} Μέλος               ${mem?.Name ?? 'ΔΕΝ ΥΠΑΡΧΕΙ'}`)
  console.log(`${mark(!!mem && mem.HideProfile === false)} Προφίλ ορατό        ${mem ? (mem.HideProfile === false ? 'ναι' : 'ΚΡΥΦΟ') : '—'}`)
  console.log(`${mark(!!mem?.Payments?.[year])} Συνδρομή ${year}        ${mem?.Payments?.[year] === 1 ? 'πληρωμένη' : '—'}`)
  console.log(`${mark(!!rec)} Απόδειξη            ${rec ? `ΑΠ. ΕΙΣ. ${rec.Number} · ${rec.Amount}€ · ${rec.IssueDate}` : 'ΔΕΝ ΕΚΔΟΘΗΚΕ'}`)
  console.log(`${mark(!!rec?.SentAt)} Email απόδειξης     ${rec?.SentAt ? rec.SentAt.slice(0, 16).replace('T', ' ') : '—'}`)
  console.log(`${mark(!!rec?.SheetSynced)} ΕΣΟΔΑ + Drive       ${rec?.SheetSynced ? 'συγχρονισμένα' : '—'}`)
  console.log(`${mark(app?.ApplicationState === 'completed')} Αίτηση κλειστή      ${app?.ApplicationState ?? '—'}`)

  const ok = !!mem?.AM && !!mem && !!rec && !!rec.SentAt && !!rec.SheetSynced
    && app?.ApplicationState === 'completed'
  console.log('─'.repeat(52))
  console.log(ok ? '✅ ΟΛΑ ΤΑ ΒΗΜΑΤΑ ΟΛΟΚΛΗΡΩΘΗΚΑΝ' : '❌ ΜΙΣΟΤΕΛΕΙΩΜΕΝΗ — δες τα ❌ παραπάνω')
  process.exit(ok ? 0 : 1)
})()
