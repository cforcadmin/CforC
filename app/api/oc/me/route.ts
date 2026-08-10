import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { resolveOcAccess } from '@/lib/ocRoles'
import { OC_LANDING_COOKIE, OC_LAST_SEAT_COOKIE } from '@/components/oc/ocPrefs'

// Returns the caller's own OC access + server-stored preferences.
// Never exposes who else sits on the board. Regular members (and anonymous
// visitors) get isBoard: false — a 200, not an error, so client code can
// probe without noise.
export async function GET() {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    if (!sessionCookie) {
      return NextResponse.json({ isBoard: false, seats: [] })
    }

    const decoded = verifyToken(sessionCookie.value)
    if (!decoded || decoded.type !== 'session') {
      return NextResponse.json({ isBoard: false, seats: [] })
    }

    const access = await resolveOcAccess(decoded.memberId)
    if (!access.isBoard) {
      return NextResponse.json({ isBoard: false, seats: [] })
    }

    const landingPref = cookieStore.get(OC_LANDING_COOKIE)?.value || null
    const lastSeatRaw = cookieStore.get(OC_LAST_SEAT_COOKIE)?.value || null
    const lastSeat = lastSeatRaw && access.seats.includes(lastSeatRaw as any) ? lastSeatRaw : null

    return NextResponse.json({ ...access, landingPref, lastSeat })
  } catch (error) {
    console.error('OC me error:', error)
    return NextResponse.json({ isBoard: false, seats: [] })
  }
}
