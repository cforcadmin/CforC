import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { resolveOcAccess, type OcSeat } from '@/lib/ocRoles'

export const maxDuration = 60

/**
 * Οπλισμός/αφοπλισμός αυτόματων υπενθυμίσεων προθεσμίας.
 *
 * Οι υπενθυμίσεις δεν τρέχουν από μόνες τους: κάποιος τις ενεργοποιεί —
 * για μία αίτηση ή για όλη τη λίστα των εγκεκριμένων που δεν πλήρωσαν.
 * Επιτρέπεται σε Ταμία, Κοινότητα και Γραμματεία/IT.
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN
const ALLOWED: OcSeat[] = ['financer', 'community', 'admin', 'it']

async function strapi(path: string, method = 'GET', data?: any) {
  const res = await fetch(`${STRAPI_URL}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${STRAPI_API_TOKEN}` },
    ...(data !== undefined && { body: JSON.stringify({ data }) }),
    cache: 'no-store',
  })
  let json: any = null
  try { json = await res.json() } catch { /* 204 */ }
  return { ok: res.ok, status: res.status, json }
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')
  const decoded = sessionCookie ? verifyToken(sessionCookie.value) : null
  if (!decoded || decoded.type !== 'session') {
    return NextResponse.json({ error: 'Απαιτείται σύνδεση' }, { status: 401 })
  }
  const access = await resolveOcAccess(decoded.memberId)
  if (!access.isBoard) return NextResponse.json({ error: 'Δεν επιτρέπεται' }, { status: 403 })
  const seatCookie = cookieStore.get('oc-last-seat')?.value as OcSeat | undefined
  const activeSeat: OcSeat | null =
    seatCookie && access.seats.includes(seatCookie) ? seatCookie
      : access.seats.length === 1 ? access.seats[0] : null
  if (!activeSeat || !ALLOWED.includes(activeSeat)) {
    return NextResponse.json({ error: 'Μόνο Ταμίας, Κοινότητα ή Γραμματεία' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const armed = body?.armed !== false
  const all = body?.all === true
  const id = String(body?.id || '').replace(/[^a-z0-9]/gi, '')
  if (!all && !id) return NextResponse.json({ error: 'Λείπει η αίτηση' }, { status: 400 })

  const stamp = armed
    ? { AutoRemindersArmed: true, AutoRemindersArmedAt: new Date().toISOString(), AutoRemindersArmedBy: `member:${decoded.memberId}` }
    : { AutoRemindersArmed: false }

  try {
    if (!all) {
      const r = await strapi(`/membership-applications/${id}`, 'PUT', stamp)
      if (!r.ok) return NextResponse.json({ error: 'Αποτυχία' }, { status: 502 })
      return NextResponse.json({ ok: true, armed, count: 1 })
    }

    // Όλη η λίστα: εγκεκριμένες, χωρίς δήλωση πληρωμής
    const list = await strapi(
      '/membership-applications?filters[ApplicationState][$eq]=approved&pagination[limit]=200&fields[0]=PaymentClaimedAt',
    )
    if (!list.ok) return NextResponse.json({ error: 'Αποτυχία ανάγνωσης' }, { status: 502 })
    const targets = (list.json?.data || []).filter((a: any) => !a.PaymentClaimedAt)
    let count = 0
    for (const a of targets) {
      const r = await strapi(`/membership-applications/${a.documentId}`, 'PUT', stamp)
      if (r.ok) count++
    }
    return NextResponse.json({ ok: true, armed, count })
  } catch (err) {
    console.error('arm-reminders failed:', err)
    return NextResponse.json({ error: 'Αποτυχία' }, { status: 502 })
  }
}
