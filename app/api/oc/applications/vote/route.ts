import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { resolveOcAccess, getBoardRoster, SEAT_LABELS, type OcSeat } from '@/lib/ocRoles'
import { sendDecisionToSheet, sheetsConfigured } from '@/lib/googleSheets'

/**
 * OC voting on membership applications (simplified v1).
 *
 * - Every board member can vote Έγκριση/Απόρριψη on a submitted application.
 * - Votes are blind: the UI shows WHO (which roles) voted, never what.
 * - The application is decided when EVERY distinct roster member has voted:
 *   simple majority wins; a tie keeps it pending (IT/Admin can resolve).
 * - IT and Admin are super-voters: their vote decides immediately
 *   (replaces all votes) — agreed simplification for v1.
 * - On decision the Sheet row is moved too (web app action "decide");
 *   a Sheet failure never blocks the decision — Strapi is the source of
 *   truth and the response flags sheetSynced for manual follow-up.
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

const OVERRIDE_SEATS: OcSeat[] = ['it', 'admin']

interface VoteRecord {
  seats: OcSeat[]
  vote: 'approve' | 'reject'
  at: string
}

async function strapi(path: string, method: string = 'GET', data?: any) {
  const res = await fetch(`${STRAPI_URL}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
    },
    ...(data !== undefined && { body: JSON.stringify({ data }) }),
    cache: 'no-store',
  })
  let json: any = null
  try {
    json = await res.json()
  } catch {
    // empty body
  }
  return { ok: res.ok, status: res.status, json }
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')
  const decoded = sessionCookie ? verifyToken(sessionCookie.value) : null
  if (!decoded || decoded.type !== 'session') {
    return NextResponse.json({ error: 'Απαιτείται σύνδεση' }, { status: 401 })
  }
  const access = await resolveOcAccess(decoded.memberId)
  if (!access.isBoard) {
    return NextResponse.json({ error: 'Δεν επιτρέπεται' }, { status: 403 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Μη έγκυρο αίτημα' }, { status: 400 })
  }
  const applicationId = String(body?.applicationId || '').replace(/[^a-z0-9]/gi, '')
  const vote = body?.vote === 'approve' ? 'approve' : body?.vote === 'reject' ? 'reject' : null
  if (!applicationId || !vote) {
    return NextResponse.json({ error: 'Μη έγκυρο αίτημα' }, { status: 400 })
  }

  const appRes = await strapi(`/membership-applications/${applicationId}`)
  const app = appRes.json?.data
  if (!app) {
    return NextResponse.json({ error: 'Η αίτηση δεν βρέθηκε' }, { status: 404 })
  }
  if (app.ApplicationState !== 'submitted') {
    return NextResponse.json(
      { error: 'Η αίτηση έχει ήδη κριθεί', state: app.ApplicationState },
      { status: 409 }
    )
  }

  const votes: Record<string, VoteRecord> =
    app.Votes && typeof app.Votes === 'object' && !Array.isArray(app.Votes) ? { ...app.Votes } : {}
  votes[decoded.memberId] = { seats: access.seats, vote, at: new Date().toISOString() }

  const isOverride = access.seats.some(s => OVERRIDE_SEATS.includes(s))

  let finalState: 'approved' | 'rejected' | null = null
  let decisionBy = ''

  if (isOverride) {
    // IT/Admin: η ψήφος αντικαθιστά όλες τις ψήφους (συμφωνημένη απλοποίηση v1)
    finalState = vote === 'approve' ? 'approved' : 'rejected'
    const label = access.seats.filter(s => OVERRIDE_SEATS.includes(s)).map(s => SEAT_LABELS[s]).join('/')
    decisionBy = `OC — ${label} (καθολική απόφαση)`
  } else {
    const roster = await getBoardRoster()
    const allVoted = roster.length > 0 && roster.every(r => votes[r.memberDocumentId])
    if (allVoted) {
      const tally = Object.values(votes).reduce(
        (t, v) => { t[v.vote]++; return t },
        { approve: 0, reject: 0 }
      )
      if (tally.approve > tally.reject) finalState = 'approved'
      else if (tally.reject > tally.approve) finalState = 'rejected'
      // Ισοψηφία: παραμένει submitted — IT/Admin λύνει
      decisionBy = finalState ? `OC — ψηφοφορία ΔΣ (${tally.approve}-${tally.reject})` : ''
    }
  }

  const update: Record<string, any> = { Votes: votes }
  if (finalState) {
    update.ApplicationState = finalState
    update.DecisionDate = new Date().toISOString()
    update.DecisionBy = decisionBy
  }
  const put = await strapi(`/membership-applications/${applicationId}`, 'PUT', update)
  if (!put.ok) {
    return NextResponse.json({ error: 'Αποτυχία καταχώρησης ψήφου' }, { status: 502 })
  }

  // Sheet: μεταφορά γραμμής (best-effort — δεν μπλοκάρει την απόφαση)
  let sheetSynced: boolean | null = null
  if (finalState && app.Email) {
    if (sheetsConfigured()) {
      try {
        await sendDecisionToSheet(String(app.Email).trim(), finalState)
        sheetSynced = true
      } catch (err) {
        console.error('vote: sheet decide failed:', err)
        sheetSynced = false
      }
    } else {
      sheetSynced = false
    }
  }

  // Ρόλοι που έχουν ψηφίσει (ποτέ ΤΙ ψήφισαν)
  const votedSeats = Array.from(
    new Set(Object.values(votes).flatMap(v => v.seats))
  ).map(s => SEAT_LABELS[s as OcSeat] || s)

  return NextResponse.json({
    ok: true,
    state: finalState || 'submitted',
    myVote: vote,
    votedSeats,
    ...(finalState && { sheetSynced }),
  })
}
