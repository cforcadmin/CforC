import { campaignEmailHtml } from '@/lib/campaignBlocks'
import { sendOcEmailResult, COMMUNITY_FROM, UNSUBSCRIBE_CC } from '@/lib/ocEmails'

/**
 * Συγχρονισμός απεγγραφών: ο Sender είναι η ΠΗΓΗ ΑΛΗΘΕΙΑΣ.
 *
 * Όποιος πατήσει «απεγγραφή» το κάνει στον Sender — εμείς δεν το μαθαίνουμε
 * ποτέ μόνοι μας. Χωρίς αυτόν τον συγχρονισμό το Strapi κρατά ανθρώπους που
 * έχουν ζητήσει να φύγουν (στις 27/9/2026 βρέθηκαν εννέα, ο ένας είχε
 * δηλώσει το γράμμα ως spam).
 *
 * ΔΙΑΒΑΖΟΥΜΕ ΚΑΙ ΤΙΣ ΔΥΟ ΟΜΑΔΕΣ. Το παλιό script κοίταζε μόνο το External —
 * και επειδή τα μέλη ζουν στο Paid, τα έβλεπε όλα ως «απεγγεγραμμένα». Αν
 * είχε τρέξει, θα έσβηνε και τα 113 μέλη από τους συνδρομητές και θα τους
 * έστελνε αποχαιρετιστήριο. Γι' αυτό υπάρχει και το φρένο παρακάτω.
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN
const SENDER_API_KEY = process.env.SENDER_API_KEY
const SENDER_EXTERNAL = process.env.SENDER_GROUP_ID
const SENDER_PAID = process.env.SENDER_PAID_GROUP_ID

/**
 * Πάνω από τόσες διαγραφές σε μία εκτέλεση, σταματάμε και αναφέρουμε.
 *
 * Μια φυσιολογική μηνιαία απώλεια είναι λίγες μονάδες. Δεκάδες σημαίνει ότι
 * κάτι έσπασε — λάθος ομάδα, άδεια απάντηση, αλλαγή στο API — και τότε η
 * σωστή κίνηση είναι να ΜΗ σβήσουμε τίποτα.
 *
 * Το όριο πιάνει ΚΑΙ το κόστος: με τρεις κοινοποιήσεις, κάθε αποχαιρετιστήριο
 * μετράει τέσσερα email στο Resend — 25 απεγγραφές = 100, δηλαδή ολόκληρο το
 * ημερήσιο όριο.
 */
export const DELETE_CAP = 25

/**
 * Περίοδος χάριτος για ΝΕΟΥΣ συνδρομητές.
 *
 * Αν η καταχώρηση στον Sender απέτυχε τη στιγμή της εγγραφής, ο άνθρωπος
 * υπάρχει στο Strapi και λείπει από τον Sender — ακριβώς το σχήμα της
 * απεγγραφής. Χωρίς αυτό το φίλτρο θα τον σβήναμε και θα του στέλναμε
 * αποχαιρετιστήριο για κάτι που ΔΕΝ ζήτησε. Επτά ημέρες δίνουν χρόνο να το
 * δει το γραφείο από την προειδοποίηση της ειδοποίησης εγγραφής.
 */
export const GRACE_DAYS = 7

const norm = (e: unknown) => String(e || '').trim().toLowerCase()

export interface UnsubSyncResult {
  ok: boolean
  senderCount: number
  strapiCount: number
  candidates: string[]
  deleted: string[]
  emailed: string[]
  failed: string[]
  stopped?: string
}

