import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { resolveOcAccess, type OcSeat } from '@/lib/ocRoles'
import { parseInvoiceFilename, buildApprovedFilename } from '@/lib/invoiceFilename'

/**
 * Έσοδα ΧΩΡΙΣ απόδειξη — χορηγίες, επιχορηγήσεις, λοιπά.
 *
 * Δεν αγγίζουν τη σειρά ΑΠ. ΕΙΣ.: γράφουν γραμμή στο ΕΣΟΔΑ με
 * ΠΑΡΑΣΤΑΤΙΚΟ την αναφορά της τράπεζας (ΕΝΤ.…) ή του χρηματοδότη, και —
 * αν υπάρχει σχετικό έγγραφο στον φάκελο ΕΣΟΔΩΝ του μήνα με το ποσό στο
 * όνομά του — το μετονομάζουν σε {Α/Α}_{όνομα}_{ΗΗ-ΜΜ-ΕΕΕΕ}.
 *
 * Financer-gated.
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN
const WEBAPP_URL = process.env.FINANCE_SHEET_WEBAPP_URL
const WEBAPP_SECRET = process.env.FINANCE_SHEET_WEBAPP_SECRET

async function webApp(action: string, payload: Record<string, any>) {
  const res = await fetch(WEBAPP_URL as string, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: WEBAPP_SECRET, action, ...payload }),
    redirect: 'follow',
    cache: 'no-store',
  })
  const text = await res.text()
  try { return JSON.parse(text) } catch { return { ok: false, error: text.slice(0, 120) } }
}

export async function POST(request: NextRequest) {
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
  if (activeSeat !== 'financer') {
    return NextResponse.json({ error: 'Μόνο ο/η Financer' }, { status: 403 })
  }
  if (!WEBAPP_URL || !WEBAPP_SECRET) {
    return NextResponse.json({ error: 'Δεν έχει ρυθμιστεί η σύνδεση με το ΕΣΟΔΑ-ΕΞΟΔΑ' }, { status: 500 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Μη έγκυρο αίτημα' }, { status: 400 })
  }

  const amount = Number(body?.amount)
  const paymentDate = String(body?.paymentDate || '')
  if (!(amount > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(paymentDate)) {
    return NextResponse.json({ error: 'Λείπει ποσό ή ημερομηνία' }, { status: 400 })
  }
  const month = paymentDate.slice(0, 7)
  const category = ['grant', 'donation', 'extraordinary', 'business', 'other'].includes(body?.category)
    ? body.category as string : 'grant'
  const docRef = String(body?.docRef || '').trim() || null
  // Τομέας προέλευσης — το ζητά το πλαίσιο παρακολούθησης (Α.1)
  const funderType = ['public', 'european', 'private', 'services', 'other'].includes(body?.funderType)
    ? body.funderType as string : null
  const payerName = String(body?.payerName || '').trim() || null
  const txnId = String(body?.txnId || '').trim() || null

  try {
    // Διπλοεγγραφή; ίδια συναλλαγή ήδη καταχωρημένη
    if (txnId) {
      const dup = await fetch(
        `${STRAPI_URL}/api/income-records?filters[TransactionId][$eq]=${encodeURIComponent(txnId)}&fields[0]=Aa&pagination[limit]=1`,
        { headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` }, cache: 'no-store' },
      )
      const hit = dup.ok ? (await dup.json())?.data?.[0] : null
      if (hit) {
        return NextResponse.json({ error: `Η συναλλαγή έχει ήδη καταχωρηθεί (${hit.Aa})` }, { status: 409 })
      }
    }

    // 1) γραμμή στο ΕΣΟΔΑ — επιστρέφει το Α/Α
    const sheetRes = await webApp('appendIncomeRecord', {
      month,
      docRef: docRef || txnId,
      payerName,
      description: body?.description || null,
      category,
      amount,
      paymentDate,
      paymentMethod: body?.paymentMethod || 'bank',
      notes: body?.notes || null,
    })
    if (!sheetRes.ok) {
      return NextResponse.json({ error: sheetRes.error || 'Αποτυχία εγγραφής στο ΕΣΟΔΑ' }, { status: 502 })
    }
    const aa: string = sheetRes.aa

    // 2) έγγραφο χρηματοδότη στον φάκελο ΕΣΟΔΩΝ; ταίριασμα με το ΠΟΣΟ
    let renamed: string | null = null
    let fileId: string | null = null
    try {
      const docs = await webApp('listMonthIncomeDocs', { month })
      const files: Array<{ id: string; name: string }> = docs.ok ? docs.files || [] : []
      const target = files.find(f => {
        // Δικές μας αποδείξεις — ΟΧΙ έγγραφα χρηματοδότη. Τρεις μορφές
        // ονομάτων κατά καιρούς: «ΑΠ. ΕΙΣ. 365…», «9.2_…ΑΠ. ΕΙΣ. 365…»,
        // και οι παλιές «326_ Όνομα.pdf» — η τελευταία έλειπε και θα
        // μετονομαζόταν ως έγγραφο χορηγίας.
        if (/ΑΠ\.\s*ΕΙΣ\./i.test(f.name)) return false
        if (/^\d{3}[_\s-]/.test(f.name)) return false
        const p = parseInvoiceFilename(f.name)
        if (p.amount !== null && Math.abs(p.amount - amount) < 0.005) return true
        // Ποσό γραμμένο ως ακέραιος («10100.pdf») ή με ελληνικό διαχωριστή
        // χιλιάδων («2.500.pdf»): για ΤΑΙΡΙΑΣΜΑ αρκεί — δεν το εμπιστευόμαστε
        // ως ποσό (το ποσό το δίνει η τράπεζα), οπότε η ασάφεια δεν κοστίζει.
        const flat = f.name.replace(/(\d)[.](?=\d{3}(\D|$))/g, '$1')
        return new RegExp(`(^|[^\\d])${Math.round(amount)}([^\\d]|$)`).test(flat)
      })
      if (target) {
        fileId = target.id
        const parsed = parseInvoiceFilename(target.name)
        const newName = buildApprovedFilename({
          aa,
          subject: payerName || parsed.supplierHint || null,
          docNumber: parsed.docNumber || null,
          mark: parsed.mark || null,
          date: paymentDate,
          amount,
          ext: parsed.ext,
        })
        const ren = await webApp('renameFile', { fileId: target.id, newName })
        if (ren.ok) renamed = newName
      }
    } catch (err) {
      console.error('income-record: doc match/rename failed (non-fatal):', err)
    }

    // 3) εγγραφή στο Strapi
    const created = await fetch(`${STRAPI_URL}/api/income-records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${STRAPI_API_TOKEN}` },
      body: JSON.stringify({
        data: {
          Month: month,
          Aa: aa,
          DocRef: docRef || txnId,
          PayerName: payerName,
          Description: body?.description || null,
          Category: category,
          FunderType: funderType,
          Amount: amount,
          PaymentDate: paymentDate,
          PaymentMethod: body?.paymentMethod || 'bank',
          TransactionId: txnId,
          FileName: renamed,
          FileId: fileId,
          Notes: body?.notes || null,
          SheetSynced: true,
          CreatedBy: `financer:${decoded.memberId}`,
        },
      }),
    })
    if (!created.ok) console.error('income-record: strapi create failed', created.status)

    return NextResponse.json({ ok: true, aa, renamed, month })
  } catch (err) {
    console.error('income-records failed:', err)
    return NextResponse.json({ error: 'Αποτυχία καταχώρησης' }, { status: 502 })
  }
}
