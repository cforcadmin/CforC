import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { resolveOcAccess, type OcSeat } from '@/lib/ocRoles'
import { effectiveSeat, OC_SEAT_MODE_COOKIE } from '@/lib/ocSeatMode'
import { validateEventDraft } from '@/lib/ocEventForm'

export const maxDuration = 60

/**
 * Δράσεις και συμμετέχοντες — για την Επισκόπηση του OC.
 *
 * ΧΩΡΙΣ slug: μόνο η λίστα των δράσεων με μετρητές, ώστε το στοιχείο να
 * ανοίγει γρήγορα.
 * ΜΕ slug: οι συμμετέχοντες ΜΙΑΣ δράσης — φορτώνονται μόνο όταν επιλεγεί,
 * γιατί είναι προσωπικά δεδομένα και δεν υπάρχει λόγος να ταξιδεύουν
 * επειδή κάποιος άνοιξε την Επισκόπηση.
 *
 * Τα ΔΙΑΤΡΟΦΙΚΑ (άρθρο 9) επιστρέφονται, γιατί χωρίς αυτά δεν παραγγέλνεις
 * φαγητό — αλλά η στήλη τους είναι εκτός προεπιλογής στην οθόνη.
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

async function strapi(path: string, method: string = 'GET', data?: any) {
  const res = await fetch(`${STRAPI_URL}/api${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
      ...(data !== undefined && { 'Content-Type': 'application/json' }),
    },
    ...(data !== undefined && { body: JSON.stringify({ data }) }),
    cache: 'no-store',
  })
  let json: any = null
  try { json = await res.json() } catch { /* 204 */ }
  return { ok: res.ok, status: res.status, json }
}

/**
 * Ποιος ΓΡΑΦΕΙ δράσεις: Γραμματεία και IT. Καμία άλλη έδρα.
 *
 * Η ανάγνωση μένει όπως ήταν — ολόκληρο το ΔΣ βλέπει τις δράσεις και τους
 * συμμετέχοντες. Το φράγμα μπαίνει ΜΟΝΟ στο γράψιμο, γιατί μια δράση είναι
 * δημόσια σελίδα με φόρμα που δέχεται προσωπικά δεδομένα.
 */
export const EVENT_WRITER_SEATS: OcSeat[] = ['admin', 'it']

async function authorizeWrite() {
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
  if (!activeSeat || !EVENT_WRITER_SEATS.includes(activeSeat)) {
    return { error: NextResponse.json(
      { error: 'Μόνο η Γραμματεία και το IT δημιουργούν ή αλλάζουν δράσεις' }, { status: 403 }) }
  }
  return { memberId: decoded.memberId, activeSeat }
}

/** Πόσες δηλώσεις κρέμονται από αυτή τη διεύθυνση — η διεύθυνση είναι υπόσχεση */
async function registrationCount(slug: string): Promise<number> {
  const r = await strapi(
    `/event-registrations?filters[event][Slug][$eq]=${encodeURIComponent(slug)}`
    + '&fields[0]=Status&pagination[limit]=1')
  return r.json?.meta?.pagination?.total ?? 0
}

/** Υπάρχει ήδη δράση με αυτό το slug; (εξαιρώντας μία, για την επεξεργασία) */
async function slugTaken(slug: string, exceptDocId?: string): Promise<boolean> {
  const r = await strapi(
    `/events?filters[Slug][$eq]=${encodeURIComponent(slug)}&fields[0]=Slug&pagination[limit]=5`)
  return (r.json?.data || []).some((e: any) => e.documentId !== exceptDocId)
}

async function authorize() {
  const store = await cookies()
  const token = store.get('session')?.value
  const decoded = token ? verifyToken(token) : null
  if (!decoded || decoded.type !== 'session') {
    return NextResponse.json({ error: 'Απαιτείται σύνδεση' }, { status: 401 })
  }
  const access = await resolveOcAccess(decoded.memberId)
  if (!access.isBoard) return NextResponse.json({ error: 'Δεν επιτρέπεται' }, { status: 403 })
  return null
}

