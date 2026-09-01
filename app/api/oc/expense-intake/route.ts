import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { resolveOcAccess, type OcSeat } from '@/lib/ocRoles'
import { parseInvoiceFilename, type ParsedInvoiceName } from '@/lib/invoiceFilename'
import { getSupplierAliases, lookupAlias, upsertSupplierAlias, type ExpenseCategory } from '@/lib/supplierAliases'
import { buildApprovedFilename } from '@/lib/invoiceFilename'
import { parseKiniseis } from '@/lib/bankStatement'

/**
 * ΕΞΟΔΑ — ανάλυση παραστατικών του μήνα (ΜΟΝΟ ανάγνωση, καμία εγγραφή).
 *
 * POST {month, kiniseis?} →
 *   1. λίστα αρχείων του φακέλου Drive του μήνα (web app)
 *   2. ντετερμινιστικό parse του ονόματος (ΜΑΡΚ/αριθμός/ημερομηνία/ποσό)
 *   3. συμπλήρωση επωνυμίας/ΑΦΜ/κατηγορίας από το μητρώο προμηθευτών
 *   4. αντιστοίχιση με τις ΧΡΕΩΣΕΙΣ της τράπεζας — κύριο κλειδί το ΠΟΣΟ
 *      (απόφαση Financer)· σε ισοπαλία, oldest-first
 *   5. σήμανση όσων υπάρχουν ήδη ως expense (idempotency)
 *
 * Financer-gated. Η εγγραφή γίνεται μετά, με έγκριση (βήμα 3).
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN
const WEBAPP_URL = process.env.FINANCE_SHEET_WEBAPP_URL
const WEBAPP_SECRET = process.env.FINANCE_SHEET_WEBAPP_SECRET

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

/**
 * GET ?month=YYYY-MM — τα εγκεκριμένα ΑΝΕΞΟΦΛΗΤΑ παραστατικά παλαιότερων
 * μηνών. Εμφανίζονται πριν την επικόλληση, ώστε ο/η Financer να ξέρει τι να
 * ψάξει στις κινήσεις (η ίδια λίστα που η Ανάλυση ταιριάζει αυτόματα ως
 * «Εξοφλήσεις παλαιότερων»). Μόνο ανάγνωση — κάθε θέση του ΔΣ.
 */
