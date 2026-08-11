import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { sendOcEmail, paymentClaimNoticeHtml, FINANCE_EMAIL } from '@/lib/ocEmails'

/**
 * Δήλωση «πλήρωσα» από τον σύνδεσμο των emails (μετά το επιβεβαιωτικό κλικ):
 * σημειώνει PaymentClaimedAt στον φάκελο και ειδοποιεί το finance@.
 * Auth: το signed payment-claim token — δεν απαιτεί λογαριασμό.
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

export async function POST(request: NextRequest) {
  if (!STRAPI_URL || !STRAPI_API_TOKEN) {
    return NextResponse.json({ ok: false, error: 'not configured' }, { status: 500 })
  }
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'bad request' }, { status: 400 })
  }
  const decoded = verifyToken(String(body?.token || ''))
  if (!decoded || decoded.type !== 'payment-claim') {
    return NextResponse.json({ ok: false, error: 'invalid token' }, { status: 401 })
  }

  try {
    const res = await fetch(
      `${STRAPI_URL}/api/membership-applications/${decoded.applicationId}`,
      { headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` }, cache: 'no-store' }
    )
    const app = res.ok ? (await res.json())?.data : null
    if (!app) {
      return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 })
    }
    if (app.ApplicationState !== 'approved') {
      // completed κ.λπ. — τίποτα να δηλωθεί, αλλά όχι σφάλμα για τον χρήστη
      return NextResponse.json({ ok: true, state: app.ApplicationState })
    }
    if (!app.PaymentClaimedAt) {
      const put = await fetch(`${STRAPI_URL}/api/membership-applications/${app.documentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
        body: JSON.stringify({ data: { PaymentClaimedAt: new Date().toISOString() } }),
      })
      if (!put.ok) {
        return NextResponse.json({ ok: false, error: 'store failed' }, { status: 502 })
      }
      const name = `${app.FirstName || ''} ${app.LastName || ''}`.trim() || '—'
      const notice = paymentClaimNoticeHtml(name, String(app.Email || ''), app.documentId)
      await sendOcEmail(FINANCE_EMAIL, notice.subject, notice.html)
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('payment-claim error:', error)
    return NextResponse.json({ ok: false, error: 'internal' }, { status: 500 })
  }
}
