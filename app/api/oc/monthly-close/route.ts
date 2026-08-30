import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { resolveOcAccess, getSeatHolder, type OcSeat } from '@/lib/ocRoles'
import { type ReceiptType } from '@/lib/receipts'
import { sendOcEmail, monthlyDispatchEmailHtml, ADMIN_FROM, ADMIN_EMAIL, FINANCE_EMAIL } from '@/lib/ocEmails'

/**
 * Μηνιαία εικόνα ΕΣΟΔΩΝ + ΕΞΟΔΩΝ και κλείσιμο μήνα («εστάλη στο λογιστήριο»).
 *
 *  GET ?month=yyyy-MM → τρεις πηγές, όπως ακριβώς και στο Excel:
 *    Α. έσοδα  = αποδείξεις ΚΑΤΑ ΗΜΕΡΟΜΗΝΙΑ ΠΛΗΡΩΜΗΣ (απόφαση λογιστηρίου)
 *                + έσοδα χωρίς απόδειξη (χορηγίες/επιχορηγήσεις)
 *    Β. έξοδα  = εγκεκριμένα παραστατικά του μπλοκ του μήνα (πεδίο Month —
 *                ίδιο κριτήριο με τον φάκελο Drive και το Α/Α του ΕΞΟΔΑ)
 *    συν σύνολα ανά κατηγορία, ισοζύγιο, κατάσταση κλεισίματος, και δέλτα:
 *    αποδείξεις που δημιουργήθηκαν ΜΕΤΑ το κλείσιμο του μήνα τους —
 *    εμφανίζονται, δεν σιωπούν (handoff note §2.4).
 *  POST {month, action}:
 *    'ready'    → «Έτοιμο προς αποστολή στο λογιστήριο» (ΜΟΝΟ Financer)
 *    'dispatch' → «Αποστολή στο λογιστήριο» (ΜΟΝΟ Διαχείριση/IT): χτίζει το
 *                 CSV του μήνα με ΑΜΦΟΤΕΡΑ τα τμήματα και το στέλνει στο
 *                 ACCOUNTANT_EMAIL (fallback: finance@).
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

const TYPE_LABELS: Record<ReceiptType, string> = {
  registration: 'Εγγραφή + Συνδρομή',
  subscription: 'Συνδρομή',
  extraordinary: 'Έκτακτη εισφορά',
  donation: 'Δωρεά',
  grant: 'Χορηγία',
  other: 'Είσπραξη',
}

const INCOME_RECORD_LABELS: Record<string, string> = {
  grant: 'Χορηγία', donation: 'Δωρεά', extraordinary: 'Έκτακτη εισφορά',
  business: 'Επιχειρηματική δραστηριότητα', other: 'Λοιπά έσοδα',
}

/** Οι κατηγορίες του ΕΞΟΔΑ, όπως τις ονομάζει το ίδιο το φύλλο */
const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  'Office Expenses': 'Λειτουργικά',
  'Services': 'Υπηρεσίες',
  'Travel and Accommodation': 'Μετακινήσεις & διαμονή',
  'Others': 'Λοιπά',
}

/** «9.10» > «9.2»: το Α/Α του φύλλου είναι μήνας.σειρά, όχι δεκαδικός */
function aaOrder(aa: string | null | undefined): number {
  const m = /^(\d+)\.(\d+)$/.exec(String(aa || ''))
  if (!m) return Number.MAX_SAFE_INTEGER
  return Number(m[1]) * 10000 + Number(m[2])
}

