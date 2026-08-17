import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { resolveOcAccess, type OcSeat } from '@/lib/ocRoles'

/**
 * Ετήσια δομή φακέλων Παραστατικών στο Drive — proxy προς το ΕΣΟΔΑ web app.
 *  GET  → δύο ΑΝΕΞΑΡΤΗΤΕΣ πληροφορίες (board):
 *         exists     — υπάρχει η δομή του έτους; (οδηγεί το banner «Καλή Χρονιά»)
 *         connection — απαντά το web app; ok | unconfigured | unauthorized | unreachable
 *         Χώρια, γιατί «δεν ξέρω» ΔΕΝ σημαίνει «όλα καλά»: μέχρι τώρα κάθε
 *         αποτυχία γύριζε exists:true και η βλάβη έμενε αόρατη μέχρι να
 *         σκάσει στη μέση μιας έγκρισης.
 *  POST → δημιουργία της δομής (ΜΟΝΟ Financer) — καλείται από το banner
 *         «Καλή Χρονιά» στα Οικονομικά, ποτέ αυτόματα.
 */

type Connection = 'ok' | 'unconfigured' | 'unauthorized' | 'unreachable'

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

function requestedYear(raw: string | null): number {
  const y = Number(raw)
  return Number.isInteger(y) && y >= 2020 && y <= 2100 ? y : new Date().getFullYear()
}

export async function GET(request: NextRequest) {
  const denied = await authorize(false)
  if (denied) return denied
  const year = requestedYear(request.nextUrl.searchParams.get('year'))
  if (!WEBAPP_URL || !WEBAPP_SECRET) {
    return NextResponse.json({ exists: true, year, connection: 'unconfigured' as Connection })
  }
  try {
    const r = await webApp('checkYearStructure', year)
    if (r?.ok) return NextResponse.json({ exists: !!r.exists, year, connection: 'ok' as Connection })
    // Το web app απάντησε αλλά αρνήθηκε: λάθος μυστικό ή σφάλμα script
    const detail = String(r?.error || '').slice(0, 200)
    const connection: Connection = /unauthorized/i.test(detail) ? 'unauthorized' : 'unreachable'
    console.error('finance-structure: web app refused:', detail)
    // exists:true → κανένα banner σε αμφιβολία· η βλάβη λέγεται από το connection
    return NextResponse.json({ exists: true, year, connection, detail })
  } catch (err) {
    console.error('finance-structure check failed:', err)
    return NextResponse.json({ exists: true, year, connection: 'unreachable' as Connection })
  }
}

export async function POST(request: NextRequest) {
  const denied = await authorize(true)
  if (denied) return denied
  if (!WEBAPP_URL || !WEBAPP_SECRET) return NextResponse.json({ error: 'Μη διαμορφωμένο' }, { status: 500 })
  try {
    const body = await request.json().catch(() => ({}))
    const year = requestedYear(String(body?.year ?? ''))
    const r = await webApp('createYearStructure', year)
    if (!r.ok) return NextResponse.json({ error: r.error || 'Αποτυχία δημιουργίας' }, { status: 502 })
    return NextResponse.json({ ok: true, year })
  } catch (err) {
    console.error('finance-structure create failed:', err)
    return NextResponse.json({ error: 'Αποτυχία δημιουργίας' }, { status: 502 })
  }
}
