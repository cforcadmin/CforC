import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { LIB_COLS_COOKIE, LIB_DENSITY_COOKIE, LIB_INTRO_COOKIE, LIB_COLUMNS } from '@/components/library/libraryPrefs'

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 365 * 24 * 60 * 60,
}

/** Body: { cols?: string[], density?: 'comfortable'|'compact', introSeen?: boolean } */
export async function POST(request: NextRequest) {
  const store = await cookies()
  const session = store.get('session')
  const decoded = session ? verifyToken(session.value) : null
  if (!decoded || decoded.type !== 'session') {
    return NextResponse.json({ error: 'Απαιτείται σύνδεση' }, { status: 401 })
  }
  const body = await request.json().catch(() => ({}))
  const res = NextResponse.json({ ok: true })

  if (Array.isArray(body.cols)) {
    const valid = LIB_COLUMNS.map(c => c.key)
    res.cookies.set(LIB_COLS_COOKIE, body.cols.filter((c: unknown): c is string => typeof c === 'string' && valid.includes(c)).join(','), COOKIE_OPTS)
  }
  if (body.density === 'comfortable' || body.density === 'compact') {
    res.cookies.set(LIB_DENSITY_COOKIE, body.density, COOKIE_OPTS)
  }
  if (body.introSeen === true) res.cookies.set(LIB_INTRO_COOKIE, '1', COOKIE_OPTS)
  return res
}

/** Ο client δεν διαβάζει httpOnly cookies — τα ζητά από εδώ */
export async function GET() {
  const store = await cookies()
  const raw = store.get(LIB_COLS_COOKIE)?.value
  return NextResponse.json({
    cols: raw === undefined ? null : raw.split(',').filter(Boolean),
    density: store.get(LIB_DENSITY_COOKIE)?.value === 'compact' ? 'compact' : 'comfortable',
    introSeen: store.get(LIB_INTRO_COOKIE)?.value === '1',
  })
}
