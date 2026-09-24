import { NextRequest, NextResponse } from 'next/server'
import { generatePaymentClaimToken } from '@/lib/auth'
import { getSeatHolder } from '@/lib/ocRoles'
import {
  sendOcEmail, paymentReminderEmailHtml, applicationDeletedEmailHtml, paymentClaimUrl,
  COMMUNITY_FROM, COMMUNITY_EMAIL, ADMIN_EMAIL, FINANCE_EMAIL,
} from '@/lib/ocEmails'
import { sheetsConfigured, removeApplicantFromSheet } from '@/lib/googleSheets'

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

    // ── Διαγραφή όσων πέρασε άπρακτη η προθεσμία (§4α, GDPR) ────────────
    //
    // Δεν τρέχει σε όλες τις εγκεκριμένες αιτήσεις παρά ΜΟΝΟ στις οπλισμένες:
    // η διαγραφή είναι η εκτέλεση της υπόσχεσης που έδωσαν τα γράμματα των 15
    // και των 28 ημερών, και αυτά φεύγουν μόνο όταν AutoRemindersArmed=true.
    // Χωρίς αυτόν τον όρο θα σβήναμε ανθρώπους που δεν προειδοποιήθηκαν ποτέ.
    //
    // Ούτε τρέχει χωρίς DecisionDate: αν λείπει, δεν υπάρχει αφετηρία, άρα
    // δεν υπάρχει προθεσμία που να έχει λήξει. Η απουσία ημερομηνίας δεν
    // σημαίνει «πάει πολύς καιρός» — σημαίνει «δεν ξέρουμε».
    const deleted: string[] = []
    for (const app of r.json?.data || []) {
      if (!app.DecisionDate || app.PaymentClaimedAt) continue
      if (daysSince(app.DecisionDate) <= DEADLINE_DAYS) continue

      const days = daysSince(app.DecisionDate)
      const name = `${app.FirstName || ''} ${app.LastName || ''}`.trim() || '—'
      const email = String(app.Email || '').trim()
      // Τα κρατάμε ΠΡΙΝ τη διαγραφή: μετά δεν υπάρχει από πού να διαβαστούν
      const pending: string[] = []

      // 1) Η γραμμή στα ΕΓΚΕΚΡΙΜΕΝΑ του φύλλου
      if (!sheetsConfigured()) {
        pending.push('Το Google Sheet δεν είναι ρυθμισμένο — σβήσε τη γραμμή από τα ΕΓΚΕΚΡΙΜΕΝΑ με το χέρι.')
      } else {
        try {
          await removeApplicantFromSheet(email)
        } catch (e) {
          console.error('[PAYMENT-REMINDERS] sheet removal failed', app.documentId)
          pending.push(`Δεν σβήστηκε η γραμμή από τα ΕΓΚΕΚΡΙΜΕΝΑ του φύλλου (${(e as Error).message}). Χρειάζεται διαγραφή με το χέρι.`)
        }
      }

      // 2) Η φωτογραφία στη Βιβλιοθήκη Πολυμέσων — δεν φεύγει με την εγγραφή
      const photoId = app.Photo?.id
      if (photoId) {
        const del = await fetch(`${STRAPI_URL}/api/upload/files/${photoId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
        }).catch(() => null)
        if (!del?.ok) {
          pending.push('Η φωτογραφία της αίτησης έμεινε στη Βιβλιοθήκη Πολυμέσων του Strapi — χρειάζεται διαγραφή με το χέρι.')
        }
      }

      // 3) Η ίδια η αίτηση. Αν αποτύχει, ΔΕΝ στέλνουμε ειδοποίηση διαγραφής
      //    για κάτι που δεν διαγράφηκε — ξαναδοκιμάζει αύριο.
      const gone = await strapi(`/membership-applications/${app.documentId}`, 'DELETE')
      if (!gone.ok) {
        console.error('[PAYMENT-REMINDERS] delete failed', gone.status, app.documentId)
        skipped.push(`${email}: αποτυχία διαγραφής (${gone.status})`)
        continue
      }

      const tpl = applicationDeletedEmailHtml({ name, email, decisionDate: app.DecisionDate, days, pending })
      await sendOcEmail(ADMIN_EMAIL, tpl.subject, tpl.html, {
        from: COMMUNITY_FROM, replyTo: COMMUNITY_EMAIL, cc: [COMMUNITY_EMAIL, FINANCE_EMAIL],
      })
      deleted.push(`${name} (ημέρα ${days}${pending.length ? `, ${pending.length} εκκρεμότητες` : ''})`)
    }

    console.log(`[PAYMENT-REMINDERS] sent ${sent.length}${sent.length ? ': ' + sent.join(', ') : ''}`)
    if (deleted.length) console.log(`[PAYMENT-REMINDERS] deleted ${deleted.length}: ${deleted.join(', ')}`)
    return NextResponse.json({ success: true, sent, skipped, deleted })
  } catch (err) {
    console.error('[PAYMENT-REMINDERS] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