async function senderGroup(id: string): Promise<string[]> {
  const out: string[] = []
  for (let page = 1; page < 60; page++) {
    const res = await fetch(`https://api.sender.net/v2/groups/${id}/subscribers?limit=100&page=${page}`, {
      headers: { Authorization: `Bearer ${SENDER_API_KEY}`, Accept: 'application/json' },
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`Sender ${id}: HTTP ${res.status}`)
    const rows = (await res.json())?.data || []
    for (const s of rows) if (s?.email) out.push(norm(s.email))
    if (rows.length < 100) break
  }
  return out
}

interface StrapiSub { documentId: string; Email: string; FirstName?: string | null; ConfirmedAt?: string | null }

async function strapiSubscribers(): Promise<StrapiSub[]> {
  const out: StrapiSub[] = []
  for (let start = 0; ; start += 100) {
    const res = await fetch(
      `${STRAPI_URL}/api/newsletter-subscribers?fields[0]=Email&fields[1]=FirstName&fields[2]=ConfirmedAt` +
      `&pagination[start]=${start}&pagination[limit]=100`,
      { headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` }, cache: 'no-store' },
    )
    if (!res.ok) throw new Error(`Strapi subscribers: HTTP ${res.status}`)
    const rows = (await res.json())?.data || []
    out.push(...rows)
    if (rows.length < 100) break
  }
  return out
}

/**
 * Το αποχαιρετιστήριο, με την ΤΑΥΤΟΤΗΤΑ του δικτύου.
 *
 * Ήταν γραμμένο στο χέρι μέσα στο script, με λάθος κοραλί (#FF6B4A αντί για
 * #FF8B6A) και δικές του γραμματοσειρές. Τώρα βγαίνει από τα ίδια μπλοκ που
 * φτιάχνουν κάθε άλλο γράμμα, οπότε αλλάζει μαζί τους.
 */
export function farewellEmail(firstName?: string | null): { subject: string; html: string; text: string } {
  const name = String(firstName || '').trim()
  const greeting = name ? `Γεια σου ${name},` : 'Γεια σου,'
  return campaignEmailHtml({
    subject: 'Η απεγγραφή σου ολοκληρώθηκε',
    preheader: 'Σε διαγράψαμε από τη λίστα. Αν άλλαξες γνώμη, η πόρτα είναι ανοιχτή.',
    headerStyle: 'coral',
    headerLogo: true,
    footerStyle: 'organisation',
    footerLook: 'cream',
    footerLogo: true,
    blocks: [
      { type: 'text', html: `<p>${greeting}</p><p>Η απεγγραφή σου από τη λίστα αλληλογραφίας μας ολοκληρώθηκε. Δεν θα λαμβάνεις άλλα newsletter από εμάς.</p>` },
      { type: 'box', tone: 'cream', title: 'Θα μας βοηθούσε πολύ', html: '<p>Αν θέλεις, απάντησε σε αυτό το μήνυμα με δυο λόγια για τον λόγο που αποχώρησες. Το διαβάζουμε και μας βοηθά να γίνουμε καλύτεροι.</p>' },
      { type: 'text', html: '<p>Αν αλλάξεις γνώμη, μπορείς να εγγραφείς ξανά όποτε θέλεις από το <a href="https://www.cultureforchange.net">cultureforchange.net</a>.</p>' },
    ] as any,
    signer: { name: 'Culture for Change', role: 'Κοινότητα', email: 'community@cultureforchange.net' },
  })
}

export async function syncUnsubscribes(opts: { dryRun?: boolean; cap?: number } = {}): Promise<UnsubSyncResult> {
  const cap = opts.cap ?? DELETE_CAP
  if (!STRAPI_URL || !STRAPI_API_TOKEN || !SENDER_API_KEY || !SENDER_EXTERNAL || !SENDER_PAID) {
    return { ok: false, senderCount: 0, strapiCount: 0, candidates: [], deleted: [], emailed: [], failed: [], stopped: 'λείπουν μεταβλητές περιβάλλοντος' }
  }

  // ΚΑΙ οι δύο ομάδες: τα μέλη ζουν στο Paid, το κοινό στο External
  const [ext, paid] = await Promise.all([senderGroup(SENDER_EXTERNAL), senderGroup(SENDER_PAID)])
  const live = new Set([...ext, ...paid])

  // Άδεια απάντηση = κάτι έσπασε. ΔΕΝ σβήνουμε ολόκληρη τη λίστα.
  if (live.size === 0) {
    return { ok: false, senderCount: 0, strapiCount: 0, candidates: [], deleted: [], emailed: [], failed: [], stopped: 'ο Sender γύρισε κενή λίστα' }
  }

  const subs = await strapiSubscribers()
  const graceFrom = Date.now() - GRACE_DAYS * 24 * 60 * 60 * 1000
  const isNew = (s: StrapiSub) => {
    const t = Date.parse(String(s.ConfirmedAt || ''))
    return Number.isFinite(t) && t > graceFrom
  }
  const gone = subs.filter(s => !live.has(norm(s.Email)) && !isNew(s))
  const candidates = gone.map(s => s.Email)

  const result: UnsubSyncResult = {
    ok: true, senderCount: live.size, strapiCount: subs.length,
    candidates, deleted: [], emailed: [], failed: [],
  }

  if (gone.length > cap) {
    result.ok = false
    result.stopped = `${gone.length} διαγραφές ξεπερνούν το όριο ασφαλείας (${cap}) — δεν έγινε τίποτα`
    return result
  }
  if (opts.dryRun) return result

  for (const s of gone) {
    const del = await fetch(`${STRAPI_URL}/api/newsletter-subscribers/${s.documentId}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
    }).catch(() => null)
    if (!del || (!del.ok && del.status !== 204)) { result.failed.push(s.Email); continue }
    result.deleted.push(s.Email)

    const tpl = farewellEmail(s.FirstName)
    const sent = await sendOcEmailResult(s.Email, tpl.subject, tpl.html, {
      from: COMMUNITY_FROM, replyTo: 'community@cultureforchange.net',
      cc: UNSUBSCRIBE_CC,
    })
    if (sent.ok) result.emailed.push(s.Email)
  }
  return result
}
