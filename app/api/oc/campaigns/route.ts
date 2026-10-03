import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { resolveOcAccess, getSeatHolder, SEAT_LABELS, SEAT_MAILBOX, type OcSeat } from '@/lib/ocRoles'
import { effectiveSeat, resolveSeatContext, attributionFor, OC_SEAT_MODE_COOKIE, type SeatContext } from '@/lib/ocSeatMode'
import { campaignEmailHtml, PRESETS, NEWSLETTER_PRESETS, TOC_DEFAULT_TITLE, visibleBlocks, BLOCK_LABELS, BLOCK_VARIANTS, MERGE_FIELDS, FOOTER_STYLES, FOOTER_LOOKS, HEADER_STYLES, NEWSLETTER_FOOTERS, NEWSLETTER_FOOTER_DEFAULTS, normaliseNewsletterFooter, applyMergeFields, type Block, type FooterStyle, type FooterLook, type HeaderStyle, type CampaignSigner } from '@/lib/campaignBlocks'
import { drainCampaigns } from '@/lib/campaignDrain'
import {
  resolveRecipients, toQueue, validateCampaign, daysNeeded, recipientSummary,
  firstNameOf, DAILY_EMAIL_BUDGET, SEAT_AUDIENCES, SEAT_LABEL_SET,
  type CampaignMember, type RecipientSelection, describeAudience } from '@/lib/campaignRecipients'
import { OC_EMAIL_SEATS, OC_DESK_LABELS, canSendEmailFrom, canNewsletterFrom, deskOfSeat, isEmailDesk } from '@/components/oc/ocPrefs'
import {
  NEWSLETTER_AUDIENCES, senderGroupId, normaliseAudiences,
  validateNewsletter, applySenderTags, unsupportedTags, SEAT_TEST_GROUPS,
} from '@/lib/newsletterAudiences'
import {
  createSenderCampaign, createSenderCampaignRaw, sendSenderCampaign,
  scheduleSenderCampaign, fillTagsForTest, getSenderCampaignStats,
} from '@/lib/senderCampaigns'
import { sendOcEmailResult } from '@/lib/ocEmails'

// Η «Αποστολή» στέλνει ΤΩΡΑ ό,τι χωράει — χρειάζεται χρόνο, όχι 60 δευτερόλεπτα
export const maxDuration = 300

/**
 * Αποστολή email από το OC — σύνθεση, παραλήπτες, ουρά.
 *
 * Ένας παραλήπτης ή εκατόν δεκατρείς: ίδια διαδρομή. Η ουρά ενεργοποιείται
 * μόνο όταν δεν χωρούν όλοι στο σημερινό όριο.
 *
 * Η αποστολή ΔΕΝ γίνεται εδώ. Η διαδρομή φτιάχνει την καμπάνια και τη βάζει
 * στην ουρά· το cron τη στραγγίζει με το ημερήσιο όριο. Έτσι μια αποστολή σε
 * 113 μέλη δεν εξαρτάται από το αν θα θυμηθεί κάποιος να στείλει το δεύτερο
 * μέρος αύριο, ούτε κρεμάει τη διαδρομή για λεπτά.
 *
 *  GET                      → καμπάνιες, μπλοκ, preset, ομάδες, όριο ημέρας
 *  POST action=resolve      → η επιλογή γίνεται συγκεκριμένη λίστα + πλήθος
 *  POST action=preview      → HTML προεπισκόπησης από τα μπλοκ
 *  POST action=save         → δημιουργία/ενημέρωση προσχεδίου
 *  POST action=queue        → έλεγχος και είσοδος στην ουρά
 *  POST action=cancel       → ακύρωση (ό,τι έχει ήδη φύγει, έχει φύγει)
 *  DELETE ?id=              → διαγραφή προσχεδίου
 *
 * ΠΡΟΣΒΑΣΗ ΚΑΙ ΘΥΡΙΔΑ
 * Κάθε έδρα με δικό της γραφείο αποστολής (βλ. OC_EMAIL_DESKS) στέλνει από
 * ΤΗ ΔΙΚΗ ΤΗΣ θυρίδα: ο Ταμίας από finance@, η Κοινότητα από community@, ο
 * Συντονισμός από coordination@, το Outreach από outreach@. Η θυρίδα βγαίνει
 * από την ΕΝΕΡΓΗ ΕΔΡΑ, όχι από την ενότητα — γι' αυτό η ίδια οθόνη στην
 * Επισκόπηση υπογράφει coordination@ για την Έφη και outreach@ για τη Δήμητρα.
 *
 * Η ΛΙΣΤΑ ανήκει στο ΓΡΑΦΕΙΟ, όχι στο πρόσωπο: κάθε ενότητα έχει δικά της
 * Απεσταλμένα και δικό της Αρχείο. Η Επισκόπηση είναι ΕΝΑ γραφείο που το
 * μοιράζονται Συντονισμός και Outreach — βλέπουν ο ένας τα γράμματα του άλλου,
 * γιατί δουλεύουν στο ίδιο τραπέζι. Τα Οικονομικά δεν βλέπουν τίποτα από αυτά.
 * Χωρίς αυτόν τον διαχωρισμό, ένα «Διαγραφή» σε λάθος γραμμή θα έσβηνε τα
 * γράμματα —και τις εικόνες— άλλου γραφείου. Το IT κάθεται σε όποιο γραφείο
 * ανοίξει και βλέπει ό,τι υπάρχει εκεί.
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN
const ALLOWED_SEATS = OC_EMAIL_SEATS as OcSeat[]

async function strapi(path: string, method = 'GET', data?: any) {
  const res = await fetch(`${STRAPI_URL}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${STRAPI_API_TOKEN}` },
    ...(data !== undefined && { body: JSON.stringify({ data }) }),
    cache: 'no-store',
  })
  let json: any = null
  try { json = await res.json() } catch { /* 204 */ }
  return { ok: res.ok, status: res.status, json }
}

async function authorize() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')
  const decoded = sessionCookie ? verifyToken(sessionCookie.value) : null
  if (!decoded || decoded.type !== 'session') {
    return { error: NextResponse.json({ error: 'Απαιτείται σύνδεση' }, { status: 401 }) }
  }
  const access = await resolveOcAccess(decoded.memberId)
  if (!access.isBoard) return { error: NextResponse.json({ error: 'Δεν επιτρέπεται' }, { status: 403 }) }
  const seatCookie = cookieStore.get('oc-last-seat')?.value as OcSeat | undefined
  const seatModeCookie = cookieStore.get(OC_SEAT_MODE_COOKIE)?.value
  const activeSeat: OcSeat | null =
    effectiveSeat(access.seats as OcSeat[], seatCookie, seatModeCookie)
  if (!activeSeat || !ALLOWED_SEATS.includes(activeSeat)) {
    return { error: NextResponse.json({ error: 'Η έδρα σου δεν στέλνει email από το OC' }, { status: 403 }) }
  }
  return {
    memberId: decoded.memberId,
    activeSeat,
    seatCtx: resolveSeatContext(access.seats as OcSeat[], seatCookie, seatModeCookie),
  }
}

/**
 * Ποιος ΟΝΤΩΣ το έγραψε — όχι ποια έδρα το υπογράφει.
 *
 * Το γράμμα φεύγει υπογεγραμμένο από τον κάτοχο της έδρας (signerFor): αυτό
 * είναι το νόημα του «ενεργώ ως». Το μητρώο όμως πρέπει να λέει την αλήθεια,
 * αλλιώς μια καμπάνια που έστειλε το IT φοράει το όνομα της Ταμία και κανένα
 * αρχείο δεν δείχνει ποιος πάτησε το κουμπί.
 */
async function authorName(auth: { memberId: string; seatCtx: SeatContext; activeSeat: OcSeat }): Promise<string> {
  const real = await memberName(auth.memberId)
  return attributionFor(auth.seatCtx, real, SEAT_LABELS[auth.activeSeat] || auth.activeSeat)
}

