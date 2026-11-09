import { NextRequest, NextResponse } from 'next/server'
import { canRejectPayment } from '@/lib/businessDays'

/**
 * 300s, ΟΧΙ 60 — και το 60 ήταν η αιτία πραγματικής ζημιάς (7/10/2026).
 *
 * Το «Πληρώθηκε» κάνει ΔΥΟ κλήσεις σε Apps Script (Μητρώο για την προαγωγή,
 * ΕΣΟΔΑ+Drive για την απόδειξη) και καθεμιά, σε κρύα εκκίνηση, αργεί 40–60
 * δευτερόλεπτα — μετρημένο 25/9/2026: 43,8s και 57,7s. Μαζί με PDF και δύο
 * email, τα 60s δεν έφταναν ΠΟΤΕ.
 *
 * Τι συνέβη: το Μητρώο προήχθη κανονικά, η συνάρτηση σκοτώθηκε αμέσως μετά.
 * Κανένα μέλος, καμία απόδειξη, καμία εγγραφή στα ΕΣΟΔΑ, κανένα email — και
 * ΚΑΜΙΑ ένδειξη στην οθόνη, γιατί η απάντηση δεν γύρισε ποτέ. Ίδιο όριο με
 * τη διαδρομή των αποδείξεων, που κάνει ΛΙΓΟΤΕΡΑ.
 */
export const maxDuration = 300
import { cookies } from 'next/headers'
import { verifyToken, generatePaymentClaimToken } from '@/lib/auth'
import { resolveOcAccess, getSeatHolder, type OcSeat } from '@/lib/ocRoles'
import { effectiveSeat, isActingAsOtherSeat, RECEIPT_WEARING_REFUSAL, OC_SEAT_MODE_COOKIE } from '@/lib/ocSeatMode'
import { sendPaymentToSheet, sheetsConfigured, removeApplicantFromSheet } from '@/lib/googleSheets'
import { sendOcEmail, reminderEmailHtml, paymentFailedEmailHtml, applicationExpiredEmailHtml, paymentClaimUrl, COMMUNITY_FROM, COMMUNITY_EMAIL, FINANCE_FROM, FINANCE_EMAIL, ADMIN_EMAIL, IT_EMAIL } from '@/lib/ocEmails'
import { processPaymentCompletion } from '@/lib/paymentCompletion'
import { recordOutcome, confirmOutcomeDeletion } from '@/lib/applicationOutcome'
import { strapiFetch } from '@/lib/strapiFetch'