export async function GET(request: NextRequest) {
  const denied = await authorize()
  if (denied) return denied
  if (!STRAPI_URL || !STRAPI_API_TOKEN) {
    return NextResponse.json({ error: 'Σφάλμα διαμόρφωσης' }, { status: 500 })
  }

  const params = new URL(request.url).searchParams
  const slug = params.get('slug')

  /**
   * ΟΛΟΚΛΗΡΗ η δράση, για τη φόρμα επεξεργασίας.
   *
   * Ξεχωριστή διαδρομή από τη λίστα επίτηδες: η λίστα φορτώνεται σε κάθε
   * άνοιγμα της Επισκόπησης και δεν έχει λόγο να κουβαλά συνεδρίες, μπλοκ,
   * ανοιχτή πρόσκληση και υλικό για 200 δράσεις.
   */
  const editId = params.get('documentId')
  if (editId) {
    const one = await strapi(
      `/events/${editId.replace(/[^a-z0-9]/gi, '')}`
      + '?populate[Sessions]=true&populate[Options]=true&populate[OpenCall]=true'
      + '&populate[Resources][populate][File][fields][0]=url&populate[Cover][fields][0]=url')
    if (!one.ok || !one.json?.data) {
      return NextResponse.json({ error: 'Η δράση δεν βρέθηκε' }, { status: 404 })
    }
    const e = one.json.data
    return NextResponse.json({
      event: e,
      // Το κλείδωμα της διεύθυνσης φαίνεται ΠΡΙΝ γραφτεί κάτι, όχι ως άρνηση
      // μετά την «Αποθήκευση»: το πεδίο βγαίνει ανενεργό με τον λόγο δίπλα.
      registrations: await registrationCount(String(e.Slug || '')),
    })
  }

  if (!slug) {
    const [evRes, regRes] = await Promise.all([
      strapi('/events?populate[Sessions]=true&sort=StartDate:desc&pagination[limit]=200'),
      // Μόνο ό,τι χρειάζεται ο μετρητής — ΟΧΙ ολόκληρες οι δηλώσεις
      strapi('/event-registrations?fields[0]=Status&fields[1]=ProposalSubmitted&populate[event][fields][0]=Slug&pagination[limit]=1000'),
    ])
    const counts = new Map<string, { confirmed: number; pending: number; proposals: number }>()
    for (const r of regRes.json?.data || []) {
      const s = r.event?.Slug
      if (!s) continue
      const c = counts.get(s) || { confirmed: 0, pending: 0, proposals: 0 }
      if (r.Status === 'confirmed') c.confirmed++
      else if (r.Status === 'pending') c.pending++
      if (r.ProposalSubmitted) c.proposals++
      counts.set(s, c)
    }
    const events = (evRes.json?.data || []).map((e: any) => ({
      documentId: e.documentId, Title: e.Title, Slug: e.Slug, Subtitle: e.Subtitle,
      StartDate: e.StartDate, EndDate: e.EndDate, RegistrationDeadline: e.RegistrationDeadline,
      City: e.City, Venue: e.Venue, Audience: e.Audience,
      Sessions: (e.Sessions || []).map((s: any) => ({ id: s.id, Title: s.Title })),
      counts: counts.get(e.Slug) || { confirmed: 0, pending: 0, proposals: 0 },
    }))
    return NextResponse.json({ events })
  }

  const regRes = await strapi(
    `/event-registrations?filters[event][Slug][$eq]=${encodeURIComponent(slug)}`
    + '&populate[proposal][fields][0]=EventProposalTitle&populate[proposal][fields][1]=Status'
    + '&sort=createdAt:asc&pagination[limit]=1000')
  const registrations = (regRes.json?.data || []).map((r: any) => ({
    documentId: r.documentId,
    FirstName: r.FirstName, LastName: r.LastName,
    Email: r.Email, Phone: r.Phone,
    Capacity: r.Capacity, CapacityOther: r.CapacityOther,
    Status: r.Status,
    SessionChoices: r.SessionChoices || {},
    OptionAnswers: r.OptionAnswers || {},
    Dietary: r.Dietary || '',
    AgendaTopic: r.AgendaTopic || '',
    GeneralComments: r.GeneralComments || '',
    // Ο σύνδεσμος προς την εργάσιμη εγγραφή: από τη δήλωση στην πρόταση
    proposal: r.proposal
      ? { documentId: r.proposal.documentId, Title: r.proposal.EventProposalTitle, Status: r.proposal.Status }
      : null,
    SubmittedAt: r.SubmittedAt,
  }))
  return NextResponse.json({ registrations })
}

/**
 * ΝΕΑ ΔΡΑΣΗ.
 *
 * Το slug ελέγχεται για σύγκρουση ΠΡΙΝ γραφτεί: δύο δράσεις στην ίδια
 * διεύθυνση σημαίνει ότι η μία γίνεται αόρατη, και το Strapi δεν το εμποδίζει
 * από μόνο του (το uid είναι μοναδικό μόνο όταν το παράγει εκείνο).
 */
