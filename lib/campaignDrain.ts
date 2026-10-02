import { sendOcEmailResult } from '@/lib/ocEmails'
import { campaignEmailHtml, applyMergeFields, type Block, type FooterStyle, type FooterLook, type HeaderStyle, type CampaignSigner } from '@/lib/campaignBlocks'
import { DAILY_EMAIL_BUDGET, firstNameOf, type QueuedRecipient } from '@/lib/campaignRecipients'

/**
 * Η στράγγιση της ουράς — ΜΙΑ υλοποίηση, δύο καλούντες.
 *
 * Το cron τη φωνάζει κάθε πρωί με όλο το ημερήσιο όριο· η διαδρομή του OC τη
 * φωνάζει αμέσως μετά το «Αποστολή», ώστε μια μικρή αποστολή να φεύγει τώρα
 * αντί να περιμένει τις 08:00. Κοινή λογική μέσω import, ΟΧΙ μέσω δικτύου:
 * ένα route που καλεί άλλο route είναι ο δρόμος για μπερδεμένες απαντήσεις
 * και timeouts (βλ. το μάθημα του Αυγούστου με το Apps Script στη μέση).
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

/** Πόσες φορές ξαναδοκιμάζουμε έναν παραλήπτη που απέτυχε, σε επόμενες νύχτες */
const MAX_ATTEMPTS = 3

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

interface CampaignRow {
  documentId: string
  Subject: string
  Preheader?: string | null
  Blocks: Block[]
  Recipients: QueuedRecipient[]
  Cc?: string[] | null
  State: string
  /** Πότε ΕΠΙΤΡΕΠΕΤΑΙ να φύγει — στο μέλλον όταν είναι προγραμματισμένη */
  QueuedAt?: string | null
  SentCount?: number
  FailedCount?: number
  TotalCount?: number
  FooterStyle?: FooterStyle
  FooterLook?: FooterLook
  FooterLogo?: boolean
  HeaderStyle?: HeaderStyle
  HeaderLogo?: boolean
  Signer?: CampaignSigner | null
}

/**
 * Τα συνημμένα, κατεβασμένα ΜΙΑ φορά ανά καμπάνια.
 *
 * Μέσα στον βρόχο των παραληπτών θα κατέβαιναν ξανά για τον καθένα: 5 MB επί
 * 300 μέλη είναι 1,5 GB κίνησης για ένα αρχείο — και 300 ευκαιρίες να
 * αποτύχει κάτι που είχε ήδη πετύχει.
 *
 * Το όριο του Resend είναι 40 MB ΜΕΤΑ την κωδικοποίηση Base64, που φουσκώνει
 * τα bytes κατά ~4/3. Κόβουμε στα 28 MB ωμά (~37,3 MB κωδικοποιημένα) και
 * αφήνουμε περιθώριο για το ίδιο το γράμμα.
 */
const ATTACH_RAW_LIMIT = 28 * 1024 * 1024

async function collectAttachments(blocks: Block[]): Promise<{
  files: Array<{ filename: string; content: string }>
  skipped: string[]
}> {
  const items = (blocks || [])
    .filter((b): b is Extract<Block, { type: 'attachment' }> => b?.type === 'attachment' && !b.hidden)
    .flatMap(b => b.items || [])
    .filter(it => it?.url && it?.name)
  const files: Array<{ filename: string; content: string }> = []
  const skipped: string[] = []
  let total = 0
  for (const it of items) {
    if (total + (Number(it.size) || 0) > ATTACH_RAW_LIMIT) { skipped.push(it.name); continue }
    try {
      const res = await fetch(it.url, { cache: 'no-store' })
      if (!res.ok) { skipped.push(it.name); continue }
      const buf = Buffer.from(await res.arrayBuffer())
      total += buf.byteLength
      if (total > ATTACH_RAW_LIMIT) { skipped.push(it.name); continue }
      files.push({ filename: it.name, content: buf.toString('base64') })
    } catch { skipped.push(it.name) }
  }
  return { files, skipped }
}

/** Ξαναδοκιμάζουμε μόνο όσους απέτυχαν λιγότερες από MAX_ATTEMPTS φορές */
const isPending = (r: QueuedRecipient) =>
  r.status === 'pending' || (r.status === 'failed' && (r.attempts || 0) < MAX_ATTEMPTS)


/** Ξαναδοκιμάζουμε μόνο όσους απέτυχαν λιγότερες από MAX_ATTEMPTS φορές */

