import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { resolveOcAccess, type OcSeat } from '@/lib/ocRoles'
import { pendingClaims, pendingTotal, daysSince } from '@/lib/expenseClaimReminders'
import { getSeatHolder } from '@/lib/ocRoles'
import { sendOcEmail, expenseClaimPaidEmailHtml, FINANCE_FROM, FINANCE_EMAIL, ADMIN_EMAIL } from '@/lib/ocEmails'

export const maxDuration = 60

/**
 * Εξοδολόγια στο OC.
 *
 *   GET                     → όσα περιμένουν πληρωμή (+ τα 20 τελευταία πληρωμένα)
 *   POST {id, action:'paid'} → σημειώνεται η πληρωμή, σταματούν οι υπενθυμίσεις
 *
 * Βλέπουν Financer, Διαχείριση και IT· σημειώνει πληρωμή ΜΟΝΟ ο/η Financer —
 * αυτός/ή κάνει την κατάθεση, αυτός/ή το βεβαιώνει.
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN
const VIEW_SEATS: OcSeat[] = ['financer', 'admin', 'it']

async function strapi(path: string, method: string = 'GET', data?: any) {
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
  const store = await cookies()
  const token = store.get('session')?.value
  const decoded = token ? verifyToken(token) : null
  if (!decoded || decoded.type !== 'session') {
    return { error: NextResponse.json({ error: 'Απαιτείται σύνδεση' }, { status: 401 }) }
  }
  const access = await resolveOcAccess(decoded.memberId)
  if (!access.isBoard) return { error: NextResponse.json({ error: 'Δεν επιτρέπεται' }, { status: 403 }) }
  const seatCookie = store.get('oc-last-seat')?.value as OcSeat | undefined
  const activeSeat: OcSeat | null =
    seatCookie && access.seats.includes(seatCookie) ? seatCookie
      : access.seats.length === 1 ? access.seats[0] : null
  if (!activeSeat || !VIEW_SEATS.includes(activeSeat)) {
    return { error: NextResponse.json({ error: 'Τα εξοδολόγια ανήκουν σε Οικονομικά, Διαχείριση και IT' }, { status: 403 }) }
  }
  return { memberId: decoded.memberId, activeSeat }
}

export async function GET() {
  const auth = await authorize()
  if ('error' in auth) return auth.error

  const res = await strapi('/expense-claims?pagination[limit]=200&sort=SubmittedAt:desc')
  if (!res.ok) return NextResponse.json({ error: 'Αποτυχία φόρτωσης' }, { status: 502 })
  const all = (res.json?.data || []).map((c: any) => ({ ...c, Payable: Number(c.Payable) || 0 }))
  const now = new Date()

  const pending = pendingClaims(all).map((c: any) => ({
    id: c.documentId,
    claimNumber: c.ClaimNumber,
    memberName: c.MemberName,
    memberEmail: c.MemberEmail,
    payable: c.Payable,
    submittedAt: c.SubmittedAt,
    waitingDays: daysSince(c.SubmittedAt, now),
    eventLabel: c.EventName ? `${c.EventType} — ${c.EventName}` : c.EventType,
    accountHolder: c.AccountHolder,
    bankName: c.BankName,
    iban: c.Iban,
    folderUrl: c.FolderUrl,
    pdfUrl: c.PdfUrl,
    remindersSent: c.ReminderLog?.count || 0,
  }))

  // Πληρωμένα ΑΥΤΟΝ τον μήνα: αυτά είναι που θα βρει ο/η Financer στις
  // χρεώσεις της τράπεζας όταν κλείσει τον μήνα. Ο μήνας μετριέται σε ώρα
  // Ελλάδας — το Vercel τρέχει σε UTC και η 1η του μήνα θα έπεφτε λάθος.
  const month = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Athens', year: 'numeric', month: '2-digit',
  }).format(now).slice(0, 7)
  const athensMonthOf = (iso: string) => {
    const t = Date.parse(iso)
    if (!Number.isFinite(t)) return ''
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Athens', year: 'numeric', month: '2-digit',
    }).format(new Date(t)).slice(0, 7)
  }

  // Ο προηγούμενος μήνας, για όταν ο τρέχων είναι άδειος: κάτι να δει ο/η
  // Financer αντί για λευκή οθόνη — και συχνά εκεί είναι η δουλειά που
  // μόλις έκλεισε.
  const [y, mo] = month.split('-').map(Number)
  const prev = new Date(Date.UTC(y, mo - 2, 15))
  const lastMonth = `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, '0')}`

  const brief = (c: any) => ({
    id: c.documentId, claimNumber: c.ClaimNumber, memberName: c.MemberName,
    payable: Number(c.Payable) || 0, submittedAt: c.SubmittedAt, paidAt: c.PaidAt || null,
    state: c.State, pdfUrl: c.PdfUrl || null, folderUrl: c.FolderUrl || null,
  })
  const submittedIn = (m: string) => all
    .filter((c: any) => c.SubmittedAt && athensMonthOf(c.SubmittedAt) === m)
    .sort((a: any, b: any) => String(b.SubmittedAt).localeCompare(String(a.SubmittedAt)))
    .map(brief)

  const paidThisMonth = all
    .filter((c: any) => c.State === 'paid' && c.PaidAt && athensMonthOf(c.PaidAt) === month)
    .sort((a: any, b: any) => String(b.PaidAt).localeCompare(String(a.PaidAt)))
    .map((c: any) => ({
      id: c.documentId, claimNumber: c.ClaimNumber, memberName: c.MemberName,
      payable: c.Payable, paidAt: c.PaidAt, paidBy: c.PaidBy,
      pdfUrl: c.PdfUrl, folderUrl: c.FolderUrl,
    }))

  return NextResponse.json({
    pending,
    thisMonthSubmitted: submittedIn(month),
    lastMonth,
    lastMonthSubmitted: submittedIn(lastMonth),
    paidThisMonth,
    paidThisMonthTotal: Math.round(paidThisMonth.reduce((s: number, c: any) => s + (Number(c.payable) || 0), 0) * 100) / 100,
    month,
    total: pendingTotal(all),
    canPay: auth.activeSeat === 'financer',
    seat: auth.activeSeat,
  })
}

export async function POST(request: NextRequest) {
  const auth = await authorize()
  if ('error' in auth) return auth.error
  if (auth.activeSeat !== 'financer') {
    return NextResponse.json({ error: 'Μόνο ο/η Financer σημειώνει πληρωμή' }, { status: 403 })
  }
  const body = await request.json().catch(() => null)
  const id = String(body?.id || '').replace(/[^a-z0-9]/gi, '')
  if (!id || body?.action !== 'paid') {
    return NextResponse.json({ error: 'Μη έγκυρο αίτημα' }, { status: 400 })
  }

  const current = await strapi(`/expense-claims/${id}`)
  const claim = current.json?.data
  if (!claim) return NextResponse.json({ error: 'Το εξοδολόγιο δεν βρέθηκε' }, { status: 404 })
  if (claim.State === 'paid') {
    return NextResponse.json({ ok: true, alreadyPaid: true, claimNumber: claim.ClaimNumber })
  }

  const who = await strapi(`/members/${auth.memberId}?fields[0]=Name`)
  const r = await strapi(`/expense-claims/${id}`, 'PUT', {
    State: 'paid',
    PaidAt: new Date().toISOString(),
    PaidBy: String(who.json?.data?.Name || '').trim() || 'Financer',
    PaymentNote: String(body?.note || '').trim() || null,
  })
  if (!r.ok) {
    console.error('oc/expense-claims: mark paid failed', r.status)
    return NextResponse.json({ error: 'Αποτυχία ενημέρωσης' }, { status: 502 })
  }

  // ── Ειδοποίηση στο μέλος: τι να περιμένει και πότε να ανησυχήσει.
  //    Best-effort — η πληρωμή έχει ήδη σημειωθεί και δεν ξεγράφεται
  //    επειδή έπεσε ο πάροχος email.
  let emailSent = false
  try {
    const financer = await getSeatHolder('financer')
    // Το τηλέφωνο μπαίνει μόνο αν υπάρχει στο μητρώο — δεν εφευρίσκουμε
    let financerPhone: string | null = null
    if (financer?.email) {
      const f = await strapi(`/members?filters[Email][$eqi]=${encodeURIComponent(financer.email)}&pagination[limit]=1`)
      financerPhone = String(f.json?.data?.[0]?.Phone || '').trim() || null
    }
    const iban = String(claim.Iban || '')
    const tpl = expenseClaimPaidEmailHtml({
      firstName: String(claim.MemberName || '').trim().split(/\s+/)[0] || 'μέλος',
      claimNumber: claim.ClaimNumber,
      payable: `${Number(claim.Payable || 0).toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`,
      accountHolder: claim.AccountHolder || claim.MemberName,
      bankName: claim.BankName || null,
      ibanTail: iban.slice(-4) || '—',
      financerName: financer?.name || 'την Ομάδα Οικονομικών',
      financerPhone,
    })
    emailSent = await sendOcEmail(String(claim.MemberEmail || '').trim(), tpl.subject, tpl.html, {
      from: FINANCE_FROM,
      replyTo: FINANCE_EMAIL,
      cc: [FINANCE_EMAIL, ADMIN_EMAIL],
    })
    if (!emailSent) console.error('oc/expense-claims: paid email not sent', claim.ClaimNumber)
  } catch (e) {
    console.error('oc/expense-claims: paid email failed', e)
  }

  return NextResponse.json({ ok: true, claimNumber: claim.ClaimNumber, emailSent })
}