/**
 * Τα μεγέθη των λιστών του Sender.
 *
 * Best-effort: αν ο Sender δεν απαντήσει, η οθόνη δείχνει «—» αντί για ψεύτικο
 * νούμερο. Ποτέ μηδέν — ένα «0 παραλήπτες» θα έμοιαζε με άδεια λίστα και θα
 * οδηγούσε σε λάθος συμπέρασμα.
 */
async function newsletterLists() {
  const key = process.env.SENDER_API_KEY
  const out = NEWSLETTER_AUDIENCES.map(a => ({ id: a.id, label: a.label, hint: a.hint, count: null as number | null }))
  if (!key) return out
  /**
   * ΟΧΙ το recipient_count του /groups.
   *
   * Εκείνο μετράει και τις κατασταλμένες επαφές — όσους έχουν απεγγραφεί ή
   * έχουν κάνει bounce — και έδειχνε 116/420 ενώ οι λίστες που ΠΑΡΑΔΙΔΟΥΝ
   * είχαν 114/408. Ένα φουσκωμένο νούμερο εδώ γίνεται λάθος προσδοκία για το
   * πόσοι θα λάβουν το γράμμα.
   *
   * Με `limit=1` το `meta.last_page` ισούται με το πλήθος των ΠΡΑΓΜΑΤΙΚΩΝ
   * συνδρομητών — μία κλήση ανά λίστα, χωρίς σελιδοποίηση.
   */
  await Promise.all(out.map(async a => {
    const gid = senderGroupId(a.id as any)
    if (!gid) return
    try {
      const res = await fetch(`https://api.sender.net/v2/groups/${gid}/subscribers?limit=1`, {
        headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
        next: { revalidate: 300 },
      })
      if (!res.ok) return
      const j = await res.json()
      a.count = (j?.data || []).length === 0 ? 0 : Number(j?.meta?.last_page ?? 0)
    } catch { /* η οθόνη δείχνει «—» */ }
  }))
  return out
}

/** Όλα τα μέλη με ό,τι χρειάζεται η επιλογή — μία φορά, με pagination */
async function loadMembers(): Promise<CampaignMember[]> {
  const out: CampaignMember[] = []
  let start = 0
  while (true) {
    const r = await strapi(
      `/members?fields[0]=Name&fields[1]=Email&fields[2]=AM&fields[3]=Payments` +
      `&pagination[start]=${start}&pagination[limit]=100`
    )
    const rows = r.json?.data || []
    for (const m of rows) {
      out.push({
        docId: m.documentId,
        name: String(m.Name || '').trim(),
        email: String(m.Email || '').trim(),
        am: typeof m.AM === 'number' ? m.AM : null,
        payments: m.Payments && typeof m.Payments === 'object' ? m.Payments : {},
        groups: [],
      })
    }
    if (rows.length < 100) break
    start += rows.length
  }
  return out
}

/**
 * Οι ομάδες κάθε μέλους: έδρες OC + ομάδες εργασίας.
 * Best-effort — αν αποτύχει, η επιλογή «κατά ομάδα» απλώς δεν βρίσκει κανέναν,
 * αντί να ρίξει όλη τη σελίδα.
 */
async function attachGroups(members: CampaignMember[]): Promise<string[]> {
  const byDoc = new Map(members.map(m => [m.docId, m]))
  const names = new Set<string>()
  try {
    const { getBoardRoster } = await import('@/lib/ocRoles')
    for (const r of await getBoardRoster()) {
      const m = byDoc.get(r.memberDocumentId)
      for (const s of r.seats) {
        const label = SEAT_LABELS[s] || s
        names.add(label)
        if (m) m.groups = [...(m.groups || []), label]
      }
    }
  } catch { /* οι έδρες δεν είναι κρίσιμες για τη σύνθεση */ }
  try {
    const wg = await strapi('/working-groups?populate[Members][fields][0]=id&fields[0]=Name&pagination[limit]=100')
    for (const g of wg.json?.data || []) {
      const label = String(g.Name || '').trim()
      if (!label) continue
      names.add(label)
      for (const mem of g.Members || []) {
        const m = members.find(x => x.docId === mem.documentId)
        if (m) m.groups = [...(m.groups || []), label]
      }
    }
  } catch { /* ομοίως */ }
  // Οι έδρες βγαίνουν από εδώ: έχουν δικό τους άξονα και πάνε σε θυρίδα,
  // όχι στο προσωπικό email του κατόχου.
  return [...names].filter(n => !SEAT_LABEL_SET.has(n)).sort((a, b) => a.localeCompare(b, 'el'))
}

/**
 * Ποιος υπογράφει: η θυρίδα και ο ρόλος από την ΕΔΡΑ που συνθέτει, το όνομα
 * από τον τρέχοντα κάτοχό της. Ποτέ γραμμένο στο χέρι — οι εκλογές αλλάζουν
 * πρόσωπα, και ένα πρότυπο με καρφωμένο όνομα γερνάει σιωπηλά.
 */
async function signerFor(seat: OcSeat): Promise<CampaignSigner> {
  const holder = await getSeatHolder(seat).catch(() => null)
  return {
    name: holder?.name || holder?.engName || 'Culture for Change',
    role: SEAT_LABELS[seat] || '',
    email: SEAT_MAILBOX[seat] || 'hello@cultureforchange.net',
  }
}

const CAMPAIGN_FIELDS_BASE =
  'fields[0]=Subject&fields[1]=State&fields[2]=SentCount&fields[3]=FailedCount' +
  '&fields[4]=TotalCount&fields[5]=QueuedAt&fields[6]=LastRunAt&fields[7]=CompletedAt' +
  '&fields[8]=CreatedByName&fields[9]=IsTemplate&fields[10]=TemplateName&fields[11]=updatedAt'
// Κλιμακωτά, ΟΧΙ ένα ενιαίο query: ένα πεδίο που δεν έχει βγει ακόμη στο
// Strapi Cloud γυρίζει 400 «Invalid key» και ΠΑΡΑΣΕΡΝΕΙ μαζί του όλα τα
// αδέλφια του — η λίστα έρχεται κενή και οι καμπάνιες μοιάζουν χαμένες.
const CAMPAIGN_FIELDS_SIGNER = CAMPAIGN_FIELDS_BASE + '&fields[12]=Signer'
const CAMPAIGN_FIELDS_ARCHIVE = CAMPAIGN_FIELDS_SIGNER + '&fields[13]=Archived&fields[14]=ArchivedAt'
const CAMPAIGN_FIELDS_DESK = CAMPAIGN_FIELDS_ARCHIVE + '&fields[15]=Desk'
// Το είδος: η λίστα πρέπει να ξεχωρίζει μήνυμα από τεύχος, αλλιώς ανοίγεις
// ένα προσχέδιο και ο συνθέτης δεν ξέρει σε ποια από τις δύο διαδρομές ανήκει.
const CAMPAIGN_FIELDS_KIND = CAMPAIGN_FIELDS_DESK + '&fields[16]=Kind'
// Η ΕΠΙΛΟΓΗ παραληπτών: η λίστα δείχνει ΣΕ ΠΟΙΟΝ πήγε το καθένα. Τελευταίο
// σκαλί, με την ίδια λογική κλιμάκωσης — αν λείπει, η λίστα απλώς δεν δείχνει
// παραλήπτη, δεν αδειάζει.
const CAMPAIGN_FIELDS = CAMPAIGN_FIELDS_KIND + '&fields[17]=Selection&fields[18]=Groups'

/**
 * Θυρίδα → γραφείο. Χτίζεται από τις ΙΔΙΕΣ πηγές που ορίζουν ποιος στέλνει
 * από πού (SEAT_MAILBOX) και ποιος κάθεται πού (OC_EMAIL_DESKS), ώστε να μην
 * υπάρχει τρίτος πίνακας να ξεσυγχρονιστεί.
 */
