import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { checkCsrf } from '@/lib/csrf'
import { eventRegisterLimiter, getRateLimitErrorMessage } from '@/lib/rateLimiter'

export const maxDuration = 60

/**
 * Η εικόνα προβολής μιας πρότασης δράσης — ανεβαίνει ΠΡΙΝ υποβληθεί η φόρμα.
 *
 * ΓΙΑΤΙ ΞΕΧΩΡΙΣΤΑ ΑΠΟ ΤΗ ΔΗΛΩΣΗ: η δήλωση ταξιδεύει ως JSON. Για να πάει
 * μαζί της η εικόνα θα έπρεπε είτε να γίνει multipart ολόκληρη, είτε να
 * ταξιδέψει σε base64 — 5 MB γίνονται 6,7 MB και μια αργή σύνδεση χάνει ΟΛΗ
 * τη δήλωση επειδή κόπηκε το ανέβασμα. Έτσι η εικόνα φεύγει μόνη της και η
 * φόρμα κρατά μια διεύθυνση.
 *
 * ΜΟΝΟ ΓΙΑ ΣΥΝΔΕΔΕΜΕΝΑ ΜΕΛΗ. Η ανοιχτή πρόσκληση απευθύνεται σε μέλη, άρα το
 * ανέβασμα δεν χρειάζεται ποτέ να είναι ανοιχτό — και ένα ανοιχτό ανέβασμα
 * αρχείων είναι δωρεάν αποθηκευτικός χώρος για όποιον το βρει.
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export async function POST(request: NextRequest) {
  if (!STRAPI_URL || !STRAPI_API_TOKEN) {
    return NextResponse.json({ error: 'Σφάλμα διαμόρφωσης διακομιστή' }, { status: 500 })
  }
  const csrfError = checkCsrf(request)
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 })

  const store = await cookies()
  const token = store.get('session')?.value
  const decoded = token ? verifyToken(token) : null
  if (!decoded || decoded.type !== 'session') {
    return NextResponse.json({ error: 'Χρειάζεται σύνδεση' }, { status: 401 })
  }

  // Ίδιο όριο με τη δήλωση: η σύνδεση δεν είναι άδεια για απεριόριστα αρχεία
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rate = eventRegisterLimiter.check(ip)
  if (!rate.allowed) {
    return NextResponse.json({ error: getRateLimitErrorMessage(rate.resetTime) }, { status: 429 })
  }

  let form: FormData
  try { form = await request.formData() } catch {
    return NextResponse.json({ error: 'Μη έγκυρο αίτημα' }, { status: 400 })
  }
  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Δεν στάλθηκε αρχείο' }, { status: 400 })
  }
  if (!ALLOWED[file.type]) {
    return NextResponse.json({ error: 'Δεκτές μόνο εικόνες JPG, PNG ή WebP' }, { status: 415 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({
      error: `Η εικόνα είναι ${(file.size / 1048576).toFixed(1).replace('.', ',')} MB — το όριο είναι 5 MB.`,
    }, { status: 413 })
  }

  const fd = new FormData()
  fd.append('files', file, file.name)
  const up = await fetch(`${STRAPI_URL}/api/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
    body: fd,
  })
  if (!up.ok) {
    console.error('events/proposal-image: upload failed', up.status, (await up.text()).slice(0, 300))
    return NextResponse.json({ error: 'Η εικόνα δεν ανέβηκε' }, { status: 502 })
  }
  const json = await up.json().catch(() => null)
  const saved = Array.isArray(json) ? json[0] : null
  if (!saved?.url) return NextResponse.json({ error: 'Η εικόνα δεν ανέβηκε' }, { status: 502 })

  return NextResponse.json({ id: String(saved.id), url: String(saved.url), name: file.name })
}
