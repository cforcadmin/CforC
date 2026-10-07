import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { checkCsrf } from '@/lib/csrf'
import { workingGroupProposeLimiter, getRateLimitErrorMessage } from '@/lib/rateLimiter'
import { validateProposal } from '@/lib/workingGroupProposals'
import { sendOcEmail, workingGroupProposalEmailHtml, ADMIN_FROM, ADMIN_EMAIL, IT_EMAIL } from '@/lib/ocEmails'
import { SEAT_MAILBOX } from '@/lib/ocRoles'

/**
 * ΠΡΟΤΑΣΗ ΝΕΑΣ ΟΜΑΔΑΣ ΕΡΓΑΣΙΑΣ — η διαδρομή που αντικαθιστά τη φόρμα Google.
 *
 * ΔΥΟ ΠΡΑΓΜΑΤΑ, ΜΕ ΑΥΤΗ ΤΗ ΣΕΙΡΑ: πρώτα γράφεται στο Strapi, μετά φεύγει το
 * email. Αν αποτύχει το email, η πρόταση ΥΠΑΡΧΕΙ και φαίνεται στο OC — ενώ
 * αν γινόταν το αντίστροφο, ένα χαμένο γράμμα θα σήμαινε χαμένη πρόταση.
 * Ακριβώς αυτό έκανε τη φόρμα Google μαύρο κουτί.
 *
 * Το email είναι awaited: un-awaited fetch πεθαίνει με το lambda.
 */
export const maxDuration = 30

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

export async function POST(request: Request) {
  const csrfError = checkCsrf(request)
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 })

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
             request.headers.get('x-real-ip') || 'unknown'
  const gate = workingGroupProposeLimiter.check(ip)
  if (!gate.allowed) {
    return NextResponse.json({ error: getRateLimitErrorMessage(gate.resetTime) }, { status: 429 })
  }

  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')
  const decoded = sessionCookie ? verifyToken(sessionCookie.value) : null
  if (!decoded || decoded.type !== 'session') {
    return NextResponse.json({ error: 'Πρέπει να είσαι συνδεδεμένος/η' }, { status: 401 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Μη έγκυρο αίτημα' }, { status: 400 })
  }

  // Η φόρμα ελέγχει τα ίδια — αλλά η φόρμα δεν είναι φράγμα: ο καθένας
  // στέλνει POST. Ίδια συνάρτηση, δύο καλούντες.
  const { ok, errors, clean } = validateProposal(body)
  if (!ok) {
    return NextResponse.json({ error: 'Λείπουν ή είναι λανθασμένα κάποια πεδία', errors }, { status: 400 })
  }

  if (!STRAPI_URL || !STRAPI_API_TOKEN) {
    console.error('propose: Strapi not configured')
    return NextResponse.json({ error: 'Η υπηρεσία δεν είναι διαμορφωμένη' }, { status: 500 })
  }

  // Το ΑΜ δεν έρχεται από τον browser: διαβάζεται από τη συνεδρία. Ό,τι
  // στέλνει ο πελάτης για ταυτότητα είναι πρόταση, όχι απόδειξη.
  let memberAm: number | null = null
  try {
    const res = await fetch(
      `${STRAPI_URL}/api/members/${decoded.memberId}?fields[0]=AM`,
      { headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` }, cache: 'no-store' }
    )
    if (res.ok) {
      const json = await res.json()
      const am = Number(json?.data?.AM)
      memberAm = Number.isFinite(am) && am > 0 ? am : null
    }
  } catch { /* το ΑΜ είναι καλό να υπάρχει, δεν είναι προϋπόθεση */ }

  const now = new Date().toISOString()
  const payload = {
    data: {
      Title: clean.title,
      Theme: clean.theme,
      Goal: clean.goal,
      MoreInfo: clean.moreInfo || null,
      ContactPerson: clean.contactPerson,
      ProposerName: clean.proposerName,
      ProposerEmail: clean.proposerEmail,
      Phone: clean.phone,
      Facebook: clean.facebook || null,
      Links: clean.links,
      MemberAm: memberAm,
      Status: 'new',
      Archived: false,
      SubmittedAt: now,
    },
  }

  let documentId: string | null = null
  try {
    const res = await fetch(`${STRAPI_URL}/api/working-group-proposals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${STRAPI_API_TOKEN}` },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const text = await res.text()
      console.error('propose: Strapi refused', res.status, text.slice(0, 200))
      return NextResponse.json({ error: 'Αποτυχία καταχώρησης. Δοκίμασε ξανά.' }, { status: 502 })
    }
    documentId = (await res.json())?.data?.documentId || null
  } catch (err) {
    console.error('propose: Strapi error', err)
    return NextResponse.json({ error: 'Αποτυχία καταχώρησης. Δοκίμασε ξανά.' }, { status: 502 })
  }

  // Καταχωρήθηκε. Ό,τι ακολουθεί δεν μπορεί πια να χαλάσει την πρόταση — ένα
  // email που δεν έφυγε ΔΕΝ είναι λόγος να πει η οθόνη «απέτυχε».
  const tpl = workingGroupProposalEmailHtml({
    title: clean.title,
    theme: clean.theme,
    goal: clean.goal,
    moreInfo: clean.moreInfo,
    contactPerson: clean.contactPerson,
    proposerName: clean.proposerName,
    proposerEmail: clean.proposerEmail,
    phone: clean.phone,
    facebook: clean.facebook,
    links: clean.links,
    memberAm,
  })
  let notified = false
  try {
    notified = await sendOcEmail(SEAT_MAILBOX.admin, tpl.subject, tpl.html, {
      from: ADMIN_FROM,
      replyTo: clean.proposerEmail,
      // it@ για εφεδρεία, ο/η προτείνων/ουσα ως απόδειξη παραλαβής
      cc: [IT_EMAIL, clean.proposerEmail],
    })
    if (notified && documentId) {
      await fetch(`${STRAPI_URL}/api/working-group-proposals/${documentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${STRAPI_API_TOKEN}` },
        body: JSON.stringify({ data: { NotifiedAt: new Date().toISOString() } }),
      }).catch(() => {})
    }
  } catch (err) {
    console.error('propose: notification failed', err)
  }

  return NextResponse.json({ ok: true, documentId, notified, to: ADMIN_EMAIL })
}
