import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { resolveOcAccess } from '@/lib/ocRoles'

/**
 * Πίνακες εκκρεμοτήτων — δημιουργία και αρχειοθέτηση.
 *
 * Το Scope ορίζει ΠΟΙΟΙ μπορούν να αναλάβουν:
 *   coordination → οι επτά θέσεις
 *   members      → κάθε μέλος του δικτύου
 *   project      → ομάδα έργου (ίδιος μηχανισμός, άλλο περιεχόμενο)
 *
 * Διαγραφή δεν υπάρχει επίτηδες: ένας πίνακας με ιστορικό δεν πρέπει να
 * χάνεται με ένα κλικ. Αρχειοθετείται και φεύγει από τη λίστα.
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN
const SCOPES = ['coordination', 'members', 'project'] as const

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
  return { memberId: decoded.memberId }
}

export async function POST(request: NextRequest) {
  const auth = await authorize()
  if ('error' in auth) return auth.error
  const body = await request.json().catch(() => null)
  const title = String(body?.title || '').trim()
  const scope = SCOPES.includes(body?.scope) ? body.scope : 'project'
  if (!title) return NextResponse.json({ error: 'Λείπει ο τίτλος' }, { status: 400 })

  const dup = await strapi(`/oc-task-boards?filters[Title][$eqi]=${encodeURIComponent(title)}&pagination[limit]=1`)
  if (dup.json?.data?.[0]) {
    return NextResponse.json({ error: 'Υπάρχει ήδη πίνακας με αυτό το όνομα' }, { status: 409 })
  }

  const r = await strapi('/oc-task-boards', 'POST', {
    Title: title,
    Scope: scope,
    Description: String(body?.description || '').trim() || null,
    SortIndex: Number.isFinite(Number(body?.sortIndex)) ? Number(body.sortIndex) : 10,
  })
  if (!r.ok) {
    console.error('board create failed', r.status, JSON.stringify(r.json?.error?.message || ''))
    return NextResponse.json({ error: 'Αποτυχία δημιουργίας πίνακα' }, { status: 502 })
  }
  return NextResponse.json({ ok: true, documentId: r.json?.data?.documentId })
}

export async function PATCH(request: NextRequest) {
  const auth = await authorize()
  if ('error' in auth) return auth.error
  const body = await request.json().catch(() => null)
  const id = String(body?.id || '').replace(/[^a-z0-9]/gi, '')
  if (!id) return NextResponse.json({ error: 'Λείπει ο πίνακας' }, { status: 400 })
  const payload: Record<string, any> = {}
  if (body?.title !== undefined) {
    const t = String(body.title).trim()
    if (!t) return NextResponse.json({ error: 'Λείπει ο τίτλος' }, { status: 400 })
    payload.Title = t
  }
  if (body?.description !== undefined) payload.Description = String(body.description || '').trim() || null
  if (body?.scope !== undefined && SCOPES.includes(body.scope)) payload.Scope = body.scope
  if (body?.archived !== undefined) payload.Archived = !!body.archived
  const r = await strapi(`/oc-task-boards/${id}`, 'PUT', payload)
  if (!r.ok) return NextResponse.json({ error: 'Αποτυχία ενημέρωσης' }, { status: 502 })
  return NextResponse.json({ ok: true })
}
