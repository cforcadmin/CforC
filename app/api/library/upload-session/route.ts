import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { getAccessToken, SCOPES } from '@/lib/googleAuth'
import { ALLOWED_MIME, MAX_FILE_BYTES, LIBRARY_FOLDER_ID } from '@/lib/googleDrive'

/**
 * Ξεκινά «resumable» ανέβασμα στο Drive και δίνει στον browser τη διεύθυνση
 * της συνεδρίας, ώστε τα bytes να πάνε ΚΑΤΕΥΘΕΙΑΝ στην Google.
 *
 * ΓΙΑΤΙ ΟΧΙ ΜΕΣΩ ΤΟΥ SERVER: το πέρασμα του αρχείου από εμάς σκόνταφτε σε
 * ΔΥΟ αόρατα όρια γύρω στα 5 MB — το multipart του Drive (σκληρό όριο 5 MB)
 * και το όριο σώματος αιτήματος της πλατφόρμας. Οι βιβλιοθηκάριοι έχασαν
 * 18 από 50 αρχεία «κάτω από τα 40 MB» πριν το καταλάβουμε. Με τη συνεδρία,
 * το όριο των 40 MB είναι αληθινό.
 *
 * Η διεύθυνση συνεδρίας δεν περιέχει το token μας — είναι εξουσιοδότηση
 * μόνο για το συγκεκριμένο ανέβασμα και λήγει μόνη της.
 *
 * ΛΕΠΤΟΜΕΡΕΙΑ ΠΟΥ ΔΕΝ ΦΑΙΝΕΤΑΙ: η Google δένει τη συνεδρία με το Origin
 * του αιτήματος που τη δημιούργησε. Αν δεν στείλουμε εδώ το Origin του
 * browser, το PUT του browser θα απορριφθεί από το CORS.
 */
export async function POST(request: NextRequest) {
  const store = await cookies()
  const session = store.get('session')
  const decoded = session ? verifyToken(session.value) : null
  if (!decoded || decoded.type !== 'session') {
    return NextResponse.json({ error: 'Απαιτείται σύνδεση' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const name = String(body.name || '').trim().slice(0, 200)
  const mimeType = String(body.mimeType || '')
  const size = Number(body.size)

  if (!name) return NextResponse.json({ error: 'Λείπει το όνομα αρχείου' }, { status: 400 })
  if (!ALLOWED_MIME[mimeType]) {
    return NextResponse.json({ error: `Μη αποδεκτός τύπος αρχείου (${mimeType || 'άγνωστος'}). Δεκτά: PDF, Word, Excel, PowerPoint, OpenDocument, ePub, κείμενο, εικόνες.` }, { status: 400 })
  }
  if (!Number.isFinite(size) || size <= 0) {
    return NextResponse.json({ error: 'Άγνωστο μέγεθος αρχείου' }, { status: 400 })
  }
  if (size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: `Το αρχείο είναι ${(size / 1024 / 1024).toFixed(1)} MB — το όριο είναι ${Math.round(MAX_FILE_BYTES / 1024 / 1024)} MB.` }, { status: 400 })
  }

  const token = await getAccessToken(SCOPES.driveWrite)
  if (!token) return NextResponse.json({ error: 'Σφάλμα ρύθμισης' }, { status: 500 })

  const origin = request.headers.get('origin') || request.nextUrl.origin
  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': mimeType,
        'X-Upload-Content-Length': String(size),
        Origin: origin,
      },
      body: JSON.stringify({ name, parents: [LIBRARY_FOLDER_ID] }),
    },
  )
  if (!res.ok) {
    console.error('upload-session:', res.status, (await res.text()).slice(0, 200))
    return NextResponse.json({ error: 'Δεν άνοιξε συνεδρία ανεβάσματος' }, { status: 502 })
  }
  const uploadUrl = res.headers.get('location')
  if (!uploadUrl) return NextResponse.json({ error: 'Η Google δεν επέστρεψε διεύθυνση' }, { status: 502 })
  return NextResponse.json({ uploadUrl })
}
