/**
 * ΚΑΙΝΟΥΡΓΙΟΣ σύνδεσμος επιβεβαίωσης σε όσους κόλλησαν από τη βλάβη.
 *
 * Γιατί όχι «χειροκίνητη έγκριση»: το OC ΔΕΝ μπορεί να αλλάξει κατάσταση
 * δήλωσης — μόνο τις μετράει. Και μια επιβεβαίωση που την κάνουμε ΕΜΕΙΣ για
 * λογαριασμό τους δεν είναι απόδειξη συγκατάθεσης· το κλικ τους είναι.
 * Οπότε δεν τους εγκρίνουμε: τους δίνουμε σύνδεσμο που δουλεύει.
 *
 * ΧΩΡΙΣ --send δεν στέλνει και δεν γράφει ΤΙΠΟΤΑ. Απλώς δείχνει ποιους θα πιάσει.
 *
 *   npx tsx --env-file=.env.local scripts/resend-event-confirm.ts
 *   npx tsx --env-file=.env.local scripts/resend-event-confirm.ts --only a@b.gr --send
 *   npx tsx --env-file=.env.local scripts/resend-event-confirm.ts --send
 */
import crypto from 'node:crypto'
import { PUBLIC_SITE_URL as SITE } from '../lib/siteUrl'
import { eventRetryConfirmEmailHtml } from '../lib/eventEmails'
import { sendOcEmail, ADMIN_FROM, ADMIN_EMAIL } from '../lib/ocEmails'
import { dateRangeLabel } from '../lib/events'

const U = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const H = { Authorization: `Bearer ${process.env.STRAPI_API_TOKEN}`, 'Content-Type': 'application/json' }

const args = process.argv.slice(2)
const SEND = args.includes('--send')
const ONLY = args.includes('--only') ? args[args.indexOf('--only') + 1] : null
/** Στέλνει ΜΟΝΟ δείγμα του γράμματος σε μία διεύθυνση. Καμία εγγραφή δεν
 *  αγγίζεται και ο σύνδεσμος είναι ψεύτικος — είναι για να δεις πώς φαίνεται. */
const PREVIEW = args.includes('--preview') ? args[args.indexOf('--preview') + 1] : null
/**
 * ΥΠΟΧΡΕΩΤΙΚΟ όταν στέλνουμε. Η βλάβη άγγιξε δύο δράσεις, αλλά το γράμμα
 * αφορά συγκεκριμένο κοινό: χωρίς αυτό, ένα `--send` θα έφευγε σε ΟΛΟΥΣ τους
 * εκκρεμείς κάθε δράσης. Η προεπιλογή «όλοι» σε μαζική αποστολή είναι λάθος
 * που δεν παίρνει πίσω.
 */
const EVENT = args.includes('--event') ? args[args.indexOf('--event') + 1] : null

