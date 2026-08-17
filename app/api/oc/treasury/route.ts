import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { resolveOcAccess, type OcSeat } from '@/lib/ocRoles'
import { athensToday } from '@/lib/receipts'

/**
 * Ταμείο — χειροκίνητη μέτρηση υπολοίπου.
 *
 * Το υπόλοιπο ΔΕΝ υπολογίζεται από τις κινήσεις: το διαβάζει ο/η Financer
 * από την τράπεζα και το καταχωρεί. Κάθε μέτρηση κρατιέται (δεν πατάει την
 * προηγούμενη), ώστε το πλακίδιο να μπορεί να δείξει και πορεία.
 *
 *  GET  → τελευταία μέτρηση + ιστορικό + αν λείπει μέτρηση τρέχοντος μήνα
 *  POST → νέα μέτρηση (ΜΟΝΟ ενεργός ρόλος Financer)
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

async function strapi(path: string, method: string = 'GET', data?: any) {
  const res = await fetch(`${STRAPI_URL}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${STRAPI_API_TOKEN}` },
    ...(data !== undefined && { body: JSON.stringify({ data }) }),
    cache: 'no-store',
  })
  let json: any = null
  try { json = await res.json() } catch { /* non-JSON */ }
  return { ok: res.ok, status: res.status, json }
}

async function authorize(needFinancer: boolean) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')
  const decoded = sessionCookie ? verifyToken(sessionCookie.value) : null
  if (!decoded || decoded.type !== 'session') {
    return { error: NextResponse.json({ error: 'Απαιτείται σύνδεση' }, { status: 401 }) }
  }
  const access = await resolveOcAccess(decoded.memberId)
  if (!access.isBoard) return { error: NextResponse.json({ error: 'Δεν επιτρέπεται' }, { status: 403 }) }
  if (needFinancer) {
    const seatCookie = cookieStore.get('oc-last-seat')?.value as OcSeat | undefined
    const activeSeat: OcSeat | null =
      seatCookie && access.seats.includes(seatCookie) ? seatCookie
        : access.seats.length === 1 ? access.seats[0] : null
    if (activeSeat !== 'financer') {
      return { error: NextResponse.json({ error: 'Μόνο ο/η Financer μπορεί να ενημερώσει το ταμείο' }, { status: 403 }) }
    }
  }
  return { memberId: decoded.memberId }
}

/** Λείπει μέτρηση για τον τρέχοντα μήνα; */
export function isStale(asOf: string | null | undefined): boolean {
  if (!asOf) return true
  return String(asOf).slice(0, 7) < athensToday().slice(0, 7)
}

export async function GET() {
  const auth = await authorize(false)
  if ('error' in auth) return auth.error
  try {
    const r = await strapi('/treasury-balances?sort=AsOf:desc&pagination[limit]=12')
    if (!r.ok) {
      // Η συλλογή μπορεί να μην έχει φτάσει ακόμη στο Strapi Cloud
      return NextResponse.json({ latest: null, history: [], stale: false, unconfigured: true })
    }
    const rows = (r.json?.data || []).map((x: any) => ({
      documentId: x.documentId,
      bank: Number(x.Bank) || 0,
      cash: x.Cash === null || x.Cash === undefined ? null : Number(x.Cash),
      asOf: x.AsOf,
      notes: x.Notes || null,
      recordedBy: x.RecordedBy || null,
    }))
    const latest = rows[0] || null
    return NextResponse.json({
      latest,
      history: rows.slice(0, 6),
      stale: isStale(latest?.asOf),
      currentMonth: athensToday().slice(0, 7),
    })
  } catch (err) {
    console.error('oc/treasury GET failed:', err)
    return NextResponse.json({ error: 'Αποτυχία φόρτωσης ταμείου' }, { status: 502 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await authorize(true)
  if ('error' in auth) return auth.error

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Μη έγκυρο αίτημα' }, { status: 400 })
  }

  const bank = Number(body?.bank)
  const cashRaw = body?.cash
  const cash = cashRaw === '' || cashRaw === null || cashRaw === undefined ? null : Number(cashRaw)
  const asOf = String(body?.asOf || '').trim() || athensToday()

  if (!Number.isFinite(bank)) {
    return NextResponse.json({ error: 'Δώσε το υπόλοιπο τράπεζας' }, { status: 400 })
  }
  if (cash !== null && !Number.isFinite(cash)) {
    return NextResponse.json({ error: 'Μη έγκυρο ποσό μετρητών' }, { status: 400 })
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) {
    return NextResponse.json({ error: 'Μη έγκυρη ημερομηνία' }, { status: 400 })
  }
  if (asOf > athensToday()) {
    return NextResponse.json({ error: 'Η ημερομηνία δεν μπορεί να είναι στο μέλλον' }, { status: 400 })
  }

  try {
    const r = await strapi('/treasury-balances', 'POST', {
      AsOf: asOf,
      Bank: bank,
      Cash: cash,
      Notes: String(body?.notes || '').trim() || null,
      RecordedBy: `financer:${auth.memberId}`,
    })
    if (!r.ok) {
      console.error('treasury create failed', r.status, JSON.stringify(r.json?.error?.message || ''))
      return NextResponse.json({ error: 'Αποτυχία καταχώρησης' }, { status: 502 })
    }
    return NextResponse.json({ ok: true, bank, cash, asOf })
  } catch (err) {
    console.error('oc/treasury POST failed:', err)
    return NextResponse.json({ error: 'Αποτυχία καταχώρησης' }, { status: 502 })
  }
}