const METHOD_LABELS: Record<string, string> = {
  bank: 'Τράπεζα', cash: 'Μετρητά', offset: 'Συμψηφισμός', unpaid: 'Ανεξόφλητο',
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

type Gate = 'board' | 'financer' | 'admin'

async function authorize(gate: Gate) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')
  const decoded = sessionCookie ? verifyToken(sessionCookie.value) : null
  if (!decoded || decoded.type !== 'session') {
    return { error: NextResponse.json({ error: 'Απαιτείται σύνδεση' }, { status: 401 }) }
  }
  const access = await resolveOcAccess(decoded.memberId)
  if (!access.isBoard) return { error: NextResponse.json({ error: 'Δεν επιτρέπεται' }, { status: 403 }) }
  if (gate !== 'board') {
    const seatCookie = cookieStore.get('oc-last-seat')?.value as OcSeat | undefined
    const activeSeat: OcSeat | null =
      seatCookie && access.seats.includes(seatCookie) ? seatCookie
        : access.seats.length === 1 ? access.seats[0] : null
    if (gate === 'financer' && activeSeat !== 'financer') {
      return { error: NextResponse.json({ error: 'Μόνο ο/η Financer' }, { status: 403 }) }
    }
    if (gate === 'admin' && activeSeat !== 'admin' && activeSeat !== 'it') {
      return { error: NextResponse.json({ error: 'Μόνο Διαχείριση (Γραμματεία/IT)' }, { status: 403 }) }
    }
  }
  return { memberId: decoded.memberId }
}