async function main() {
  if (PREVIEW) {
    /** Με --event παίρνει τα ΑΛΗΘΙΝΑ στοιχεία της δράσης, ώστε το δείγμα να
     *  είναι ακριβώς αυτό που θα λάβουν — όχι μια παρόμοια εκδοχή. */
    let ev: any = null
    if (EVENT) {
      const er = await fetch(`${U}/api/events?filters[Slug][$eq]=${encodeURIComponent(EVENT)}`, { headers: H, cache: 'no-store' })
      ev = (await er.json())?.data?.[0] || null
      if (!ev) { console.log(`Δεν βρέθηκε δράση με slug «${EVENT}».`); process.exit(1) }
    }
    const tpl = eventRetryConfirmEmailHtml({
      firstName: 'ΔΗΜΗΤΡΑ',
      eventTitle: ev?.Title || 'ENCC Bridges Makers | Αθήνα 2026',
      dates: ev ? dateRangeLabel(ev.StartDate, ev.EndDate) : '13–14 Νοεμβρίου 2026',
      venue: ev ? ([ev.Venue, ev.City].filter(Boolean).join(', ') || undefined)
                : 'Πολιτιστικό Κέντρο «Μελίνα», Αθήνα',
      confirmUrl: `${SITE}/api/events/confirm?token=DEIGMA-O-SYNDESMOS-DEN-DOULEUEI`,
    })
    const sent = await sendOcEmail(PREVIEW, `[ΔΕΙΓΜΑ] ${tpl.subject}`, tpl.html,
      { from: ADMIN_FROM, replyTo: ADMIN_EMAIL })
    console.log(sent ? `Δείγμα εστάλη στο ${PREVIEW}. Ο σύνδεσμος είναι ψεύτικος επίτηδες.`
                     : `Η αποστολή στο ${PREVIEW} ΑΠΕΤΥΧΕ.`)
    console.log('Καμία δήλωση δεν άλλαξε.')
    return
  }

  if (SEND && !ONLY && !EVENT) {
    console.log('ΣΤΑΜΑΤΗΣΑ: μαζική αποστολή χωρίς --event θα πήγαινε σε ΟΛΕΣ τις δράσεις.')
    console.log('Παράδειγμα:  --event encc-bridges-makers-athina-2026 --send')
    process.exit(1)
  }

  const filter = ONLY
    ? `filters[Email][$eqi]=${encodeURIComponent(ONLY)}`
    : 'filters[Status][$eq]=pending'
      + (EVENT ? `&filters[event][Slug][$eq]=${encodeURIComponent(EVENT)}` : '')
  const r = await fetch(`${U}/api/event-registrations?${filter}&populate[event]=true&pagination[limit]=100&sort=SubmittedAt:asc`,
    { headers: H, cache: 'no-store' })
  const j: any = await r.json()
  if (!r.ok) { console.log(`Το ερώτημα απέτυχε: HTTP ${r.status}`); process.exit(1) }

  const rows = j.data || []
  if (!rows.length) { console.log('Καμία δήλωση δεν ταιριάζει.'); return }

  console.log(SEND ? '=== ΑΠΟΣΤΟΛΗ ===\n' : '=== ΔΟΚΙΜΗ (δεν στέλνει, δεν γράφει) — βάλε --send ===\n')
  let ok = 0, bad = 0

  for (const reg of rows) {
    const ev = reg.event
    const who = `${reg.FirstName} ${String(reg.LastName || '').slice(0, 1)}.`
    const line = `${who.padEnd(20)} ${String(reg.Email).padEnd(38)} ${String(ev?.Title || '').slice(0, 28)}`
    if (!SEND) { console.log(`   ${line}  [${reg.Status}]`); continue }

    const raw = crypto.randomBytes(32).toString('hex')
    const upd = await fetch(`${U}/api/event-registrations/${reg.documentId}`, {
      method: 'PUT', headers: H,
      body: JSON.stringify({ data: {
        Status: 'pending',
        ConfirmedAt: null,
        ConfirmTokenHash: crypto.createHash('sha256').update(raw).digest('hex'),
        ConfirmTokenExpiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      } }),
    })
    if (!upd.ok) { console.log(`   ΑΠΕΤΥΧΕ (Strapi) ${line}`); bad++; continue }

    const tpl = eventRetryConfirmEmailHtml({
      firstName: String(reg.FirstName || '').trim(),
      eventTitle: ev?.Title || 'τη δράση',
      dates: ev ? dateRangeLabel(ev.StartDate, ev.EndDate) : '',
      venue: [ev?.Venue, ev?.City].filter(Boolean).join(', ') || undefined,
      confirmUrl: `${SITE}/api/events/confirm?token=${raw}`,
    })
    const sent = await sendOcEmail(String(reg.Email), tpl.subject, tpl.html,
      { from: ADMIN_FROM, replyTo: ADMIN_EMAIL })
    console.log(`   ${sent ? 'ΕΣΤΑΛΗ ' : 'ΑΠΕΤΥΧΕ'} ${line}`)
    sent ? ok++ : bad++
  }

  if (SEND) console.log(`\nΣΥΝΟΛΟ: ${ok} εστάλησαν, ${bad} απέτυχαν.`)
  else console.log(`\n${rows.length} θα έπαιρναν καινούργιο σύνδεσμο. Τίποτα δεν άλλαξε.`)
}
main()