/**
 * Πόσα email έχουν ΗΔΗ φύγει σήμερα.
 *
 * Το όριο του Resend είναι ΗΜΕΡΗΣΙΟ, όχι ανά εκτέλεση. Με ένα πέρασμα την
 * ημέρα τα δύο ταυτίζονται κατά τύχη — και η ταύτιση σπάει με το πρώτο
 * επιπλέον πέρασμα: το cron της παραγωγής, η άμεση στράγγιση μετά το
 * «Αποστολή», ή ένας εξωτερικός χρονοδιακόπτης. Τότε ένα φρέσκο όριο σε κάθε
 * πέρασμα δίνει πολλαπλάσια email από όσα επιτρέπει η ημέρα.
 *
 * (27/9/26: το cron ΔΕΝ μπορεί να γίνει ωριαίο σε πλάνο Hobby της Vercel —
 * μια πιο συχνή έκφραση ΡΙΧΝΕΙ το deployment. Η μέτρηση μένει γιατί είναι
 * σωστή έτσι κι αλλιώς: η άμεση στράγγιση είναι ήδη δεύτερο πέρασμα.)
 *
 * Μετράει από τις εγγραφές των ίδιων των παραληπτών (`sentAt`), που είναι η
 * μόνη αλήθεια για το τι όντως στάλθηκε — όχι από μετρητές που μπορεί να
 * έχουν μείνει πίσω.
 */
async function spentToday(): Promise<number | null> {
  // Τοπική ώρα του server = UTC στο Vercel· το ίδιο όριο μετρά και ο πάροχος
  const since = new Date(); since.setHours(0, 0, 0, 0)
  const iso = since.toISOString()
  let r = await strapi(
    `/oc-campaigns?filters[LastRunAt][$gte]=${encodeURIComponent(iso)}&pagination[limit]=50`,
  )
  // Αν το φίλτρο δεν γίνει δεκτό, μετράμε από τις πιο πρόσφατες — ακριβότερο
  // αλλά σωστό· το φιλτράρισμα ανά ημέρα γίνεται έτσι κι αλλιώς παρακάτω.
  if (!r.ok) r = await strapi('/oc-campaigns?sort=updatedAt:desc&pagination[limit]=50')
  // ΔΕΝ επιστρέφουμε 0: το μηδέν σημαίνει «όλο το όριο ελεύθερο» και θα
  // μετέτρεπε ένα προσωρινό σφάλμα ανάγνωσης σε υπέρβαση ορίου.
  if (!r.ok) return null

  let spent = 0
  for (const c of (r.json?.data || []) as CampaignRow[]) {
    const per = 1 + (Array.isArray(c.Cc) ? c.Cc.filter(Boolean).length : 0)
    for (const x of (Array.isArray(c.Recipients) ? c.Recipients : [])) {
      if (x.status === 'sent' && x.sentAt && x.sentAt >= iso) spent += per
    }
  }
  return spent
}

export interface DrainResult { sent: number; budgetLeft: number; report: string[] }