const DESK_BY_MAILBOX: Map<string, string> = new Map(
  Object.entries(SEAT_MAILBOX)
    .map(([seat, box]) => [String(box).toLowerCase(), deskOfSeat(seat)] as const)
    .filter((e): e is readonly [string, string] => !!e[1])
)

/**
 * Σε ποιο γραφείο ανήκει μια καμπάνια.
 *
 * Πρώτα το γραμμένο `Desk` — είναι η αλήθεια, γιατί το IT μπορεί να έχει
 * συνθέσει από οποιοδήποτε τραπέζι και η θυρίδα του (it@) δεν προδίδει ποιο.
 * Αν λείπει (παλιές εγγραφές, ή το πεδίο δεν έχει βγει ακόμη στο Strapi
 * Cloud), το συμπεραίνουμε από τη θυρίδα του υπογράφοντα: coordination@ και
 * outreach@ δείχνουν και τα δύο στην Επισκόπηση. Ό,τι δεν αναγνωρίζεται —
 * χωρίς υπογραφή, ή υπογεγραμμένο από it@ πριν υπάρξει το πεδίο — πέφτει στη
 * Διαχείριση, που ήταν ούτως ή άλλως η κοινή δεξαμενή μέχρι σήμερα.
 */
function deskOfCampaign(row: any): string {
  const stored = String(row?.Desk || '').trim()
  if (isEmailDesk(stored)) return stored
  const box = String(row?.Signer?.email || '').trim().toLowerCase()
  return DESK_BY_MAILBOX.get(box) || 'admin'
}

/** Φτάνει αυτή η έδρα σε αυτή την καμπάνια; */
function campaignInReach(row: any, seat: OcSeat): boolean {
  return canSendEmailFrom(deskOfCampaign(row), seat)
}

/** Το ίδιο, για μια καμπάνια που ξέρουμε μόνο με το documentId της */
async function assertOwnership(id: string, seat: OcSeat): Promise<NextResponse | null> {
  if (seat === 'it') return null
  // Το Desk μπορεί να μην έχει βγει ακόμη — τότε ζητάμε μόνο το Signer και
  // συμπεραίνουμε. Ένα 400 εδώ θα μπλόκαρε κάθε αρχειοθέτηση και διαγραφή.
  let r = await strapi(`/oc-campaigns/${id}?fields[0]=Signer&fields[1]=Desk`)
  if (!r.ok) r = await strapi(`/oc-campaigns/${id}?fields[0]=Signer`)
  if (!r.ok) {
    // Δεν μπορούμε να δούμε πού ανήκει → δεν την πειράζουμε. Μια άρνηση
    // είναι αναστρέψιμη· μια διαγραφή σε ξένο γραφείο δεν είναι.
    return NextResponse.json({ error: 'Η καμπάνια δεν βρέθηκε' }, { status: 404 })
  }
  if (!campaignInReach(r.json?.data, seat)) {
    return NextResponse.json({ error: 'Το μήνυμα ανήκει σε άλλο γραφείο' }, { status: 403 })
  }
  return null
}

/**
 * Η ώρα προγραμματισμού, ως πραγματική στιγμή.
 *
 * Ο επιλογέας `datetime-local` δίνει «2026-09-27T12:30» ΧΩΡΙΣ ζώνη ώρας. Αν
 * το διάβαζε ο server, θα το εκλάμβανε ως UTC και το γράμμα θα έφευγε τρεις
 * ώρες αργότερα από ό,τι είδε ο συντάκτης. Γι' αυτό ο browser στέλνει ISO με
 * ζώνη και εδώ δεχόμαστε ΜΟΝΟ αυτό.
 *
 * Το περιθώριο του ενός λεπτού κρατά το «τώρα» να σημαίνει τώρα: μια ώρα που
 * μόλις πέρασε δεν είναι προγραμματισμός, είναι άμεση αποστολή.
 */
function scheduledFor(v: unknown): Date | null {
  const t = Date.parse(String(v || ''))
  if (!Number.isFinite(t) || t <= Date.now() + 60_000) return null
  return new Date(t)
}

/**
 * Ένα προσχέδιο ΔΕΝ αλλάζει είδος.
 *
 * Μήνυμα και τεύχος έχουν άλλη διαδρομή αποστολής, άλλους παραλήπτες και
 * άλλο υποσέλιδο· ένα «μήνυμα» αποθηκευμένο πάνω σε τεύχος θα έστελνε το
 * τεύχος χωρίς σύνδεσμο απεγγραφής, που είναι και παράβαση. Ο συνθέτης
 * κρατά πια χωριστές καταστάσεις ανά είδος — αυτό είναι η δεύτερη γραμμή.
 *
 * Αν το πεδίο Kind δεν έχει βγει ακόμη στο Strapi, ΔΕΝ μπλοκάρουμε: μια
 * άρνηση εδώ θα σταματούσε κάθε αποθήκευση σε κάθε παλιό προσχέδιο.
 */
async function assertKindMatches(id: string, kind: string): Promise<NextResponse | null> {
  const r = await strapi(`/oc-campaigns/${id}?fields[0]=Kind`)
  if (!r.ok) return null
  const stored = r.json?.data?.Kind
  if (!stored || stored === kind) return null
  return NextResponse.json({
    error: stored === 'newsletter'
      ? 'Αυτό το προσχέδιο είναι newsletter — άνοιξέ το από τα Προσχέδια για να το συνεχίσεις'
      : 'Αυτό το προσχέδιο είναι μήνυμα — άνοιξέ το από τα Προσχέδια για να το συνεχίσεις',
  }, { status: 409 })
}

/**
 * Σε ποιο γραφείο δουλεύει αυτό το αίτημα.
 *
 * Το λέει η οθόνη (η ενότητα που είναι ανοιχτή) και το ΕΛΕΓΧΟΥΜΕ: χωρίς
 * έλεγχο, ένα χειροκίνητο `?desk=finances` θα άνοιγε τα Οικονομικά σε
 * οποιονδήποτε. Αν δεν το πει, πέφτουμε στο γραφείο της έδρας του.
 */
/**
 * Το υποσέλιδο ισχύει ΜΟΝΟ για newsletter.
 *
 * Ένα μήνυμα γραφείου υπογράφεται από πρόσωπο και δεν έχει απεγγραφή· αν του
 * κολλούσαμε τη ζώνη με τα κοινωνικά δίκτυα και το σημείωμα GDPR, μια απλή
 * απόδειξη θα έμοιαζε με διαφημιστικό.
 */
function nlFooter(body: any) {
  return body?.kind === 'newsletter' ? normaliseNewsletterFooter(body?.footer) : null
}

function deskOfRequest(asked: string | null | undefined, seat: OcSeat): string | null {
  const want = String(asked || '').trim()
  if (want && canSendEmailFrom(want, seat)) return want
  return deskOfSeat(seat) || (seat === 'it' ? 'admin' : null)
}

