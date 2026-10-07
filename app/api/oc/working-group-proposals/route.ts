import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { resolveOcAccess, type OcSeat } from '@/lib/ocRoles'
import { effectiveSeat, OC_SEAT_MODE_COOKIE } from '@/lib/ocSeatMode'
import { canArchive, statusPatch, PROPOSAL_STATUSES, type ProposalStatus } from '@/lib/workingGroupProposals'

/**
 * ΠΡΟΤΑΣΕΙΣ ΝΕΩΝ ΟΜΑΔΩΝ ΕΡΓΑΣΙΑΣ — ανάγνωση για όλο το ΔΣ, απόφαση από
 * Συντονισμό, Κοινότητα και IT.
 *
 * Γιατί ΟΧΙ μόνο IT (όπως στα αιτήματα ιστοτόπου): εκεί η κατάσταση είναι
 * τεχνική εκκρεμότητα· εδώ είναι ΚΡΙΣΗ για το αν γεννιέται ομάδα του
 * δικτύου. Το IT μένει μέσα ως δίχτυ ασφαλείας, όχι ως κριτής.
 *
 * ΔΕΝ στέλνεται αυτόματο email στον προτείνοντα όταν αλλάζει η κατάσταση:
 * μια έγκριση ή απόρριψη ομάδας θέλει ανθρώπινα λόγια, όχι πρότυπο.
 */

const DECIDING_SEATS: OcSeat[] = ['coordinator', 'community', 'it']

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

async function strapi(path: string, method: string = 'GET', data?: any) {
  const res = await fetch(`${STRAPI_URL}/api${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
      ...(data !== undefined && { 'Content-Type': 'application/json' }),
    },
    ...(data !== undefined && { body: JSON.stringify({ data }) }),
    cache: 'no-store',
  })
  let json: any = null
  try { json = await res.json() } catch { /* 204 */ }
  return { ok: res.ok, status: res.status, json }
}

async function authorize(needWrite: boolean) {
  const store = await cookies()
  const token = store.get('session')?.value
  const decoded = token ? verifyToken(token) : null
  if (!decoded || decoded.type !== 'session') {
    return { error: NextResponse.json({ error: 'Απαιτείται σύνδεση' }, { status: 401 }) }
  }
  const access = await resolveOcAccess(decoded.memberId)
  if (!access.isBoard) return { error: NextResponse.json({ error: 'Δεν επιτρέπεται' }, { status: 403 }) }
  const seatCookie = store.get('oc-last-seat')?.value as OcSeat | undefined
  const activeSeat = effectiveSeat(
    access.seats as OcSeat[], seatCookie, store.get(OC_SEAT_MODE_COOKIE)?.value)
  if (needWrite && (!activeSeat || !DECIDING_SEATS.includes(activeSeat))) {
    return {
      error: NextResponse.json(
        { error: 'Την πρόταση κρίνουν Συντονισμός, Κοινότητα ή IT' }, { status: 403 }),
    }
  }
  return { memberId: decoded.memberId, activeSeat }
}

const FIELDS =
  'fields[0]=Title&fields[1]=Theme&fields[2]=Goal&fields[3]=MoreInfo'
  + '&fields[4]=ContactPerson&fields[5]=ProposerName&fields[6]=ProposerEmail'
  + '&fields[7]=Phone&fields[8]=Facebook&fields[9]=Links&fields[10]=MemberAm'
  + '&fields[11]=Status&fields[12]=Notes&fields[13]=Archived&fields[14]=ArchivedAt'
  + '&fields[15]=DecidedAt&fields[16]=NotifiedAt&fields[17]=SubmittedAt'

export async function GET() {
  const auth = await authorize(false)
  if ('error' in auth) return auth.error
  if (!STRAPI_URL || !STRAPI_API_TOKEN) {
    return NextResponse.json({ error: 'Σφάλμα διαμόρφωσης' }, { status: 500 })
  }
  const r = await strapi(`/working-group-proposals?sort=createdAt:desc&pagination[limit]=200&${FIELDS}`)
  if (!r.ok) {
    // Η συλλογή μπορεί να μην έχει βγει ακόμη στο Strapi Cloud — το κουτί
    // ανοίγει με εξήγηση αντί να ρίξει τη σελίδα.
    return NextResponse.json({ proposals: [], unavailable: true })
  }
  return NextResponse.json({
    proposals: r.json?.data || [],
    canManage: !!auth.activeSeat && DECIDING_SEATS.includes(auth.activeSeat),
  })
}

export async function PUT(request: NextRequest) {
  const auth = await authorize(true)
  if ('error' in auth) return auth.error
  if (!STRAPI_URL || !STRAPI_API_TOKEN) {
    return NextResponse.json({ error: 'Σφάλμα διαμόρφωσης' }, { status: 500 })
  }

  let body: any
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Μη έγκυρο αίτημα' }, { status: 400 })
  }
  const documentId = String(body?.documentId || '').replace(/[^a-z0-9]/gi, '')
  if (!documentId) return NextResponse.json({ error: 'Λείπει η πρόταση' }, { status: 400 })

  const current = await strapi(`/working-group-proposals/${documentId}?${FIELDS}`)
  if (!current.ok || !current.json?.data) {
    return NextResponse.json({ error: 'Η πρόταση δεν βρέθηκε' }, { status: 404 })
  }
  const row = current.json.data
  const patch: Record<string, any> = {}

  if (body.status !== undefined) {
    if (!PROPOSAL_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: 'Άγνωστη κατάσταση' }, { status: 400 })
    }
    Object.assign(patch, statusPatch(body.status as ProposalStatus))
  }

  if (body.archived !== undefined) {
    const wanted = !!body.archived
    const statusAfter = patch.Status ?? row.Status
    if (wanted && !canArchive(statusAfter)) {
      return NextResponse.json(
        { error: 'Αρχειοθετείται μόνο πρόταση που κρίθηκε' }, { status: 409 })
    }
    patch.Archived = wanted
    patch.ArchivedAt = wanted ? new Date().toISOString() : null
  }

  if (body.notes !== undefined) patch.Notes = String(body.notes || '').trim() || null

  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: 'Καμία αλλαγή' }, { status: 400 })
  }

  const put = await strapi(`/working-group-proposals/${documentId}`, 'PUT', patch)
  if (!put.ok) {
    return NextResponse.json({ error: 'Το Strapi απέρριψε την αλλαγή' }, { status: 502 })
  }
  return NextResponse.json({ ok: true, proposal: put.json?.data || null })
}