export async function drainCampaigns(opts: {
  budget?: number
  timeBudgetMs?: number
  /** Μόνο αυτή η καμπάνια — για την άμεση αποστολή από το OC */
  onlyId?: string
} = {}): Promise<DrainResult> {
  const startedAt = Date.now()
  const timeBudget = opts.timeBudgetMs ?? 240_000
  const report: string[] = []
  let sentTotal = 0

  let budget: number
  if (opts.budget != null) {
    budget = opts.budget
  } else {
    const spent = await spentToday()
    if (spent === null) {
      // Δεν ξέρουμε πόσα έχουν φύγει → δεν στέλνουμε. Το κόστος είναι μια
      // καθυστερημένη παρτίδα· το αντίθετο κόστος θα ήταν μπλοκαρισμένος
      // λογαριασμός και μηνύματα που δεν φτάνουν πουθενά.
      return { sent: 0, budgetLeft: 0, report: ['δεν μετρήθηκε το σημερινό όριο — παράλειψη'] }
    }
    budget = Math.max(0, DAILY_EMAIL_BUDGET - spent)
    if (budget <= 0) return { sent: 0, budgetLeft: 0, report: [`το σημερινό όριο εξαντλήθηκε (${spent})`] }
  }

  const list = await strapi(
    '/oc-campaigns?filters[State][$in][0]=queued&filters[State][$in][1]=sending' +
    '&sort=QueuedAt:asc&pagination[limit]=20',
  )
  if (!list.ok) return { sent: 0, budgetLeft: budget, report: ['αποτυχία ανάγνωσης ουράς'] }

  let campaigns: CampaignRow[] = list.json?.data || []
  if (opts.onlyId) campaigns = campaigns.filter(c => c.documentId === opts.onlyId)

  for (const c of campaigns) {
    if (budget <= 0 || Date.now() - startedAt > timeBudget) break

    /**
     * Προγραμματισμένη για αργότερα.
     *
     * Το QueuedAt είναι η ΩΡΑ ΑΔΕΙΑΣ, όχι η ώρα που πατήθηκε το κουμπί. Μια
     * καμπάνια που έχει ήδη αρχίσει («sending») δεν σταματά ποτέ εδώ: τα
     * μισά γράμματα έχουν φύγει και τα υπόλοιπα πρέπει να ακολουθήσουν.
     */
    if (c.State === 'queued' && c.QueuedAt && Date.parse(c.QueuedAt) > Date.now()) {
      report.push(`${c.Subject}: προγραμματισμένη για αργότερα`)
      continue
    }

    const recipients: QueuedRecipient[] = Array.isArray(c.Recipients) ? c.Recipients : []
    const cc = Array.isArray(c.Cc) ? c.Cc.filter(Boolean) : []
    const costPer = 1 + cc.length
    const signer: CampaignSigner = c.Signer && typeof c.Signer === 'object'
      ? c.Signer
      : { name: 'Culture for Change', role: 'Γραμματεία', email: 'hello@cultureforchange.net' }

    if (c.State !== 'sending') await strapi(`/oc-campaigns/${c.documentId}`, 'PUT', { State: 'sending' })

    // ΠΡΙΝ τον βρόχο: τα ίδια bytes για όλους τους παραλήπτες
    const { files: attachments, skipped } = await collectAttachments(Array.isArray(c.Blocks) ? c.Blocks : [])
    if (skipped.length) {
      // Δεν σταματά την αποστολή: ο σύνδεσμος λήψης είναι μέσα στο γράμμα και
      // παραμένει ο δρόμος προς το αρχείο. Αλλά ΛΕΓΕΤΑΙ στην αναφορά.
      report.push(`${c.Subject}: δεν επισυνάφθηκαν — ${skipped.join(', ')}`)
    }

    let sentHere = 0
    for (let i = 0; i < recipients.length; i++) {
      const r = recipients[i]
      if (!isPending(r)) continue
      if (budget < costPer) { report.push(`${c.Subject}: εξαντλήθηκε το όριο`); break }
      if (Date.now() - startedAt > timeBudget) { report.push(`${c.Subject}: εξαντλήθηκε ο χρόνος`); break }

      // Τα πεδία λύνονται ΑΝΑ ΠΑΡΑΛΗΠΤΗ — εδώ γίνεται το «Αγαπητή Μαρία»
      const values: Record<string, string> = {
        'όνομα': firstNameOf(r.name) || r.name || '',
        'επώνυμο': String(r.name || '').split(/\s+/).slice(1).join(' '),
        'ΑΜ': r.am != null ? String(r.am) : '',
        'έτος': String(new Date().getFullYear()),
      }
      const tpl = campaignEmailHtml({
        subject: applyMergeFields(c.Subject || '', values),
        preheader: c.Preheader || undefined,
        blocks: Array.isArray(c.Blocks) ? c.Blocks : [],
        signer,
        footerStyle: c.FooterStyle, footerLook: c.FooterLook, footerLogo: !!c.FooterLogo,
        headerStyle: c.HeaderStyle, headerLogo: !!c.HeaderLogo,
      })

      const res = await sendOcEmailResult(r.email, tpl.subject, applyMergeFields(tpl.html, values), {
        from: `Culture for Change <${signer.email}>`,
        replyTo: signer.email,
        ...(cc.length && { cc }),
        ...(attachments.length && { attachments }),
      })

      recipients[i] = res.ok
        ? { ...r, status: 'sent', sentAt: new Date().toISOString(), attempts: (r.attempts || 0) + 1, error: undefined }
        : { ...r, status: 'failed', attempts: (r.attempts || 0) + 1, error: res.error || 'άγνωστο σφάλμα' }

      if (res.ok) { budget -= costPer; sentHere++; sentTotal++ }

      // Εγγραφή ΜΕΤΑ ΑΠΟ ΚΑΘΕ ΕΝΑ: ένα timeout δεν πρέπει να ξαναστείλει
      const sent = recipients.filter(x => x.status === 'sent').length
      const failed = recipients.filter(x => x.status === 'failed').length
      await strapi(`/oc-campaigns/${c.documentId}`, 'PUT', {
        Recipients: recipients, SentCount: sent, FailedCount: failed,
        LastRunAt: new Date().toISOString(),
      })
    }

    const remaining = recipients.filter(isPending).length
    if (remaining === 0) {
      await strapi(`/oc-campaigns/${c.documentId}`, 'PUT', {
        State: 'sent', CompletedAt: new Date().toISOString(),
      })
      report.push(`${c.Subject}: ολοκληρώθηκε (${sentHere})`)
    } else {
      report.push(`${c.Subject}: ${sentHere} τώρα, απομένουν ${remaining}`)
    }
  }

  return { sent: sentTotal, budgetLeft: budget, report }
}
