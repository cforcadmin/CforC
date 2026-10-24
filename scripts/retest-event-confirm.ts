/**
 * ΔΟΚΙΜΗ ΤΟΥ ΣΥΝΔΕΣΜΟΥ ΕΠΙΒΕΒΑΙΩΣΗΣ — χωρίς να πειραχτεί κανένας άλλος.
 *
 * Γυρίζει ΤΗ ΔΙΚΗ ΣΟΥ δήλωση σε «εκκρεμεί», βγάζει καινούργιο διακριτικό και
 * τυπώνει τον σύνδεσμο. Πατάς, και βλέπεις ΑΚΡΙΒΩΣ ό,τι βλέπουν οι 13.
 *
 * Γιατί υπάρχει: στις 24/10/2026 η δοκιμή μέσω φόρμας έγινε ΣΥΝΔΕΔΕΜΕΝΑ, άρα
 * isMember=true, άρα η δήλωση μπήκε κατευθείαν «confirmed» ΧΩΡΙΣ διακριτικό —
 * και δοκίμασε τα πάντα εκτός από αυτό που είχε σπάσει.
 *
 * Τρέξε:  npx tsx --env-file=.env.local scripts/retest-event-confirm.ts <email>
 */
import crypto from 'node:crypto'
import { PUBLIC_SITE_URL as SITE } from '../lib/siteUrl'

const U = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const H = { Authorization: `Bearer ${process.env.STRAPI_API_TOKEN}`, 'Content-Type': 'application/json' }
// Η διεύθυνση έρχεται από τη ΦΡΟΥΡΗΜΕΝΗ πηγή (ελέγχει για https): τοπικά το
// NEXT_PUBLIC_SITE_URL ΕΙΝΑΙ localhost, οπότε ένα `|| '…'` θα έδινε νεκρό σύνδεσμο.
const EMAIL = process.argv[2]

async function main() {
  if (!EMAIL) { console.log('Λείπει το email. Παράδειγμα:\n  npx tsx --env-file=.env.local scripts/retest-event-confirm.ts you@example.com'); process.exit(1) }

  const r = await fetch(`${U}/api/event-registrations?filters[Email][$eqi]=${encodeURIComponent(EMAIL)}`
    + '&sort=createdAt:desc&pagination[limit]=1&populate[event][fields][0]=Title', { headers: H, cache: 'no-store' })
  const j: any = await r.json()
  const reg = j?.data?.[0]
  if (!r.ok || !reg) { console.log(`Δεν βρέθηκε δήλωση για ${EMAIL} (HTTP ${r.status})`); process.exit(1) }

  console.log(`Δήλωση: ${reg.FirstName} — ${reg.event?.Title}`)
  console.log(`Τώρα:   Status=${reg.Status}\n`)

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
  if (!upd.ok) { console.log('Απέτυχε η ενημέρωση:', JSON.stringify((await upd.json())?.error?.message)); process.exit(1) }

  console.log('Έγινε «εκκρεμεί» με καινούργιο διακριτικό. ΠΑΤΑ ΑΥΤΟΝ ΤΟΝ ΣΥΝΔΕΣΜΟ:\n')
  console.log(`${SITE}/api/events/confirm?token=${raw}\n`)
  console.log('ΠΕΡΙΜΕΝΕ: «Η συμμετοχή σου καταχωρήθηκε ✓» + email επιβεβαίωσης.')
  console.log('ΞΑΝΑΠΑΤΑ τον: πρέπει να πει «ήδη καταχωρημένη», ΟΧΙ σφάλμα.')
}
main()