export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')
  const decoded = sessionCookie ? verifyToken(sessionCookie.value) : null
  if (!decoded || decoded.type !== 'session') {
    return NextResponse.json({ error: 'Απαιτείται σύνδεση' }, { status: 401 })
  }
  const access = await resolveOcAccess(decoded.memberId)
  if (!access.isBoard) return NextResponse.json({ error: 'Δεν επιτρέπεται' }, { status: 403 })
  const month = request.nextUrl.searchParams.get('month') || ''
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'Μη έγκυρος μήνας' }, { status: 400 })
  }
  const res = await strapi(
    `/expenses?filters[State][$eq]=approved&filters[PaymentMethod][$eq]=unpaid&filters[Month][$lt]=${month}`
    + '&sort[0]=Month:asc&pagination[limit]=200'
    + '&fields[0]=Aa&fields[1]=Month&fields[2]=SupplierName&fields[3]=DocNumber&fields[4]=DocRef&fields[5]=IssueDate&fields[6]=PayableAmount&fields[7]=FileId',
  )
  if (!res.ok) return NextResponse.json({ error: 'Αποτυχία ανάγνωσης' }, { status: 502 })
  const unpaid = (res.json?.data || []).map((e: any) => ({
    documentId: e.documentId, aa: e.Aa || null, month: e.Month,
    supplierName: e.SupplierName || null, docNumber: e.DocNumber || e.DocRef || null,
    issueDate: e.IssueDate || null, amount: Number(e.PayableAmount) || 0, hasFile: !!e.FileId,
  }))
  return NextResponse.json({ unpaid })
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
  // Financer: όλη η ροή. IT: ΜΟΝΟ έγκριση χειροκίνητων γραμμών (χωρίς
  // αρχείο) — αφού ελέγξει τι έχει ήδη καταχωρηθεί και συνεννοηθεί με
  // τον/την Financer. Ο έλεγχος γίνεται εδώ, όχι μόνο στην οθόνη.
  if (activeSeat !== 'financer' && activeSeat !== 'it') {
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
  const month = String(body?.month || '')
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'Μη έγκυρος μήνας' }, { status: 400 })
  }

  if (body?.action === 'ackRecon') {
    const id = String(body?.id || '').replace(/[^a-z0-9]/gi, '')
    if (!id) return NextResponse.json({ error: 'Λείπει η εγγραφή' }, { status: 400 })
    const r = await strapi(`/expenses/${id}`, 'PUT', { ReconAcked: true })
    if (!r.ok) {
      const msg = String(r.json?.error?.message || '')
      if (/invalid key|ReconAcked/i.test(msg)) {
        return NextResponse.json({ error: 'Η σήμανση θα δουλέψει μόλις ανέβει το πεδίο στη βάση — ενημέρωσε το IT' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Αποτυχία σήμανσης' }, { status: 502 })
    }
    return NextResponse.json({ ok: true })
  }

  if (body?.action === 'approve') {
    const items: any[] = Array.isArray(body?.items) ? body.items : []
    const settlements: any[] = Array.isArray(body?.settlements) ? body.settlements : []
    const manualCount = items.filter(it => String(it?.fileId || '').startsWith('manual-')).length
    if (activeSeat === 'it') {
      if (manualCount !== items.length || settlements.length > 0) {
        return NextResponse.json({ error: 'Το IT εγκρίνει μόνο χειροκίνητες καταχωρήσεις' }, { status: 403 })
      }
    } else if (manualCount > 0) {
      return NextResponse.json({ error: 'Οι χειροκίνητες καταχωρήσεις γίνονται μόνο από το IT — επικοινώνησε με το it@' }, { status: 403 })
    }
    return approveExpenses(month, body, decoded.memberId, activeSeat)
  }
  if (activeSeat !== 'financer') {
    return NextResponse.json({ error: 'Μόνο ο/η Financer' }, { status: 403 })
  }

  try {
    // 1) αρχεία του μήνα
    const listing = await webApp('listMonthInvoices', { month })
    if (!listing.ok) {
      return NextResponse.json({ error: listing.error || 'Αποτυχία ανάγνωσης φακέλου' }, { status: 502 })
    }
    const files: Array<{ id: string; name: string; url: string; size: number }> = listing.files || []

    // 2+3) parse + μητρώο προμηθευτών
    const aliases = await getSupplierAliases()

    // 5) ήδη καταχωρημένα (ανά όνομα αρχείου ή ΜΑΡΚ/αριθμό)
    const existingRes = await strapi(
      `/expenses?filters[Month][$eq]=${month}&filters[State][$eq]=approved&pagination[limit]=200` +
      '&fields[0]=Aa&fields[1]=FileName&fields[2]=Mark&fields[3]=DocNumber&fields[4]=State&fields[5]=PayableAmount&fields[6]=IssueDate'
    )
    const existing: any[] = existingRes.json?.data || []
    const existingByFile = new Map<string, any>()
    const existingByMark = new Map<string, any>()
    // (30/8) Και ανά αριθμό παραστατικού: οι backfilled γραμμές δεν έχουν
    // ούτε αρχείο ούτε ΜΑΡΚ (ξένοι προμηθευτές), κι έτσι ξαναγράφονταν
    const normDoc = (v: any) => String(v || '').toUpperCase().replace(/[^A-ZΑ-Ω0-9]/g, '')
    const digitsDoc = (v: any) => String(v || '').replace(/\D/g, '')
    const existingByDoc = new Map<string, any[]>()
    for (const e of existing) {
      if (e.FileName) existingByFile.set(e.FileName, e)
      if (e.Mark) existingByMark.set(e.Mark, e)
      for (const k of new Set([normDoc(e.DocNumber), digitsDoc(e.DocNumber)])) {
        if (k.length < 3) continue
        const arr = existingByDoc.get(k) || []
        arr.push(e)
        existingByDoc.set(k, arr)
      }
    }

    // 4) χρεώσεις τράπεζας (προαιρετικά)
    const kiniseisText = String(body?.kiniseis || '')
    let debits: Array<{ txnId: string; date: string; amount: number; reason: string; used?: boolean }> = []
    const warnings: string[] = []
    if (kiniseisText.trim()) {
      try {
        const parsed = parseKiniseis(kiniseisText)
        warnings.push(...parsed.warnings)
        debits = parsed.movements
          .filter(m => m.direction === 'debit')
          .map(d => ({ txnId: d.txnId, date: d.date, amount: d.amount, reason: d.reason }))
      } catch (err) {
        warnings.push('Δεν διαβάστηκαν οι κινήσεις — έλεγξε την επικόλληση')
      }
    }

    // αύξων αριθμός: συνέχεια από ό,τι υπάρχει ήδη στον μήνα
    const monthIdx = Number(month.split('-')[1])
    let nextSeq = 1
    for (const e of existing) {
      const m = /^\d+\.(\d+)$/.exec(String(e.Aa || ''))
      if (m) nextSeq = Math.max(nextSeq, Number(m[1]) + 1)
    }

    const rows = files.map((f) => {
      const parsed: ParsedInvoiceName = parseInvoiceFilename(f.name)
      const alias = parsed.supplierHint ? lookupAlias(parsed.supplierHint, aliases) : null
      let already = existingByFile.get(f.name) || (parsed.mark ? existingByMark.get(parsed.mark) : null)
      if (!already && parsed.docNumber) {
        const cands = existingByDoc.get(normDoc(parsed.docNumber)) || existingByDoc.get(digitsDoc(parsed.docNumber)) || []
        if (cands.length === 1) already = cands[0]
        else if (cands.length > 1) {
          // ίδιος αριθμός σε πολλές γραμμές (π.χ. μηνιαίο ενοίκιο «758»): προτίμησε
          // τη γραμμή χωρίς αρχείο που συμφωνεί σε ποσό, μετά σε ημερομηνία
          already = cands.find(c => !c.FileName && parsed.amount !== null && Math.abs(Number(c.PayableAmount) - (parsed.amount as number)) < 0.005)
            || cands.find(c => !c.FileName && parsed.issueDate && c.IssueDate === parsed.issueDate)
            || cands.find(c => !c.FileName)
            || cands[0]
        }
      }

      const docPrefix = alias?.docPrefix || '2.1'
      const docRef = [docPrefix, parsed.docNumber, parsed.mark].filter(Boolean).join('/')

      return {
        fileId: f.id,
        fileName: f.name,
        fileUrl: f.url,
        parsed: {
          mark: parsed.mark,
          docNumber: parsed.docNumber,
          issueDate: parsed.issueDate,
          amount: parsed.amount,
          grossAmount: parsed.grossAmount,
          withholding: parsed.withholding,
          supplierHint: parsed.supplierHint,
        },
        suggestion: {
          docRef,
          supplierName: alias?.supplierName || parsed.supplierHint || null,
          supplierTaxId: alias?.supplierTaxId || null,
          category: alias?.category || null,
          autoPaid: !!alias?.autoPaid,
          fromRegistry: !!alias,
          confirmations: alias?.confirmations || 0,
        },
        // hasFile=false → «σύνδεση»: το αρχείο δένεται στην υπάρχουσα γραμμή
        // αντί να δημιουργηθεί δεύτερη
        existing: already
          ? { documentId: already.documentId, aa: already.Aa, state: already.State, amount: already.PayableAmount, hasFile: !!already.FileName }
          : null,
      }
    })

    // ── Αντιστοίχιση με χρεώσεις ──
    // Πέρασμα 1: ΠΟΣΟ (απόφαση Financer), oldest-first σε ισοπαλίες
    const matched: Record<string, { txnId: string; date: string; amount: number; reason: string; via: 'amount' | 'supplier' }> = {}
    const rowsWithAmount = rows
      .filter(r => !r.existing && r.parsed.amount !== null)
      .sort((a, b) => String(a.parsed.issueDate || '').localeCompare(String(b.parsed.issueDate || '')))
    for (const r of rowsWithAmount) {
      const hit = debits.find(d => !d.used && Math.abs(d.amount - (r.parsed.amount as number)) < 0.005)
      if (hit) {
        hit.used = true
        matched[r.fileId] = { txnId: hit.txnId, date: hit.date, amount: hit.amount, reason: hit.reason, via: 'amount' }
      }
    }

    // Πέρασμα 2: ΟΝΟΜΑ ΠΡΟΜΗΘΕΥΤΗ στην αιτιολογία, για όσα δεν έχουν ποσό
    // στο όνομα αρχείου («SΤRΑΡΙ», «ΖΟΟΜ.CΟΜ», «ΤΠΥ 110 ΚΛΗΡΟΝ…»).
    // Μοναδικό ταίριασμα μόνο — αν δύο χρεώσεις ταιριάζουν, αφήνεται στον
    // Financer αντί να μαντέψουμε.
    const norm = (t: string) => t
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLocaleUpperCase('el').replace(/[^A-ZΑ-Ω0-9]/g, '')
    for (const r of rows) {
      if (r.existing || matched[r.fileId]) continue
      const hint = norm(r.suggestion.supplierName || r.parsed.supplierHint || '')
      if (hint.length < 4) continue
      const cands = debits.filter(d => {
        if (d.used) return false
        const reason = norm(d.reason || '')
        return reason.includes(hint.slice(0, 8)) || hint.includes(reason.slice(0, 8))
      })
      if (cands.length === 1) {
        cands[0].used = true
        matched[r.fileId] = {
          txnId: cands[0].txnId, date: cands[0].date,
          amount: cands[0].amount, reason: cands[0].reason, via: 'supplier',
        }
      }
    }

    // Πέρασμα 3: ΕΞΟΦΛΗΣΕΙΣ ΠΑΛΑΙΟΤΕΡΩΝ παραστατικών — εγκεκριμένα έξοδα
    // οποιουδήποτε μήνα που είχαν μείνει απλήρωτα και πληρώνονται τώρα.
    const carriedRes = await strapi(
      '/expenses?filters[State][$eq]=approved&filters[PaymentMethod][$eq]=unpaid' +
      '&pagination[limit]=200&sort=IssueDate:asc' +
      '&fields[0]=Aa&fields[1]=Month&fields[2]=DocRef&fields[3]=SupplierName' +
      '&fields[4]=PayableAmount&fields[5]=IssueDate'
    )
    const carriedOver: Array<{
      documentId: string; aa: string; month: string; docRef: string | null
      supplierName: string | null; amount: number; issueDate: string | null
      txnId: string; paymentDate: string; reason: string
    }> = []
    for (const e of carriedRes.json?.data || []) {
      const amt = Number(e.PayableAmount) || 0
      if (!(amt > 0)) continue
      const hit = debits.find(d => !d.used && Math.abs(d.amount - amt) < 0.005)
      if (!hit) continue
      hit.used = true
      carriedOver.push({
        documentId: e.documentId, aa: e.Aa, month: e.Month, docRef: e.DocRef || null,
        supplierName: e.SupplierName || null, amount: amt, issueDate: e.IssueDate || null,
        txnId: hit.txnId, paymentDate: hit.date, reason: hit.reason,
      })
    }

    /* Πέρασμα 3β: χρεώσεις που εξοφλούν παραστατικό προηγούμενου μήνα το
       οποίο ΕΧΕΙ ΗΔΗ καταχωρηθεί ως πληρωμένο, με ημερομηνία πληρωμής μέσα
       σε αυτόν τον μήνα.

       Χωρίς αυτό, η χρέωση έπεφτε στα «χωρίς παραστατικό»: το αρχείο ζει στον
       φάκελο του μήνα ΕΚΔΟΣΗΣ (σωστά) και το πέρασμα 3 κοιτά μόνο απλήρωτα.
       Συνέβαινε κάθε μήνα στο μηνιαίο τιμολόγιο που εκδίδεται στο τέλος του
       μήνα και πληρώνεται στις πρώτες μέρες του επόμενου (1/9/2026).

       Δεν κρύβεται: μένει ως ΕΝΗΜΕΡΩΣΗ ώστε να ελεγχθούν οι ημερομηνίες
       έκδοσης και πληρωμής — και κλείνει οριστικά με το ✕ (ReconAcked). */
    const settledRes = await strapi(
      `/expenses?filters[State][$eq]=approved&filters[Month][$lt]=${month}` +
      `&filters[PaymentMethod][$ne]=unpaid&filters[PaymentDate][$gte]=${month}-01&filters[PaymentDate][$lte]=${month}-31` +
      '&pagination[limit]=200&sort=PaymentDate:asc'
      // Επίτηδες ΧΩΡΙΣ λίστα fields: το ReconAcked μπορεί να μην έχει φτάσει
      // ακόμη στο Strapi Cloud, και ένα άγνωστο κλειδί ρίχνει ΟΛΟ το ερώτημα
      // με 400 «Invalid key» — η ενημέρωση θα χανόταν σιωπηλά (1/9/2026).
    )
    const settledEarlier: Array<{
      documentId: string; aa: string; month: string; supplierName: string | null
      docRef: string | null; amount: number; issueDate: string | null; paymentDate: string | null
      txnId: string | null; reason: string | null; hasFile: boolean
    }> = []
    for (const e of settledRes.json?.data || []) {
      const amt = Number(e.PayableAmount) || 0
      if (!(amt > 0)) continue
      const hit = debits.find(d => !d.used && Math.abs(d.amount - amt) < 0.005)
      if (hit) hit.used = true      // η χρέωση εξηγείται — δεν είναι «χωρίς παραστατικό»
      if (e.ReconAcked) continue    // έχει ήδη ελεγχθεί από άνθρωπο
      settledEarlier.push({
        documentId: e.documentId, aa: e.Aa, month: e.Month, supplierName: e.SupplierName || null,
        docRef: e.DocNumber || e.DocRef || null, amount: amt,
        issueDate: e.IssueDate || null, paymentDate: e.PaymentDate || null,
        txnId: hit?.txnId || null, reason: hit?.reason || null, hasFile: !!e.FileName,
      })
    }

    // Ασυμφωνία ποσού: όνομα αρχείου vs τράπεζα (εκεί πιάνονται τα λάθη
    // τύπου «Zoom 14,99 αντί 15,99»)
    const mismatches: Array<{ fileId: string; fileName: string; fromName: number; fromBank: number }> = []
    for (const r of rows) {
      const bank = matched[r.fileId]
      if (bank && r.parsed.amount !== null && Math.abs(bank.amount - r.parsed.amount) >= 0.005) {
        mismatches.push({
          fileId: r.fileId, fileName: r.fileName,
          fromName: r.parsed.amount, fromBank: bank.amount,
        })
      }
    }

    const leftoverDebits = debits.filter(d => !d.used)
    const unpaidInvoices = rows.filter(r => !r.existing && !matched[r.fileId])

    return NextResponse.json({
      month,
      rows,
      matched,
      mismatches,
      carriedOver,
      reconciliation: {
        settledEarlier,
        debitsWithoutInvoice: leftoverDebits.map(d => ({
          txnId: d.txnId, date: d.date, amount: d.amount, reason: d.reason,
        })),
        debitsWithoutInvoiceTotal: Math.round(leftoverDebits.reduce((s, d) => s + d.amount, 0) * 100) / 100,
        invoicesWithoutPayment: unpaidInvoices.map(r => ({
          fileName: r.fileName, amount: r.parsed.amount, issueDate: r.parsed.issueDate,
        })),
      },
      nextSeq,
      unmatchedDebits: debits.filter(d => !d.used).map(d => ({
        txnId: d.txnId, date: d.date, amount: d.amount, reason: d.reason,
      })),
      warnings,
      folderMissing: !!listing.folderMissing,
      folderUrl: listing.folderUrl || null,
      stats: {
        files: rows.length,
        alreadyRecorded: rows.filter(r => r.existing).length,
        fromRegistry: rows.filter(r => r.suggestion.fromRegistry).length,
        withDate: rows.filter(r => r.parsed.issueDate).length,
        bankMatched: Object.keys(matched).length,
      },
    })
  } catch (err) {
    console.error('expense-intake analyze failed:', err)
    return NextResponse.json({ error: 'Αποτυχία ανάλυσης' }, { status: 502 })
  }
}

/**
 * Έγκριση: για κάθε εγκεκριμένη γραμμή — Strapi expense → γραμμή ΕΞΟΔΑ
 * (η οποία επιστρέφει το Α/Α) → μετονομασία αρχείου στο Drive →
 * εκμάθηση προμηθευτή. Best-effort ανά γραμμή: μια αποτυχία δεν ρίχνει
 * τις υπόλοιπες, επιστρέφεται αναλυτικό αποτέλεσμα.
 */
async function approveExpenses(month: string, body: any, memberId: string, seat: OcSeat) {
  const items: any[] = Array.isArray(body?.items) ? body.items : []
  const settlements: any[] = Array.isArray(body?.settlements) ? body.settlements : []
  if (items.length === 0 && settlements.length === 0) {
    return NextResponse.json({ error: 'Καμία γραμμή προς έγκριση' }, { status: 400 })
  }

  // Εξοφλήσεις παλαιότερων παραστατικών: ενημέρωση υπάρχουσας γραμμής
  const settled: Array<{ documentId: string; ok: boolean; aa?: string; error?: string }> = []
  for (const st of settlements) {
    try {
      const upd = await webApp('updateExpensePayment', {
        docRef: st.docRef,
        amount: Number(st.amount),
        paymentDate: st.paymentDate,
        paymentMethod: st.paymentMethod || 'bank',
      })
      if (!upd.ok) throw new Error(upd.error || 'Αποτυχία ενημέρωσης γραμμής')
      const r = await strapi(`/expenses/${st.documentId}`, 'PUT', {
        PaymentMethod: st.paymentMethod || 'bank',
        PaymentDate: st.paymentDate,
        TransactionId: st.txnId || null,
      })
      if (!r.ok) console.error('settle: strapi update failed', r.status)
      settled.push({ documentId: st.documentId, ok: true, aa: upd.aa })
    } catch (err: any) {
      settled.push({ documentId: st.documentId, ok: false, error: err?.message || 'Αποτυχία' })
    }
  }

  const results: Array<{ fileId: string; ok: boolean; aa?: string; newName?: string; error?: string }> = []

  for (const it of items) {
    const fileId = String(it?.fileId || '')
    // Χειροκίνητη γραμμή (χωρίς αρχείο, από το «Προσθήκη» του intake):
    // ίδια ροή, αλλά χωρίς αρχείο και ΜΕ σήμανση στις Σημειώσεις — βάση και ΕΞΟΔΑ
    const isManual = fileId.startsWith('manual-')
    const notes = isManual
      ? `Χειροκίνητη καταχώρηση από IT (χωρίς αρχείο)${it.notes ? ` — ${it.notes}` : ''}`
      : (it.notes || null)
    try {
      // Σύνδεση αρχείου με ΥΠΑΡΧΟΥΣΑ γραμμή (χωρίς αρχείο, π.χ. backfill):
      // μετονομασία με τα δεδομένα της γραμμής + FileId/FileName — τίποτα
      // άλλο δεν γράφεται (ούτε ΕΞΟΔΑ, ούτε νέα εγγραφή)
      if (it?.linkTo) {
        const ex = (await strapi(`/expenses/${it.linkTo}?fields[0]=Aa&fields[1]=SupplierName&fields[2]=DocNumber&fields[3]=Mark&fields[4]=IssueDate&fields[5]=PayableAmount&fields[6]=Withholding`)).json?.data
        if (!ex?.Aa || !ex?.IssueDate) throw new Error('Η υπάρχουσα γραμμή δεν βρέθηκε')
        const parsedName = parseInvoiceFilename(String(it.fileName || ''))
        const pay = Number(ex.PayableAmount) || 0
        const wh = Number(ex.Withholding) || 0
        const linkedName = buildApprovedFilename({
          aa: ex.Aa, subject: ex.SupplierName || null, docNumber: ex.DocNumber || null, mark: ex.Mark || null,
          date: String(ex.IssueDate), amount: pay, grossAmount: wh > 0 ? Math.round((pay + wh) * 100) / 100 : null, ext: parsedName.ext,
        })
        if (fileId) {
          const ren = await webApp('renameFile', { fileId, newName: linkedName })
          if (!ren.ok) console.error('expense link: rename failed', ren.error)
        }
        const upd = await strapi(`/expenses/${it.linkTo}`, 'PUT', { FileId: fileId || null, FileName: linkedName })
        if (!upd.ok) throw new Error('Αποτυχία σύνδεσης με την υπάρχουσα γραμμή')
        results.push({ fileId, ok: true, aa: ex.Aa, newName: linkedName })
        continue
      }
      if (!it?.issueDate) throw new Error('Λείπει ημερομηνία έκδοσης — μετονόμασε το αρχείο και ξανατρέξε την ανάλυση')
      const payable = Number(it?.payable)
      if (!(payable > 0)) throw new Error('Λείπει ποσό')

      // 1) γραμμή στο ΕΞΟΔΑ — δίνει το επίσημο Α/Α
      const sheetRes = await webApp('appendExpense', {
        month,
        category: it.category || null,
        issueDate: it.issueDate,
        docRef: it.docRef || null,
        supplierName: it.supplierName || null,
        supplierTaxId: it.supplierTaxId || null,
        amount: payable,
        withholding: Number(it.withholding) || 0,
        paymentMethod: it.paymentMethod || 'unpaid',
        paymentDate: it.paymentDate || null,
        notes,
      })
      if (!sheetRes.ok) throw new Error(sheetRes.error || 'Αποτυχία εγγραφής στο ΕΞΟΔΑ')
      const aa: string = sheetRes.aa

      // 2) μετονομασία αρχείου: {Α/Α}_{όνομα που έδωσες}_{ΗΗ-ΜΜ-ΕΕΕΕ}
      let newName: string | undefined
      if (fileId && it.fileName && !isManual) {
        const parsed = parseInvoiceFilename(String(it.fileName))
        newName = buildApprovedFilename({
          aa,
          subject: it.supplierName || parsed.supplierHint || null,
          docNumber: it.docNumber || parsed.docNumber || null,
          mark: it.mark || parsed.mark || null,
          date: String(it.issueDate),
          amount: payable,
          // κρατήσεις → το όνομα κρατά και το σύνολο: «σύνολο→πληρωτέο»
          grossAmount: Number(it.withholding) > 0 ? Math.round((payable + Number(it.withholding)) * 100) / 100 : null,
          ext: parsed.ext,
        })
        const ren = await webApp('renameFile', { fileId, newName })
        if (!ren.ok) console.error('expense approve: rename failed', ren.error)
      }

      // 3) εγγραφή στο Strapi
      const created = await strapi('/expenses', 'POST', {
        Month: month,
        Aa: aa,
        IssueDate: it.issueDate,
        DocRef: it.docRef || null,
        DocNumber: it.docNumber || null,
        Mark: it.mark || null,
        SupplierName: it.supplierName || null,
        SupplierTaxId: it.supplierTaxId || null,
        Category: it.category || null,
        NetAmount: it.netAmount ? Number(it.netAmount) : null,
        VatAmount: it.vatAmount ? Number(it.vatAmount) : null,
        Withholding: Number(it.withholding) || null,
        PayableAmount: payable,
        PaymentMethod: it.paymentMethod || 'unpaid',
        PaymentDate: it.paymentDate || null,
        TransactionId: it.txnId || null,
        Notes: notes,
        FileName: isManual ? null : (newName || it.fileName || null),
        FileId: isManual ? null : (fileId || null),
        State: 'approved',
        SheetSynced: true,
        ApprovedAt: new Date().toISOString(),
        ApprovedBy: `${seat}:${memberId}`,
      })
      if (!created.ok) console.error('expense approve: strapi create failed', created.status)

      // 4) εκμάθηση προμηθευτή — η επόμενη φορά έρχεται συμπληρωμένη
      if (it.supplierHint && it.supplierName) {
        await upsertSupplierAlias({
          hint: String(it.supplierHint),
          supplierName: String(it.supplierName),
          supplierTaxId: it.supplierTaxId || null,
          category: (it.category as ExpenseCategory) || null,
          autoPaid: !!it.autoPaid,
        })
      }

      results.push({ fileId, ok: true, aa, newName })
    } catch (err: any) {
      results.push({ fileId, ok: false, error: err?.message || 'Αποτυχία' })
    }
  }

  return NextResponse.json({
    ok: results.every(r => r.ok) && settled.every(s => s.ok),
    results,
    settled,
    approved: results.filter(r => r.ok).length,
    failed: results.filter(r => !r.ok).length,
  })
}
