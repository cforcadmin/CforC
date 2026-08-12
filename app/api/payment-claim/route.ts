import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { sendOcEmail, paymentClaimNoticeHtml, FINANCE_EMAIL } from '@/lib/ocEmails'

/**
 * Δήλωση «πλήρωσα» από τον σύνδεσμο των emails (μετά το επιβεβαιωτικό κλικ):
 * σημειώνει PaymentClaimedAt στον φάκελο, αποθηκεύει το προαιρετικό
 * αποδεικτικό κατάθεσης (PaymentReceipt) και ειδοποιεί το finance@.
 * Auth: το signed payment-claim token — δεν απαιτεί λογαριασμό.
 * Body: multipart FormData { token, receipt? } (ή JSON { token }).
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN
const MAX_RECEIPT_BYTES = 10 * 1024 * 1024
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']

export async function POST(request: NextRequest) {
  if (!STRAPI_URL || !STRAPI_API_TOKEN) {
    return NextResponse.json({ ok: false, error: 'not configured' }, { status: 500 })
  }

  let token = ''
  let receipt: File | null = null
  const contentType = request.headers.get('content-type') || ''
  try {
    if (contentType.includes('multipart/form-data')) {
      const fd = await request.formData()
      token = String(fd.get('token') || '')
      const f = fd.get('receipt')
      if (f instanceof File && f.size > 0) receipt = f
    } else {
      const body = await request.json()
      token = String(body?.token || '')
    }
  } catch {
    return NextResponse.json({ ok: false, error: 'bad request' }, { status: 400 })
  }

  const decoded = verifyToken(token)
  if (!decoded || decoded.type !== 'payment-claim') {
    return NextResponse.json({ ok: false, error: 'invalid token' }, { status: 401 })
  }
  if (receipt && (receipt.size > MAX_RECEIPT_BYTES || !ALLOWED_TYPES.includes(receipt.type))) {
    return NextResponse.json({ ok: false, error: 'invalid receipt file' }, { status: 422 })
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

    // Αποδεικτικό → Strapi media (πριν το PUT, ώστε να συνδεθεί μαζί)
    let receiptId: number | null = null
    let receiptUrl: string | null = null
    if (receipt) {
      const ext = receipt.type === 'application/pdf' ? 'pdf'
        : receipt.type === 'image/png' ? 'png'
        : receipt.type === 'image/webp' ? 'webp' : 'jpg'
      const uploadForm = new FormData()
      uploadForm.append('files', receipt, `receipt_${decoded.applicationId}_${Date.now()}.${ext}`)
      const up = await fetch(`${STRAPI_URL}/api/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
        body: uploadForm,
      })
      if (up.ok) {
        const uploaded = await up.json()
        receiptId = uploaded?.[0]?.id ?? null
        receiptUrl = uploaded?.[0]?.url ?? null
      }
    }

    const firstClaim = !app.PaymentClaimedAt
    const data: Record<string, any> = {}
    if (firstClaim) data.PaymentClaimedAt = new Date().toISOString()
    if (receiptId) data.PaymentReceipt = receiptId
    if (Object.keys(data).length > 0) {
      const put = await fetch(`${STRAPI_URL}/api/membership-applications/${app.documentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
        body: JSON.stringify({ data }),
      })
      if (!put.ok) {
        return NextResponse.json({ ok: false, error: 'store failed' }, { status: 502 })
      }
    }

    // Ειδοποίηση finance@ στην πρώτη δήλωση (ή όταν προστίθεται αποδεικτικό)
    if (firstClaim || receiptId) {
      const name = `${app.FirstName || ''} ${app.LastName || ''}`.trim() || '—'
      const notice = paymentClaimNoticeHtml(name, String(app.Email || ''), app.documentId, receiptUrl)
      await sendOcEmail(FINANCE_EMAIL, notice.subject, notice.html)
    }
    return NextResponse.json({ ok: true, receiptStored: !!receiptId })
  } catch (error) {
    console.error('payment-claim error:', error)
    return NextResponse.json({ ok: false, error: 'internal' }, { status: 500 })
  }
}
