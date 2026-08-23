import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { getAccessToken, SCOPES } from '@/lib/googleAuth'

export const maxDuration = 60

/**
 * Σερβίρει ένα αρχείο της βιβλιοθήκης σε ΣΥΝΔΕΔΕΜΕΝΟ μέλος.
 *
 * ΓΙΑΤΙ ΠΕΡΝΑΕΙ ΑΠΟ ΕΔΩ: τα αρχεία στο Drive είναι σκόπιμα «Περιορισμένη
 * πρόσβαση». Σύνδεσμος Drive θα έδινε «Ζητήστε πρόσβαση» στα μέλη, και
 * «Οποιοσδήποτε έχει τον σύνδεσμο» θα τα άνοιγε σε όλο το διαδίκτυο —
 * ακυρώνοντας και το «μόνο για μέλη» και το «για εσωτερική χρήση» πάνω στο
 * οποίο στέκει η θέση μας για τα πνευματικά δικαιώματα.
 *
 * Το id ελέγχεται ΠΑΝΤΑ απέναντι στη βάση: χωρίς αυτό, όποιος ξέρει ένα
 * οποιοδήποτε id του Drive θα κατέβαζε αρχεία που ο λογαριασμός υπηρεσίας
 * τυχαίνει να βλέπει — και βλέπει και τα πρακτικά και τα οικονομικά.
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

/** Τι ανοίγει με ασφάλεια μέσα στον browser και τι κατεβαίνει */
const INLINE = new Set([
  'application/pdf', 'text/plain', 'image/png', 'image/jpeg', 'image/gif', 'image/webp',
])

export async function GET(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const session = cookieStore.get('session')
  const decoded = session ? verifyToken(session.value) : null
  if (!decoded || decoded.type !== 'session') {
    return NextResponse.json({ error: 'Απαιτείται σύνδεση' }, { status: 401 })
  }

  const { id } = await ctx.params
  if (!/^[A-Za-z0-9_-]{10,}$/.test(id)) {
    return NextResponse.json({ error: 'Άκυρο αναγνωριστικό' }, { status: 400 })
  }

  // Υπάρχει τεκμήριο με αυτό το αρχείο; Αλλιώς δεν το δίνουμε.
  const look = await fetch(
    `${STRAPI_URL}/api/library-items?filters[DriveFileId][$eq]=${encodeURIComponent(id)}`
    + '&fields[0]=FileName&fields[1]=MimeType&fields[2]=State&pagination[pageSize]=1',
    { headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` }, cache: 'no-store' },
  )
  const lj: any = await look.json().catch(() => null)
  const rec = lj?.data?.[0]
  if (!look.ok || !rec || rec.State === 'rejected') {
    return NextResponse.json({ error: 'Δεν βρέθηκε' }, { status: 404 })
  }

  const token = await getAccessToken(SCOPES.drive)
  if (!token) return NextResponse.json({ error: 'Σφάλμα ρύθμισης' }, { status: 500 })

  const upstream = await fetch(
    `https://www.googleapis.com/drive/v3/files/${id}?alt=media&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (!upstream.ok || !upstream.body) {
    console.error('library/file: drive', upstream.status, id)
    return NextResponse.json({ error: 'Το αρχείο δεν είναι διαθέσιμο' }, { status: 502 })
  }

  const mime = rec.MimeType || upstream.headers.get('content-type') || 'application/octet-stream'
  const name = rec.FileName || 'document'
  const disposition = INLINE.has(mime) ? 'inline' : 'attachment'
  const headers = new Headers({
    'Content-Type': mime,
    // filename* για ελληνικά ονόματα· το σκέτο filename ως εφεδρεία
    'Content-Disposition': `${disposition}; filename="${name.replace(/[^\x20-\x7E]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(name)}`,
    // Ιδιωτικό: να μην το κρατήσει ενδιάμεσος proxy ή η CDN
    'Cache-Control': 'private, max-age=0, no-store',
    'X-Content-Type-Options': 'nosniff',
  })
  const len = upstream.headers.get('content-length')
  if (len) headers.set('Content-Length', len)
  return new NextResponse(upstream.body, { status: 200, headers })
}
