import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { resolveOcAccess, type OcSeat } from '@/lib/ocRoles'
import { effectiveSeat, OC_SEAT_MODE_COOKIE } from '@/lib/ocSeatMode'
import {
  readReporting, appendReporting, updateReporting, deleteReporting,
  readGantt, updateGanttCell, commsSheetConfigured,
  REPORTING_COLUMNS, type ReportingField,
} from '@/lib/commsSheet'

export const maxDuration = 60

/**
 * ΤΟ ΦΥΛΛΟ ΤΗΣ ΕΠΙΚΟΙΝΩΝΙΑΣ ΜΕΣΑ ΑΠΟ ΤΟ OC.
 *
 * Διαβάζει όλο το ΔΣ — η επικοινωνία αφορά όλους. Γράφουν Επικοινωνία,
 * Media και IT: οι δύο πρώτοι επειδή είναι η δουλειά τους, το IT ως δίχτυ
 * ασφαλείας για να μη μένει προφανές λάθος αδιόρθωτο επειδή λείπει κάποιος.
 *
 * Το φύλλο ΔΕΝ είναι αντίγραφο — είναι η πηγή. Άνθρωποι το γράφουν με το
 * χέρι την ίδια ώρα, γι' αυτό κάθε διόρθωση και διαγραφή περνά από
 * επιβεβαίωση περιεχομένου μέσα στο lib.
 */

const WRITING_SEATS: OcSeat[] = ['comms', 'media', 'it']

async function authorize(needWrite: boolean) {
  const store = await cookies()
  const token = store.get('session')?.value
  const decoded = token ? verifyToken(token) : null
  if (!decoded || decoded.type !== 'session') {
    return { error: NextResponse.json({ error: 'Απαιτείται σύνδεση' }, { status: 401 }) }
  }
  const access = await resolveOcAccess(decoded.memberId)
  if (!access.isBoard) return { error: NextResponse.json({ error: 'Δεν επιτρέπεται' }, { status: 403 }) }
  const seatCookie = store.get('oc-last-seat')?.value as OcSeat | undefined
  const activeSeat = effectiveSeat(
    access.seats as OcSeat[], seatCookie, store.get(OC_SEAT_MODE_COOKIE)?.value)
  const canWrite = !!activeSeat && WRITING_SEATS.includes(activeSeat)
  if (needWrite && !canWrite) {
    return {
      error: NextResponse.json(
        { error: 'Γράφουν Επικοινωνία, Media ή IT' }, { status: 403 }),
    }
  }
  return { activeSeat, canWrite }
}

const clean = (v: unknown) => String(v ?? '').trim().slice(0, 1000)

function pickFields(body: any): Partial<Record<ReportingField, string>> {
  const out: Partial<Record<ReportingField, string>> = {}
  for (const key of REPORTING_COLUMNS) {
    if (body?.[key] !== undefined) out[key] = clean(body[key])
  }
  return out
}

export async function GET() {
  const auth = await authorize(false)
  if ('error' in auth) return auth.error
  if (!commsSheetConfigured()) {
    return NextResponse.json({ error: 'Λείπει το COMMS_SHEET_ID' }, { status: 500 })
  }
  try {
    // Παράλληλα: οι δύο καρτέλες δεν εξαρτώνται μεταξύ τους και το φύλλο
    // απαντά αργά αρκετά ώστε η σειριακή ανάγνωση να φαίνεται.
    const [reporting, gantt] = await Promise.all([readReporting(), readGantt()])
    return NextResponse.json({ reporting, gantt, canWrite: auth.canWrite })
  } catch (err: any) {
    console.error('comms-sheet GET:', err?.message || err)
    return NextResponse.json({ error: 'Δεν διαβάστηκε το φύλλο' }, { status: 502 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await authorize(true)
  if ('error' in auth) return auth.error

  let body: any
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Μη έγκυρο αίτημα' }, { status: 400 })
  }

  try {
    if (body?.target === 'gantt') {
      const rowNumber = Number(body?.rowNumber)
      const col = Number(body?.col)
      if (!Number.isInteger(rowNumber) || rowNumber < 3 || !Number.isInteger(col) || col < 2) {
        return NextResponse.json({ error: 'Άκυρο κελί' }, { status: 400 })
      }
      await updateGanttCell(rowNumber, col, clean(body?.value))
      return NextResponse.json({ ok: true })
    }

    // Comms_reporting: νέα καταχώρηση
    const row = pickFields(body)
    if (!row.date && !row.title) {
      return NextResponse.json({ error: 'Χρειάζεται τουλάχιστον ημερομηνία ή τίτλο' }, { status: 400 })
    }
    const rowNumber = await appendReporting(row)
    return NextResponse.json({ ok: true, rowNumber })
  } catch (err: any) {
    console.error('comms-sheet POST:', err?.message || err)
    return NextResponse.json({ error: err?.message || 'Αποτυχία εγγραφής' }, { status: 502 })
  }
}

export async function PUT(request: NextRequest) {
  const auth = await authorize(true)
  if ('error' in auth) return auth.error

  let body: any
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Μη έγκυρο αίτημα' }, { status: 400 })
  }
  const rowNumber = Number(body?.rowNumber)
  if (!Number.isInteger(rowNumber) || rowNumber < 2) {
    return NextResponse.json({ error: 'Άκυρη γραμμή' }, { status: 400 })
  }
  // Ό,τι έδειχνε η οθόνη: χωρίς αυτό, μια γραμμή που μπήκε στο φύλλο στο
  // μεταξύ μετακινεί τις υπόλοιπες και γράφουμε πάνω σε ξένη καταχώρηση.
  const expect = { date: clean(body?.expectDate), title: clean(body?.expectTitle) }

  try {
    await updateReporting(rowNumber, pickFields(body), expect)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    const msg = err?.message || 'Αποτυχία εγγραφής'
    console.error('comms-sheet PUT:', msg)
    return NextResponse.json({ error: msg }, { status: /άλλαξε/.test(msg) ? 409 : 502 })
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await authorize(true)
  if ('error' in auth) return auth.error

  let body: any
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Μη έγκυρο αίτημα' }, { status: 400 })
  }
  const rowNumber = Number(body?.rowNumber)
  if (!Number.isInteger(rowNumber) || rowNumber < 2) {
    return NextResponse.json({ error: 'Άκυρη γραμμή' }, { status: 400 })
  }
  const expect = { date: clean(body?.expectDate), title: clean(body?.expectTitle) }

  try {
    await deleteReporting(rowNumber, expect)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    const msg = err?.message || 'Αποτυχία διαγραφής'
    console.error('comms-sheet DELETE:', msg)
    return NextResponse.json({ error: msg }, { status: /άλλαξε/.test(msg) ? 409 : 502 })
  }
}