export async function POST(request: NextRequest) {
  const auth = await authorizeWrite()
  if ('error' in auth) return auth.error
  if (!STRAPI_URL || !STRAPI_API_TOKEN) {
    return NextResponse.json({ error: 'Σφάλμα διαμόρφωσης' }, { status: 500 })
  }

  let body: any
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Μη έγκυρο αίτημα' }, { status: 400 })
  }

  const v = validateEventDraft(body)
  if (!v.ok) return NextResponse.json({ error: v.errors.join(' · '), errors: v.errors }, { status: 400 })

  if (await slugTaken(v.payload!.Slug)) {
    return NextResponse.json(
      { error: `Υπάρχει ήδη δράση στη διεύθυνση «${v.payload!.Slug}» — άλλαξε το slug`, errors: ['slug'] },
      { status: 409 })
  }

  const res = await strapi('/events', 'POST', v.payload)
  if (!res.ok) {
    console.error('oc/events: create failed', res.status, JSON.stringify(res.json?.error || {}).slice(0, 200))
    return NextResponse.json({ error: 'Το Strapi απέρριψε τη δημιουργία' }, { status: 502 })
  }
  return NextResponse.json({
    ok: true,
    documentId: res.json?.data?.documentId || null,
    slug: v.payload!.Slug,
  })
}

/**
 * ΑΛΛΑΓΗ ΔΡΑΣΗΣ.
 *
 * ΤΟ SLUG ΚΛΕΙΔΩΝΕΙ ΟΤΑΝ ΥΠΑΡΧΟΥΝ ΔΗΛΩΣΕΙΣ. Η διεύθυνση έχει ήδη φύγει σε
 * γράμματα και, στη δική μας περίπτωση, σε πρόσκληση προς όλο το δίκτυο· μια
 * αλλαγή εδώ μετατρέπει κάθε αντίγραφό της σε 404 και κανείς δεν το μαθαίνει
 * μέχρι να τηλεφωνήσει κάποιος. Τα υπόλοιπα πεδία αλλάζουν ελεύθερα.
 */
export async function PUT(request: NextRequest) {
  const auth = await authorizeWrite()
  if ('error' in auth) return auth.error
  if (!STRAPI_URL || !STRAPI_API_TOKEN) {
    return NextResponse.json({ error: 'Σφάλμα διαμόρφωσης' }, { status: 500 })
  }

  let body: any
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Μη έγκυρο αίτημα' }, { status: 400 })
  }
  const documentId = String(body?.documentId || '').replace(/[^a-z0-9]/gi, '')
  if (!documentId) return NextResponse.json({ error: 'Λείπει η δράση' }, { status: 400 })

  const v = validateEventDraft(body)
  if (!v.ok) return NextResponse.json({ error: v.errors.join(' · '), errors: v.errors }, { status: 400 })

  const current = await strapi(`/events/${documentId}?fields[0]=Slug&fields[1]=Title`)
  if (!current.ok || !current.json?.data) {
    return NextResponse.json({ error: 'Η δράση δεν βρέθηκε' }, { status: 404 })
  }
  const oldSlug = String(current.json.data.Slug || '')

  if (v.payload!.Slug !== oldSlug) {
    if (await slugTaken(v.payload!.Slug, documentId)) {
      return NextResponse.json(
        { error: `Υπάρχει ήδη άλλη δράση στη διεύθυνση «${v.payload!.Slug}»` }, { status: 409 })
    }
    const regs = await registrationCount(oldSlug)
    if (regs > 0) {
      return NextResponse.json({
        error: `Η διεύθυνση δεν αλλάζει: υπάρχουν ${regs} δηλώσεις σε αυτήν και ο παλιός σύνδεσμος `
          + 'έχει ήδη σταλεί. Άφησε το slug όπως ήταν.',
        lockedSlug: oldSlug,
      }, { status: 409 })
    }
  }

  const res = await strapi(`/events/${documentId}`, 'PUT', v.payload)
  if (!res.ok) {
    console.error('oc/events: update failed', res.status, JSON.stringify(res.json?.error || {}).slice(0, 200))
    return NextResponse.json({ error: 'Το Strapi απέρριψε την αλλαγή' }, { status: 502 })
  }
  return NextResponse.json({ ok: true, documentId, slug: v.payload!.Slug })
}
