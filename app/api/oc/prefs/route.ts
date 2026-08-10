import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { resolveOcAccess } from '@/lib/ocRoles'
import { OC_LANDING_COOKIE, OC_LAST_SEAT_COOKIE } from '@/components/oc/ocPrefs'

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 365 * 24 * 60 * 60, // 1 year
}

// Persists OC preferences server-side (httpOnly cookies) because client
// storage is unreliable under content blockers/private browsing.
// Body: { landing?: 'oc' | 'members' | 'ask', seat?: string }
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    if (!sessionCookie) {
      return NextResponse.json({ error: 'No active session' }, { status: 401 })
    }
    const decoded = verifyToken(sessionCookie.value)
    if (!decoded || decoded.type !== 'session') {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const access = await resolveOcAccess(decoded.memberId)
    if (!access.isBoard) {
      // Regular members have no OC preferences to set
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const { landing, seat } = body as { landing?: string; seat?: string }

    if (landing !== undefined) {
      if (landing === 'ask') {
        cookieStore.delete(OC_LANDING_COOKIE)
      } else if (landing === 'oc' || landing === 'members') {
        cookieStore.set(OC_LANDING_COOKIE, landing, COOKIE_OPTS)
      } else {
        return NextResponse.json({ error: 'Invalid landing value' }, { status: 400 })
      }
    }

    if (seat !== undefined) {
      // Only seats the member actually holds may be stored
      if (!access.seats.includes(seat as any)) {
        return NextResponse.json({ error: 'Invalid seat' }, { status: 400 })
      }
      cookieStore.set(OC_LAST_SEAT_COOKIE, seat, COOKIE_OPTS)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('OC prefs error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
