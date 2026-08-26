import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { resolveOcAccess } from '@/lib/ocRoles'
import {
  OC_LANDING_COOKIE, OC_LAST_SEAT_COOKIE, OC_HERO_COMPACT_COOKIE,
  OC_TABLE_COLS_COOKIE, OC_TABLE_DENSITY_COOKIE, OC_TABLE_COLUMNS,
} from '@/components/oc/ocPrefs'

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
    const { landing, seat, tableCols, tableDensity, heroCompact } = body as {
      landing?: string; seat?: string; tableCols?: string; tableDensity?: string
      heroCompact?: boolean
    }

    if (heroCompact !== undefined) {
      if (heroCompact) cookieStore.set(OC_HERO_COMPACT_COOKIE, '1', COOKIE_OPTS)
      else cookieStore.delete(OC_HERO_COMPACT_COOKIE)
    }

    if (tableCols !== undefined) {
      const valid = new Set(OC_TABLE_COLUMNS.map(c => c.key))
      const cols = String(tableCols).split(',').map(s => s.trim()).filter(k => valid.has(k))
      cookieStore.set(OC_TABLE_COLS_COOKIE, cols.join(','), COOKIE_OPTS)
    }
    if (tableDensity !== undefined) {
      if (tableDensity !== 'comfortable' && tableDensity !== 'compact') {
        return NextResponse.json({ error: 'Invalid density' }, { status: 400 })
      }
      cookieStore.set(OC_TABLE_DENSITY_COOKIE, tableDensity, COOKIE_OPTS)
    }

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
