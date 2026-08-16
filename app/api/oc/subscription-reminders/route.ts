import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { resolveOcAccess, getSeatHolder, type OcSeat } from '@/lib/ocRoles'
import { sendOcEmail, subscriptionReminderEmailHtml, FINANCE_FROM, FINANCE_EMAIL } from '@/lib/ocEmails'

/**
 * Υπενθύμιση συνδρομής σε μέλος — από τα bubbles «Προς ειδοποίηση /
 * Προς διαγραφή» στα Οικονομικά. ΕΝΑ μέλος ανά κλήση: το «Σε όλους»
 * τρέχει διαδοχικά από τον browser, ώστε καμία μαζική αποστολή να μην
 * κόβεται από όριο χρόνου και κάθε bubble να δείχνει την πορεία του.
 *
 * Επιτρέπεται ΜΟΝΟ σε ενεργό ρόλο Financer ή Community. Αποστολέας
 * finance@ με υπογραφή του/της τρέχοντος Financer (θέμα πληρωμών).
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
  if (activeSeat !== 'financer' && activeSeat !== 'community') {
    return NextResponse.json({ error: 'Μόνο Financer ή Community μπορούν να στείλουν υπενθυμίσεις' }, { status: 403 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Μη έγκυρο αίτημα' }, { status: 400 })
  }
  const memberDocId = String(body?.memberDocId || '').replace(/[^a-z0-9]/gi, '')
  if (!memberDocId) return NextResponse.json({ error: 'Λείπει μέλος' }, { status: 400 })

  try {
    const res = await fetch(
      `${STRAPI_URL}/api/members/${memberDocId}?fields[0]=Name&fields[1]=Email&fields[2]=Payments&fields[3]=RegistrationYear&fields[4]=AM`,
      { headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` }, cache: 'no-store' },
    )
    const member = res.ok ? (await res.json())?.data : null
    if (!member) return NextResponse.json({ error: 'Το μέλος δεν βρέθηκε' }, { status: 404 })
    const email = String(member.Email || '').trim()
    if (!email) return NextResponse.json({ error: 'Το μέλος δεν έχει email' }, { status: 422 })

    // Ποια έτη εκκρεμούν (ίδια σημασιολογία με την Επισκόπηση: 1=πληρωμένο,
    // 0=δεν όφειλε, οτιδήποτε άλλο=εκκρεμεί)
    const year = new Date().getFullYear()
    const p = (member.Payments && typeof member.Payments === 'object') ? member.Payments : {}
    const regYear = typeof member.RegistrationYear === 'number' ? member.RegistrationYear : null
    const owed: number[] = []
    const prev = p[String(year - 1)]
    if (prev !== 1 && prev !== 0 && (regYear === null || regYear <= year - 1)) owed.push(year - 1)
    const cur = p[String(year)]
    if (cur !== 1 && cur !== 0) owed.push(year)
    if (owed.length === 0) {
      return NextResponse.json({ error: 'Το μέλος δεν οφείλει — καμία υπενθύμιση', upToDate: true }, { status: 409 })
    }

    const name = String(member.Name || '').trim()
    const firstName = name.split(' ')[0] || 'μέλος'
    const finSigner = await getSeatHolder('financer')
    const tpl = subscriptionReminderEmailHtml(
      firstName, name, owed, owed.length * 35,
      finSigner?.engName || finSigner?.name || 'Culture for Change — Finance',
    )
    const sent = await sendOcEmail(email, tpl.subject, tpl.html, {
      from: FINANCE_FROM,
      replyTo: FINANCE_EMAIL,
    })
    if (!sent) return NextResponse.json({ error: 'Αποτυχία αποστολής email' }, { status: 502 })
    return NextResponse.json({ ok: true, to: email, owedYears: owed, amount: owed.length * 35 })
  } catch (err) {
    console.error('subscription-reminders failed:', err)
    return NextResponse.json({ error: 'Αποτυχία αποστολής υπενθύμισης' }, { status: 502 })
  }
}
