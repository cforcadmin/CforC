import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { resolveOcAccess, type OcSeat } from '@/lib/ocRoles'
import sharp from 'sharp'
import path from 'path'
import { readFile } from 'fs/promises'

export const maxDuration = 60

/**
 * Εικόνες μαζικής αποστολής: ανέβασμα στη Βιβλιοθήκη Πολυμέσων και διαγραφή.
 *
 *  POST   multipart «file»  → { id, url, name, width, height }
 *  DELETE ?id=              → διαγραφή, ΜΕ φρένο (βλ. παρακάτω)
 *
 * ΤΟ ΦΡΕΝΟ ΣΤΗ ΔΙΑΓΡΑΦΗ
 * Ένα email που έχει ήδη φύγει κατεβάζει τις εικόνες του από αυτές τις
 * διευθύνσεις ΚΑΘΕ φορά που κάποιος το ανοίγει. Αν σβήσουμε το αρχείο, η
 * εικόνα σπάει αναδρομικά σε κάθε γραμματοκιβώτιο που το έλαβε — μήνες μετά.
 * Γι' αυτό διαγράφεται μόνο ό,τι δεν το χρησιμοποιεί καμπάνια που έχει
 * μπει σε ουρά ή σταλεί. Στα προσχέδια η διαγραφή είναι ελεύθερη.
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN
const ALLOWED_SEATS: OcSeat[] = ['admin', 'it']
const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

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
    seatCookie && access.seats.includes(seatCookie) ? seatCookie
      : access.seats.length === 1 ? access.seats[0] : null
  if (!activeSeat || !ALLOWED_SEATS.includes(activeSeat)) {
    return { error: NextResponse.json({ error: 'Η μαζική αποστολή ανήκει στη Γραμματεία' }, { status: 403 }) }
  }
  return { memberId: decoded.memberId }
}

/**
 * Το σήμα CforC «καίγεται» μέσα στην εικόνα.
 *
 * ΓΙΑΤΙ ΟΧΙ ΜΕ CSS: το Outlook αγνοεί position:absolute, οπότε ένα σήμα σε
 * επικάλυψη θα κατέληγε είτε κάτω από την εικόνα είτε πουθενά. Η μόνη
 * αξιόπιστη επικάλυψη σε email είναι μία ΕΝΙΑΙΑ εικόνα.
 *
 * Χωρίς πλακίδιο ή φόντο — μόνο το σύμβολο. Επειδή δεν ξέρουμε τι φωτογραφία
 * θα ανέβει, η απόχρωση επιλέγεται από τον συντάκτη: λευκό σε σκούρα εικόνα,
 * ανθρακί σε ανοιχτή. Αυτός βλέπει τη φωτογραφία· εμείς όχι.
 *
 * Η ΠΡΩΤΟΤΥΠΗ εικόνα δεν πειράζεται ποτέ — δημιουργείται νέο αρχείο, ώστε το
 * ξετικάρισμα να επιστρέφει ακριβώς ό,τι ανέβηκε.
 */
