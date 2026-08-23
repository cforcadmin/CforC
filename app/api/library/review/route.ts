import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { strapiAll } from '@/lib/strapiPaged'
import { shapeItem } from '@/lib/library'
import { trashFile } from '@/lib/googleDrive'

export const maxDuration = 60

/**
 * Ο πάγκος του Βιβλιοθηκάριου: τεκμήρια σε αναμονή, με το υπάρχον δίπλα.
 *
 * Ο ρόλος ελέγχεται ΣΤΟΝ SERVER σε κάθε κλήση. Το να κρύψουμε το κουμπί
 * στο interface δεν είναι έλεγχος πρόσβασης — η διαδρομή είναι δημόσια για
 * όποιον την καλέσει με έγκυρη συνεδρία.
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

const strapi = (path: string, init?: RequestInit) =>
  fetch(`${STRAPI_URL}/api${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}`, 'Content-Type': 'application/json', ...init?.headers },
    cache: 'no-store',
  })

async function requireLibrarian(): Promise<
  { ok: true; memberId: string; name: string } | { ok: false; res: NextResponse }
> {
  const store = await cookies()
  const session = store.get('session')
  const decoded = session ? verifyToken(session.value) : null
  if (!decoded || decoded.type !== 'session') {
    return { ok: false, res: NextResponse.json({ error: 'Απαιτείται σύνδεση' }, { status: 401 }) }
  }
  const r = await strapi(`/members/${decoded.memberId}?fields[0]=Name&fields[1]=IsLibrarian`)
  const m = (await r.json().catch(() => null))?.data
  if (!m?.IsLibrarian) {
    return { ok: false, res: NextResponse.json({ error: 'Μόνο ο Βιβλιοθηκάριος' }, { status: 403 }) }
  }
  return { ok: true, memberId: decoded.memberId, name: m.Name || '' }
}

/** Τα εκκρεμή, με το τεκμήριο που μοιάζουν δίπλα */
export async function GET() {
  const auth = await requireLibrarian()
  if (!auth.ok) return auth.res

  const pending = await strapiAll(
    '/library-items?filters[State][$eq]=pending&sort=createdAt:asc'
    + '&populate[SubmittedBy][fields][0]=Name&populate[SubmittedBy][fields][1]=Email'
    + '&populate[DuplicateOf][fields][0]=Title&populate[DuplicateOf][fields][1]=Description'
    + '&populate[DuplicateOf][fields][2]=Year&populate[DuplicateOf][fields][3]=Theme'
    + '&populate[DuplicateOf][fields][4]=Subthemes&populate[DuplicateOf][fields][5]=DocType'
    + '&populate[DuplicateOf][fields][6]=SourceUrl&populate[DuplicateOf][fields][7]=DriveFileId'
    + '&populate[DuplicateOf][fields][8]=FileName&populate[DuplicateOf][fields][9]=MimeType'
    + '&populate[DuplicateOf][fields][10]=Language&populate[DuplicateOf][fields][11]=SubmittedByName',
  )
  if (!pending.ok) return NextResponse.json({ error: 'Αποτυχία φόρτωσης' }, { status: 502 })

  return NextResponse.json({
    items: pending.data.map((r: any) => ({
      ...shapeItem(r),
      submitterEmail: r.SubmittedBy?.Email ?? null,
      existing: r.DuplicateOf ? shapeItem(r.DuplicateOf) : null,
    })),
  })
}

/**
 * Body: { documentId, action: 'approve' | 'reject', reason?: string }
 */
export async function POST(request: NextRequest) {
  const auth = await requireLibrarian()
  if (!auth.ok) return auth.res

  const body = await request.json().catch(() => ({}))
  const documentId = String(body.documentId || '')
  const action = body.action === 'approve' ? 'approve' : body.action === 'reject' ? 'reject' : null
  if (!documentId || !action) {
    return NextResponse.json({ error: 'Λείπει το τεκμήριο ή η ενέργεια' }, { status: 400 })
  }

  const cur = await strapi(`/library-items/${documentId}`
    + '?populate[SubmittedBy][fields][0]=Name&populate[SubmittedBy][fields][1]=Email'
    + '&populate[DuplicateOf][fields][0]=Title')
  const item = (await cur.json().catch(() => null))?.data
  if (!cur.ok || !item) return NextResponse.json({ error: 'Δεν βρέθηκε' }, { status: 404 })
  if (item.State !== 'pending') {
    // Δύο Βιβλιοθηκάριοι μπορεί να ανοίξουν το ίδιο email ταυτόχρονα.
    return NextResponse.json({ error: 'Έχει ήδη κριθεί', alreadyDecided: item.State }, { status: 409 })
  }

  const patch: Record<string, unknown> = {
    State: action === 'approve' ? 'published' : 'rejected',
    ReviewedBy: auth.name,
    ReviewedAt: new Date().toISOString(),
  }
  if (action === 'reject' && body.reason) patch.RejectionReason = String(body.reason).slice(0, 500)

  const up = await strapi(`/library-items/${documentId}`, { method: 'PUT', body: JSON.stringify({ data: patch }) })
  if (!up.ok) {
    console.error('library/review: strapi', up.status, (await up.text()).slice(0, 200))
    return NextResponse.json({ error: 'Η ενημέρωση απέτυχε' }, { status: 502 })
  }

  if (action === 'reject') {
    // Το αντίγραφο δεν χρειάζεται πια. Στον κάδο, ΟΧΙ οριστική διαγραφή:
    // αν η απόρριψη ήταν λάθος, το αρχείο επαναφέρεται.
    if (item.DriveFileId) await trashFile(item.DriveFileId).catch(() => {})

    const { sendDuplicateRejection } = await import('@/lib/libraryEmails')
    await sendDuplicateRejection({
      to: item.SubmittedBy?.Email || '',
      name: item.SubmittedBy?.Name || item.SubmittedByName || '',
      title: item.Title,
      existingTitle: item.DuplicateOf?.Title || 'υπάρχον τεκμήριο',
      reason: body.reason || undefined,
    }).catch((err: unknown) => console.error('library/review: email απόρριψης', err))
  }

  return NextResponse.json({ ok: true, state: patch.State })
}
