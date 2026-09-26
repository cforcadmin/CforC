import { NextRequest, NextResponse } from 'next/server'
import { sendOcEmailResult } from '@/lib/ocEmails'
import { campaignEmailHtml, applyMergeFields, type Block, type FooterStyle, type FooterLook, type HeaderStyle, type CampaignSigner } from '@/lib/campaignBlocks'
import { DAILY_EMAIL_BUDGET, firstNameOf, type QueuedRecipient } from '@/lib/campaignRecipients'

// Στέλνει έως 80 email με σύγχρονη εγγραφή μετά από κάθε ένα — χρειάζεται χρόνο
export const maxDuration = 300

/**
 * Η ουρά της μαζικής αποστολής, μία παρτίδα την ημέρα.
 *
 * Ο πάροχος επιτρέπει 100 transactional email/ημέρα. Κρατάμε 20 για τα
 * αυτόματα (αποδείξεις, εγκρίσεις, υπενθυμίσεις) και στραγγίζουμε τα υπόλοιπα
 * 80 από τις καμπάνιες σε ουρά, παλαιότερη πρώτα.
 *
 * ΓΙΑΤΙ ΓΡΑΦΟΥΜΕ ΜΕΤΑ ΑΠΟ ΚΑΘΕ ΕΝΑ EMAIL
 * Η αποστολή δεν ανακαλείται. Αν στέλναμε σαράντα και γράφαμε στο τέλος, ένα
 * timeout θα άφηνε τη βάση να νομίζει ότι δεν στάλθηκε κανένα — και η επόμενη
 * νύχτα θα τα ξανάστελνε στους ίδιους ανθρώπους. Η εγγραφή ανά παραλήπτη
 * κοστίζει χρόνο και τον πληρώνουμε.
 *
 * Κάθε CC μετράει ΞΕΧΩΡΙΣΤΑ στο όριο: ένα μήνυμα με 3 CC κοστίζει 4.
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN
const CRON_SECRET = process.env.CRON_SECRET

/** Αφήνουμε περιθώριο να ολοκληρωθεί η τελευταία εγγραφή πριν μας κόψει η πλατφόρμα */
const TIME_BUDGET_MS = 240_000
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

export async function GET(request: NextRequest) {
  // Το `!CRON_SECRET` ΔΕΝ είναι περιττό: χωρίς τη μεταβλητή η σύγκριση γίνεται
  // με «Bearer undefined» και περνά όποιος το στείλει.
  if (!CRON_SECRET || request.headers.get('authorization') !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!STRAPI_URL || !STRAPI_API_TOKEN) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  const startedAt = Date.now()
  let budget = DAILY_EMAIL_BUDGET
  const report: string[] = []

  try {
    const list = await strapi(
      '/oc-campaigns?filters[State][$in][0]=queued&filters[State][$in][1]=sending' +
      '&sort=QueuedAt:asc&pagination[limit]=20',
    )
    if (!list.ok) return NextResponse.json({ error: `strapi ${list.status}` }, { status: 502 })
    const campaigns: CampaignRow[] = list.json?.data || []
    if (campaigns.length === 0) {
      return NextResponse.json({ success: true, drained: 0, note: 'καμία καμπάνια σε ουρά' })
    }

    let sentTotal = 0

    for (const c of campaigns) {
      if (budget <= 0 || Date.now() - startedAt > TIME_BUDGET_MS) break

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
        if (Date.now() - startedAt > TIME_BUDGET_MS) { report.push(`${c.Subject}: εξαντλήθηκε ο χρόνος`); break }

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

        // Εγγραφή ΜΕΤΑ ΑΠΟ ΚΑΘΕ ΕΝΑ: βλ. σχόλιο στην κορυφή
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
        report.push(`${c.Subject}: ολοκληρώθηκε (${sentHere} σήμερα)`)
      } else {
        report.push(`${c.Subject}: ${sentHere} σήμερα, απομένουν ${remaining}`)
      }
    }

    console.log(`[CAMPAIGN-DRAIN] ${sentTotal} email · ${report.join(' | ')}`)
    return NextResponse.json({
      success: true,
      sent: sentTotal,
      budgetLeft: budget,
      seconds: Math.round((Date.now() - startedAt) / 1000),
      report,
    })
  } catch (err) {
    console.error('[CAMPAIGN-DRAIN] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
