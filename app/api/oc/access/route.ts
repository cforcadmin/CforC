import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { resolveOcAccess, type OcSeat } from '@/lib/ocRoles'
import {
  KEY_CATALOGUE, judgeAccess, worstAccess, keyAgeDays,
  type VercelKey, type AccessFinding, type AccessSeverity,
} from '@/lib/ocAccess'

export const maxDuration = 60

/**
 * Ασφάλεια++ → Πρόσβαση & μυστικά. ΜΟΝΟ για τη θέση IT.
 *
 * ΜΟΝΟ ΑΝΑΦΟΡΑ. Καμία ενέργεια: τίποτα δεν σβήνεται, δεν αλλάζει και δεν
 * εναλλάσσεται από εδώ. Η οθόνη λέει τι βλέπει και πού να πατήσει ο άνθρωπος.
 *
 * ΚΑΜΙΑ ΤΙΜΗ ΜΥΣΤΙΚΟΥ δεν φεύγει από αυτή τη διαδρομή. Το Vercel επιστρέφει
 * `value` για τα μη κρυπτογραφημένα κλειδιά· διαλέγουμε ΡΗΤΑ πέντε πεδία και
 * το `value` δεν είναι ανάμεσά τους. Όποιος προσθέσει πεδίο εδώ, ας το θυμηθεί.
 */

async function authorizeIt() {
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
  if (activeSeat !== 'it') return NextResponse.json({ error: 'Μόνο το IT' }, { status: 403 })
  return null
}

export interface AccessPayload {
  /** Μπόρεσε να ρωτήσει το Vercel; Αλλιώς η οθόνη λέει γιατί όχι. */
  vercel: 'ok' | 'unconfigured' | 'error'
  vercelDetail?: string
  state: AccessSeverity
  findings: AccessFinding[]
  /** Ηλικία κάθε κλειδιού — ΔΕΙΧΝΕΤΑΙ, δεν κρίνεται */
  keys: Array<{ key: string; targets: string[]; ageDays: number | null; known: boolean }>
  checkedAt: string
}

export async function GET() {
  const denied = await authorizeIt()
  if (denied) return denied

  const token = process.env.VERCEL_API_TOKEN
  const projectId = process.env.VERCEL_PROJECT_ID

  if (!token || !projectId) {
    const payload: AccessPayload = {
      vercel: 'unconfigured',
      vercelDetail: 'λείπει το VERCEL_API_TOKEN ή το VERCEL_PROJECT_ID',
      state: 'warn',
      findings: [],
      keys: [],
      checkedAt: new Date().toISOString(),
    }
    return NextResponse.json(payload)
  }

  const teamQs = process.env.VERCEL_TEAM_ID ? `?teamId=${encodeURIComponent(process.env.VERCEL_TEAM_ID)}` : ''
  let vercelKeys: VercelKey[] = []
  try {
    const r = await fetch(
      `https://api.vercel.com/v9/projects/${encodeURIComponent(projectId)}/env${teamQs}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
    if (!r.ok) {
      const payload: AccessPayload = {
        vercel: 'error',
        vercelDetail: `Vercel API ${r.status}`,
        state: 'warn',
        findings: [],
        keys: [],
        checkedAt: new Date().toISOString(),
      }
      return NextResponse.json(payload)
    }
    const j = await r.json()
    // ΡΗΤΗ επιλογή πεδίων. Το `value` ΔΕΝ αντιγράφεται πουθενά.
    vercelKeys = (j?.envs || []).map((e: Record<string, unknown>): VercelKey => ({
      key: String(e.key || ''),
      targets: Array.isArray(e.target) ? e.target.map(String) : e.target ? [String(e.target)] : [],
      type: e.type ? String(e.type) : undefined,
      createdAt: typeof e.createdAt === 'number' ? e.createdAt : undefined,
      updatedAt: typeof e.updatedAt === 'number' ? e.updatedAt : undefined,
    })).filter((k: VercelKey) => k.key)
  } catch {
    const payload: AccessPayload = {
      vercel: 'error',
      vercelDetail: 'δεν απάντησε το Vercel',
      state: 'warn',
      findings: [],
      keys: [],
      checkedAt: new Date().toISOString(),
    }
    return NextResponse.json(payload)
  }

  const findings = judgeAccess(vercelKeys)
  const known = new Set(KEY_CATALOGUE.map(s => s.key))
  const payload: AccessPayload = {
    vercel: 'ok',
    state: worstAccess(findings),
    findings,
    keys: vercelKeys
      .map(k => ({
        key: k.key,
        targets: k.targets,
        ageDays: keyAgeDays(k),
        known: known.has(k.key),
      }))
      .sort((a, b) => (b.ageDays ?? -1) - (a.ageDays ?? -1)),
    checkedAt: new Date().toISOString(),
  }
  return NextResponse.json(payload)
}
