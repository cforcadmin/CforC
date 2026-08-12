import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

/**
 * Υποβολή φόρμας αποχώρησης → Strapi exit-survey.
 * Auth: το signed exit-survey token. Ανώνυμη από προεπιλογή — το όνομα
 * μπαίνει ΜΟΝΟ από το token όταν το μέλος τσέκαρε «να συμπληρωθεί» (η
 * ταυτότητα δεν ταξιδεύει ποτέ ως ελεύθερο πεδίο από τον browser).
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

const clampStr = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max) || null
const cleanList = (v: unknown, max = 12) =>
  Array.isArray(v) ? v.slice(0, max).map(x => String(x).slice(0, 120)) : []

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
  if (!decoded || decoded.type !== 'exit-survey') {
    return NextResponse.json({ ok: false, error: 'invalid token' }, { status: 401 })
  }

  const identify = body?.identify === true
  const satisfaction = Number.isInteger(body?.satisfaction) && body.satisfaction >= 1 && body.satisfaction <= 5
    ? body.satisfaction
    : null

  const data: Record<string, any> = {
    Anonymous: !identify,
    ...(identify && { MemberName: decoded.name, MemberDocId: decoded.memberId }),
    Reasons: cleanList(body?.reasons),
    ReasonOther: clampStr(body?.reasonOther, 300),
    Satisfaction: satisfaction,
    MostUseful: cleanList(body?.useful),
    Barriers: cleanList(body?.barriers),
    WouldChange: clampStr(body?.wouldChange, 3000),
    WouldReturn: cleanList(body?.wouldReturn),
    KeepNewsletter: typeof body?.keepNewsletter === 'boolean' ? body.keepNewsletter : null,
    AllowFollowUp: identify && body?.allowFollowUp === true,
    FinalComment: clampStr(body?.finalComment, 3000),
    SubmittedAt: new Date().toISOString(),
  }

  try {
    const res = await fetch(`${STRAPI_URL}/api/exit-surveys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${STRAPI_API_TOKEN}`,
      },
      body: JSON.stringify({ data }),
    })
    if (!res.ok) {
      console.error('farewell: strapi create failed', res.status, await res.text().catch(() => ''))
      return NextResponse.json({ ok: false, error: 'store failed' }, { status: 502 })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('farewell error:', error)
    return NextResponse.json({ ok: false, error: 'internal' }, { status: 500 })
  }
}
