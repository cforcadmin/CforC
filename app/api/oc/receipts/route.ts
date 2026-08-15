import { NextRequest, NextResponse } from 'next/server'

// PDF + email θέλουν χρόνο — όχι το Vercel default των 10s
export const maxDuration = 60
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { resolveOcAccess, getSeatHolder, type OcSeat } from '@/lib/ocRoles'
import { nextReceiptNumber, createReceipt, type ReceiptType } from '@/lib/receipts'
import { generateReceiptPdf } from '@/lib/receiptPdf'
import { sendOcEmail, manualReceiptEmailHtml, FINANCE_FROM, FINANCE_EMAIL } from '@/lib/ocEmails'

/**
 * Χειροκίνητη έκδοση αποδείξεων από τον/τη Financer (OC → Οικονομικά).
 *
 *  GET  — κατάσταση σειράς (επόμενος αριθμός ή unseeded) + πρόσφατες
 *  POST — action 'seed'  : αρχικοποίηση σειράς με τον τελευταίο χειρόγραφο
 *                          αριθμό (μόνο σε ΚΕΝΗ συλλογή, χωρίς email/PDF)
 *         action 'issue' : νέα απόδειξη με τον επόμενο αριθμό — PDF, email
 *                          στο μέλος (προαιρετικά), ενημέρωση Payments για
 *                          συνδρομές. SheetSynced:false μέχρι τη Φάση Γ.
 *
 * Προβολή: όλο το ΔΣ. Έκδοση/seed: ΜΟΝΟ ενεργός ρόλος Financer.
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

const TYPE_LABELS: Record<ReceiptType, string> = {
  registration: 'Εγγραφή + Ετήσια συνδρομή',
  subscription: 'Ετήσια συνδρομή',
  extraordinary: 'Έκτακτη εισφορά',
  donation: 'Δωρεά',
  grant: 'Χορηγία',
  other: 'Είσπραξη',
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
  try { json = await res.json() } catch { /* non-JSON */ }
  return { ok: res.ok, status: res.status, json }
}

async function authorize(needFinancer: boolean) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')
  const decoded = sessionCookie ? verifyToken(sessionCookie.value) : null
  if (!decoded || decoded.type !== 'session') {
    return { error: NextResponse.json({ error: 'Απαιτείται σύνδεση' }, { status: 401 }) }
  }
  const access = await resolveOcAccess(decoded.memberId)
  if (!access.isBoard) {
    return { error: NextResponse.json({ error: 'Δεν επιτρέπεται' }, { status: 403 }) }
  }
  if (needFinancer) {
    const seatCookie = cookieStore.get('oc-last-seat')?.value as OcSeat | undefined
    const activeSeat: OcSeat | null =
      seatCookie && access.seats.includes(seatCookie) ? seatCookie
        : access.seats.length === 1 ? access.seats[0] : null
    if (activeSeat !== 'financer') {
      return { error: NextResponse.json({ error: 'Μόνο ο/η Financer μπορεί να εκδώσει αποδείξεις' }, { status: 403 }) }
    }
  }
  return { memberId: decoded.memberId }
}

