import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { resolveOcAccess } from '@/lib/ocRoles'

export const maxDuration = 60

/**
 * Παρουσίες σε δράσεις.
 *
 *  GET  ?year=2026 → όλες οι καταγραφές της χρονιάς (για τους δείκτες)
 *  GET  ?eventId=  → μία καταγραφή
 *  PUT  {eventId, eventTitle, eventDate, …} → upsert
 *
 * Γράφει όλο το ΔΣ: η καταγραφή γίνεται αμέσως μετά τη δράση, από όποιον
 * ήταν εκεί — αν χρειαζόταν συγκεκριμένος ρόλος, δεν θα γινόταν ποτέ.
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

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

async function authorize() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')
  const decoded = sessionCookie ? verifyToken(sessionCookie.value) : null
  if (!decoded || decoded.type !== 'session') {
    return { error: NextResponse.json({ error: 'Απαιτείται σύνδεση' }, { status: 401 }) }
  }
  const access = await resolveOcAccess(decoded.memberId)
  if (!access.isBoard) return { error: NextResponse.json({ error: 'Δεν επιτρέπεται' }, { status: 403 }) }
  return { memberId: decoded.memberId }
}

const POPULATE = 'populate[attendees][fields][0]=Name&populate[attendees][fields][1]=Gender'

function shape(r: any) {
  const attendees = (r.attendees || []).map((a: any) => ({
    documentId: a.documentId, name: a.Name, gender: a.Gender || null,
  }))
  return {
    documentId: r.documentId,
    eventId: r.EventId,
    eventTitle: r.EventTitle,
    eventDate: r.EventDate,
    eventCategory: r.EventCategory || null,
    attendees,
    memberCount: attendees.length,
    nonMemberCount: r.NonMemberCount ?? 0,
    guestNames: r.GuestNames || null,
    notes: r.Notes || null,
    recordedAt: r.RecordedAt || null,
  }
}

export async function GET(request: NextRequest) {
  const auth = await authorize()
  if ('error' in auth) return auth.error
  const eventId = request.nextUrl.searchParams.get('eventId')
  const year = request.nextUrl.searchParams.get('year')
  try {
    let q = `/event-attendances?pagination[limit]=500&sort=EventDate:desc&${POPULATE}`
    if (eventId) q += `&filters[EventId][$eq]=${encodeURIComponent(eventId)}`
    else if (year && /^\d{4}$/.test(year)) {
      q += `&filters[EventDate][$gte]=${year}-01-01&filters[EventDate][$lte]=${year}-12-31`
    }
    const r = await strapi(q)
    if (!r.ok) return NextResponse.json({ records: [], unconfigured: true })
    return NextResponse.json({ records: (r.json?.data || []).map(shape) })
  } catch (err) {
    console.error('oc/attendance GET failed:', err)
    return NextResponse.json({ error: 'Αποτυχία φόρτωσης' }, { status: 502 })
  }
}

export async function PUT(request: NextRequest) {
  const auth = await authorize()
  if ('error' in auth) return auth.error
  const body = await request.json().catch(() => null)
  const eventId = String(body?.eventId || '').trim()
  const eventTitle = String(body?.eventTitle || '').trim()
  const eventDate = String(body?.eventDate || '').slice(0, 10)
  if (!eventId || !eventTitle || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
    return NextResponse.json({ error: 'Λείπουν στοιχεία γεγονότος' }, { status: 400 })
  }
  const nonMember = Number(body?.nonMemberCount)
  const payload: Record<string, any> = {
    EventId: eventId,
    EventTitle: eventTitle,
    EventDate: eventDate,
    EventCategory: String(body?.eventCategory || '').trim() || null,
    attendees: Array.isArray(body?.attendees)
      ? [...new Set(body.attendees.map((a: any) => String(a).replace(/[^a-z0-9]/gi, '')).filter(Boolean))]
      : [],
    NonMemberCount: Number.isFinite(nonMember) && nonMember >= 0 ? Math.round(nonMember) : 0,
    GuestNames: String(body?.guestNames || '').trim() || null,
    Notes: String(body?.notes || '').trim() || null,
    RecordedBy: `member:${auth.memberId}`,
    RecordedAt: new Date().toISOString(),
  }
  try {
    const found = await strapi(`/event-attendances?filters[EventId][$eq]=${encodeURIComponent(eventId)}&pagination[limit]=1`)
    const existing = found.json?.data?.[0]
    const r = existing
      ? await strapi(`/event-attendances/${existing.documentId}`, 'PUT', payload)
      : await strapi('/event-attendances', 'POST', payload)
    if (!r.ok) {
      console.error('attendance save failed', r.status, JSON.stringify(r.json?.error?.message || ''))
      return NextResponse.json({ error: 'Αποτυχία καταχώρησης' }, { status: 502 })
    }
    return NextResponse.json({ ok: true, documentId: r.json?.data?.documentId })
  } catch (err) {
    console.error('oc/attendance PUT failed:', err)
    return NextResponse.json({ error: 'Αποτυχία καταχώρησης' }, { status: 502 })
  }
}
