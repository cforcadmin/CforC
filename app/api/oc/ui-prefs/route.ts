import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { resolveOcAccess } from '@/lib/ocRoles'

/**
 * Προτιμήσεις οθόνης του OC ανά χρήστη: πλάτη στηλών και σειρά καρτών.
 *
 * Ζουν στον server (πεδίο OcPrefs του μέλους) και όχι στον browser: η τοπική
 * αποθήκευση αποδείχθηκε αναξιόπιστη (private mode, καθαρισμός site data),
 * και έτσι η διάταξη ακολουθεί τον άνθρωπο σε κάθε συσκευή.
 *
 *   GET            → { colWidths, layout }
 *   PUT {colWidths} → συγχώνευση ανά πίνακα
 *   PUT {layout}    → συγχώνευση ανά θέση/ενότητα
 *   PUT {reset:'all'|{section,seat}} → επαναφορά προεπιλογής
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

export interface OcUiPrefs {
  /** { tableId: { columnKey: πλάτος σε px } } */
  colWidths?: Record<string, Record<string, number>>
  /** { seat: { section: [ids καρτών με τη σειρά τους] } } */
  layout?: Record<string, Record<string, string[]>>
}

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

/** Καθαρισμός: μόνο θετικοί αριθμοί σε λογικά όρια, μόνο συμβολοσειρές στη σειρά */
function cleanWidths(raw: any): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {}
  if (!raw || typeof raw !== 'object') return out
  for (const [table, cols] of Object.entries(raw).slice(0, 20)) {
    if (!cols || typeof cols !== 'object') continue
    const t: Record<string, number> = {}
    for (const [key, w] of Object.entries(cols as Record<string, unknown>).slice(0, 40)) {
      const n = Math.round(Number(w))
      if (Number.isFinite(n) && n >= 40 && n <= 1200) t[String(key).slice(0, 40)] = n
    }
    if (Object.keys(t).length) out[String(table).slice(0, 40)] = t
  }
  return out
}
function cleanLayout(raw: any): Record<string, Record<string, string[]>> {
  const out: Record<string, Record<string, string[]>> = {}
  if (!raw || typeof raw !== 'object') return out
  for (const [seat, sections] of Object.entries(raw).slice(0, 10)) {
    if (!sections || typeof sections !== 'object') continue
    const s: Record<string, string[]> = {}
    for (const [section, ids] of Object.entries(sections as Record<string, unknown>).slice(0, 20)) {
      if (!Array.isArray(ids)) continue
      s[String(section).slice(0, 40)] = ids.map(v => String(v).slice(0, 60)).slice(0, 40)
    }
    if (Object.keys(s).length) out[String(seat).slice(0, 20)] = s
  }
  return out
}

async function readPrefs(memberId: string): Promise<OcUiPrefs> {
  const r = await strapi(`/members/${memberId}?fields[0]=OcPrefs`)
  const raw = r.json?.data?.OcPrefs
  if (!raw || typeof raw !== 'object') return {}
  return { colWidths: cleanWidths(raw.colWidths), layout: cleanLayout(raw.layout) }
}

export async function GET() {
  const auth = await authorize()
  if ('error' in auth) return auth.error
  try {
    return NextResponse.json(await readPrefs(auth.memberId))
  } catch {
    // Μη κρίσιμο: χωρίς προτιμήσεις, οι πίνακες δείχνουν τις προεπιλογές
    return NextResponse.json({})
  }
}

export async function PUT(request: Request) {
  const auth = await authorize()
  if ('error' in auth) return auth.error
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Μη έγκυρο αίτημα' }, { status: 400 })

  const current = await readPrefs(auth.memberId)
  let next: OcUiPrefs = { colWidths: current.colWidths || {}, layout: current.layout || {} }

  if (body.reset === 'all') {
    next = { colWidths: {}, layout: {} }
  } else if (body.reset && typeof body.reset === 'object') {
    // Επαναφορά μίας ενότητας για μία θέση
    const seat = String(body.reset.seat || '').slice(0, 20)
    const section = String(body.reset.section || '').slice(0, 40)
    if (next.layout?.[seat]) delete next.layout[seat][section]
  } else {
    for (const [table, cols] of Object.entries(cleanWidths(body.colWidths))) {
      next.colWidths![table] = { ...(next.colWidths![table] || {}), ...cols }
    }
    for (const [seat, sections] of Object.entries(cleanLayout(body.layout))) {
      next.layout![seat] = { ...(next.layout![seat] || {}), ...sections }
    }
  }

  const r = await strapi(`/members/${auth.memberId}`, 'PUT', { OcPrefs: next })
  if (!r.ok) {
    console.error('oc/ui-prefs: save failed', r.status)
    return NextResponse.json({ error: 'Αποτυχία αποθήκευσης' }, { status: 502 })
  }
  return NextResponse.json({ ok: true, ...next })
}