export async function GET() {
  const auth = await authorize(false)
  if ('error' in auth) return auth.error
  try {
    const [next, recentRes] = await Promise.all([
      nextReceiptNumber(),
      strapi('/receipts?sort=Number:desc&pagination[limit]=12' +
        '&fields[0]=Number&fields[1]=Type&fields[2]=Amount&fields[3]=MemberName' +
        '&fields[4]=IssueDate&fields[5]=PaymentDate&fields[6]=SheetSynced'),
    ])
    const recent = (recentRes.json?.data || []).map((r: any) => ({
      number: r.Number,
      type: r.Type,
      typeLabel: TYPE_LABELS[r.Type as ReceiptType] || r.Type,
      amount: r.Amount,
      memberName: r.MemberName,
      issueDate: r.IssueDate,
      paymentDate: r.PaymentDate,
      sheetSynced: !!r.SheetSynced,
    }))
    return NextResponse.json({ seeded: next !== null, nextNumber: next, recent })
  } catch (err) {
    console.error('oc/receipts GET failed:', err)
    return NextResponse.json({ error: 'Αποτυχία φόρτωσης σειράς' }, { status: 502 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await authorize(true)
  if ('error' in auth) return auth.error

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Μη έγκυρο αίτημα' }, { status: 400 })
  }

  const action = body?.action === 'seed' ? 'seed' : body?.action === 'issue' ? 'issue' : null
  if (!action) return NextResponse.json({ error: 'Μη έγκυρη ενέργεια' }, { status: 400 })

  try {
    if (action === 'seed') {
      const number = Number(body?.number)
      if (!Number.isInteger(number) || number < 1) {
        return NextResponse.json({ error: 'Δώσε έγκυρο αριθμό τελευταίας χειρόγραφης απόδειξης' }, { status: 400 })
      }
      const existing = await nextReceiptNumber()
      if (existing !== null) {
        return NextResponse.json({ error: `Η σειρά έχει ήδη αρχικοποιηθεί (επόμενος: ${existing})` }, { status: 409 })
      }
      const receipt = await createReceipt({
        type: 'other',
        amount: Number(body?.amount) > 0 ? Number(body.amount) : 0,
        memberName: String(body?.memberName || '').trim() || null,
        notes: 'Seed σειράς — τελευταία χειρόγραφη απόδειξη πριν από την αυτόματη αρίθμηση. Εκδόθηκε εκτός συστήματος.',
        createdBy: `financer:${auth.memberId}`,
      }, number)
      return NextResponse.json({ ok: true, action: 'seed', number: receipt.number })
    }

    // ---- issue ----
    const type = (Object.keys(TYPE_LABELS) as ReceiptType[]).includes(body?.type) ? body.type as ReceiptType : null
    const amount = Number(body?.amount)
    const year = Number.isInteger(Number(body?.year)) ? Number(body.year) : new Date().getFullYear()
    const memberDocId = String(body?.memberDocId || '').replace(/[^a-z0-9]/gi, '') || null
    let memberName = String(body?.memberName || '').trim()
    let email = String(body?.email || '').trim()
    const sendEmail = body?.sendEmail !== false
    const paymentMethod = body?.paymentMethod === 'cash' ? 'cash' as const : 'bank' as const
    const paymentDate = /^\d{4}-\d{2}-\d{2}$/.test(String(body?.paymentDate || '')) ? String(body.paymentDate) : undefined

    if (!type || !(amount > 0)) {
      return NextResponse.json({ error: 'Λείπει τύπος ή ποσό' }, { status: 400 })
    }
    if (!memberDocId && !memberName) {
      return NextResponse.json({ error: 'Δώσε μέλος ή ονοματεπώνυμο' }, { status: 400 })
    }

    // Μέλος: ΑΜ/email για την απόδειξη + ενημέρωση Payments για συνδρομές.
    // ΠΡΟΣΟΧΗ: το custom member controller δέχεται ΜΟΝΟ αριθμητικό id στο PUT.
    let memberAm: number | string = ''
    if (memberDocId) {
      const m = await strapi(`/members/${memberDocId}?fields[0]=Name&fields[1]=Email&fields[2]=AM&fields[3]=Payments`)
      const member = m.json?.data
      if (!member) return NextResponse.json({ error: 'Το μέλος δεν βρέθηκε' }, { status: 404 })
      memberName = memberName || String(member.Name || '')
      email = email || String(member.Email || '')
      memberAm = typeof member.AM === 'number' ? member.AM : ''
      if (type === 'subscription' || type === 'registration') {
        const payments: Record<string, number> = {}
        if (member.Payments && typeof member.Payments === 'object') {
          for (const [k, v] of Object.entries(member.Payments)) {
            if (v === 0 || v === 1) payments[k] = v as number
          }
        }
        payments[String(year)] = 1
        const upd = await strapi(`/members/${member.id}`, 'PUT', { Payments: payments })
        if (!upd.ok) console.error('oc/receipts: Payments update failed', upd.status)
      }
    }

    const isSubscriptionLike = type === 'subscription' || type === 'registration'
    const registrationFee = type === 'registration' ? (Number(body?.registrationFee) > 0 ? Number(body.registrationFee) : 10) : 0
    const subscriptionFee = type === 'registration'
      ? Math.max(0, amount - registrationFee)
      : type === 'subscription' ? amount : 0
    const customLabel = !isSubscriptionLike
      ? (String(body?.customLabel || '').trim() || TYPE_LABELS[type])
      : null

    const receipt = await createReceipt({
      type,
      amount,
      registrationFee: registrationFee || undefined,
      subscriptionFee: subscriptionFee || undefined,
      subscriptionYear: isSubscriptionLike ? year : undefined,
      paymentDate,
      payerName: String(body?.payerName || '').trim() || null,
      memberName: memberName || null,
      memberDocId,
      paymentMethod,
      companyName: String(body?.companyName || '').trim() || null,
      companyAddress: String(body?.companyAddress || '').trim() || null,
      companyTaxId: String(body?.companyTaxId || '').trim() || null,
      notes: String(body?.notes || '').trim() || null,
      createdBy: `financer:${auth.memberId}`,
    })

    // PDF + email — awaited (serverless: το fire-and-forget πεθαίνει)
    let emailSent = false
    if (sendEmail && email) {
      const finSigner = await getSeatHolder('financer')
      const pdf = await generateReceiptPdf({
        name: memberName,
        email,
        am: memberAm,
        year,
        receiptNumber: receipt.number,
        registrationFee,
        subscriptionFee: isSubscriptionLike ? subscriptionFee : amount,
        date: new Date(),
        city: null,
        paymentMethod: paymentMethod === 'cash' ? 'Μετρητά' : 'Τραπεζική κατάθεση',
        financerName: finSigner?.name || null,
        customItemLabel: customLabel,
        periodLabel: isSubscriptionLike ? undefined : '—',
        companyName: String(body?.companyName || '').trim() || null,
        companyAddress: String(body?.companyAddress || '').trim() || null,
        companyTaxId: String(body?.companyTaxId || '').trim() || null,
      })
      const detail = isSubscriptionLike ? `${TYPE_LABELS[type]} ${year}` : (customLabel || TYPE_LABELS[type])
      const firstName = memberName.split(' ')[0] || 'μέλος'
      const tpl = manualReceiptEmailHtml(firstName, detail, finSigner?.engName || finSigner?.name || 'Culture for Change — Finance')
      emailSent = await sendOcEmail(email, tpl.subject, tpl.html, {
        from: FINANCE_FROM,
        replyTo: FINANCE_EMAIL,
        cc: [FINANCE_EMAIL],
        attachments: [{ filename: `apodeixi-eispraxis-${receipt.number}.pdf`, content: Buffer.from(pdf).toString('base64') }],
      })
    }

    return NextResponse.json({ ok: true, action: 'issue', number: receipt.number, emailSent, to: sendEmail ? email || null : null })
  } catch (err: any) {
    console.error('oc/receipts POST failed:', err)
    const msg = String(err?.message || '')
    if (msg.includes('not seeded')) {
      return NextResponse.json({ error: 'Η σειρά δεν έχει αρχικοποιηθεί — καταχώρησε πρώτα τον τελευταίο χειρόγραφο αριθμό' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Αποτυχία έκδοσης απόδειξης' }, { status: 502 })
  }
}
