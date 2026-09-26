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

/** Ξαναδοκιμάζουμε μόνο όσους απέτυχαν λιγότερες από MAX_ATTEMPTS φορές */
const isPending = (r: QueuedRecipient) =>
  r.status === 'pending' || (r.status === 'failed' && (r.attempts || 0) < MAX_ATTEMPTS)


/** Ξαναδοκιμάζουμε μόνο όσους απέτυχαν λιγότερες από MAX_ATTEMPTS φορές */

export interface DrainResult { sent: number; budgetLeft: number; report: string[] }

export async function drainCampaigns(opts: {
  budget?: number
  timeBudgetMs?: number
  /** Μόνο αυτή η καμπάνια — για την άμεση αποστολή από το OC */
  onlyId?: string
} = {}): Promise<DrainResult> {
  const startedAt = Date.now()
  let budget = opts.budget ?? DAILY_EMAIL_BUDGET
  const timeBudget = opts.timeBudgetMs ?? 240_000
  const report: string[] = []
  let sentTotal = 0

  const list = await strapi(
    '/oc-campaigns?filters[State][$in][0]=queued&filters[State][$in][1]=sending' +
    '&sort=QueuedAt:asc&pagination[limit]=20',
  )
  if (!list.ok) return { sent: 0, budgetLeft: budget, report: ['αποτυχία ανάγνωσης ουράς'] }

  let campaigns: CampaignRow[] = list.json?.data || []
  if (opts.onlyId) campaigns = campaigns.filter(c => c.documentId === opts.onlyId)

  for (const c of campaigns) {
    if (budget <= 0 || Date.now() - startedAt > timeBudget) break

    const recipients: QueuedRecipient[] = Array.isArray(c.Recipients) ? c.Recipients : []
    const cc = Array.isArray(c.Cc) ? c.Cc.filter(Boolean) : []
    const costPer = 1 + cc.length
    const signer: CampaignSigner = c.Signer && typeof c.Signer === 'object'
      ? c.Signer
      : { name: 'Culture for Change', role: 'Γραμματεία', email: 'hello@cultureforchange.net' }

    if (c.State !== 'sending') await strapi(`/oc-campaigns/${c.documentId}`, 'PUT', { State: 'sending' })

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