export async function GET(request: NextRequest) {
  const auth = await authorize()
  if ('error' in auth) return auth.error
  try {
    const desk = deskOfRequest(request.nextUrl.searchParams.get('desk'), auth.activeSeat)
    const id = request.nextUrl.searchParams.get('id')
    if (id) {
      const one = await strapi(`/oc-campaigns/${id.replace(/[^a-z0-9]/gi, '')}`)
      if (!one.ok) return NextResponse.json({ error: 'Η καμπάνια δεν βρέθηκε' }, { status: 404 })
      if (!campaignInReach(one.json?.data, auth.activeSeat)) {
        return NextResponse.json({ error: 'Το μήνυμα ανήκει σε άλλο γραφείο' }, { status: 403 })
      }
      // Τα στατιστικά ενός τεύχους ζουν στον Sender. Τα φέρνουμε ΜΟΝΟ όταν
      // ανοίγει η γραμμή — μία κλήση, όχι μία ανά καμπάνια στη λίστα.
      const sid = one.json?.data?.SenderCampaignId
      const senderStats = sid ? await getSenderCampaignStats(String(sid)) : null
      return NextResponse.json({ campaign: one.json?.data, senderStats })
    }
    const members = await loadMembers()
    const groups = await attachGroups(members)
    // Το Archived μπορεί να μην έχει βγει ακόμη στο Strapi Cloud: τότε το query
    // γυρίζει 400 «Invalid key» και η λίστα θα ερχόταν ΚΕΝΗ — δηλαδή οι
    // καμπάνιες θα «εξαφανίζονταν» ενώ υπάρχουν. Ξαναδοκιμάζουμε χωρίς αυτό.
    const listUrl = (f: string) => `/oc-campaigns?sort=updatedAt:desc&pagination[limit]=100&${f}`
    // Κλιμακωτά: το Desk είναι το νεότερο πεδίο και μπορεί να μην έχει βγει
    // ακόμη. Χωρίς αυτό δουλεύουμε με τη θυρίδα του υπογράφοντα — ο
    // διαχωρισμός των γραφείων ΔΕΝ περιμένει το deploy του Strapi.
    let list = await strapi(listUrl(CAMPAIGN_FIELDS))
    if (!list.ok) list = await strapi(listUrl(CAMPAIGN_FIELDS_KIND))
    if (!list.ok) list = await strapi(listUrl(CAMPAIGN_FIELDS_DESK))
    if (!list.ok) list = await strapi(listUrl(CAMPAIGN_FIELDS_ARCHIVE))
    if (!list.ok) list = await strapi(listUrl(CAMPAIGN_FIELDS_SIGNER))
    let scoped = true
    if (!list.ok) { list = await strapi(listUrl(CAMPAIGN_FIELDS_BASE)); scoped = false }
    // Χωρίς ούτε Signer δεν ξέρουμε πού ανήκει τίποτα· τότε δείχνουμε τα πάντα
    // αντί για τίποτα — η λίστα είναι αρχείο, όχι μυστικό.
    const rows: any[] = list.json?.data || []
    const campaigns = (scoped && desk ? rows.filter(c => deskOfCampaign(c) === desk) : rows)
      // «Σε ποιον πήγε» — υπολογίζεται ΕΔΩ, όπου υπάρχουν ήδη τα ονόματα των
      // μελών· η οθόνη δεν χρειάζεται να μάθει ποτέ διευθύνσεις.
      .map((c: any) => ({
        ...c,
        audience: describeAudience(c.Selection, {
          total: c.TotalCount,
          groups: Array.isArray(c.Groups) ? c.Groups : [],
          nameOf: (id: string) => members.find(m => m.docId === id)?.name,
        }),
      }))
    return NextResponse.json({
      campaigns,
      desk,
      deskLabel: desk ? OC_DESK_LABELS[desk] || '' : '',
      // Ό,τι χρειάζεται η οθόνη για να χτίσει τον επιλογέα, χωρίς δεύτερη κλήση
      memberCount: members.filter(m => m.am != null && m.email).length,
      /**
       * Ο κατάλογος για τον επιλογέα συγκεκριμένων μελών.
       *
       * ΧΩΡΙΣ φίλτρο ΑΜ, σκόπιμα: ο resolveRecipients δεν φιλτράρει κι εκείνος
       * όταν κάποιος διαλέγει ΡΗΤΑ ένα άτομο («αν το διάλεξε, το εννοεί»).
       * Ένας επιλογέας που κρύβει μέλη τα οποία ο server θα δεχόταν, είναι
       * επιλογέας που λέει ψέματα. Χωρίς email ΔΕΝ μπαίνει: δεν υπάρχει πού
       * να σταλεί. Το ίδιο το email δεν ταξιδεύει — φτάνει το docId.
       */
      memberList: members
        .filter(m => m.email)
        .map(m => ({ docId: m.docId, name: m.name, am: m.am ?? null }))
        .sort((a, b) => String(a.name).localeCompare(String(b.name), 'el')),
      groups,
      seats: SEAT_AUDIENCES,
      blockLabels: BLOCK_LABELS,
      blockVariants: BLOCK_VARIANTS,
      presets: PRESETS.map(p => ({ id: p.id, label: p.label, hint: p.hint, blocks: p.blocks })),
      // Τα έτοιμα σχέδια του newsletter είναι ΑΛΛΑ: τα τέσσερα παραπάνω
      // αφορούν μόνο την αποστολή email.
      newsletterPresets: NEWSLETTER_PRESETS.map(p => ({ id: p.id, label: p.label, hint: p.hint, blocks: p.blocks })),
      mergeFields: MERGE_FIELDS,
      newsletterFooters: NEWSLETTER_FOOTERS,
      newsletterFooterDefaults: NEWSLETTER_FOOTER_DEFAULTS,
      footerStyles: FOOTER_STYLES,
      footerLooks: FOOTER_LOOKS,
      headerStyles: HEADER_STYLES,
      signer: await signerFor(auth.activeSeat),
      dailyBudget: DAILY_EMAIL_BUDGET,
      tocDefaultTitle: TOC_DEFAULT_TITLE,
      // Μαζική αποστολή: Επικοινωνία (Newsletter) και Διαχείριση (Bulk email)
      newsletterLists: canNewsletterFrom(desk) ? await newsletterLists() : [],
      seat: auth.activeSeat,
    })
  } catch (err) {
    console.error('oc/campaigns GET failed:', err)
    return NextResponse.json({ error: 'Αποτυχία φόρτωσης' }, { status: 502 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await authorize()
  if ('error' in auth) return auth.error
  const body = await request.json().catch(() => null)
  const action = String(body?.action || '')

  try {
    if (action === 'resolve') {
      const members = await loadMembers()
      await attachGroups(members)
      const recipients = resolveRecipients(members, (body?.selection || {}) as RecipientSelection)
      return NextResponse.json({
        recipients,
        count: recipients.length,
        days: daysNeeded(recipients.length),
        summary: recipientSummary(recipients.length),
      })
    }

    if (action === 'preview') {
      const blocks: Block[] = Array.isArray(body?.blocks) ? body.blocks : []
      // Η προεπισκόπηση δείχνει τα merge fields ΛΥΜΕΝΑ, αλλιώς κανείς δεν
      // καταλαβαίνει τι θα δει ο παραλήπτης
      const sample = body?.sample || { 'όνομα': 'Μαρία', 'επώνυμο': 'Κολιοπούλου', 'ΑΜ': '34', 'έτος': String(new Date().getFullYear()) }
      const tpl = campaignEmailHtml({
        subject: applyMergeFields(String(body?.subject || ''), sample),
        preheader: String(body?.preheader || ''),
        blocks,
        signer: await signerFor(auth.activeSeat),
        footerStyle: (body?.footerStyle || 'signature') as FooterStyle,
        footerLook: (body?.footerLook || 'plain') as FooterLook,
        footerLogo: !!body?.footerLogo,
        newsletterFooter: nlFooter(body),
        headerStyle: (body?.headerStyle || 'coral') as HeaderStyle,
        headerLogo: !!body?.headerLogo,
        // Η προεπισκόπηση πρέπει να δείχνει ΚΑΙ τη γραμμή απεγγραφής, αλλιώς
        // ο συντάκτης δεν βλέπει ποτέ το γράμμα όπως φτάνει στον παραλήπτη
        unsubscribe: body?.kind === 'newsletter',
        // Σήμανση μπλοκ: μόνο εδώ, ώστε το κλικ στην προεπισκόπηση να ξέρει
        // ποιο στοιχείο πατήθηκε. Στο γράμμα που φεύγει δεν μπαίνει ποτέ.
        annotate: true,
      })
      // Δεν υπάρχει ακόμη τεύχος στο αρχείο — ο σύνδεσμος μένει αδρανής
      const previewHtml = applyMergeFields(tpl.html, sample).replace(/\{\{ARCHIVE_URL\}\}/g, '#')
      return NextResponse.json({ html: previewHtml, text: tpl.text, subject: tpl.subject })
    }

    if (action === 'save' || action === 'queue') {
      const blocks: Block[] = Array.isArray(body?.blocks) ? body.blocks : []
      const subject = String(body?.subject || '').trim()
      const members = await loadMembers()
      await attachGroups(members)
      const recipients = resolveRecipients(members, (body?.selection || {}) as RecipientSelection)

      if (action === 'queue') {
        // Τα κρυφά ΔΕΝ μετράνε: γράμμα με μόνο κρυφά στοιχεία είναι κενό
        const v = validateCampaign({ subject, blocks: visibleBlocks(blocks), recipients })
        if (!v.ok) return NextResponse.json({ error: v.errors.join(' · '), errors: v.errors }, { status: 400 })
      }

      const name = await authorName(auth)
      // Το γραφείο γράφεται ΜΙΑ φορά, τη στιγμή της σύνθεσης. Δεν βγαίνει από
      // τη θυρίδα του υπογράφοντα, γιατί το IT υπογράφει πάντα it@ ανεξάρτητα
      // από το τραπέζι στο οποίο κάθεται.
      const desk = deskOfRequest(body?.desk, auth.activeSeat)
      const sendAt = action === 'queue' ? scheduledFor(body?.scheduleAtIso) : null
      const payload: Record<string, any> = {
        Desk: desk,
        // Το είδος καθορίζει ΟΛΗ τη διαδρομή αποστολής. Μαζική αποστολή μόνο
        // από τα γραφεία του NEWSLETTER_DESKS — αλλού η οθόνη δεν την προσφέρει.
        Kind: body?.kind === 'newsletter' && canNewsletterFrom(desk) ? 'newsletter' : 'message',
        Groups: normaliseAudiences(body?.audiences),
        Subject: subject || '(χωρίς θέμα)',
        Preheader: String(body?.preheader || '').trim() || null,
        Blocks: blocks,
        Recipients: toQueue(recipients),
        // Η ΕΠΙΛΟΓΗ, όχι μόνο το αποτέλεσμά της: χωρίς αυτήν, ανοίγοντας ξανά
        // ένα προσχέδιο θα βλέπαμε 113 ονόματα αντί για «όλα τα μέλη», και
        // κάθε αλλαγή στο μητρώο θα «πάγωνε» στο προσχέδιο.
        Selection: body?.selection ?? {},
        TotalCount: recipients.length,
        Cc: Array.isArray(body?.cc) ? body.cc : null,
        Notes: String(body?.notes || '').trim() || null,
        FooterStyle: String(body?.footerStyle || 'signature'),
        FooterLook: String(body?.footerLook || 'plain'),
        FooterLogo: !!body?.footerLogo,
        Footer: nlFooter(body),
        HeaderStyle: String(body?.headerStyle || 'coral'),
        HeaderLogo: !!body?.headerLogo,
        // Παγώνει εδώ: η αποστολή μπορεί να κρατήσει ημέρες
        Signer: await signerFor(auth.activeSeat),
        IsTemplate: !!body?.isTemplate,
        TemplateName: String(body?.templateName || '').trim() || null,
        State: action === 'queue' ? 'queued' : 'draft',
        // Η ΩΡΑ ΑΔΕΙΑΣ, όχι η ώρα που πατήθηκε το κουμπί: η στράγγιση δεν
        // αγγίζει καμπάνια που δεν έχει ωριμάσει ακόμη.
        ...(action === 'queue' && { QueuedAt: (sendAt || new Date()).toISOString() }),
      }

      const id = String(body?.id || '').replace(/[^a-z0-9]/gi, '')
      if (id) {
        const denied = await assertOwnership(id, auth.activeSeat)
        if (denied) return denied
        const wrongKind = await assertKindMatches(id, String(body?.kind || 'message'))
        if (wrongKind) return wrongKind
      }
      const write = (p: Record<string, any>) => id
        ? strapi(`/oc-campaigns/${id}`, 'PUT', p)
        : strapi('/oc-campaigns', 'POST', { ...p, CreatedByName: name })
      /**
       * Αποθήκευση με σταδιακή υποχώρηση.
       *
       * Ένα πεδίο που δεν έχει βγει ακόμη στο Strapi Cloud γυρίζει 400 και θα
       * εμπόδιζε ΟΛΗ την αποθήκευση. Πετάμε τα νεότερα πεδία ένα-ένα, από το
       * νεότερο προς το παλαιότερο, ώστε να χαθεί όσο το δυνατόν λιγότερο: αν
       * πετούσαμε όλη την ομάδα μαζί, η καμπάνια θα έχανε σιωπηλά και την
       * κεφαλίδα και το υποσέλιδο που διάλεξε ο συντάκτης.
       */
      const DROP_ORDER: Array<keyof typeof payload | string> = [
        'Footer',                                           // υποσέλιδο newsletter
        'Kind', 'Groups',                                   // newsletter
        'Selection',                                        // κοινά προσχέδια
        'Desk',                                             // γραφεία
        'FooterStyle', 'FooterLook', 'FooterLogo', 'HeaderStyle', 'HeaderLogo', 'Signer',
      ]
      let attempt: Record<string, any> = { ...payload }
      let res = await write(attempt)
      for (const field of DROP_ORDER) {
        if (res.ok || res.status !== 400) break
        if (!(field in attempt)) continue
        delete attempt[field as string]
        res = await write(attempt)
      }
      if (!res.ok) {
        console.error('oc/campaigns: save failed', res.status)
        return NextResponse.json({ error: 'Αποτυχία αποθήκευσης' }, { status: 502 })
      }
      const savedId = res.json?.data?.documentId || id

      // Στέλνουμε ΑΜΕΣΩΣ ό,τι χωράει στο σημερινό όριο. Η ουρά υπάρχει για
      // ό,τι ΔΕΝ χωράει — δεν έχει νόημα ένα μήνυμα σε τρεις παραλήπτες να
      // περιμένει τις 08:00 επειδή το όριο είναι 80.
      let sentNow = 0
      let drainReport: string[] = []
      // Προγραμματισμένη: ΔΕΝ τη στραγγίζουμε τώρα — θα την πιάσει το cron
      // όταν έρθει η ώρα της.
      if (action === 'queue' && savedId && !sendAt) {
        try {
          const d = await drainCampaigns({ onlyId: savedId, timeBudgetMs: 240_000 })
          sentNow = d.sent
          drainReport = d.report
        } catch (e) {
          // Η καμπάνια είναι ήδη στην ουρά· το cron θα την πιάσει το πρωί
          console.error('oc/campaigns: άμεση αποστολή απέτυχε', (e as Error).message)
        }
      }

      const remaining = recipients.length - sentNow
      return NextResponse.json({
        ok: true,
        id: savedId,
        state: payload.State,
        count: recipients.length,
        sentNow,
        remaining,
        days: daysNeeded(recipients.length),
        summary: recipientSummary(recipients.length),
        report: drainReport,
      })
    }

    /**
     * Διπλότυπο ολόκληρης καμπάνιας, από τη λίστα.
     *
     * Γίνεται στον server και όχι στο πρόγραμμα περιήγησης: τα μπλοκ ενός
     * newsletter φτάνουν τα 100 και δεν υπάρχει λόγος να κατέβουν και να
     * ξανανέβουν για μια αντιγραφή.
     *
     * Οι ΕΙΚΟΝΕΣ μοιράζονται σκόπιμα — δεν αντιγράφονται. Η διαγραφή
     * καμπάνιας ήδη σβήνει μόνο όσες εικόνες δεν κρατά άλλη καμπάνια, οπότε
     * το αντίγραφο δεν μπορεί να μείνει με σπασμένες εικόνες.
     *
     * Το αντίγραφο γεννιέται ΠΑΝΤΑ ως προσχέδιο, χωρίς παραλήπτες και χωρίς
     * ίχνος αποστολής: αλλιώς ένα διπλότυπο απεσταλμένου θα έμοιαζε σαν να
     * στάλθηκε κι αυτό.
     */
    if (action === 'duplicate') {
      const id = String(body?.id || '').replace(/[^a-z0-9]/gi, '')
      const subject = String(body?.subject || '').trim()
      if (!id) return NextResponse.json({ error: 'Λείπει η καμπάνια' }, { status: 400 })
      if (!subject) return NextResponse.json({ error: 'Λείπει το όνομα' }, { status: 400 })

      const src = await strapi(`/oc-campaigns/${id}`)
      const row = src.json?.data
      if (!src.ok || !row) return NextResponse.json({ error: 'Δεν βρέθηκε η καμπάνια' }, { status: 404 })

      const copy = await strapi('/oc-campaigns', 'POST', {
        Subject: subject,
        Kind: row.Kind || 'message',
        Blocks: row.Blocks || [],
        Desk: auth.activeSeat,
        State: 'draft',
        FooterStyle: row.FooterStyle ?? null,
        FooterLook: row.FooterLook ?? null,
        FooterLogo: row.FooterLogo ?? null,
        HeaderStyle: row.HeaderStyle ?? null,
        HeaderLogo: row.HeaderLogo ?? null,
        Footer: row.Footer ?? null,
        CreatedByName: await authorName(auth),
      })
      if (!copy.ok) return NextResponse.json({ error: 'Αποτυχία διπλοτύπου' }, { status: 502 })
      return NextResponse.json({ ok: true, id: copy.json?.data?.documentId || null })
    }

    if (action === 'archive') {
      const id = String(body?.id || '').replace(/[^a-z0-9]/gi, '')
      if (!id) return NextResponse.json({ error: 'Λείπει η καμπάνια' }, { status: 400 })
      const deniedArchive = await assertOwnership(id, auth.activeSeat)
      if (deniedArchive) return deniedArchive
      const archived = body?.archived !== false
      // Η αρχειοθέτηση ΔΕΝ αγγίζει τίποτα: κρατά παραλήπτες, μπλοκ και εικόνες.
      // Είναι το «θέλω να φύγει από τα μάτια μου», όχι το «θέλω να χαθεί».
      const res = await strapi(`/oc-campaigns/${id}`, 'PUT', {
        Archived: archived,
        ArchivedAt: archived ? new Date().toISOString() : null,
      })
      if (!res.ok) return NextResponse.json({ error: 'Αποτυχία αρχειοθέτησης' }, { status: 502 })
      return NextResponse.json({ ok: true, archived })
    }

    if (action === 'cancel') {
      const id = String(body?.id || '').replace(/[^a-z0-9]/gi, '')
      if (!id) return NextResponse.json({ error: 'Λείπει η καμπάνια' }, { status: 400 })
      const deniedCancel = await assertOwnership(id, auth.activeSeat)
      if (deniedCancel) return deniedCancel
      // Η ακύρωση σταματά ΜΟΝΟ ό,τι δεν έχει φύγει. Τα σταλμένα δεν
      // ανακαλούνται — και η οθόνη δεν πρέπει να υπονοεί ότι ανακαλούνται.
      const res = await strapi(`/oc-campaigns/${id}`, 'PUT', { State: 'cancelled' })
      if (!res.ok) return NextResponse.json({ error: 'Αποτυχία ακύρωσης' }, { status: 502 })
      return NextResponse.json({ ok: true, state: 'cancelled' })
    }

    /**
     * ΔΟΚΙΜΑΣΤΙΚΗ ΑΠΟΣΤΟΛΗ NEWSLETTER
     *
     * Ο Sender ΔΕΝ έχει endpoint δοκιμής, οπότε η δοκιμή φεύγει από εμάς
     * (Resend) στη θυρίδα αυτού που συνθέτει. Οι ετικέτες του Sender δεν
     * γεμίζουν εκεί, άρα τις γεμίζουμε με δείγματα — αλλιώς ο συντάκτης θα
     * έβλεπε «Γεια σου {{ firstname }}» και δεν θα ήξερε αν είναι λάθος.
     *
     * ΤΙ ΔΕΝ ΔΟΚΙΜΑΖΕΙ: την παράδοση του Sender και τα δικά του link tracking.
     * Δοκιμάζει το γράμμα, όχι τη διαδρομή.
     */
    if (action === 'newsletter-test') {
      const signer = await signerFor(auth.activeSeat)
      const blocks: Block[] = Array.isArray(body?.blocks) ? body.blocks : []
      const tpl = campaignEmailHtml({
        subject: String(body?.subject || '(χωρίς θέμα)'),
        preheader: String(body?.preheader || ''),
        blocks, signer,
        footerStyle: (body?.footerStyle || 'signature') as FooterStyle,
        footerLook: (body?.footerLook || 'plain') as FooterLook,
        footerLogo: !!body?.footerLogo,
        newsletterFooter: nlFooter(body),
        headerStyle: (body?.headerStyle || 'coral') as HeaderStyle,
        headerLogo: !!body?.headerLogo,
        unsubscribe: true,
      })
      const html = fillTagsForTest(applySenderTags(tpl.html)).replace(/\{\{ARCHIVE_URL\}\}/g, '#')
      const sent = await sendOcEmailResult(signer.email, `[ΔΟΚΙΜΗ] ${tpl.subject}`, html, {
        from: `Culture for Change <${signer.email}>`, replyTo: signer.email,
      })
      if (!sent.ok) return NextResponse.json({ error: sent.error || 'Η δοκιμή δεν στάλθηκε' }, { status: 502 })
      return NextResponse.json({
        ok: true, to: signer.email,
        warnings: unsupportedTags(tpl.html),
      })
    }

    /**
     * ΤΕΛΙΚΗ ΔΟΚΙΜΗ — αληθινή καμπάνια Sender σε ομάδα μιας θυρίδας.
     *
     * Ό,τι δεν δοκιμάζει η γρήγορη δοκιμή: παράδοση από τον Sender, ξαναγραμμένοι
     * σύνδεσμοι παρακολούθησης, και ο ΑΛΗΘΙΝΟΣ σύνδεσμος απεγγραφής.
     *
     * Ο τίτλος φέρει «[ΔΟΚΙΜΗ]» ώστε να φιλτράρεται από τα στατιστικά: αλλιώς
     * κάθε δοκιμή θα προσγειωνόταν εκεί ως καμπάνια ενός παραλήπτη με 100%
     * άνοιγμα και θα τραβούσε τους μέσους όρους.
     */
    if (action === 'newsletter-final-test') {
      const group = SEAT_TEST_GROUPS[auth.activeSeat]
      if (!group) {
        return NextResponse.json({
          error: 'Η έδρα σου δεν έχει ομάδα δοκιμών στον Sender',
        }, { status: 400 })
      }
      const signer = await signerFor(auth.activeSeat)
      const blocks: Block[] = Array.isArray(body?.blocks) ? body.blocks : []
      const tpl = campaignEmailHtml({
        subject: String(body?.subject || '(χωρίς θέμα)'),
        preheader: String(body?.preheader || ''), blocks, signer,
        footerStyle: (body?.footerStyle || 'signature') as FooterStyle,
        footerLook: (body?.footerLook || 'plain') as FooterLook,
        footerLogo: !!body?.footerLogo,
        newsletterFooter: nlFooter(body),
        headerStyle: (body?.headerStyle || 'coral') as HeaderStyle,
        headerLogo: !!body?.headerLogo,
        unsubscribe: true,
      })
      const created = await createSenderCampaignRaw({
        subject: `[ΔΟΚΙΜΗ] ${tpl.subject}`,
        html: applySenderTags(tpl.html).replace(/\{\{ARCHIVE_URL\}\}/g, '#'),
        fromName: 'Culture for Change', replyTo: signer.email,
        groups: [group],
        title: `[ΔΟΚΙΜΗ] ${tpl.subject}`,
      })
      if (!created.ok || !created.campaignId) {
        return NextResponse.json({ error: created.error || 'Αποτυχία δοκιμής' }, { status: 502 })
      }
      const fired = await sendSenderCampaign(created.campaignId)
      if (!fired.ok) return NextResponse.json({ error: fired.error }, { status: 502 })

      // Η απεγγραφή είναι μη αναστρέψιμη· αν συνέβη, να το μάθει ΤΩΡΑ
      const status = await seatSubscriberStatus(signer.email)
      return NextResponse.json({
        ok: true, to: signer.email, campaignId: created.campaignId,
        seatStatus: status, warnings: unsupportedTags(tpl.html),
      })
    }

    /**
     * ΠΡΑΓΜΑΤΙΚΗ ΑΠΟΣΤΟΛΗ NEWSLETTER — μέσω Sender.
     *
     * Δύο βήματα στον Sender (δημιουργία → αποστολή), ώστε μια αποτυχία
     * σύνθεσης να σταματά ΠΡΙΝ φύγει γράμμα. Το documentId της καμπάνιας του
     * Sender αποθηκεύεται: χωρίς αυτό δεν μπορούμε ποτέ να δέσουμε τα
     * στατιστικά με το τεύχος.
     */
    if (action === 'newsletter-send') {
      const id = String(body?.id || '').replace(/[^a-z0-9]/gi, '')
      if (id) {
        const denied = await assertOwnership(id, auth.activeSeat)
        if (denied) return denied
      }
      const desk = deskOfRequest(body?.desk, auth.activeSeat)
      if (!canNewsletterFrom(desk)) {
        return NextResponse.json({ error: 'Η μαζική αποστολή γίνεται από την Επικοινωνία ή τη Διαχείριση' }, { status: 403 })
      }
      const blocks: Block[] = Array.isArray(body?.blocks) ? body.blocks : []
      const subject = String(body?.subject || '').trim()
      const audiences = normaliseAudiences(body?.audiences)
      const v = validateNewsletter({ subject, blocks: visibleBlocks(blocks), audiences })
      if (!v.ok) return NextResponse.json({ error: v.errors.join(' · '), errors: v.errors }, { status: 400 })

      const signer = await signerFor(auth.activeSeat)
      const tpl = campaignEmailHtml({
        subject, preheader: String(body?.preheader || ''), blocks, signer,
        footerStyle: (body?.footerStyle || 'signature') as FooterStyle,
        footerLook: (body?.footerLook || 'plain') as FooterLook,
        footerLogo: !!body?.footerLogo,
        newsletterFooter: nlFooter(body),
        headerStyle: (body?.headerStyle || 'coral') as HeaderStyle,
        headerLogo: !!body?.headerLogo,
        unsubscribe: true,
      })
      /**
       * Ο σύνδεσμος «δες το στον browser» δείχνει στο ΔΙΚΟ μας αρχείο, άρα
       * το slug πρέπει να υπάρχει ΠΡΙΝ φτιαχτεί το HTML. Γι' αυτό
       * υπολογίζεται εδώ και χρησιμοποιείται και στην εγγραφή του αρχείου —
       * ίδιο slug, αλλιώς ο σύνδεσμος θα οδηγούσε σε 404.
       */
      const slug = newsletterSlug(tpl.subject)
      // Οι ετικέτες μεταφράζονται, ΔΕΝ αποδίδονται: τις γεμίζει ο Sender
      const html = applySenderTags(tpl.html).replace(/\{\{ARCHIVE_URL\}\}/g, archiveUrlFor(slug))

      const created = await createSenderCampaign({
        subject: tpl.subject, html, audiences,
        fromName: 'Culture for Change', replyTo: signer.email,
        preheader: String(body?.preheader || '') || undefined,
        title: `${tpl.subject} — ${new Date().toLocaleDateString('el-GR')}`,
      })
      if (!created.ok || !created.campaignId) {
        return NextResponse.json({ error: created.error || 'Αποτυχία δημιουργίας' }, { status: 502 })
      }

      const when = String(body?.scheduleAt || '').trim()
      const fired = when
        ? await scheduleSenderCampaign(created.campaignId, when)
        : await sendSenderCampaign(created.campaignId)
      if (!fired.ok) {
        // Η καμπάνια ΥΠΑΡΧΕΙ στον Sender αλλά δεν ξεκίνησε: το λέμε ρητά,
        // ώστε να μην ξαναπατηθεί «Αποστολή» και δημιουργηθεί δεύτερη.
        return NextResponse.json({
          error: `${fired.error} — η καμπάνια υπάρχει στον Sender (${created.campaignId}) και μπορεί να σταλεί από εκεί.`,
          campaignId: created.campaignId,
        }, { status: 502 })
      }

      const name = await authorName(auth)
      const record: Record<string, any> = {
        // ΤΟ ΓΡΑΦΕΙΟ ΠΟΥ ΕΣΤΕΙΛΕ, όχι σταθερά: αλλιώς το τεύχος της Διαχείρισης
        // θα γραφόταν στο αρχείο της Επικοινωνίας και δεν θα το ξανάβρισκε.
        Desk: desk, Kind: 'newsletter', Groups: audiences,
        Subject: tpl.subject, Preheader: String(body?.preheader || '').trim() || null,
        Blocks: blocks, Recipients: [], Selection: {}, Cc: null,
        FooterStyle: String(body?.footerStyle || 'signature'),
        FooterLook: String(body?.footerLook || 'plain'),
        FooterLogo: !!body?.footerLogo,
        Footer: nlFooter(body),
        HeaderStyle: String(body?.headerStyle || 'coral'),
        HeaderLogo: !!body?.headerLogo,
        Signer: signer, SenderCampaignId: created.campaignId,
        State: when ? 'queued' : 'sent',
        QueuedAt: new Date().toISOString(),
        ...(when ? {} : { CompletedAt: new Date().toISOString() }),
      }
      const saved = id
        ? await strapi(`/oc-campaigns/${id}`, 'PUT', record)
        : await strapi('/oc-campaigns', 'POST', { ...record, CreatedByName: name })
      if (!saved.ok) console.error('oc/campaigns: newsletter saved at Sender but not in Strapi', saved.status)

      // Το τεύχος μπαίνει στο δημόσιο αρχείο — best-effort, ΠΟΤΕ δεν ρίχνει
      // την αποστολή που ήδη έφυγε
      let archive: string | null = null
      if (!when) archive = await archiveNewsletter(tpl.subject, html, audiences, slug)

      return NextResponse.json({
        ok: true, campaignId: created.campaignId, scheduled: when || null,
        archived: !!archive, warnings: unsupportedTags(tpl.html),
      })
    }

    return NextResponse.json({ error: 'Μη έγκυρη ενέργεια' }, { status: 400 })
  } catch (err) {
    console.error('oc/campaigns POST failed:', err)
    return NextResponse.json({ error: 'Εσωτερικό σφάλμα' }, { status: 500 })
  }
}

/**
 * Όλες οι καμπάνιες, σε σελίδες — ΟΧΙ με μεγάλο `limit`.
 *
 * Το Strapi ΚΟΒΕΙ σιωπηλά στις 100 όσο μεγάλο κι αν είναι το `pagination[limit]`.
 * Στη διαγραφή αυτό δεν ήταν απλώς ελλιπής ανάγνωση: ο έλεγχος «την κρατά
 * άλλη καμπάνια;» θα έβγαζε ΟΧΙ για εικόνες που κρατούσε η 101η, και η εικόνα
 * θα σβηνόταν ενώ κάποιο άλλο γράμμα τη δείχνει. Με τέσσερις καμπάνιες δεν
 * φαινόταν· θα χτυπούσε σιωπηλά μόλις περνούσαμε τις 100.
 *
 * Επιστρέφει `null` αν ΟΠΟΙΑΔΗΠΟΤΕ σελίδα αποτύχει: μερική γνώση εδώ είναι
 * χειρότερη από άγνοια, γιατί οδηγεί σε διαγραφή.
 */
async function allCampaignBlocks(): Promise<Array<{ documentId: string; Blocks: any }> | null> {
  const out: Array<{ documentId: string; Blocks: any }> = []
  for (let page = 1; page <= 50; page++) {
    const r = await strapi(
      `/oc-campaigns?pagination[page]=${page}&pagination[pageSize]=100&fields[0]=Blocks`)
    if (!r.ok) return null
    const rows = r.json?.data
    // Μη-πίνακας σημαίνει «δεν ξέρω τι γυρίζει το Strapi». Επιστρέφουμε null
    // ώστε ο καλών να ΜΗ σβήσει, αντί να σκάσει σε spread μη-επαναληπτικού.
    if (!Array.isArray(rows)) return null
    out.push(...rows)
    const pc = r.json?.meta?.pagination?.pageCount
    if (!pc || page >= pc) return out
  }
  return out
}

/** Τα mediaId που κρατά μια καμπάνια — και τα πρωτότυπα πίσω από τα σημασμένα */
function mediaIdsOf(blocks: any): number[] {
  const ids = new Set<number>()
  const walk = (v: any) => {
    if (Array.isArray(v)) { v.forEach(walk); return }
    if (v && typeof v === 'object') {
      for (const [k, val] of Object.entries(v)) {
        if ((k === 'mediaId' || k === 'origMediaId') && Number.isInteger(val)) ids.add(val as number)
        else walk(val)
      }
    }
  }
  walk(blocks)
  return [...ids]
}

export async function DELETE(request: NextRequest) {
  const auth = await authorize()
  if ('error' in auth) return auth.error
  const id = String(request.nextUrl.searchParams.get('id') || '').replace(/[^a-z0-9]/gi, '')
  if (!id) return NextResponse.json({ error: 'Λείπει η καμπάνια' }, { status: 400 })

  try {
    let cur = await strapi(`/oc-campaigns/${id}?fields[0]=State&fields[1]=Blocks&fields[2]=Subject&fields[3]=Signer&fields[4]=Desk`)
    if (!cur.ok) cur = await strapi(`/oc-campaigns/${id}?fields[0]=State&fields[1]=Blocks&fields[2]=Subject&fields[3]=Signer`)
    const row = cur.json?.data
    if (!row) return NextResponse.json({ error: 'Η καμπάνια δεν βρέθηκε' }, { status: 404 })
    if (!campaignInReach(row, auth.activeSeat)) {
      return NextResponse.json({ error: 'Το μήνυμα ανήκει σε άλλο γραφείο' }, { status: 403 })
    }
    if (row.State === 'sending') {
      // Στη μέση της αποστολής η διαγραφή θα άφηνε μισούς παραλήπτες με
      // γράμμα και κανένα αρχείο για το ποιοι ήταν.
      return NextResponse.json({ error: 'Η αποστολή είναι σε εξέλιξη — ακύρωσέ την πρώτα' }, { status: 409 })
    }

    // Οι εικόνες φεύγουν ΜΟΝΟ αν δεν τις κρατά άλλη καμπάνια
    const mine = mediaIdsOf(row.Blocks)
    const others = await allCampaignBlocks()
    const usedElsewhere = new Set<number>()
    if (others) {
      for (const c of others) {
        if (c.documentId === id) continue
        for (const m of mediaIdsOf(c.Blocks)) usedElsewhere.add(m)
      }
    } else {
      // Δεν ξέρουμε τι χρησιμοποιεί ποιος → δεν σβήνουμε καμία εικόνα
      mine.forEach(m => usedElsewhere.add(m))
    }

    const deleted: number[] = []
    const kept: number[] = []
    for (const m of mine) {
      if (usedElsewhere.has(m)) { kept.push(m); continue }
      const d = await fetch(`${STRAPI_URL}/api/upload/files/${m}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
      }).catch(() => null)
      if (d?.ok || d?.status === 404) deleted.push(m)
      else kept.push(m)
    }

    const res = await strapi(`/oc-campaigns/${id}`, 'DELETE')
    if (!res.ok) return NextResponse.json({ error: 'Αποτυχία διαγραφής' }, { status: 502 })
    return NextResponse.json({ ok: true, imagesDeleted: deleted.length, imagesKept: kept.length })
  } catch (err) {
    console.error('oc/campaigns DELETE failed:', err)
    return NextResponse.json({ error: 'Εσωτερικό σφάλμα' }, { status: 500 })
  }
}

/** Η κατάσταση μιας θυρίδας στον Sender — για τον έλεγχο μετά την τελική δοκιμή */
async function seatSubscriberStatus(email: string): Promise<string | null> {
  const key = process.env.SENDER_API_KEY
  if (!key) return null
  try {
    const r = await fetch(`https://api.sender.net/v2/subscribers/${encodeURIComponent(email)}`, {
      headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' }, cache: 'no-store',
    })
    if (!r.ok) return null
    const d = (await r.json())?.data || {}
    return String(d.status?.email || d.status || '') || null
  } catch { return null }
}

/**
 * Το τεύχος μπαίνει στο δημόσιο αρχείο newsletter.
 *
 * Κρατάμε το ΙΔΙΟ το γράμμα (Html), όχι σύνδεσμο Drive: το αρχείο ανοίγει
 * στη σελίδα μας, δεν εξαρτάται από τον λογαριασμό Google κανενός, και δεν
 * σπάει αν κάποιος μετακινήσει ένα αρχείο.
 *
 * BEST-EFFORT: το γράμμα έχει ΗΔΗ φύγει όταν τρέχει αυτό. Μια αποτυχία εδώ
 * δεν επιτρέπεται να εμφανιστεί ως αποτυχία αποστολής — θα οδηγούσε σε
 * δεύτερη αποστολή στους ίδιους ανθρώπους.
 */
function newsletterSlug(subject: string): string {
  const base = subject.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zα-ω0-9]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 60)
  return `${base || 'newsletter'}-${Date.now().toString(36)}`
}

/** Η διεύθυνση του τεύχους στο δικό μας αρχείο */
function archiveUrlFor(slug: string): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://cultureforchange.net'
  return `${site.replace(/\/$/, '')}/newsletters/${slug}`
}

async function archiveNewsletter(
  subject: string, html: string, audiences: string[], slug: string,
): Promise<string | null> {
  try {
    const today = new Date()
    const r = await strapi('/newsletters', 'POST', {
      Title: subject,
      Date: today.toISOString().slice(0, 10),
      Html: html,
      // Ένα τεύχος που πήγε ΜΟΝΟ στα μέλη δεν είναι δημόσιο υλικό
      Audience: audiences.length === 1 && audiences[0] === 'paid' ? 'members' : 'public',
      Slug: slug,
      publishedAt: today.toISOString(),
    })
    if (!r.ok) { console.error('newsletter archive failed', r.status); return null }
    return r.json?.data?.documentId || null
  } catch (err) {
    console.error('newsletter archive threw:', err)
    return null
  }
}

/** Το όνομα του μέλους για τη σφραγίδα «ποιος συνέθεσε» */
async function memberName(memberId: string): Promise<string> {
  const r = await strapi(`/members/${memberId}?fields[0]=Name`)
  return String(r.json?.data?.Name || '').trim() || `member:${memberId}`
}