/**
 * Financer actions on approved-awaiting-payment applications (OC popup):
 *  - "paid":   records the payment. The Sheet runs the full promotion
 *              (ΑΜ, Επισκόπηση/Συνδρομές, member creation via sheet-sync),
 *              then the applicant receives the welcome/first-login email.
 *              ⟨TODO λεπτομερειών⟩: επισύναψη PDF απόδειξης + Οδηγού.
 *  - "remind": sends a polite payment-reminder email.
 *  - "failed": για δηλωμένη-αλλά-μη-εμφανισθείσα πληρωμή — ευγενικό email
 *              «δεν έφτασε η κατάθεση, ξαναέλεγξε» και μηδενισμός της
 *              δήλωσης (PaymentClaimedAt) ώστε το κουτί να επανέλθει.
 *  - "expire": εγκεκριμένη που ΔΕΝ πλήρωσε μέσα στις 30 ημέρες και δεν
 *              δήλωσε πληρωμή. Ο άνθρωπος ενημερώνεται (από Community,
 *              cc finance@/it@/hello@) ότι η αίτηση έληξε, ότι τα στοιχεία
 *              του διαγράφονται (GDPR) και ότι μπορεί να ξαναϋποβάλει — και
 *              μετά τα στοιχεία ΟΝΤΩΣ διαγράφονται: γραμμή Μητρώου,
 *              φωτογραφία, αίτηση. ΠΡΩΤΑ γράφεται η ανώνυμη απόδειξη
 *              (oc-application-outcomes)· χωρίς απόδειξη δεν σβήνουμε.
 *              Ο άνθρωπος πατά, το σύστημα εκτελεί (απόφαση ΟΣ 29/9/2026:
 *              καμία ΑΥΤΟΜΑΤΗ διαγραφή). Κάθε βήμα επιστρέφει χωριστά.
 * Acting seat MUST be financer — no other role, by design.
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

async function strapiGet(path: string) {
  const res = await strapiFetch(`${STRAPI_URL}/api${path}`, {
    headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json()
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')
  const decoded = sessionCookie ? verifyToken(sessionCookie.value) : null
  if (!decoded || decoded.type !== 'session') {
    return NextResponse.json({ error: 'Απαιτείται σύνδεση' }, { status: 401 })
  }
  const access = await resolveOcAccess(decoded.memberId)
  if (!access.isBoard) {
    return NextResponse.json({ error: 'Δεν επιτρέπεται' }, { status: 403 })
  }
  const seatCookie = cookieStore.get('oc-last-seat')?.value as OcSeat | undefined
  const activeSeat: OcSeat | null =
    effectiveSeat(access.seats as OcSeat[], seatCookie, cookieStore.get(OC_SEAT_MODE_COOKIE)?.value)
  if (activeSeat !== 'financer') {
    return NextResponse.json({ error: 'Μόνο ο/η Financer μπορεί να καταχωρήσει πληρωμές' }, { status: 403 })
  }
  // Η ΔΕΥΤΕΡΗ πόρτα για απόδειξη: το «Πληρώθηκε» εκδίδει μία μέσω του
  // paymentCompletion. Φράγμα μόνο στο /api/oc/receipts θα άφηνε αυτή εδώ να
  // βγάζει σιωπηλά αριθμούς φορώντας την έδρα.
  if (isActingAsOtherSeat(access.seats as OcSeat[], seatCookie, cookieStore.get(OC_SEAT_MODE_COOKIE)?.value)) {
    return NextResponse.json({ error: RECEIPT_WEARING_REFUSAL }, { status: 403 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Μη έγκυρο αίτημα' }, { status: 400 })
  }
  const applicationId = String(body?.applicationId || '').replace(/[^a-z0-9]/gi, '')
  const action = ['paid', 'remind', 'failed', 'expire'].includes(body?.action) ? body.action as 'paid' | 'remind' | 'failed' | 'expire' : null
  if (!applicationId || !action) {
    return NextResponse.json({ error: 'Μη έγκυρο αίτημα' }, { status: 400 })
  }

  try {
    // Η φωτογραφία δεν φεύγει μαζί με την αίτηση — χρειάζεται το id της
    const appRes = await strapiGet(`/membership-applications/${applicationId}?populate[Photo][fields][0]=id`)
    const app = appRes?.data
    if (!app) {
      return NextResponse.json({ error: 'Η αίτηση δεν βρέθηκε' }, { status: 404 })
    }
    if (app.ApplicationState !== 'approved') {
      return NextResponse.json(
        { error: 'Η αίτηση δεν είναι σε αναμονή πληρωμής', state: app.ApplicationState },
        { status: 409 }
      )
    }
    const email = String(app.Email || '').trim()
    const firstName = String(app.FirstName || '').trim() || 'μέλος'
    if (!email) {
      return NextResponse.json({ error: 'Η αίτηση δεν έχει email' }, { status: 422 })
    }

    const claim = paymentClaimUrl(generatePaymentClaimToken(app.documentId))

    if (action === 'remind') {
      const signer = await getSeatHolder('community')
      const signerName = signer?.engName || signer?.name || 'Culture for Change — Community'
      const tpl = reminderEmailHtml(firstName, claim, signerName)
      const sent = await sendOcEmail(email, tpl.subject, tpl.html, { from: COMMUNITY_FROM, replyTo: COMMUNITY_EMAIL })
      if (!sent) {
        return NextResponse.json({ error: 'Αποτυχία αποστολής email' }, { status: 502 })
      }
      return NextResponse.json({ ok: true, action: 'remind', to: email })
    }

    if (action === 'failed') {
      // ΔΙΚΛΕΙΔΑ: όχι «αποτυχία» πριν περάσουν τρεις εργάσιμες από τη δήλωση
      // του μέλους — η τράπεζα αργεί, και το άδικο γράμμα δεν ξεγράφεται.
      const gate = canRejectPayment(app.PaymentClaimedAt)
      if (!gate.allowed) {
        return NextResponse.json({ error: gate.message, tooSoon: true, remaining: gate.remaining }, { status: 409 })
      }
      // Θέματα πληρωμών: υπογράφει και απαντά ο/η Financer
      const signer = await getSeatHolder('financer')
      const signerName = signer?.engName || signer?.name || 'Culture for Change — Finance'
      const tpl = paymentFailedEmailHtml(firstName, claim, signerName)
      const sent = await sendOcEmail(email, tpl.subject, tpl.html, { from: FINANCE_FROM, replyTo: FINANCE_EMAIL })
      if (!sent) {
        return NextResponse.json({ error: 'Αποτυχία αποστολής email' }, { status: 502 })
      }
      // Η δήλωση μηδενίζεται — το κουτί/entry επανέρχεται σε «αναμονή»
      await strapiFetch(`${STRAPI_URL}/api/membership-applications/${app.documentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${STRAPI_API_TOKEN}` },
        body: JSON.stringify({ data: { PaymentClaimedAt: null } }),
      }).catch(() => {})
      return NextResponse.json({ ok: true, action: 'failed', to: email })
    }

    if (action === 'expire') {
      /**
       * ΔΥΟ ΠΡΟΫΠΟΘΕΣΕΙΣ, ΚΑΙ ΟΙ ΔΥΟ ΣΤΟΝ SERVER — το κουμπί μπορεί να είναι
       * παλιό tab. Δηλωμένη πληρωμή: δεν «λήγει», ελέγχεται («Αποτυχία
       * πληρωμής»). Λιγότερες από 30 μέρες: τα γράμματα υποσχέθηκαν 30.
       *
       * Αφετηρία η έγκριση· οι ιστορικές εισαγωγές δεν έχουν DecisionDate,
       * οπότε μετράμε από την υποβολή — αλλιώς δεν θα έληγαν ποτέ.
       */
      if (app.PaymentClaimedAt) {
        return NextResponse.json(
          { error: 'Έχει δηλώσει πληρωμή — αν δεν φάνηκε η κατάθεση, χρησιμοποίησε «Αποτυχία πληρωμής».' },
          { status: 409 },
        )
      }
      const since = app.DecisionDate || app.SubmittedAt || app.createdAt
      const days = since ? Math.floor((Date.now() - new Date(since).getTime()) / 86400000) : null
      if (days === null || days < 30) {
        return NextResponse.json(
          { error: `Δεν έχουν περάσει 30 ημέρες από την έγκριση (${days ?? ';'}) — η προθεσμία που ανακοινώσαμε δεν έχει λήξει.`, tooSoon: true },
          { status: 409 },
        )
      }

      // 0) Η ΑΠΟΔΕΙΞΗ ΠΡΩΤΑ, ΧΩΡΙΣ ΠΡΟΣΩΠΙΚΑ ΔΕΔΟΜΕΝΑ. Αν δεν γραφτεί, τίποτα
      //    δεν αλλάζει: σβησμένη αίτηση χωρίς απόδειξη δεν αποδεικνύεται ποτέ.
      const now = new Date().toISOString()
      const proven = await recordOutcome({
        ApplicationRef: app.documentId,
        Outcome: 'no-payment-30d',
        DecisionDate: app.DecisionDate || null,
        DeadlineExpiredAt: now,
        DaysElapsed: days,
        Reminder15SentAt: app.Reminder15SentAt || null,
        Reminder28SentAt: app.Reminder28SentAt || null,
        DeletionRequestedAt: now,
        DeletionConfirmedAt: null,
      })
      if (!proven) {
        return NextResponse.json({ error: 'Δεν γράφτηκε η απόδειξη τήρησης της διαδικασίας — τίποτα δεν άλλαξε, δοκίμασε ξανά' }, { status: 502 })
      }

      // 1) Strapi: η απόφαση αλλάζει. Αν αποτύχει εδώ, δεν συνεχίζουμε —
      //    ένα email «έληξε» για αίτηση που μένει approved θα ήταν ψέμα.
      //    Μένει ως δίχτυ: αν αργότερα αποτύχει η διαγραφή, η αίτηση είναι
      //    τουλάχιστον rejected με σημείωση, όχι approved.
      const stamp = new Date().toLocaleDateString('el-GR')
      const note = `Λήξη προθεσμίας πληρωμής: ${days} ημέρες χωρίς καταβολή — ακύρωση από Ταμία ${stamp}`
        + (app.DecisionNote ? ` · ${app.DecisionNote}` : '')
      const put = await strapiFetch(`${STRAPI_URL}/api/membership-applications/${app.documentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${STRAPI_API_TOKEN}` },
        body: JSON.stringify({ data: {
          ApplicationState: 'rejected',
          DecisionNote: note,
          AutoRemindersArmed: false, AutoRemindersArmedAt: null, AutoRemindersArmedBy: null,
        } }),
      })
      if (!put.ok) {
        return NextResponse.json({ error: `Το Strapi δεν δέχτηκε την αλλαγή (${put.status}) — τίποτα δεν άλλαξε` }, { status: 502 })
      }

      // 2) Μητρώο: καθαρισμός της γραμμής στα ΕΓΚΕΚΡΙΜΕΝΑ. Μη-θανατηφόρο:
      //    η αστοχία ΕΠΙΣΤΡΕΦΕΤΑΙ, δεν καταπίνεται.
      let sheetCleared = false
      let sheetError: string | null = null
      if (sheetsConfigured()) {
        try { await removeApplicantFromSheet(email); sheetCleared = true }
        catch (err: any) { sheetError = String(err?.message || err).slice(0, 160) }
      } else {
        sheetError = 'Το Μητρώο δεν είναι ρυθμισμένο'
      }

      // 3) Email στον άνθρωπο — από Community, όπως η έγκριση. ΠΡΙΝ τη
      //    διαγραφή: μετά δεν θα υπάρχει διεύθυνση να του γράψουμε.
      const signer = await getSeatHolder('community')
      const signerName = signer?.engName || signer?.name || 'Culture for Change — Community'
      const tpl = applicationExpiredEmailHtml({
        firstName,
        decisionDate: app.DecisionDate || null,
        remindersSent: !!(app.Reminder15SentAt || app.Reminder28SentAt),
        signerName,
      })
      const emailSent = await sendOcEmail(email, tpl.subject, tpl.html, {
        from: COMMUNITY_FROM, replyTo: COMMUNITY_EMAIL,
        cc: [FINANCE_EMAIL, IT_EMAIL, ADMIN_EMAIL],
      })

      // 4) Φωτογραφία: ζει στη Βιβλιοθήκη Πολυμέσων, ΔΕΝ σβήνεται με την αίτηση.
      let photoRemoved: boolean | null = null   // null = δεν είχε
      const photoId = app.Photo?.id
      if (photoId) {
        const del = await strapiFetch(`${STRAPI_URL}/api/upload/files/${photoId}`, {
          method: 'DELETE', headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
        }).catch(() => null)
        photoRemoved = !!(del && (del.ok || del.status === 404))
      }

      // 5) Η ίδια η αίτηση. Μετά, η σφραγίδα «σβήστηκε» στην απόδειξη — ΜΟΝΟ
      //    αν όντως έφυγε.
      const gone = await strapiFetch(`${STRAPI_URL}/api/membership-applications/${app.documentId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
      }).catch(() => null)
      const applicationDeleted = !!(gone && (gone.ok || gone.status === 404))
      const proofConfirmed = applicationDeleted ? await confirmOutcomeDeletion(app.documentId) : false

      return NextResponse.json({
        ok: true, action: 'expire', to: email, days,
        sheetCleared, sheetError, emailSent, photoRemoved, applicationDeleted, proofConfirmed,
      })
    }

    // action === 'paid'
    if (!sheetsConfigured()) {
      return NextResponse.json({ error: 'Το Μητρώο (Sheet) δεν είναι ρυθμισμένο' }, { status: 500 })
    }
    // Το Sheet κάνει ΜΟΝΟ την προαγωγή (γρήγορο, skipSync) και επιστρέφει
    // το ΑΜ· μέλος/φάκελος/emails τρέχουν εδώ απευθείας — όχι εμφωλευμένη
    // κλήση Vercel μέσα από το Google (αργή/εύθραυστη).
    let am = ''
    try {
      am = await sendPaymentToSheet(email)
    } catch (err: any) {
      console.error('oc payment: sheet failed:', err)
      return NextResponse.json(
        { error: `Το Μητρώο απέρριψε την καταχώρηση: ${String(err?.message || err).slice(0, 120)}` },
        { status: 502 }
      )
    }

    const result = await processPaymentCompletion({
      email,
      am: Number(am),
      year: new Date().getFullYear(),
      firstName,
      lastName: String(app.LastName || '').trim(),
      gender: String(app.Gender || '').trim(),
      phone: String(app.Phone || '').trim(),
      city: String(app.ResidenceCity || '').trim(),
    })
    if (!result.ok) {
      return NextResponse.json(
        { error: `Η καταχώρηση στο Μητρώο έγινε (ΑΜ ${am}), αλλά: ${result.error}` },
        { status: 502 }
      )
    }
    return NextResponse.json({ ok: true, action: 'paid', am, to: email, emailSent: !!(result.welcomeSent && result.receiptSent) })
  } catch (error) {
    console.error('oc payment error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