async function brandImage(src: string, tone: 'light' | 'dark'): Promise<Buffer> {
  const res = await fetch(src)
  if (!res.ok) throw new Error('Η εικόνα δεν κατέβηκε')
  const input = Buffer.from(await res.arrayBuffer())

  const base = sharp(input, { failOn: 'none' }).rotate()
  const meta = await base.metadata()
  const w = meta.width || 600
  const h = meta.height || 600

  // Αναλογικό μέγεθος: το ίδιο σήμα σε 400άρι και σε 2000άρι δεν δουλεύει
  const size = Math.min(Math.max(Math.round(w * 0.11), 36), 130)
  const pad = Math.round(size * 0.45)

  // Το σύμβολο βάφεται από το ΙΔΙΟ SVG — μία πηγή, δύο αποχρώσεις
  const svg = await readFile(path.join(process.cwd(), 'public', 'cforc_logo_small.svg'), 'utf8')
  const tinted = tone === 'light' ? svg.replace(/fill="#2D2D2D"/gi, 'fill="#FFFFFF"') : svg
  const mark = await sharp(Buffer.from(tinted), { density: 600 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png().toBuffer()

  return base.composite([
    { input: mark, left: w - size - pad, top: h - size - pad },
  ]).png().toBuffer()
}

export async function POST(request: NextRequest) {
  const auth = await authorize()
  if ('error' in auth) return auth.error
  try {
    // JSON → προσθήκη σήματος σε υπάρχουσα εικόνα· multipart → νέο ανέβασμα
    if (request.headers.get('content-type')?.includes('application/json')) {
      const body = await request.json().catch(() => null)
      const src = String(body?.src || '').trim()
      if (!/^https?:\/\//i.test(src)) {
        return NextResponse.json({ error: 'Χρειάζεται εικόνα με διεύθυνση' }, { status: 400 })
      }
      const tone = body?.tone === 'light' ? 'light' : 'dark'
      const out = await brandImage(src, tone)
      const fd = new FormData()
      fd.append('files', new Blob([new Uint8Array(out)], { type: 'image/png' }), `branded_${tone}_${Date.now()}.png`)
      const up = await fetch(`${STRAPI_URL}/api/upload`, {
        method: 'POST', headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` }, body: fd,
      })
      if (!up.ok) {
        console.error('campaigns/image: branded upload failed', up.status)
        return NextResponse.json({ error: 'Αποτυχία ανεβάσματος' }, { status: 502 })
      }
      const [bf] = await up.json()
      return NextResponse.json({ id: bf.id, url: bf.url, name: bf.name })
    }

    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Δεν στάλθηκε αρχείο' }, { status: 400 })
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Δεκτές μόνο εικόνες PNG, JPG, WEBP ή GIF' }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      // Οι εικόνες κατεβαίνουν σε ΚΑΘΕ άνοιγμα του email, από κάθε παραλήπτη·
      // ένα βαρύ αρχείο κοστίζει σε παραδοσιμότητα, όχι μόνο σε χώρο.
      return NextResponse.json({
        error: `Η εικόνα είναι ${Math.round(file.size / 1024 / 1024 * 10) / 10}MB — το όριο είναι 5MB`,
      }, { status: 400 })
    }

    const fd = new FormData()
    fd.append('files', file, file.name)
    const up = await fetch(`${STRAPI_URL}/api/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
      body: fd,
    })
    if (!up.ok) {
      console.error('campaigns/image: upload failed', up.status)
      return NextResponse.json({ error: 'Αποτυχία ανεβάσματος' }, { status: 502 })
    }
    const [f] = await up.json()
    return NextResponse.json({
      id: f.id, url: f.url, name: f.name,
      width: f.width ?? null, height: f.height ?? null,
    })
  } catch (err) {
    console.error('campaigns/image POST failed:', err)
    return NextResponse.json({ error: 'Εσωτερικό σφάλμα' }, { status: 500 })
  }
}

/** Χρησιμοποιείται η εικόνα σε καμπάνια που ΔΕΝ είναι προσχέδιο; */
async function usedByLiveCampaign(mediaId: number): Promise<string | null> {
  const res = await fetch(
    `${STRAPI_URL}/api/oc-campaigns?pagination[limit]=200&fields[0]=Subject&fields[1]=State&fields[2]=Blocks`,
    { headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` }, cache: 'no-store' },
  )
  if (!res.ok) {
    // Δεν μπορούμε να ελέγξουμε → δεν σβήνουμε. Το να σπάσεις εικόνες σε
    // σταλμένα email είναι χειρότερο από ένα αχρησιμοποίητο αρχείο.
    return 'αδύνατος ο έλεγχος χρήσης'
  }
  for (const c of (await res.json())?.data || []) {
    if (c.State === 'draft') continue
    const blocks = Array.isArray(c.Blocks) ? c.Blocks : []
    const hit = JSON.stringify(blocks).includes(`"mediaId":${mediaId}`)
    if (hit) return String(c.Subject || 'καμπάνια')
  }
  return null
}

export async function DELETE(request: NextRequest) {
  const auth = await authorize()
  if ('error' in auth) return auth.error
  const id = Number(request.nextUrl.searchParams.get('id'))
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Λείπει η εικόνα' }, { status: 400 })
  }
  try {
    const usedBy = await usedByLiveCampaign(id)
    if (usedBy) {
      return NextResponse.json({
        error: `Η εικόνα χρησιμοποιείται σε απεσταλμένο μήνυμα («${usedBy}») — δεν διαγράφεται, αλλιώς θα έσπαγε στα γραμματοκιβώτια όσων το έλαβαν.`,
      }, { status: 409 })
    }
    const del = await fetch(`${STRAPI_URL}/api/upload/files/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
    })
    if (!del.ok && del.status !== 404) {
      console.error('campaigns/image: delete failed', del.status)
      return NextResponse.json({ error: 'Αποτυχία διαγραφής' }, { status: 502 })
    }
    // 404 = έχει ήδη σβηστεί· για τον χρήστη το αποτέλεσμα είναι το ίδιο
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('campaigns/image DELETE failed:', err)
    return NextResponse.json({ error: 'Εσωτερικό σφάλμα' }, { status: 500 })
  }
}
