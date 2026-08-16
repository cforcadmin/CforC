import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { resolveOcAccess, type OcSeat } from '@/lib/ocRoles'
import { parseInvoiceFilename, type ParsedInvoiceName } from '@/lib/invoiceFilename'
import { getSupplierAliases, lookupAlias } from '@/lib/supplierAliases'
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

async function strapi(path: string) {
  const res = await fetch(`${STRAPI_URL}/api${path}`, {
    headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
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
  const month = String(body?.month || '')
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'Μη έγκυρος μήνας' }, { status: 400 })
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
      `/expenses?filters[Month][$eq]=${month}&pagination[limit]=200` +
      '&fields[0]=Aa&fields[1]=FileName&fields[2]=Mark&fields[3]=DocNumber&fields[4]=State&fields[5]=PayableAmount'
    )
    const existing: any[] = existingRes.json?.data || []
    const existingByFile = new Map<string, any>()
    const existingByMark = new Map<string, any>()
    for (const e of existing) {
      if (e.FileName) existingByFile.set(e.FileName, e)
      if (e.Mark) existingByMark.set(e.Mark, e)
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
      const already = existingByFile.get(f.name) || (parsed.mark ? existingByMark.get(parsed.mark) : null)

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
          supplierHint: parsed.supplierHint,
        },
        suggestion: {
          docRef,
          supplierName: alias?.supplierName || parsed.supplierHint || null,
          supplierTaxId: alias?.supplierTaxId || null,
          category: alias?.category || null,
          fromRegistry: !!alias,
          confirmations: alias?.confirmations || 0,
        },
        existing: already ? { aa: already.Aa, state: already.State, amount: already.PayableAmount } : null,
      }
    })

    // αντιστοίχιση με χρεώσεις: ΜΟΝΟ ποσό, oldest-first σε ισοπαλίες
    const matched: Record<string, { txnId: string; date: string; amount: number; reason: string }> = {}
    const rowsWithAmount = rows
      .filter(r => !r.existing && r.parsed.amount !== null)
      .sort((a, b) => String(a.parsed.issueDate || '').localeCompare(String(b.parsed.issueDate || '')))
    for (const r of rowsWithAmount) {
      const hit = debits.find(d => !d.used && Math.abs(d.amount - (r.parsed.amount as number)) < 0.005)
      if (hit) {
        hit.used = true
        matched[r.fileId] = { txnId: hit.txnId, date: hit.date, amount: hit.amount, reason: hit.reason }
      }
    }

    return NextResponse.json({
      month,
      rows,
      matched,
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
