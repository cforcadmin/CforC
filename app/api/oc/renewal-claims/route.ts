import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60
import { cookies } from 'next/headers'
import { verifyToken, generateRenewalClaimToken } from '@/lib/auth'
import { resolveOcAccess, getSeatHolder, type OcSeat } from '@/lib/ocRoles'
import { sendOcEmail, renewalPaymentFailedEmailHtml, renewalClaimUrl, FINANCE_FROM, FINANCE_EMAIL } from '@/lib/ocEmails'

/**
 * «Αποτυχία» σε δήλωση πληρωμής συνδρομής (ανανέωση) — ΜΟΝΟ Financer.
 * Στέλνει το «δεν εντοπίσαμε την κατάθεση» (ίδιος τόνος με τη φάση
 * εγγραφής: διατραπεζικές καθυστερήσεις/απορρίψεις + νέο κουμπί δήλωσης)
 * και μηδενίζει το RenewalClaimedAt ώστε το μέλος να μπορεί να ξαναδηλώσει.
 * Η «Έγκριση» ΔΕΝ περνά από εδώ — είναι η κανονική έκδοση απόδειξης
 * (/api/oc/receipts), που καθαρίζει και τη δήλωση.
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

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
  const seatCookie = cookieStore.get('oc-last-seat')?.value as OcSeat | undefined
  const activeSeat: OcSeat | null =
    seatCookie && access.seats.includes(seatCookie) ? seatCookie
      : access.seats.length === 1 ? access.seats[0] : null
  if (activeSeat !== 'financer') {
    return NextResponse.json({ error: 'Μόνο ο/η Financer' }, { status: 403 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Μη έγκυρο αίτημα' }, { status: 400 })
  }
  if (body?.action !== 'failed') {
    return NextResponse.json({ error: 'Μη έγκυρη ενέργεια' }, { status: 400 })
  }
  const memberDocId = String(body?.memberDocId || '').replace(/[^a-z0-9]/gi, '')
  if (!memberDocId) return NextResponse.json({ error: 'Λείπει μέλος' }, { status: 400 })

  try {
    const res = await fetch(
      `${STRAPI_URL}/api/members/${memberDocId}?fields[0]=Name&fields[1]=Email&fields[2]=Payments&fields[3]=RegistrationYear&fields[4]=RenewalClaimedAt`,
      { headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` }, cache: 'no-store' },
    )
    const member = res.ok ? (await res.json())?.data : null
    if (!member) return NextResponse.json({ error: 'Το μέλος δεν βρέθηκε' }, { status: 404 })
    if (!member.RenewalClaimedAt) {
      return NextResponse.json({ error: 'Δεν υπάρχει ενεργή δήλωση πληρωμής' }, { status: 409 })
    }
    const email = String(member.Email || '').trim()
    if (!email) return NextResponse.json({ error: 'Το μέλος δεν έχει email' }, { status: 422 })

    const year = new Date().getFullYear()
    const p = (member.Payments && typeof member.Payments === 'object') ? member.Payments : {}
    const regYear = typeof member.RegistrationYear === 'number' ? member.RegistrationYear : null
    const owed: number[] = []
    const prev = p[String(year - 1)]
    if (prev !== 1 && prev !== 0 && (regYear === null || regYear <= year - 1)) owed.push(year - 1)
    const cur = p[String(year)]
    if (cur !== 1 && cur !== 0) owed.push(year)
    if (owed.length === 0) owed.push(year)

    const name = String(member.Name || '').trim()
    const firstName = name.split(' ')[0] || 'μέλος'
    const finSigner = await getSeatHolder('financer')
    const claimUrl = renewalClaimUrl(generateRenewalClaimToken(memberDocId))
    const tpl = renewalPaymentFailedEmailHtml(
      firstName, owed, claimUrl,
      finSigner?.engName || finSigner?.name || 'Culture for Change — Finance',
    )
    const sent = await sendOcEmail(email, tpl.subject, tpl.html, {
      from: FINANCE_FROM,
      replyTo: FINANCE_EMAIL,
    })
    if (!sent) return NextResponse.json({ error: 'Αποτυχία αποστολής email' }, { status: 502 })

    // Μηδενισμός δήλωσης — ΜΟΝΟ αριθμητικό id στο PUT
    const upd = await fetch(`${STRAPI_URL}/api/members/${member.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${STRAPI_API_TOKEN}` },
      body: JSON.stringify({ data: { RenewalClaimedAt: null } }),
    })
    if (!upd.ok) console.error('renewal-claims failed: clear claim failed', upd.status)

    return NextResponse.json({ ok: true, to: email })
  } catch (err) {
    console.error('renewal-claims failed action error:', err)
    return NextResponse.json({ error: 'Αποτυχία' }, { status: 502 })
  }
}
