import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken, generatePaymentClaimToken } from '@/lib/auth'
import { resolveOcAccess, getBoardRoster, getSeatHolder, isVoter, voteWeight, SEAT_LABELS, type OcSeat } from '@/lib/ocRoles'
import { sendDecisionToSheet, sheetsConfigured } from '@/lib/googleSheets'
import { sendOcEmail, approvedEmailHtml, approvedLegacyEmailHtml, paymentClaimUrl, COMMUNITY_FROM, COMMUNITY_EMAIL, FINANCE_EMAIL, ADMIN_EMAIL } from '@/lib/ocEmails'
import { OC_LAST_SEAT_COOKIE } from '@/components/oc/ocPrefs'

/**
 * OC voting on membership applications (simplified v1).
 *
 * - Το ΔΣ είναι ΠΕΝΤΕ θέσεις (VOTING_SEATS). Η Γραμματεία δεν είναι μέλος του
 *   ΔΣ — στηρίζει το ΔΣ — και δεν ψηφίζει· ούτε το IT.
 * - Votes are blind: the UI shows WHO (which roles) voted, never what.
 * - Η αίτηση κρίνεται όταν ψηφίσουν ΟΛΑ τα μέλη με δικαίωμα ψήφου. Η ψήφος
 *   της Προέδρου (Συντονισμός) μετράει διπλά, άρα σύνολο 6: η ισοπαλία 3–3
 *   είναι εφικτή και κρατά την αίτηση εκκρεμή.
 * - IT και Γραμματεία είναι το δίχτυ ασφαλείας, όχι στάδιο έγκρισης: η ψήφος
 *   τους αποφασίζει αμέσως (καθολική απόφαση), για όταν κάποιος δεν ψηφίζει
 *   ή όταν έχει δώσει προφορική συγκατάθεση.
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

  // populate=Photo: στο Strapi v5 τα media ΔΕΝ έρχονται χωρίς ρητό populate,
  // και η ύπαρξη φωτογραφίας είναι αυτή που ξεχωρίζει τις μεταφερμένες αιτήσεις
  const appRes = await strapi(`/membership-applications/${applicationId}?populate=Photo`)
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

  // Ο ρόλος με τον οποίο ΕΝΕΡΓΕΙ τώρα (επιλογή στο OC, httpOnly cookie) —
  // όχι όλοι οι ρόλοι που κατέχει. Ένα μέλος με IT+Financer που ενεργεί ως
  // Financer ψηφίζει σαν Financer· το override ισχύει ΜΟΝΟ όταν ενεργεί
  // ρητά ως IT ή Γραμματεία.
  const seatCookie = cookieStore.get(OC_LAST_SEAT_COOKIE)?.value as OcSeat | undefined
  const activeSeat: OcSeat | null =
    seatCookie && access.seats.includes(seatCookie) ? seatCookie
      : access.seats.length === 1 ? access.seats[0] : null

  const votes: Record<string, VoteRecord> =
    app.Votes && typeof app.Votes === 'object' && !Array.isArray(app.Votes) ? { ...app.Votes } : {}
  votes[decoded.memberId] = {
    seats: activeSeat ? [activeSeat] : access.seats,
    vote,
    at: new Date().toISOString(),
  }

  const isOverride = activeSeat !== null && OVERRIDE_SEATS.includes(activeSeat)

  let finalState: 'approved' | 'rejected' | null = null
  let decisionBy = ''

  if (isOverride) {
    // IT/Admin (ενεργός ρόλος): η ψήφος αντικαθιστά όλες τις ψήφους (v1)
    finalState = vote === 'approve' ? 'approved' : 'rejected'
    decisionBy = `OC — ${SEAT_LABELS[activeSeat!]} (καθολική απόφαση)`
  } else {
    const roster = await getBoardRoster()
    // ΜΟΝΟ όσοι έχουν δικαίωμα ψήφου: η Γραμματεία δεν κρατά την αίτηση όμηρο
    const voters = roster.filter(r => isVoter(r.seats))
    const allVoted = voters.length > 0 && voters.every(r => votes[r.memberDocumentId])
    if (allVoted) {
      // Η καταμέτρηση διατρέχει τους ΨΗΦΟΦΟΡΟΥΣ, όχι το αντικείμενο votes:
      // έτσι μια παλιά ψήφος από θέση που δεν ψηφίζει πια δεν μετράει, και
      // το βάρος βγαίνει από τις θέσεις του μέλους στο μητρώο.
      const tally = voters.reduce(
        (t, r) => { t[votes[r.memberDocumentId].vote] += voteWeight(r.seats); return t },
        { approve: 0, reject: 0 } as Record<'approve' | 'reject', number>
      )
      if (tally.approve > tally.reject) finalState = 'approved'
      else if (tally.reject > tally.approve) finalState = 'rejected'
      // Ισοψηφία: παραμένει submitted — IT/Γραμματεία λύνει
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

  // Έγκριση → email στον αιτούντα με ευχαριστίες + οδηγίες πληρωμής
  // (δομή — τα στοιχεία τράπεζας/ποσό οριστικοποιούνται στο lib/ocEmails)
  // Await — σε serverless το fire-and-forget email συχνά δεν προλαβαίνει να φύγει
  if (finalState === 'approved' && app.Email) {
    const claim = paymentClaimUrl(generatePaymentClaimToken(app.documentId))
    // Υπογραφή: ο/η τρέχων κάτοχος της θέσης Community — όχι hardcoded όνομα
    const signer = await getSeatHolder('community')
    const signerName = signer?.engName || signer?.name || 'Culture for Change — Community'
    // Αίτηση χωρίς φωτογραφία = μεταφερμένη από την παλιά φόρμα Google: το
    // email ζητά επιπλέον φωτογραφία προφίλ και στοιχεία τιμολόγησης
    const template = app.Photo ? approvedEmailHtml : approvedLegacyEmailHtml
    const tpl = template(String(app.FirstName || '').trim() || 'μέλος', claim, signerName)
    // Κοινοποίηση σε Οικονομικά, Γραμματεία και Κοινότητα: η έγκριση ανοίγει
    // εκκρεμότητα πληρωμής που την παρακολουθούν και οι τρεις — ισχύει και για
    // το κανονικό και για το «παλιάς φόρμας» πρότυπο.
    await sendOcEmail(String(app.Email).trim(), tpl.subject, tpl.html, {
      from: COMMUNITY_FROM, replyTo: COMMUNITY_EMAIL,
      cc: [FINANCE_EMAIL, ADMIN_EMAIL, COMMUNITY_EMAIL],
    })
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
