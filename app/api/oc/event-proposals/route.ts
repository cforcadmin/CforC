import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { resolveOcAccess } from '@/lib/ocRoles'

export const maxDuration = 60

/**
 * Προτάσεις δράσεων — για την Επισκόπηση του OC.
 *
 *  GET            → όλες οι προτάσεις, νεότερη πρώτη
 *  PUT { id, … }  → κατάσταση και σημειώσεις της ΟΣ
 *
 * Η ΟΣ αλλάζει ΜΟΝΟ τα δικά της πεδία (Status, ProposalNotes). Ό,τι έγραψε
 * το μέλος μένει ανέπαφο: η δήλωση κρατά έτσι κι αλλιώς το αποδεικτικό, και
 * δύο εκδοχές του ίδιου κειμένου που διαφέρουν σιωπηλά είναι χειρότερο από
 * μία που δεν αλλάζει.
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

const STATUSES = ['new', 'shortlisted', 'accepted', 'declined'] as const

async function strapi(path: string, method = 'GET', data?: any) {
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

export async function GET() {
  const denied = await authorize()
  if (denied) return denied
  if (!STRAPI_URL || !STRAPI_API_TOKEN) {
    return NextResponse.json({ error: 'Σφάλμα διαμόρφωσης' }, { status: 500 })
  }

  const res = await strapi(
    '/event-proposals?populate[event][fields][0]=Title&populate[event][fields][1]=Slug'
    + '&populate[registration][fields][0]=Email'
    + '&populate[ProposalPromoImage][fields][0]=url'
    + '&sort=createdAt:desc&pagination[limit]=500')
  if (!res.ok) {
    return NextResponse.json({ error: 'Αποτυχία ανάκτησης' }, { status: 502 })
  }

  const proposals = (res.json?.data || []).map((p: any) => ({
    documentId: p.documentId,
    EventProposalTitle: p.EventProposalTitle,
    EventLocation: p.EventLocation,
    TimeSlot: p.TimeSlot,
    TypeOfEvent: p.TypeOfEvent,
    ProposalCost: p.ProposalCost,
    ProposalDuration: p.ProposalDuration,
    ProposalLink: p.ProposalLink,
    ProposalNotes: p.ProposalNotes || '',
    Status: p.Status || 'new',
    SubmittedAt: p.SubmittedAt,
    ProposerName: p.ProposerName,
    ProposerEmail: p.ProposerEmail,
    image: p.ProposalPromoImage?.url || null,
    event: p.event ? { Title: p.event.Title, Slug: p.event.Slug } : null,
    // Ο σύνδεσμος πίσω στο αποδεικτικό — η ΟΣ πηγαίνει και προς τις δύο φορές
    registrationId: p.registration?.documentId || null,
  }))
  return NextResponse.json({ proposals })
}

export async function PUT(request: NextRequest) {
  const denied = await authorize()
  if (denied) return denied
  if (!STRAPI_URL || !STRAPI_API_TOKEN) {
    return NextResponse.json({ error: 'Σφάλμα διαμόρφωσης' }, { status: 500 })
  }

  const body = await request.json().catch(() => null)
  const id = String(body?.id || '').replace(/[^a-z0-9]/gi, '')
  if (!id) return NextResponse.json({ error: 'Λείπει το αναγνωριστικό' }, { status: 400 })

  const patch: Record<string, unknown> = {}
  if (body?.Status !== undefined) {
    if (!STATUSES.includes(body.Status)) {
      return NextResponse.json({ error: 'Μη έγκυρη κατάσταση' }, { status: 400 })
    }
    patch.Status = body.Status
  }
  if (body?.ProposalNotes !== undefined) patch.ProposalNotes = String(body.ProposalNotes).slice(0, 4000)
  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: 'Τίποτα προς αλλαγή' }, { status: 400 })
  }

  const upd = await strapi(`/event-proposals/${id}`, 'PUT', patch)
  if (!upd.ok) {
    console.error('oc/event-proposals: update failed', upd.status, JSON.stringify(upd.json?.error || {}).slice(0, 300))
    return NextResponse.json({ error: 'Η αλλαγή δεν αποθηκεύτηκε' }, { status: 502 })
  }
  return NextResponse.json({ ok: true })
}
