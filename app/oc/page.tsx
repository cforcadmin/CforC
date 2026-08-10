import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { verifyToken } from '@/lib/auth'
import { resolveOcAccess } from '@/lib/ocRoles'
import OcShell from '@/components/oc/OcShell'
import { OC_LANDING_COOKIE, OC_LAST_SEAT_COOKIE } from '@/components/oc/ocPrefs'

export const metadata: Metadata = {
  title: 'Operational Center | Culture for Change',
  robots: { index: false, follow: false },
}

// Hard server-side gate. Regular members must NEVER reach the OC:
// no session, invalid session, or a session whose member does not hold a
// seat on the current Coordination Team → silent redirect to the homepage.
// The UI buttons elsewhere are cosmetic; this check is the actual barrier.
export default async function OcPage() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')
  if (!sessionCookie) redirect('/')

  const decoded = verifyToken(sessionCookie.value)
  if (!decoded || decoded.type !== 'session') redirect('/')

  const access = await resolveOcAccess(decoded.memberId)
  if (!access.isBoard) redirect('/')

  // Server-stored preferences (httpOnly cookies — survive content blockers)
  const landingPref = cookieStore.get(OC_LANDING_COOKIE)?.value || null
  const lastSeatRaw = cookieStore.get(OC_LAST_SEAT_COOKIE)?.value || null
  const initialSeat = lastSeatRaw && access.seats.includes(lastSeatRaw as any) ? lastSeatRaw : null

  // Applications for Επισκόπηση (pending) and Μέλη → Νέα μέλη (all states)
  let applications: Array<{ id: string; name: string; state: string; submittedAt: string | null }> = []
  try {
    const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
    const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN
    if (STRAPI_URL && STRAPI_API_TOKEN) {
      const res = await fetch(
        `${STRAPI_URL}/api/membership-applications?fields[0]=FirstName&fields[1]=LastName&fields[2]=ApplicationState&fields[3]=SubmittedAt&sort=SubmittedAt:desc&pagination[limit]=100`,
        { headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` }, cache: 'no-store' }
      )
      if (res.ok) {
        const json = await res.json()
        applications = (json?.data || []).map((a: any) => ({
          id: a.documentId,
          name: `${a.FirstName || ''} ${a.LastName || ''}`.trim(),
          state: a.ApplicationState || 'submitted',
          submittedAt: a.SubmittedAt || null,
        }))
      }
    }
  } catch {
    // OC still renders without application data
  }

  return (
    <OcShell
      seats={access.seats}
      initialSeat={initialSeat}
      initialLandingPref={landingPref || 'ask'}
      applications={applications}
    />
  )
}
