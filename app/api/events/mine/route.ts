import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'

/**
 * Οι δράσεις και οι ΔΙΚΕΣ ΜΟΥ δηλώσεις — για το /profile#events.
 *
 * Επιστρέφει ΜΟΝΟ τις δηλώσεις του συνδεδεμένου μέλους. Το φιλτράρισμα
 * γίνεται με το documentId της συνεδρίας, ΠΟΤΕ με κάτι που στέλνει ο
 * browser: αλλιώς θα αρκούσε να αλλάξει κανείς μια παράμετρο για να δει
 * τις δηλώσεις άλλου.
 *
 * Τα ΔΙΑΤΡΟΦΙΚΑ δεν επιστρέφονται ποτέ από εδώ (είναι private στο Strapi
 * και δεν τα ζητάμε): η οθόνη δεν τα χρειάζεται για να πει «δήλωσες».
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

async function strapi(path: string) {
  const res = await fetch(`${STRAPI_URL}/api${path}`, {
    headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` }, cache: 'no-store',
  })
  let json: any = null
  try { json = await res.json() } catch { /* 204 */ }
  return { ok: res.ok, json }
}

export async function GET() {
  if (!STRAPI_URL || !STRAPI_API_TOKEN) {
    return NextResponse.json({ events: [], registrations: [] })
  }
  const store = await cookies()
  const token = store.get('session')?.value
  const decoded = token ? verifyToken(token) : null
  if (!decoded || decoded.type !== 'session') {
    return NextResponse.json({ error: 'Απαιτείται σύνδεση' }, { status: 401 })
  }

  const [evRes, regRes] = await Promise.all([
    strapi('/events?populate[Sessions]=true&sort=StartDate:desc&pagination[limit]=100'),
    strapi(
      `/event-registrations?filters[linkedMember][documentId][$eq]=${encodeURIComponent(decoded.memberId)}`
      + '&populate[event]=true&sort=createdAt:desc&pagination[limit]=100'),
  ])

  const events = (evRes.json?.data || []).map((e: any) => ({
    documentId: e.documentId, Title: e.Title, Slug: e.Slug, Subtitle: e.Subtitle,
    StartDate: e.StartDate, EndDate: e.EndDate, RegistrationDeadline: e.RegistrationDeadline,
    RegistrationOpen: e.RegistrationOpen, City: e.City, Venue: e.Venue, Audience: e.Audience,
  }))

  const registrations = (regRes.json?.data || []).map((r: any) => ({
    documentId: r.documentId,
    Status: r.Status,
    Capacity: r.Capacity,
    SessionChoices: r.SessionChoices || {},
    OptionAnswers: r.OptionAnswers || {},
    SubmittedAt: r.SubmittedAt,
    eventSlug: r.event?.Slug || null,
    eventTitle: r.event?.Title || null,
  }))

  return NextResponse.json({ events, registrations })
}
