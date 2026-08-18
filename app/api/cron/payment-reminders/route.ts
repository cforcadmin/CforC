import { NextRequest, NextResponse } from 'next/server'
import { generatePaymentClaimToken } from '@/lib/auth'
import { getSeatHolder } from '@/lib/ocRoles'
import { sendOcEmail, reminderEmailHtml, paymentClaimUrl, COMMUNITY_FROM, COMMUNITY_EMAIL } from '@/lib/ocEmails'

export const maxDuration = 60

/**
 * Αυτόματες υπενθυμίσεις προθεσμίας πληρωμής (§4α).
 *
 * ΤΡΕΧΕΙ ΜΟΝΟ ΓΙΑ ΟΠΛΙΣΜΕΝΕΣ ΑΙΤΗΣΕΙΣ. Η αυτοματοποίηση δεν ξεκινά επειδή
 * πέρασαν 15 μέρες — ξεκινά επειδή κάποιος πάτησε «ενεργοποίηση» στην
 * Επισκόπηση. Ένα cron που ξυπνά και αρχίζει να στέλνει email σε ανθρώπους
 * χωρίς ανθρώπινη απόφαση είναι λάθος σχεδιασμός, όχι ευκολία.
 *
 *  Ημέρα 15 → υπενθύμιση
 *  Ημέρα 28 → «απομένουν δύο μέρες»
 *  Ημέρα 30 → καμία αποστολή· το OC δείχνει «η προθεσμία έληξε»
 *
 * Αν έχει γίνει δήλωση πληρωμής (PaymentClaimedAt), δεν στέλνεται τίποτα.
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN
const CRON_SECRET = process.env.CRON_SECRET

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

const daysSince = (iso: string) =>
  Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)

export async function GET(request: NextRequest) {
  // Το `!CRON_SECRET` ΔΕΝ είναι περιττό: αν λείψει η μεταβλητή, η σύγκριση
  // γίνεται με το κείμενο «Bearer undefined» και οποιοσδήποτε το στείλει
  // περνά. Χωρίς μυστικό, η διαδρομή κλείνει — δεν ανοίγει.
  if (!CRON_SECRET || request.headers.get('authorization') !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!STRAPI_URL || !STRAPI_API_TOKEN) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  try {
    const r = await strapi(
      '/membership-applications?filters[ApplicationState][$eq]=approved'
      + '&filters[AutoRemindersArmed][$eq]=true'
      + '&pagination[limit]=200'
      + '&fields[0]=FirstName&fields[1]=LastName&fields[2]=Email&fields[3]=DecisionDate'
      + '&fields[4]=PaymentClaimedAt&fields[5]=Reminder15SentAt&fields[6]=Reminder28SentAt',
    )
    if (!r.ok) return NextResponse.json({ error: `strapi ${r.status}` }, { status: 502 })

    const signer = await getSeatHolder('community')
    const signerName = signer?.name || signer?.engName || 'Culture for Change — Community'

    const sent: string[] = []
    const skipped: string[] = []

    for (const app of r.json?.data || []) {
      const email = String(app.Email || '').trim()
      if (!email || !app.DecisionDate) { skipped.push(`${app.documentId}: λείπει email/ημερομηνία`); continue }
      if (app.PaymentClaimedAt) { skipped.push(`${email}: έχει δηλώσει πληρωμή`); continue }

      const days = daysSince(app.DecisionDate)
      let stage: 15 | 28 | null = null
      if (days >= 28 && !app.Reminder28SentAt) stage = 28
      else if (days >= 15 && days < 28 && !app.Reminder15SentAt) stage = 15
      if (stage === null) continue
      // Μετά τις 30 δεν ενοχλούμε άλλο — το OC δείχνει τη λήξη στον/στην Financer
      if (days > 32) { skipped.push(`${email}: πέρασε η προθεσμία (${days} μέρες)`); continue }

      const firstName = String(app.FirstName || '').trim()
      const claim = paymentClaimUrl(generatePaymentClaimToken(app.documentId))
      const tpl = reminderEmailHtml(firstName, claim, signerName)
      const subject = stage === 28
        ? `Απομένουν δύο ημέρες — ${tpl.subject}`
        : tpl.subject

      // Awaited: μη-awaited παρενέργειες πεθαίνουν με το πάγωμα της συνάρτησης
      const ok = await sendOcEmail(email, subject, tpl.html, {
        from: COMMUNITY_FROM, replyTo: COMMUNITY_EMAIL,
      })
      if (ok) {
        await strapi(`/membership-applications/${app.documentId}`, 'PUT',
          stage === 28 ? { Reminder28SentAt: new Date().toISOString() }
            : { Reminder15SentAt: new Date().toISOString() })
        sent.push(`${email} (ημέρα ${days}, στάδιο ${stage})`)
      } else {
        skipped.push(`${email}: αποτυχία αποστολής`)
      }
    }

    console.log(`[PAYMENT-REMINDERS] sent ${sent.length}${sent.length ? ': ' + sent.join(', ') : ''}`)
    return NextResponse.json({ success: true, sent, skipped })
  } catch (err) {
    console.error('[PAYMENT-REMINDERS] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
