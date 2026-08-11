import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { resolveOcAccess, type OcSeat } from '@/lib/ocRoles'
import { sendPaymentToSheet, sheetsConfigured } from '@/lib/googleSheets'
import { sendOcEmail, welcomeEmailHtml, reminderEmailHtml } from '@/lib/ocEmails'

/**
 * Financer actions on approved-awaiting-payment applications (OC popup):
 *  - "paid":   records the payment. The Sheet runs the full promotion
 *              (ΑΜ, Επισκόπηση/Συνδρομές, member creation via sheet-sync),
 *              then the applicant receives the welcome/first-login email.
 *              ⟨TODO λεπτομερειών⟩: επισύναψη PDF απόδειξης + Οδηγού.
 *  - "remind": sends a polite payment-reminder email.
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
  const action = body?.action === 'paid' ? 'paid' : body?.action === 'remind' ? 'remind' : null
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

    if (action === 'remind') {
      const tpl = reminderEmailHtml(firstName)
      const sent = await sendOcEmail(email, tpl.subject, tpl.html)
      if (!sent) {
        return NextResponse.json({ error: 'Αποτυχία αποστολής email' }, { status: 502 })
      }
      return NextResponse.json({ ok: true, action: 'remind', to: email })
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

    // Welcome/first-login email — ⟨TODO λεπτομερειών: PDF απόδειξη + Οδηγός⟩
    const tpl = welcomeEmailHtml(firstName)
    const emailSent = await sendOcEmail(email, tpl.subject, tpl.html)

    return NextResponse.json({ ok: true, action: 'paid', am, to: email, emailSent })
  } catch (error) {
    console.error('oc payment error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
