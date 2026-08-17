import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { resolveOcAccess, getSeatHoldersWithEmail, type OcSeat } from '@/lib/ocRoles'
import {
  fetchEvents, createEvent, updateEvent, deleteEvent,
  calendarConfigured, type EventInput,
} from '@/lib/googleCalendar'

export const maxDuration = 60

/**
 * Ημερολόγιο δράσεων — κοινό για Διαχείριση και Επικοινωνία.
 *
 *  GET                    → γεγονότα (όλο το ΔΣ)
 *  POST   {event}         → νέο γεγονός
 *  PATCH  {id, event}     → επεξεργασία
 *  DELETE ?id=            → διαγραφή (ανακτήσιμη 30 μέρες από τον κάδο του
 *                           Google — δεν χάνεται οριστικά με ένα κλικ)
 *
 * Γράφουν ΜΟΝΟ Γραμματεία/IT και Επικοινωνία: είναι το κοινό ημερολόγιο
 * του δικτύου, όχι προσωπική ατζέντα.
 */

const WRITERS: OcSeat[] = ['admin', 'it', 'comms']

async function authorize(needWrite: boolean) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')
  const decoded = sessionCookie ? verifyToken(sessionCookie.value) : null
  if (!decoded || decoded.type !== 'session') {
    return { error: NextResponse.json({ error: 'Απαιτείται σύνδεση' }, { status: 401 }) }
  }
  const access = await resolveOcAccess(decoded.memberId)
  if (!access.isBoard) return { error: NextResponse.json({ error: 'Δεν επιτρέπεται' }, { status: 403 }) }
  if (needWrite) {
    const seatCookie = cookieStore.get('oc-last-seat')?.value as OcSeat | undefined
    const activeSeat: OcSeat | null =
      seatCookie && access.seats.includes(seatCookie) ? seatCookie
        : access.seats.length === 1 ? access.seats[0] : null
    if (!activeSeat || !WRITERS.includes(activeSeat)) {
      return { error: NextResponse.json({ error: 'Το ημερολόγιο το ενημερώνουν Γραμματεία/IT και Επικοινωνία' }, { status: 403 }) }
    }
  }
  return { memberId: decoded.memberId }
}

/** Καθαρισμός εισόδου — ημερομηνία και τίτλος είναι τα μόνα υποχρεωτικά */
function readInput(body: any): { input: EventInput } | { error: string } {
  const title = String(body?.title || '').trim()
  const date = String(body?.date || '').trim()
  if (!title) return { error: 'Λείπει ο τίτλος' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: 'Μη έγκυρη ημερομηνία' }
  const allDay = !!body?.allDay
  const time = (v: any) => {
    const s = String(v || '').trim()
    return /^\d{2}:\d{2}$/.test(s) ? s : null
  }
  if (!allDay && body?.startTime && !time(body.startTime)) return { error: 'Μη έγκυρη ώρα έναρξης' }
  const attendees = Array.isArray(body?.attendees)
    ? [...new Set(body.attendees
        .map((e: any) => String(e || '').trim().toLowerCase())
        .filter((e: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)))] as string[]
    : []
  return {
    input: {
      title, date, allDay,
      attendees: attendees.length ? attendees : null,
      startTime: allDay ? null : time(body?.startTime) || '19:00',
      endTime: allDay ? null : time(body?.endTime) || null,
      description: String(body?.description || '').trim() || null,
      location: String(body?.location || '').trim() || null,
      meetLink: String(body?.meetLink || '').trim() || null,
    },
  }
}

export async function GET(request: NextRequest) {
  const auth = await authorize(false)
  if ('error' in auth) return auth.error
  if (!calendarConfigured()) {
    return NextResponse.json({ events: [], configured: false })
  }
  const past = Number(request.nextUrl.searchParams.get('past'))
  const future = Number(request.nextUrl.searchParams.get('future'))
  try {
    const [events, seatHolders] = await Promise.all([
      fetchEvents({
        pastDays: Number.isFinite(past) && past >= 0 ? past : 60,
        futureDays: Number.isFinite(future) && future > 0 ? future : 210,
      }),
      // Η Ομάδα Συντονισμού, για γρήγορη πρόσκληση χωρίς πληκτρολόγηση email
      getSeatHoldersWithEmail().catch(() => []),
    ])
    return NextResponse.json({ events, seatHolders, configured: true })
  } catch (err) {
    console.error('oc/calendar GET failed:', err)
    return NextResponse.json({ error: 'Αποτυχία φόρτωσης ημερολογίου' }, { status: 502 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await authorize(true)
  if ('error' in auth) return auth.error
  const body = await request.json().catch(() => null)
  const parsed = readInput(body)
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const r = await createEvent(parsed.input)
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status === 403 ? 403 : 502 })
  return NextResponse.json({ ok: true, id: r.id })
}

export async function PATCH(request: NextRequest) {
  const auth = await authorize(true)
  if ('error' in auth) return auth.error
  const body = await request.json().catch(() => null)
  const id = String(body?.id || '').trim()
  if (!id) return NextResponse.json({ error: 'Λείπει το γεγονός' }, { status: 400 })
  const parsed = readInput(body)
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const r = await updateEvent(id, parsed.input)
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status === 403 ? 403 : 502 })
  return NextResponse.json({ ok: true, id })
}

export async function DELETE(request: NextRequest) {
  const auth = await authorize(true)
  if ('error' in auth) return auth.error
  const id = String(request.nextUrl.searchParams.get('id') || '').trim()
  if (!id) return NextResponse.json({ error: 'Λείπει το γεγονός' }, { status: 400 })
  const r = await deleteEvent(id)
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status === 403 ? 403 : 502 })
  return NextResponse.json({ ok: true })
}
