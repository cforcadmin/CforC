import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { resolveOcAccess, getSeatHoldersWithEmail } from '@/lib/ocRoles'

export const maxDuration = 60

/**
 * Πίνακες εκκρεμοτήτων.
 *
 *  GET    ?board=slug|documentId   → πίνακες + εκκρεμότητες
 *  POST   {boardId, ...}           → νέα εκκρεμότητα
 *  PATCH  {id, ...}                → ενημέρωση (τικ, status, ανάδοχοι, …)
 *  DELETE ?id=                     → διαγραφή
 *
 * Γράφει όλο το ΔΣ: μια εκκρεμότητα δεν είναι οικονομική πράξη, και το να
 * μπορεί ο καθένας να σημειώσει «έγινε» είναι το νόημα του εργαλείου.
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

const STATUSES = ['not_started', 'in_progress', 'done'] as const
const PRIORITIES = ['low', 'normal', 'high'] as const

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

const TASK_FIELDS = 'fields[0]=Title&fields[1]=Completed&fields[2]=Status&fields[3]=Categories'
  + '&fields[4]=Description&fields[5]=Links&fields[6]=DueDate&fields[7]=Priority'
  + '&fields[8]=CompletedAt&fields[9]=SortIndex&fields[10]=CreatedBy'
  + '&populate[assignees][fields][0]=Name&populate[assignees][fields][1]=Email'
  + '&populate[board][fields][0]=Title'

function shape(t: any) {
  return {
    documentId: t.documentId,
    title: t.Title,
    completed: !!t.Completed,
    status: t.Status || 'not_started',
    categories: Array.isArray(t.Categories) ? t.Categories : [],
    description: t.Description || null,
    links: t.Links || null,
    dueDate: t.DueDate || null,
    priority: t.Priority || 'normal',
    completedAt: t.CompletedAt || null,
    sortIndex: t.SortIndex ?? 0,
    boardId: t.board?.documentId || null,
    assignees: (t.assignees || []).map((a: any) => ({
      documentId: a.documentId, name: a.Name, email: a.Email || null,
    })),
  }
}

/** Κοινός καθαρισμός για POST και PATCH */
function readInput(body: any, forCreate: boolean) {
  const out: Record<string, any> = {}
  if (forCreate || body?.title !== undefined) {
    const title = String(body?.title || '').trim()
    if (!title) return { error: 'Λείπει ο τίτλος' }
    out.Title = title
  }
  if (body?.status !== undefined) {
    if (!STATUSES.includes(body.status)) return { error: 'Μη έγκυρη κατάσταση' }
    out.Status = body.status
  }
  if (body?.priority !== undefined) {
    if (!PRIORITIES.includes(body.priority)) return { error: 'Μη έγκυρη προτεραιότητα' }
    out.Priority = body.priority
  }
  if (body?.completed !== undefined) {
    out.Completed = !!body.completed
    // Η στιγμή του τικ κρατιέται· το Status ΔΕΝ αλλάζει μόνο του — ένα θέμα
    // μπορεί να κλείσει ενώ ήταν «σε εξέλιξη», όπως δούλευε η ομάδα στο Slack.
    out.CompletedAt = body.completed ? new Date().toISOString() : null
  }
  if (body?.dueDate !== undefined) {
    const d = String(body.dueDate || '').trim()
    if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) return { error: 'Μη έγκυρη ημερομηνία' }
    out.DueDate = d || null
  }
  if (body?.categories !== undefined) {
    out.Categories = Array.isArray(body.categories)
      ? body.categories.map((c: any) => String(c).trim()).filter(Boolean).slice(0, 8)
      : null
  }
  if (body?.description !== undefined) out.Description = String(body.description || '').trim() || null
  if (body?.links !== undefined) out.Links = String(body.links || '').trim() || null
  if (body?.assignees !== undefined) {
    out.assignees = Array.isArray(body.assignees)
      ? [...new Set(body.assignees.map((a: any) => String(a).replace(/[^a-z0-9]/gi, '')).filter(Boolean))]
      : []
  }
  return { data: out }
}

