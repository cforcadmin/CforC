import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { resolveOcAccess, type OcSeat } from '@/lib/ocRoles'
import { mirrorContractsToSheet, type ContractRecord } from '@/lib/contractsSheet'

export const maxDuration = 60

/**
 * Μητρώο Συμβάσεων & Πληρωμών Συνεργατών.
 *
 * Αυθεντία είναι το Strapi· το Google Sheet είναι καθρέφτης. Κάθε εγγραφή
 * γράφεται ΠΡΩΤΑ στη βάση και μετά ξαναγράφεται ολόκληρο το φύλλο.
 *
 *   GET                    → όλες οι συμβάσεις (και οι αρχειοθετημένες με ?archived=1)
 *   POST   {…πεδία}        → νέα σύμβαση
 *   PATCH  {id, …πεδία}    → ενημέρωση
 *   PATCH  {id, archived}  → αρχειοθέτηση/επαναφορά (δεν υπάρχει διαγραφή)
 *
 * Πρόσβαση: ΜΟΝΟ Financer, Διαχείριση (admin) και IT — και ο έλεγχος γίνεται
 * εδώ, στον server, όχι μόνο στην οθόνη. Το περιεχόμενο (ΑΦΜ, IBAN, αμοιβές)
 * δεν γράφεται ΠΟΤΕ σε logs: στα σφάλματα καταγράφεται μόνο κατάσταση και id.
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN
const ALLOWED_SEATS: OcSeat[] = ['financer', 'admin', 'it']

/** Τα πεδία που δέχεται το API — ό,τι άλλο έρθει αγνοείται σιωπηλά */
const TEXT_FIELDS = [
  'Name', 'Role', 'Email', 'Phone', 'TaxId', 'ContractType', 'Project',
  'ContractStatus', 'ContractFile', 'ContractNotes', 'PaymentMethod',
  'PaymentFrequency', 'PaymentSchedule', 'NextPaymentStatus', 'PaymentHistory',
  'BankIban', 'PaymentStatus', 'PaymentNotes', 'ExpenseDocsLink', 'ExpenseListLink',
] as const
const DATE_FIELDS = ['StartDate', 'EndDate', 'NextPaymentDate'] as const
const NUMBER_FIELDS = ['Aa', 'SortIndex'] as const

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
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')
  const decoded = sessionCookie ? verifyToken(sessionCookie.value) : null
  if (!decoded || decoded.type !== 'session') {
    return { error: NextResponse.json({ error: 'Απαιτείται σύνδεση' }, { status: 401 }) }
  }
  const access = await resolveOcAccess(decoded.memberId)
  if (!access.isBoard) return { error: NextResponse.json({ error: 'Δεν επιτρέπεται' }, { status: 403 }) }
  const seatCookie = cookieStore.get('oc-last-seat')?.value as OcSeat | undefined
  const activeSeat: OcSeat | null =
    seatCookie && access.seats.includes(seatCookie) ? seatCookie
      : access.seats.length === 1 ? access.seats[0] : null
  if (!activeSeat || !ALLOWED_SEATS.includes(activeSeat)) {
    return { error: NextResponse.json({ error: 'Το μητρώο συμβάσεων ανήκει σε Οικονομικά, Διαχείριση και IT' }, { status: 403 }) }
  }
  return { memberId: decoded.memberId, activeSeat }
}

const FIELDS =
  'fields[0]=Aa&fields[1]=Name&fields[2]=Role&fields[3]=Email&fields[4]=Phone&fields[5]=TaxId'
  + '&fields[6]=ContractType&fields[7]=Project&fields[8]=StartDate&fields[9]=EndDate'
  + '&fields[10]=ContractStatus&fields[11]=ContractFile&fields[12]=ContractNotes&fields[13]=Amount'
  + '&fields[14]=PaymentMethod&fields[15]=PaymentFrequency&fields[16]=PaymentSchedule'
  + '&fields[17]=NextPaymentDate&fields[18]=NextPaymentStatus&fields[19]=PaymentHistory'
  + '&fields[20]=BankIban&fields[21]=PaymentStatus&fields[22]=PaymentNotes'
  + '&fields[23]=ExpenseDocsLink&fields[24]=ExpenseListLink&fields[25]=Archived'
  + '&fields[26]=SortIndex&fields[27]=CreatedByName&fields[28]=UpdatedByName&fields[29]=updatedAt'

/** Το όνομα του μέλους για τη σφραγίδα «ποιος καταχώρησε» */
async function memberName(memberId: string): Promise<string> {
  const r = await strapi(`/members/${memberId}?fields[0]=Name`)
  return String(r.json?.data?.Name || '').trim() || `member:${memberId}`
}

