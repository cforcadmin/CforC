import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'

/**
 * Τα εξοδολόγια ΤΟΥ μέλους που ρωτάει — κανενός άλλου.
 *
 * Το φιλτράρισμα γίνεται με το email της συνεδρίας, όχι με παράμετρο που
 * στέλνει ο browser: αλλιώς θα αρκούσε ένα ?email= για να διαβάσει κανείς
 * τα IBAN των υπολοίπων.
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

export async function GET() {
  const store = await cookies()
  const token = store.get('session')?.value
  const decoded = token ? verifyToken(token) : null
  if (!decoded || decoded.type !== 'session') {
    return NextResponse.json({ error: 'Απαιτείται σύνδεση' }, { status: 401 })
  }

  const meRes = await fetch(`${STRAPI_URL}/api/members/${decoded.memberId}?fields[0]=Email`, {
    headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` }, cache: 'no-store',
  })
  const email = String((await meRes.json().catch(() => null))?.data?.Email || '').trim()
  if (!email) return NextResponse.json({ error: 'Δεν βρέθηκε το μέλος' }, { status: 404 })

  const res = await fetch(
    `${STRAPI_URL}/api/expense-claims?filters[MemberEmail][$eqi]=${encodeURIComponent(email)}` +
    '&sort=SubmittedAt:desc&pagination[limit]=100',
    { headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` }, cache: 'no-store' },
  )
  if (!res.ok) return NextResponse.json({ error: 'Αποτυχία φόρτωσης' }, { status: 502 })
  const data = (await res.json())?.data || []

  return NextResponse.json({
    claims: data.map((c: any) => ({
      claimNumber: c.ClaimNumber,
      submittedAt: c.SubmittedAt,
      eventLabel: c.EventName ? `${c.EventType} — ${c.EventName}` : c.EventType,
      eventStart: c.EventStart,
      eventEnd: c.EventEnd,
      total: Number(c.Total) || 0,
      advance: Number(c.Advance) || 0,
      payable: Number(c.Payable) || 0,
      state: c.State,
      paidAt: c.PaidAt || null,
      lines: Array.isArray(c.Lines) ? c.Lines.length : 0,
      pdfUrl: c.PdfUrl || null,
      folderUrl: c.FolderUrl || null,
    })),
  })
}