export async function GET(request: NextRequest) {
  const auth = await authorize()
  if ('error' in auth) return auth.error
  try {
    const [boardsRes, tasksRes, seatHolders, membersRes] = await Promise.all([
      strapi('/oc-task-boards?sort[0]=SortIndex:asc&sort[1]=Title:asc&pagination[limit]=50'),
      strapi(`/oc-tasks?pagination[limit]=500&sort[0]=SortIndex:asc&sort[1]=createdAt:asc&${TASK_FIELDS}`),
      getSeatHoldersWithEmail().catch(() => []),
      // Για πίνακες με εμβέλεια «μέλη»: ανάδοχος μπορεί να είναι οποιοδήποτε
      // μέλος, όχι μόνο οι επτά θέσεις
      strapi('/members?pagination[limit]=1000&sort=Name:asc&fields[0]=Name&fields[1]=AM&filters[HideProfile][$ne]=true'),
    ])
    if (!boardsRes.ok) {
      // Η συλλογή μπορεί να μην έχει φτάσει ακόμη στο Strapi Cloud
      return NextResponse.json({ boards: [], tasks: [], seatHolders, unconfigured: true })
    }
    const boards = (boardsRes.json?.data || [])
      .filter((b: any) => !b.Archived)
      .map((b: any) => ({
        documentId: b.documentId, title: b.Title, slug: b.Slug,
        scope: b.Scope || 'coordination', description: b.Description || null,
      }))
    return NextResponse.json({
      boards,
      tasks: (tasksRes.json?.data || []).map(shape),
      seatHolders,
      members: (membersRes.json?.data || []).map((m: any) => ({
        documentId: m.documentId, name: m.Name, am: m.AM ?? null,
      })),
      me: auth.memberId,
    })
  } catch (err) {
    console.error('oc/tasks GET failed:', err)
    return NextResponse.json({ error: 'Αποτυχία φόρτωσης' }, { status: 502 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await authorize()
  if ('error' in auth) return auth.error
  const body = await request.json().catch(() => null)
  const boardId = String(body?.boardId || '').replace(/[^a-z0-9]/gi, '')
  if (!boardId) return NextResponse.json({ error: 'Λείπει ο πίνακας' }, { status: 400 })
  const parsed = readInput(body, true)
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const r = await strapi('/oc-tasks', 'POST', {
    ...parsed.data,
    board: boardId,
    CreatedBy: `member:${auth.memberId}`,
  })
  if (!r.ok) {
    console.error('task create failed', r.status, JSON.stringify(r.json?.error?.message || ''))
    return NextResponse.json({ error: 'Αποτυχία δημιουργίας' }, { status: 502 })
  }
  return NextResponse.json({ ok: true, documentId: r.json?.data?.documentId })
}

export async function PATCH(request: NextRequest) {
  const auth = await authorize()
  if ('error' in auth) return auth.error
  const body = await request.json().catch(() => null)
  const id = String(body?.id || '').replace(/[^a-z0-9]/gi, '')
  if (!id) return NextResponse.json({ error: 'Λείπει η εκκρεμότητα' }, { status: 400 })
  const parsed = readInput(body, false)
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const r = await strapi(`/oc-tasks/${id}`, 'PUT', parsed.data)
  if (!r.ok) {
    console.error('task update failed', r.status, JSON.stringify(r.json?.error?.message || ''))
    return NextResponse.json({ error: 'Αποτυχία ενημέρωσης' }, { status: 502 })
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const auth = await authorize()
  if ('error' in auth) return auth.error
  const id = String(request.nextUrl.searchParams.get('id') || '').replace(/[^a-z0-9]/gi, '')
  if (!id) return NextResponse.json({ error: 'Λείπει η εκκρεμότητα' }, { status: 400 })
  const r = await strapi(`/oc-tasks/${id}`, 'DELETE')
  if (!r.ok && r.status !== 204) return NextResponse.json({ error: 'Αποτυχία διαγραφής' }, { status: 502 })
  return NextResponse.json({ ok: true })
}
