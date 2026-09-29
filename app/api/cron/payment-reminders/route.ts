import { NextRequest, NextResponse } from 'next/server'
import { recordRun, cronAuthorized, triggerOf, type RunNote } from '@/lib/ocRunLog'
import { recordOutcome, outcomeExists } from '@/lib/applicationOutcome'
import { generatePaymentClaimToken } from '@/lib/auth'
import { getSeatHolder } from '@/lib/ocRoles'
import {
  sendOcEmail, paymentReminderEmailHtml, applicationDeletionDueEmailHtml, paymentClaimUrl,
  COMMUNITY_FROM, COMMUNITY_EMAIL,
} from '@/lib/ocEmails'

// 300s μένουν παρότι έφυγε η αυτόματη διαγραφή: η διαδρομή στέλνει email ένα
// προς ένα και το Strapi μπορεί να ξυπνά από ψυχρή εκκίνηση. Το περιθώριο δεν
// κοστίζει τίποτα όταν όλα πάνε γρήγορα.
export const maxDuration = 300

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
 *  Ημέρα 31 → διαγραφή της αίτησης (GDPR) + ειδοποίηση στο ΔΣ
 *
 * Αν έχει γίνει δήλωση πληρωμής (PaymentClaimedAt), δεν στέλνεται τίποτα.
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN
const CRON_SECRET = process.env.CRON_SECRET

/** Η προθεσμία σε ημέρες· από την επόμενη η αίτηση διαγράφεται. */
const DEADLINE_DAYS = 30

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

async function runJob(request: NextRequest, log: RunNote) {
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
      + '&fields[4]=PaymentClaimedAt&fields[5]=Reminder15SentAt&fields[6]=Reminder28SentAt'
      + '&populate[Photo][fields][0]=id',
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
      // Η προθεσμία είναι 30 ημέρες: από την 31η και μετά δεν στέλνουμε τίποτα.
      // Ήταν 32, που σήμαινε ότι κάποιος στη 31η ή 32η ημέρα λάμβανε το
      // «απομένουν 2 ημέρες» ΜΕΤΑ τη λήξη της προθεσμίας που ανήγγειλε.
      // Από εκεί και πέρα το θέμα το βλέπει ο/η Financer στο OC.
      if (days > 30) { skipped.push(`${email}: πέρασε η προθεσμία (${days} μέρες)`); continue }

      const firstName = String(app.FirstName || '').trim()
      const claim = paymentClaimUrl(generatePaymentClaimToken(app.documentId))
      // Κάθε στάδιο έχει το δικό του κείμενο — όχι ίδιο γράμμα με άλλο θέμα
      const tpl = paymentReminderEmailHtml(stage, firstName, claim, signerName)
      const subject = tpl.subject

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

    /**
     * ── Λήξη προθεσμίας: ΑΠΟΔΕΙΞΗ + ΑΙΤΗΜΑ, καμία διαγραφή ─────────────────
     *
     * ΤΟ ΥΠΟΨΗΦΙΟ ΜΕΛΟΣ ΔΕΝ ΔΙΑΓΡΑΦΕΤΑΙ ΠΟΤΕ ΑΥΤΟΜΑΤΑ (απόφαση ΟΣ, 29/9/2026,
     * ρητή και επαναλαμβανόμενη). Μέχρι σήμερα ο κώδικας έσβηνε μόνος του
     * αίτηση, φωτογραφία και γραμμή φύλλου· αυτό αφαιρέθηκε.
     *
     * Τώρα, όταν λήξει άπρακτη η προθεσμία, γίνονται ΔΥΟ πράγματα και μόνο:
     *   1. Γράφεται η μη-προσωπική απόδειξη ότι τηρήθηκε η διαδικασία —
     *      πότε εγκρίθηκε, πότε έφυγαν οι υπενθυμίσεις, πότε έληξε. Γράφεται
     *      ΤΩΡΑ ώστε να υπάρχει ήδη όποτε κι αν γίνει η χειροκίνητη διαγραφή.
     *   2. Στέλνεται ΜΙΑ φορά αίτημα διαγραφής στην community@.
     *
     * Δεν τρέχει σε όλες τις εγκεκριμένες παρά ΜΟΝΟ στις οπλισμένες: το
     * αίτημα είναι η συνέχεια της υπόσχεσης που έδωσαν τα γράμματα των 15 και
     * 28 ημερών, και αυτά φεύγουν μόνο όταν AutoRemindersArmed=true.
     *
     * Ούτε τρέχει χωρίς DecisionDate: χωρίς αφετηρία δεν υπάρχει προθεσμία
     * που να έχει λήξει. Η απουσία ημερομηνίας δεν σημαίνει «πάει πολύς
     * καιρός» — σημαίνει «δεν ξέρουμε».
     */
    const deletionDue: string[] = []
    for (const app of r.json?.data || []) {
      if (!app.DecisionDate || app.PaymentClaimedAt) continue
      const days = daysSince(app.DecisionDate)
      if (days <= DEADLINE_DAYS) continue

      // Η απόδειξη γράφεται μία φορά· το outcomeExists κρατά το αίτημα μοναδικό
      if (await outcomeExists(app.documentId)) continue

      const name = `${app.FirstName || ''} ${app.LastName || ''}`.trim() || '—'
      const email = String(app.Email || '').trim()
      const now = new Date().toISOString()

      const proven = await recordOutcome({
        ApplicationRef: app.documentId,
        Outcome: 'no-payment-30d',
        DecisionDate: app.DecisionDate,
        DeadlineExpiredAt: now,
        DaysElapsed: days,
        Reminder15SentAt: app.Reminder15SentAt || null,
        Reminder28SentAt: app.Reminder28SentAt || null,
        DeletionRequestedAt: now,
        DeletionConfirmedAt: null,
      })
      if (!proven) {
        skipped.push(`${email}: δεν γράφτηκε η απόδειξη — ξαναδοκιμάζει αύριο`)
        continue
      }

      const tpl = applicationDeletionDueEmailHtml({ name, email, decisionDate: app.DecisionDate, days })
      await sendOcEmail(COMMUNITY_EMAIL, tpl.subject, tpl.html, {
        from: COMMUNITY_FROM, replyTo: COMMUNITY_EMAIL,
      })
      deletionDue.push(`${name} (ημέρα ${days})`)
    }

    console.log(`[PAYMENT-REMINDERS] sent ${sent.length}${sent.length ? ': ' + sent.join(', ') : ''}`)
    if (deletionDue.length) console.log(`[PAYMENT-REMINDERS] deletion requested ${deletionDue.length}: ${deletionDue.join(', ')}`)
    log.note(`${sent.length} υπενθυμίσεις· ${skipped.length} παραλείφθηκαν· ${deletionDue.length} αιτήματα χειροκίνητης διαγραφής`)
    return NextResponse.json({ success: true, sent, skipped, deletionDue })
  } catch (err) {
    console.error('[PAYMENT-REMINDERS] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Το περίβλημα καταγραφής. Ο έλεγχος μυστικού γίνεται ΠΡΙΝ από αυτό ώστε μια
 * ανεπιτυχής κλήση να μη γράφει «εκτέλεση» στο ημερολόγιο.
 */
export async function GET(request: NextRequest) {
  if (!cronAuthorized(request)) return runJob(request, { note: () => {} })
  return recordRun('/api/cron/payment-reminders', log => runJob(request, log), { trigger: triggerOf(request) })
}
