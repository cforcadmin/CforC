import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { resolveOcAccess, type OcSeat } from '@/lib/ocRoles'
import { effectiveSeat, OC_SEAT_MODE_COOKIE } from '@/lib/ocSeatMode'

export const maxDuration = 60

/**
 * Εκκρεμείς χειροκίνητες διαγραφές — λίστα και επιβεβαίωση.
 *
 * ΓΙΑΤΙ ΕΔΩ ΚΑΙ ΟΧΙ ΣΤΗ ΛΙΣΤΑ ΑΙΤΗΣΕΩΝ: μόλις κάποιος σβήσει την αίτηση από
 * το Strapi, η γραμμή της εξαφανίζεται από την Επισκόπηση — μαζί της θα
 * έφευγε και το κουμπί, πριν προλάβει να το πατήσει. Η εκκρεμότητα ζει στην
 * ΑΠΟΔΕΙΞΗ, που επιβιώνει, όχι στην αίτηση που σβήνεται.
 *
 * Η επιβεβαίωση ΔΕΝ σβήνει τίποτα. Απλώς σημειώνει ότι ο άνθρωπος το έκανε —
 * και πρώτα ΕΠΑΛΗΘΕΥΕΙ ότι η αίτηση όντως δεν υπάρχει πια. Ένα κουμπί που
 * δέχεται «έγινε» χωρίς έλεγχο παράγει αρχείο που λέει ψέματα.
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN
const ALLOWED: OcSeat[] = ['financer', 'community', 'admin', 'it']

async function strapi(path: string, method = 'GET', data?: unknown) {
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
    effectiveSeat(access.seats as OcSeat[], seatCookie, cookieStore.get(OC_SEAT_MODE_COOKIE)?.value)
  if (!activeSeat || !ALLOWED.includes(activeSeat)) {
    return { error: NextResponse.json({ error: 'Μόνο Ταμίας, Κοινότητα ή Γραμματεία' }, { status: 403 }) }
  }
  return { seat: activeSeat }
}

/** Υπάρχει ακόμη η αίτηση στο Strapi; */
async function applicationStillExists(ref: string): Promise<boolean> {
  const r = await strapi(`/membership-applications/${ref}?fields[0]=ApplicationState`)
  return r.status === 200 && !!r.json?.data
}

export async function GET() {
  const auth = await authorize()
  if (auth.error) return auth.error

  const r = await strapi(
    '/oc-application-outcomes?pagination[limit]=100&sort[0]=DeadlineExpiredAt:asc'
    + '&filters[DeletionConfirmedAt][$null]=true')
  if (r.status === 404) {
    return NextResponse.json({ items: [], note: 'η συλλογή δεν υπάρχει ακόμη στο Strapi Cloud' })
  }
  if (!r.ok) return NextResponse.json({ error: `Strapi ${r.status}` }, { status: 502 })

  const rows: any[] = r.json?.data || []
  const items = await Promise.all(rows.map(async row => ({
    ref: row.ApplicationRef,
    outcome: row.Outcome,
    decisionDate: row.DecisionDate || null,
    deadlineExpiredAt: row.DeadlineExpiredAt || null,
    daysElapsed: row.DaysElapsed ?? null,
    // Δείχνει αν μένει ακόμη δουλειά στο Strapi ή αν λείπει μόνο η σφραγίδα
    stillInStrapi: await applicationStillExists(row.ApplicationRef),
  })))
  return NextResponse.json({ items })
}

export async function POST(request: NextRequest) {
  const auth = await authorize()
  if (auth.error) return auth.error

  const body = await request.json().catch(() => null)
  const ref = String(body?.ref || '').replace(/[^a-z0-9]/gi, '')
  if (!ref) return NextResponse.json({ error: 'Λείπει η αναφορά' }, { status: 400 })

  /**
   * Ο ΕΛΕΓΧΟΣ ΠΡΙΝ ΤΗ ΣΦΡΑΓΙΔΑ. Αν η αίτηση υπάρχει ακόμη, το «έγινε» θα ήταν
   * ψέμα καταγεγραμμένο σε αρχείο που κρατάμε δέκα χρόνια.
   */
  if (await applicationStillExists(ref)) {
    return NextResponse.json({
      error: 'Η αίτηση υπάρχει ακόμη στο Strapi — σβήσε την πρώτα (μαζί με τη φωτογραφία και τη γραμμή του φύλλου).',
    }, { status: 409 })
  }

  const find = await strapi(
    `/oc-application-outcomes?pagination[limit]=1&filters[ApplicationRef][$eq]=${encodeURIComponent(ref)}`)
  const doc = (find.json?.data || [])[0]
  if (!doc) return NextResponse.json({ error: 'Δεν βρέθηκε η απόδειξη' }, { status: 404 })
  if (doc.DeletionConfirmedAt) return NextResponse.json({ ok: true, already: true })

  const put = await strapi(`/oc-application-outcomes/${doc.documentId}`, 'PUT', {
    DeletionConfirmedAt: new Date().toISOString(),
  })
  if (!put.ok) return NextResponse.json({ error: `Strapi ${put.status}` }, { status: 502 })
  return NextResponse.json({ ok: true })
}
