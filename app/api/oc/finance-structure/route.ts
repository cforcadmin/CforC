import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { resolveOcAccess, type OcSeat } from '@/lib/ocRoles'

/**
 * Ετήσια δομή φακέλων Παραστατικών στο Drive — proxy προς το ΕΣΟΔΑ web app.
 *  GET  → υπάρχει η δομή του τρέχοντος έτους; (board)
 *  POST → δημιουργία της δομής (ΜΟΝΟ Financer) — καλείται από το banner
 *         «Καλή Χρονιά» στα Οικονομικά, ποτέ αυτόματα.
 */

const WEBAPP_URL = process.env.FINANCE_SHEET_WEBAPP_URL
const WEBAPP_SECRET = process.env.FINANCE_SHEET_WEBAPP_SECRET

async function webApp(action: string, year: number) {
  const res = await fetch(WEBAPP_URL as string, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: WEBAPP_SECRET, action, year }),
    redirect: 'follow',
    cache: 'no-store',
  })
  const text = await res.text()
  try { return JSON.parse(text) } catch { return { ok: false, error: text.slice(0, 120) } }
}

async function authorize(needFinancer: boolean) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')
  const decoded = sessionCookie ? verifyToken(sessionCookie.value) : null
  if (!decoded || decoded.type !== 'session') {
    return NextResponse.json({ error: 'Απαιτείται σύνδεση' }, { status: 401 })
  }
  const access = await resolveOcAccess(decoded.memberId)
  if (!access.isBoard) return NextResponse.json({ error: 'Δεν επιτρέπεται' }, { status: 403 })
  if (needFinancer) {
    const seatCookie = cookieStore.get('oc-last-seat')?.value as OcSeat | undefined
    const activeSeat: OcSeat | null =
      seatCookie && access.seats.includes(seatCookie) ? seatCookie
        : access.seats.length === 1 ? access.seats[0] : null
    if (activeSeat !== 'financer') {
      return NextResponse.json({ error: 'Μόνο ο/η Financer' }, { status: 403 })
    }
  }
  return null
}

export async function GET() {
  const denied = await authorize(false)
  if (denied) return denied
  if (!WEBAPP_URL || !WEBAPP_SECRET) return NextResponse.json({ exists: true, unconfigured: true })
  try {
    const year = new Date().getFullYear()
    const r = await webApp('checkYearStructure', year)
    return NextResponse.json({ exists: r.ok ? !!r.exists : true, year })
  } catch (err) {
    console.error('finance-structure check failed:', err)
    return NextResponse.json({ exists: true }) // σε αμφιβολία, χωρίς banner
  }
}

export async function POST() {
  const denied = await authorize(true)
  if (denied) return denied
  if (!WEBAPP_URL || !WEBAPP_SECRET) return NextResponse.json({ error: 'Μη διαμορφωμένο' }, { status: 500 })
  try {
    const year = new Date().getFullYear()
    const r = await webApp('createYearStructure', year)
    if (!r.ok) return NextResponse.json({ error: r.error || 'Αποτυχία δημιουργίας' }, { status: 502 })
    return NextResponse.json({ ok: true, year })
  } catch (err) {
    console.error('finance-structure create failed:', err)
    return NextResponse.json({ error: 'Αποτυχία δημιουργίας' }, { status: 502 })
  }
}
