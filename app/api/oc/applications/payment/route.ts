import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken, generatePaymentClaimToken } from '@/lib/auth'
import { resolveOcAccess, getSeatHolder, type OcSeat } from '@/lib/ocRoles'
import { sendPaymentToSheet, sheetsConfigured } from '@/lib/googleSheets'
import { sendOcEmail, reminderEmailHtml, paymentFailedEmailHtml, paymentClaimUrl, COMMUNITY_FROM, COMMUNITY_EMAIL, FINANCE_FROM, FINANCE_EMAIL } from '@/lib/ocEmails'

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
 * Acting seat MUST be financer — no other role, by design.
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

async function strapiGet(path: string) {
  const res = await fetch(`${STRAPI_URL}/api${path}`, {
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
    seatCookie && access.seats.includes(seatCookie) ? seatCookie
      : access.seats.length === 1 ? access.seats[0] : null
  if (activeSeat !== 'financer') {
    return NextResponse.json({ error: 'Μόνο ο/η Financer μπορεί να καταχωρήσει πληρωμές' }, { status: 403 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Μη έγκυρο αίτημα' }, { status: 400 })
  }
  const applicationId = String(body?.applicationId || '').replace(/[^a-z0-9]/gi, '')
  const action = ['paid', 'remind', 'failed'].includes(body?.action) ? body.action as 'paid' | 'remind' | 'failed' : null
  if (!applicationId || !action) {
    return NextResponse.json({ error: 'Μη έγκυρο αίτημα' }, { status: 400 })
  }

  try {
    const appRes = await strapiGet(`/membership-applications/${applicationId}`)
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
      // Θέματα πληρωμών: υπογράφει και απαντά ο/η Financer
      const signer = await getSeatHolder('financer')
      const signerName = signer?.engName || signer?.name || 'Culture for Change — Finance'
      const tpl = paymentFailedEmailHtml(firstName, claim, signerName)
      const sent = await sendOcEmail(email, tpl.subject, tpl.html, { from: FINANCE_FROM, replyTo: FINANCE_EMAIL })
      if (!sent) {
        return NextResponse.json({ error: 'Αποτυχία αποστολής email' }, { status: 502 })
      }
      // Η δήλωση μηδενίζεται — το κουτί/entry επανέρχεται σε «αναμονή»
      await fetch(`${STRAPI_URL}/api/membership-applications/${app.documentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${STRAPI_API_TOKEN}` },
        body: JSON.stringify({ data: { PaymentClaimedAt: null } }),
      }).catch(() => {})
      return NextResponse.json({ ok: true, action: 'failed', to: email })
    }

    // action === 'paid'
    if (!sheetsConfigured()) {
      return NextResponse.json({ error: 'Το Μητρώο (Sheet) δεν είναι ρυθμισμένο' }, { status: 500 })
    }
    // Η προαγωγή γίνεται από το Sheet (μία πηγή αλήθειας για τη ροή):
    // ΠΛΗΡΩΜΗ=Ναι → ΑΜ + γραμμές + sheet-sync πίσω που δημιουργεί το μέλος
    // στο Strapi και ολοκληρώνει τον φάκελο. Συγχρονισμό, όχι fire-and-forget.
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

    // Τα emails ολοκλήρωσης (IT welcome + finance απόδειξη) στέλνονται από
    // το κοινό σημείο /api/sheet-sync (payment) — ίδια συμπεριφορά είτε η
    // πληρωμή καταχωρηθεί από το OC είτε απευθείας στο Sheet.
    return NextResponse.json({ ok: true, action: 'paid', am, to: email, emailSent: true })
  } catch (error) {
    console.error('oc payment error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