function validMonth(raw: string | null): string {
  if (raw && /^\d{4}-\d{2}$/.test(raw)) return raw
  // default: ο προηγούμενος μήνας
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const MONTH_NAMES = ['Ιανουάριος','Φεβρουάριος','Μάρτιος','Απρίλιος','Μάιος','Ιούνιος',
  'Ιούλιος','Αύγουστος','Σεπτέμβριος','Οκτώβριος','Νοέμβριος','Δεκέμβριος']

function monthLabelOf(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return `${MONTH_NAMES[m - 1]} ${y}`
}

function monthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split('-').map(Number)
  const last = new Date(y, m, 0).getDate()
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, '0')}` }
}

/**
 * Block Γ — «εκ των υστέρων» για μήνες που έχουν ΗΔΗ σταλεί, ορισμένο
 * μόνο από δεδομένα (χωρίς stamp), ώστε κάθε στοιχείο να φεύγει ακριβώς μία
 * φορά:
 *  - εξόφληση:  έξοδο παλαιότερου μήνα που ΠΛΗΡΩΘΗΚΕ μέσα στον μήνα M →
 *               αναφέρεται στην αποστολή του M (μήνας πληρωμής)
 *  - προσθήκη:  έξοδο παλαιότερου μήνα που ΕΓΚΡΙΘΗΚΕ αφού στάλθηκε ο μήνας
 *               του, και μετά την τελευταία αποστολή → αναφέρεται στην πρώτη
 *               αποστολή που ακολουθεί
 * Κανόνας Financer (30/8): η εκ των υστέρων γραμμή είναι η ΤΕΛΕΥΤΑΙΑ του
 * μήνα της (Α/Α συνέχεια), όποια κι αν είναι η ημερομηνία έκδοσης.
 */
export interface LateItem {
  documentId: string
  month: string
  aa: string | null
  supplierName: string | null
  docNumber: string | null
  mark: string | null
  issueDate: string | null
  amount: number
  kind: 'settlement' | 'addition'
  paymentMethod: string
  paymentDate: string | null
  fileName: string | null
  fileId: string | null
}

async function computeLateItems(
  month: string,
  closes: Array<{ Month: string; SentAt?: string | null }>,
): Promise<LateItem[]> {
  const { from, to } = monthRange(month)
  const sentAtOf = new Map<string, number>()
  for (const c of closes) if (c.SentAt) sentAtOf.set(c.Month, Date.parse(c.SentAt))
  // η τελευταία αποστολή ΠΡΙΝ από αυτή (οποιουδήποτε μήνα εκτός του M)
  const lastDispatch = Math.max(0, ...closes.filter(c => c.Month !== month && c.SentAt).map(c => Date.parse(c.SentAt as string)))
  const fields = '&fields[0]=Aa&fields[1]=Month&fields[2]=SupplierName&fields[3]=DocNumber&fields[4]=DocRef&fields[5]=Mark'
    + '&fields[6]=IssueDate&fields[7]=PayableAmount&fields[8]=PaymentMethod&fields[9]=PaymentDate&fields[10]=FileName&fields[11]=FileId&fields[12]=ApprovedAt'
  const [settledRes, addedRes] = await Promise.all([
    strapi(`/expenses?filters[State][$eq]=approved&filters[Month][$lt]=${month}&filters[PaymentMethod][$ne]=unpaid`
      + `&filters[PaymentDate][$gte]=${from}&filters[PaymentDate][$lte]=${to}&pagination[limit]=200${fields}`),
    lastDispatch > 0
      ? strapi(`/expenses?filters[State][$eq]=approved&filters[Month][$lt]=${month}`
        + `&filters[ApprovedAt][$gt]=${new Date(lastDispatch).toISOString()}&pagination[limit]=200${fields}`)
      : Promise.resolve({ ok: true, status: 200, json: { data: [] } }),
  ])
  const toItem = (e: any, kind: LateItem['kind']): LateItem => ({
    documentId: e.documentId, month: e.Month, aa: e.Aa || null,
    supplierName: e.SupplierName || null, docNumber: e.DocNumber || e.DocRef || null, mark: e.Mark || null,
    issueDate: e.IssueDate || null, amount: Number(e.PayableAmount) || 0, kind,
    paymentMethod: e.PaymentMethod || 'unpaid', paymentDate: e.PaymentDate || null,
    fileName: e.FileName || null, fileId: e.FileId || null,
  })
  const items = new Map<string, LateItem>()
  // προσθήκες: μόνο όσες εγκρίθηκαν ΜΕΤΑ την αποστολή του δικού τους μήνα
  for (const e of addedRes.json?.data || []) {
    const ownSent = sentAtOf.get(e.Month)
    if (!ownSent || !e.ApprovedAt || Date.parse(e.ApprovedAt) <= ownSent) continue
    items.set(e.documentId, toItem(e, 'addition'))
  }
  for (const e of settledRes.json?.data || []) {
    if (!sentAtOf.get(e.Month)) continue          // ο μήνας του δεν έχει σταλεί → θα πάει με τον ίδιο
    if (!items.has(e.documentId)) items.set(e.documentId, toItem(e, 'settlement'))
  }
  return Array.from(items.values()).sort((a, b) => a.month.localeCompare(b.month) || aaOrder(a.aa) - aaOrder(b.aa))
}

/** Οι φάκελοι Drive του μήνα (σύνδεσμοι για το λογιστήριο) — μέσω του web app του φύλλου */
async function monthFolderUrls(month: string): Promise<{ expenses: string | null; income: string | null }> {
  const url = process.env.FINANCE_SHEET_WEBAPP_URL, secret = process.env.FINANCE_SHEET_WEBAPP_SECRET
  if (!url || !secret) return { expenses: null, income: null }
  const call = async (action: string) => {
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, action, month }), redirect: 'follow', cache: 'no-store' })
      const j = JSON.parse(await res.text())
      return (j?.folderUrl as string) || null
    } catch { return null }
  }
  const [expenses, income] = await Promise.all([call('listMonthInvoices'), call('listMonthIncomeDocs')])
  return { expenses, income }
}

export async function GET(request: NextRequest) {
  const auth = await authorize('board')
  if ('error' in auth) return auth.error
  try {
    const month = validMonth(request.nextUrl.searchParams.get('month'))
    const { from, to } = monthRange(month)

    const [recRes, incRes, expRes, closeRes, allClosesRes] = await Promise.all([
      strapi(`/receipts?filters[PaymentDate][$gte]=${from}&filters[PaymentDate][$lte]=${to}` +
        '&sort[0]=PaymentDate:asc&sort[1]=Number:asc&pagination[limit]=500' +
        '&fields[0]=Number&fields[1]=Type&fields[2]=Amount&fields[3]=RegistrationFee' +
        '&fields[4]=SubscriptionYear&fields[5]=MemberName&fields[6]=PayerName' +
        '&fields[7]=PaymentDate&fields[8]=IssueDate&fields[9]=SentAt&fields[10]=createdAt&fields[11]=PaymentMethod&fields[12]=Aa'),
      strapi(`/income-records?filters[Month][$eq]=${month}&sort=Aa:asc&pagination[limit]=500`),
      strapi(`/expenses?filters[Month][$eq]=${month}&filters[State][$eq]=approved` +
        '&sort[0]=IssueDate:asc&pagination[limit]=500'),
      strapi(`/monthly-closes?filters[Month][$eq]=${month}&pagination[limit]=1`),
      strapi('/monthly-closes?sort=Month:desc&pagination[limit]=24&fields[0]=Month&fields[1]=SentAt&fields[2]=ReadyAt'),
    ])

    const close = closeRes.json?.data?.[0] || null
    // Μήνας που καταχωρήθηκε ΑΝΑΔΡΟΜΙΚΑ (backfill από το φύλλο): η ημερομηνία
    // αποστολής είναι μεταγενέστερη επινόηση, οπότε ΚΑΘΕ εγγραφή θα φαινόταν
    // «δέλτα». Δεν συγκρίνουμε — δεν κρύβουμε τίποτα, απλώς δεν εφευρίσκουμε.
    const backfilled = /^backfill/i.test(String(close?.SentBy || ''))
    // Τα «δέλτα» μετρούν από την ΑΠΟΣΤΟΛΗ (ό,τι έλαβε το λογιστήριο)
    const closeTime = !backfilled && close?.SentAt ? Date.parse(close.SentAt) : null

    const receipts = (recRes.json?.data || []).map((r: any) => {
      const isDelta = closeTime !== null && r.createdAt && Date.parse(r.createdAt) > closeTime
      return {
        number: r.Number,
        aa: r.Aa || null,
        type: r.Type,
        typeLabel: TYPE_LABELS[r.Type as ReceiptType] || r.Type,
        amount: Number(r.Amount) || 0,
        registrationFee: Number(r.RegistrationFee) || 0,
        subscriptionYear: r.SubscriptionYear ?? null,
        memberName: r.MemberName,
        payerName: r.PayerName,
        paymentDate: r.PaymentDate,
        issueDate: r.IssueDate,
        method: r.PaymentMethod || 'bank',
        emailSent: !!r.SentAt,
        delta: isDelta,
      }
    })

    // Έσοδα χωρίς απόδειξη (χορηγίες/επιχορηγήσεις) — ίδιο τμήμα Α
    const incomeRecords = (incRes.json?.data || []).map((r: any) => ({
      aa: r.Aa,
      docRef: r.DocRef || null,
      payerName: r.PayerName || null,
      description: r.Description || null,
      category: r.Category,
      categoryLabel: INCOME_RECORD_LABELS[r.Category] || r.Category,
      amount: Number(r.Amount) || 0,
      paymentDate: r.PaymentDate,
      method: r.PaymentMethod || 'bank',
      fileName: r.FileName || null,
    }))

    // Έξοδα του μπλοκ του μήνα — μόνο εγκεκριμένα
    const expenses = (expRes.json?.data || []).map((e: any) => ({
      aa: e.Aa,
      issueDate: e.IssueDate,
      docNumber: e.DocNumber || e.DocRef || null,
      mark: e.Mark || null,
      supplierName: e.SupplierName || null,
      supplierTaxId: e.SupplierTaxId || null,
      category: e.Category || null,
      categoryLabel: e.Category ? (EXPENSE_CATEGORY_LABELS[e.Category] || e.Category) : null,
      withholding: Number(e.Withholding) || 0,
      amount: Number(e.PayableAmount) || 0,
      method: e.PaymentMethod || 'unpaid',
      methodLabel: METHOD_LABELS[e.PaymentMethod] || 'Ανεξόφλητο',
      paymentDate: e.PaymentDate || null,
      fileName: e.FileName || null,
      notes: e.Notes || null,
    }))

    // Ταξινόμηση όπως στο φύλλο: αύξον Α/Α. Ό,τι δεν έχει ακόμη Α/Α
    // (παλιές αποδείξεις πριν την καταγραφή του, ή αποτυχημένο sync)
    // πηγαίνει στο τέλος με τη σειρά πληρωμής.
    receipts.sort((a: any, b: any) =>
      aaOrder(a.aa) - aaOrder(b.aa) ||
      String(a.paymentDate || '').localeCompare(String(b.paymentDate || '')) ||
      a.number - b.number)
    incomeRecords.sort((a: any, b: any) => aaOrder(a.aa) - aaOrder(b.aa))
    expenses.sort((a: any, b: any) =>
      aaOrder(a.aa) - aaOrder(b.aa) ||
      String(a.issueDate || '').localeCompare(String(b.issueDate || '')))

    // Σύνολα ανά κατηγορία — αντιστοιχούν στις στήλες του ΕΣΟΔΑ
    const totals: Record<string, number> = {}
    const add = (k: string, v: number) => { totals[k] = Math.round(((totals[k] || 0) + v) * 100) / 100 }
    for (const r of receipts) {
      add('Σύνολο', r.amount)
      if (r.type === 'registration') {
        add('Εγγραφές', r.registrationFee || 10)
        add(`Συνδρομές ${r.subscriptionYear ?? ''}`.trim(), r.amount - (r.registrationFee || 10))
      } else if (r.type === 'subscription') {
        add(`Συνδρομές ${r.subscriptionYear ?? ''}`.trim(), r.amount)
      } else {
        add(TYPE_LABELS[r.type as ReceiptType] || 'Λοιπά', r.amount)
      }
    }
    for (const g of incomeRecords) {
      add('Σύνολο', g.amount)
      add(g.categoryLabel, g.amount)
    }

    // Σύνολα εξόδων ανά κατηγορία του ΕΞΟΔΑ
    const expenseTotals: Record<string, number> = {}
    const addX = (k: string, v: number) => { expenseTotals[k] = Math.round(((expenseTotals[k] || 0) + v) * 100) / 100 }
    for (const e of expenses) {
      addX('Σύνολο', e.amount)
      addX(e.categoryLabel || 'Χωρίς κατηγορία', e.amount)
    }

    const round2 = (n: number) => Math.round(n * 100) / 100
    const incomeTotal = round2(totals['Σύνολο'] || 0)
    const expenseTotal = round2(expenseTotals['Σύνολο'] || 0)
    // Ανεξόφλητα: μπαίνουν στο αρχείο του μήνα αλλά δεν έχουν φύγει από το ταμείο
    const unpaidCount = expenses.filter((e: any) => e.method === 'unpaid' || !e.paymentDate).length
    const uncategorised = expenses.filter((e: any) => !e.category).length
    const late = await computeLateItems(month, allClosesRes.json?.data || [])

    return NextResponse.json({
      month,
      receipts,
      incomeRecords,
      expenses,
      totals,
      expenseTotals,
      summary: { income: incomeTotal, expenses: expenseTotal, balance: round2(incomeTotal - expenseTotal) },
      count: receipts.length + incomeRecords.length,
      receiptCount: receipts.length,
      incomeRecordCount: incomeRecords.length,
      expenseCount: expenses.length,
      unpaidCount,
      uncategorised,
      late,
      deltaCount: receipts.filter((r: any) => r.delta).length,
      close: close ? {
        readyAt: close.ReadyAt || null,
        readyBy: close.ReadyBy || null,
        sentAt: close.SentAt || null,
        sentBy: close.SentBy || null,
      } : null,
      status: close?.SentAt ? 'sent' : close?.ReadyAt ? 'ready' : 'pending',
      backfilled,
      closes: (allClosesRes.json?.data || []).map((c: any) => ({ month: c.Month, readyAt: c.ReadyAt || null, sentAt: c.SentAt || null })),
    })
  } catch (err) {
    console.error('monthly-close GET failed:', err)
    return NextResponse.json({ error: 'Αποτυχία φόρτωσης μηνιαίας εικόνας' }, { status: 502 })
  }
}

export async function POST(request: NextRequest) {
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Μη έγκυρο αίτημα' }, { status: 400 })
  }
  const action = body?.action === 'dispatch' ? 'dispatch' : 'ready'
  const auth = await authorize(action === 'ready' ? 'financer' : 'admin')
  if ('error' in auth) return auth.error

  try {
    const month = validMonth(String(body?.month || ''))
    const existing = (await strapi(`/monthly-closes?filters[Month][$eq]=${month}&pagination[limit]=1`)).json?.data?.[0] || null

    if (action === 'ready') {
      if (existing?.ReadyAt) {
        return NextResponse.json({ error: `Ο μήνας ${month} έχει ήδη εγκριθεί` }, { status: 409 })
      }
      const payload = { Month: month, ReadyAt: new Date().toISOString(), ReadyBy: `financer:${auth.memberId}` }
      const r = existing
        ? await strapi(`/monthly-closes/${existing.documentId}`, 'PUT', payload)
        : await strapi('/monthly-closes', 'POST', payload)
      if (!r.ok) return NextResponse.json({ error: 'Αποτυχία σήμανσης' }, { status: 502 })
      return NextResponse.json({ ok: true, month, status: 'ready' })
    }

    // ---- dispatch: αρχείο μήνα → λογιστήριο ----
    if (!existing?.ReadyAt) {
      return NextResponse.json({ error: 'Ο μήνας δεν έχει εγκριθεί από τον/τη Financer ακόμη' }, { status: 409 })
    }
    if (existing.SentAt) {
      return NextResponse.json({ error: `Ο μήνας ${month} έχει ήδη σταλεί στο λογιστήριο` }, { status: 409 })
    }

    // Έσοδα + έξοδα του μήνα για το αρχείο
    const { from, to } = monthRange(month)
    const [recRes, incRes2, expRes2] = await Promise.all([
      strapi(`/receipts?filters[PaymentDate][$gte]=${from}&filters[PaymentDate][$lte]=${to}` +
        '&sort[0]=PaymentDate:asc&sort[1]=Number:asc&pagination[limit]=500' +
        '&fields[0]=Number&fields[1]=Type&fields[2]=Amount&fields[3]=MemberName' +
        '&fields[4]=PaymentDate&fields[5]=IssueDate&fields[6]=SubscriptionYear&fields[7]=PaymentMethod&fields[8]=Aa'),
      strapi(`/income-records?filters[Month][$eq]=${month}&sort=Aa:asc&pagination[limit]=500`),
      strapi(`/expenses?filters[Month][$eq]=${month}&filters[State][$eq]=approved&sort[0]=IssueDate:asc&pagination[limit]=500`),
    ])
    const receipts = (recRes.json?.data || []).sort((a: any, b: any) => aaOrder(a.Aa) - aaOrder(b.Aa) || a.Number - b.Number)
    const incomeRecords = (incRes2.json?.data || []).sort((a: any, b: any) => aaOrder(a.Aa) - aaOrder(b.Aa))
    const expenses = (expRes2.json?.data || []).sort((a: any, b: any) => aaOrder(a.Aa) - aaOrder(b.Aa))
    const money = (n: any) => (Number(n) || 0).toFixed(2).replace('.', ',')
    const total = receipts.reduce((s: number, r: any) => s + (Number(r.Amount) || 0), 0)
      + incomeRecords.reduce((s: number, r: any) => s + (Number(r.Amount) || 0), 0)
    const expenseTotal = expenses.reduce((s: number, e: any) => s + (Number(e.PayableAmount) || 0), 0)

    // CSV με BOM ώστε το Excel να διαβάζει σωστά τα ελληνικά.
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const lines: string[] = []
    lines.push(`ΜΗΝΙΑΙΑ ΕΙΚΟΝΑ CULTURE FOR CHANGE — ${month}`)
    lines.push('')
    lines.push('Α. ΕΣΟΔΑ')
    lines.push(['Α/Α', 'Παραστατικό', 'Ονοματεπώνυμο / Πληρωτής', 'Τύπος', 'Ημ. πληρωμής', 'Ημ. έκδοσης', 'Έτος συνδρομής', 'Τρόπος', 'Ποσό (€)'].map(esc).join(';'))
    for (const r of receipts) {
      lines.push([
        r.Aa || '', `ΑΠ. ΕΙΣ. ${r.Number}`, r.MemberName || '', TYPE_LABELS[r.Type as ReceiptType] || r.Type,
        r.PaymentDate || '', r.IssueDate || '', r.SubscriptionYear ?? '',
        r.PaymentMethod === 'cash' ? 'Μετρητά' : 'Τράπεζα', money(r.Amount),
      ].map(esc).join(';'))
    }
    for (const g of incomeRecords) {
      lines.push([
        g.Aa || '', g.DocRef || '(χωρίς απόδειξη)', g.PayerName || g.Description || '',
        INCOME_RECORD_LABELS[g.Category] || g.Category || '', g.PaymentDate || '', '', '',
        METHOD_LABELS[g.PaymentMethod] || 'Τράπεζα', money(g.Amount),
      ].map(esc).join(';'))
    }
    lines.push([esc('ΣΥΝΟΛΟ ΕΣΟΔΩΝ'), '', '', '', '', '', '', '', esc(money(total))].join(';'))
    lines.push('')
    lines.push('Β. ΕΞΟΔΑ')
    lines.push(['Α/Α', 'Κατηγορία', 'Ημ. έκδοσης', 'Παραστατικό', 'ΜΑΡΚ', 'Επωνυμία', 'ΑΦΜ', 'Κρατήσεις (€)', 'Πληρωτέο (€)', 'Τρόπος', 'Ημ. πληρωμής', 'Αρχείο', 'Σημειώσεις'].map(esc).join(';'))
    for (const e of expenses) {
      lines.push([
        e.Aa || '', EXPENSE_CATEGORY_LABELS[e.Category] || e.Category || '',
        e.IssueDate || '', e.DocNumber || e.DocRef || '', e.Mark || '',
        e.SupplierName || '', e.SupplierTaxId || '',
        e.Withholding ? money(e.Withholding) : '', money(e.PayableAmount),
        METHOD_LABELS[e.PaymentMethod] || 'Ανεξόφλητο', e.PaymentDate || '',
        e.FileName || '', e.Notes || '',
      ].map(esc).join(';'))
    }
    lines.push([esc('ΣΥΝΟΛΟ ΕΞΟΔΩΝ'), '', '', '', '', '', '', '', esc(money(expenseTotal))].join(';'))
    lines.push('')
    lines.push([esc('ΙΣΟΖΥΓΙΟ ΜΗΝΑ (έσοδα − έξοδα)'), esc(money(total - expenseTotal))].join(';'))

    // Γ. Εκ των υστέρων για μήνες που έχουν ήδη σταλεί
    const allClosesForLate = (await strapi('/monthly-closes?sort=Month:desc&pagination[limit]=36&fields[0]=Month&fields[1]=SentAt')).json?.data || []
    const late = await computeLateItems(month, allClosesForLate)
    if (late.length > 0) {
      lines.push('')
      lines.push('Γ. ΕΚ ΤΩΝ ΥΣΤΕΡΩΝ / ΔΙΟΡΘΩΣΕΙΣ ΓΙΑ ΜΗΝΕΣ ΠΟΥ ΕΧΟΥΝ ΗΔΗ ΣΤΑΛΕΙ')
      lines.push(['Μήνας', 'Α/Α', 'Είδος', 'Ημ. έκδοσης', 'Παραστατικό', 'ΜΑΡΚ', 'Επωνυμία', 'Πληρωτέο (€)', 'Τρόπος', 'Ημ. πληρωμής', 'Αρχείο'].map(esc).join(';'))
      for (const l of late) {
        lines.push([
          monthLabelOf(l.month), l.aa || '', l.kind === 'addition' ? 'Νέα καταχώρηση (εκ των υστέρων)' : 'Εξόφληση',
          l.issueDate || '', l.docNumber || '', l.mark || '', l.supplierName || '', money(l.amount),
          METHOD_LABELS[l.paymentMethod] || 'Ανεξόφλητο', l.paymentDate || '',
          l.fileId ? `https://drive.google.com/file/d/${l.fileId}/view` : (l.fileName || ''),
        ].map(esc).join(';'))
      }
    }
    const folders = await monthFolderUrls(month)
    const csv = '\ufeff' + lines.join('\r\n')

    const to_ = process.env.ACCOUNTANT_EMAIL || FINANCE_EMAIL
    const viaFallback = !process.env.ACCOUNTANT_EMAIL
    const monthLabel = monthLabelOf(month)

    // Σύνολα ανά κατηγορία για το σώμα του email
    const catTotals: Record<string, number> = {}
    const bump = (k: string, v: number) => { catTotals[k] = Math.round(((catTotals[k] || 0) + v) * 100) / 100 }
    for (const r of receipts) {
      const t = r.Type as ReceiptType
      let key: string
      if (t === 'registration') key = 'Εγγραφές + Συνδρομές'
      else if (t === 'subscription') key = `Συνδρομές ${r.SubscriptionYear ?? ''}`.trim()
      else key = TYPE_LABELS[t] || 'Λοιπά'
      bump(key, Number(r.Amount) || 0)
    }
    for (const g of incomeRecords) {
      bump(INCOME_RECORD_LABELS[g.Category] || 'Λοιπά έσοδα', Number(g.Amount) || 0)
    }
    const expCatTotals: Record<string, number> = {}
    for (const e of expenses) {
      const key = EXPENSE_CATEGORY_LABELS[e.Category] || e.Category || 'Χωρίς κατηγορία'
      expCatTotals[key] = Math.round(((expCatTotals[key] || 0) + (Number(e.PayableAmount) || 0)) * 100) / 100
    }
    const fmt = (n: number) => n.toFixed(2).replace('.', ',')
    const sortLines = (obj: Record<string, number>): Array<[string, string]> =>
      Object.entries(obj).sort(([a], [b]) => a.localeCompare(b, 'el')).map(([k, v]) => [k, fmt(v)])

    // Υπογραφή: ο/η τρέχων κάτοχος της θέσης Διαχείρισης (admin)
    const adminSigner = await getSeatHolder('admin')
    const tpl = monthlyDispatchEmailHtml(monthLabel, {
      lateItems: late.map(l => ({
        monthLabel: monthLabelOf(l.month), aa: l.aa, kind: l.kind, supplierName: l.supplierName, docNumber: l.docNumber,
        issueDate: l.issueDate, amount: fmt(l.amount), paymentLabel: METHOD_LABELS[l.paymentMethod] || 'Ανεξόφλητο',
        paymentDate: l.paymentDate, fileUrl: l.fileId ? `https://drive.google.com/file/d/${l.fileId}/view` : null,
      })),
      expenseFolderUrl: folders.expenses,
      incomeFolderUrl: folders.income,
      incomeLines: sortLines(catTotals),
      incomeCount: receipts.length + incomeRecords.length,
      incomeTotal: fmt(total),
      expenseLines: sortLines(expCatTotals),
      expenseCount: expenses.length,
      expenseTotal: fmt(expenseTotal),
      balance: fmt(total - expenseTotal),
      signerName: adminSigner?.name || adminSigner?.engName || 'Culture for Change — Διαχείριση',
      viaFallback,
    })
    const sent = await sendOcEmail(to_, tpl.subject, tpl.html, {
      from: ADMIN_FROM,
      replyTo: ADMIN_EMAIL,
      cc: [FINANCE_EMAIL, ADMIN_EMAIL],
      attachments: [{ filename: `CforC-μηνιαία-εικόνα-${month}.csv`, content: Buffer.from(csv, 'utf8').toString('base64') }],
    })
    if (!sent) return NextResponse.json({ error: 'Αποτυχία αποστολής email' }, { status: 502 })

    const upd = await strapi(`/monthly-closes/${existing.documentId}`, 'PUT', {
      SentAt: new Date().toISOString(),
      SentBy: `admin:${auth.memberId}`,
    })
    if (!upd.ok) return NextResponse.json({ error: 'Το email στάλθηκε αλλά η σήμανση απέτυχε — έλεγξε το Strapi' }, { status: 502 })
    return NextResponse.json({ ok: true, month, status: 'sent', to: to_, viaFallback })
  } catch (err) {
    console.error('monthly-close POST failed:', err)
    return NextResponse.json({ error: 'Αποτυχία' }, { status: 502 })
  }
}
