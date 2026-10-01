import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { resolveOcAccess } from '@/lib/ocRoles'

export const maxDuration = 60

/**
 * Δράσεις και συμμετέχοντες — για την Επισκόπηση του OC.
 *
 * ΧΩΡΙΣ slug: μόνο η λίστα των δράσεων με μετρητές, ώστε το στοιχείο να
 * ανοίγει γρήγορα.
 * ΜΕ slug: οι συμμετέχοντες ΜΙΑΣ δράσης — φορτώνονται μόνο όταν επιλεγεί,
 * γιατί είναι προσωπικά δεδομένα και δεν υπάρχει λόγος να ταξιδεύουν
 * επειδή κάποιος άνοιξε την Επισκόπηση.
 *
 * Τα ΔΙΑΤΡΟΦΙΚΑ (άρθρο 9) επιστρέφονται, γιατί χωρίς αυτά δεν παραγγέλνεις
 * φαγητό — αλλά η στήλη τους είναι εκτός προεπιλογής στην οθόνη.
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

async function authorize() {
  const store = await cookies()
  const token = store.get('session')?.value
  const decoded = token ? verifyToken(token) : null
  if (!decoded || decoded.type !== 'session') {
    return NextResponse.json({ error: 'Απαιτείται σύνδεση' }, { status: 401 })
  }
  const access = await resolveOcAccess(decoded.memberId)
  if (!access.isBoard) return NextResponse.json({ error: 'Δεν επιτρέπεται' }, { status: 403 })
  return null
}

export async function GET(request: NextRequest) {
  const denied = await authorize()
  if (denied) return denied
  if (!STRAPI_URL || !STRAPI_API_TOKEN) {
    return NextResponse.json({ error: 'Σφάλμα διαμόρφωσης' }, { status: 500 })
  }

  const slug = new URL(request.url).searchParams.get('slug')

  if (!slug) {
    const [evRes, regRes] = await Promise.all([
      strapi('/events?populate[Sessions]=true&sort=StartDate:desc&pagination[limit]=200'),
      // Μόνο ό,τι χρειάζεται ο μετρητής — ΟΧΙ ολόκληρες οι δηλώσεις
      strapi('/event-registrations?fields[0]=Status&populate[event][fields][0]=Slug&pagination[limit]=1000'),
    ])
    const counts = new Map<string, { confirmed: number; pending: number }>()
    for (const r of regRes.json?.data || []) {
      const s = r.event?.Slug
      if (!s) continue
      const c = counts.get(s) || { confirmed: 0, pending: 0 }
      if (r.Status === 'confirmed') c.confirmed++
      else if (r.Status === 'pending') c.pending++
      counts.set(s, c)
    }
    const events = (evRes.json?.data || []).map((e: any) => ({
      documentId: e.documentId, Title: e.Title, Slug: e.Slug, Subtitle: e.Subtitle,
      StartDate: e.StartDate, EndDate: e.EndDate, RegistrationDeadline: e.RegistrationDeadline,
      City: e.City, Venue: e.Venue, Audience: e.Audience,
      Sessions: (e.Sessions || []).map((s: any) => ({ id: s.id, Title: s.Title })),
      counts: counts.get(e.Slug) || { confirmed: 0, pending: 0 },
    }))
    return NextResponse.json({ events })
  }

  const regRes = await strapi(
    `/event-registrations?filters[event][Slug][$eq]=${encodeURIComponent(slug)}`
    + '&sort=createdAt:asc&pagination[limit]=1000')
  const registrations = (regRes.json?.data || []).map((r: any) => ({
    documentId: r.documentId,
    FirstName: r.FirstName, LastName: r.LastName,
    Email: r.Email, Phone: r.Phone,
    Capacity: r.Capacity, CapacityOther: r.CapacityOther,
    Status: r.Status,
    SessionChoices: r.SessionChoices || {},
    OptionAnswers: r.OptionAnswers || {},
    Dietary: r.Dietary || '',
    AgendaTopic: r.AgendaTopic || '',
    GeneralComments: r.GeneralComments || '',
    SubmittedAt: r.SubmittedAt,
  }))
  return NextResponse.json({ registrations })
}