async function allContracts(): Promise<ContractRecord[]> {
  const res = await strapi(`/oc-contracts?pagination[limit]=500&sort[0]=SortIndex:asc&sort[1]=Aa:asc&${FIELDS}`)
  if (!res.ok) return []
  return (res.json?.data || []).map((c: any) => ({ ...c, Amount: c.Amount === null ? null : Number(c.Amount) }))
}

/** Καθαρισμός εισόδου· ό,τι δεν αναγνωρίζεται δεν φτάνει ποτέ στη βάση */
function readInput(body: any, requireName: boolean): { data: Record<string, any> } | { error: string } {
  const out: Record<string, any> = {}
  for (const f of TEXT_FIELDS) {
    if (body?.[f] !== undefined) out[f] = String(body[f] ?? '').trim() || null
  }
  for (const f of DATE_FIELDS) {
    if (body?.[f] === undefined) continue
    const v = String(body[f] ?? '').trim()
    if (v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) return { error: `Μη έγκυρη ημερομηνία στο πεδίο ${f}` }
    out[f] = v || null
  }
  if (body?.Amount !== undefined) {
    const raw = String(body.Amount ?? '').replace(/[€\s]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')
    if (raw === '') out.Amount = null
    else {
      const n = parseFloat(raw)
      if (!Number.isFinite(n)) return { error: 'Μη έγκυρο ποσό' }
      out.Amount = n
    }
  }
  for (const f of NUMBER_FIELDS) {
    if (body?.[f] === undefined) continue
    const n = parseInt(String(body[f]), 10)
    out[f] = Number.isFinite(n) ? n : null
  }
  if (body?.Archived !== undefined) out.Archived = !!body.Archived
  if (requireName && !out.Name) return { error: 'Λείπει το ονοματεπώνυμο' }
  if (Object.keys(out).length === 0) return { error: 'Καμία αλλαγή' }
  return { data: out }
}

export async function GET(request: NextRequest) {
  const auth = await authorize()
  if ('error' in auth) return auth.error
  try {
    const withArchived = request.nextUrl.searchParams.get('archived') === '1'
    const all = await allContracts()
    return NextResponse.json({
      contracts: withArchived ? all : all.filter(c => !c.Archived),
      archivedCount: all.filter(c => c.Archived).length,
      seat: auth.activeSeat,
    })
  } catch {
    return NextResponse.json({ error: 'Αποτυχία φόρτωσης' }, { status: 502 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await authorize()
  if ('error' in auth) return auth.error
  const body = await request.json().catch(() => null)
  const parsed = readInput(body, true)
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const current = await allContracts()
  if (parsed.data.Aa === undefined || parsed.data.Aa === null) {
    parsed.data.Aa = Math.max(0, ...current.map(c => c.Aa || 0)) + 1
  }
  if (parsed.data.SortIndex === undefined || parsed.data.SortIndex === null) {
    parsed.data.SortIndex = Math.max(0, ...current.map(c => c.SortIndex || 0)) + 1
  }
  parsed.data.CreatedByName = await memberName(auth.memberId)

  const r = await strapi('/oc-contracts', 'POST', parsed.data)
  if (!r.ok) {
    console.error('oc/contracts: create failed', r.status)   // ΠΟΤΕ το payload
    return NextResponse.json({ error: 'Αποτυχία καταχώρισης' }, { status: 502 })
  }
  const mirror = await mirrorContractsToSheet(await allContracts())
  return NextResponse.json({ ok: true, documentId: r.json?.data?.documentId, mirror })
}

export async function PATCH(request: NextRequest) {
  const auth = await authorize()
  if ('error' in auth) return auth.error
  const body = await request.json().catch(() => null)
  const id = String(body?.id || '').replace(/[^a-z0-9]/gi, '')
  if (!id) return NextResponse.json({ error: 'Λείπει η σύμβαση' }, { status: 400 })
  const parsed = readInput(body, false)
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })
  parsed.data.UpdatedByName = await memberName(auth.memberId)

  const r = await strapi(`/oc-contracts/${id}`, 'PUT', parsed.data)
  if (!r.ok) {
    console.error('oc/contracts: update failed', r.status, id)
    return NextResponse.json({ error: 'Αποτυχία ενημέρωσης' }, { status: 502 })
  }
  const mirror = await mirrorContractsToSheet(await allContracts())
  return NextResponse.json({ ok: true, mirror })
}
