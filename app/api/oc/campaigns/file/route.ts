import { NextRequest, NextResponse } from 'next/server'
import { authorizeOcUpload } from '@/lib/ocUploadAuth'

export const maxDuration = 60

/**
 * Συνημμένα των email του OC: ανέβασμα στη Βιβλιοθήκη Πολυμέσων.
 *
 *  POST   multipart «file» → { url, name, size, ext }
 *  DELETE ?id=             → διαγραφή
 *
 * ΓΙΑΤΙ ΧΩΡΙΣΤΑ ΑΠΟ ΤΙΣ ΕΙΚΟΝΕΣ: εκείνη η διαδρομή περνά ό,τι ανεβαίνει από
 * το sharp — αλλάζει μέγεθος, καίει σήμα, ξαναγράφει το αρχείο. Ένα PDF που
 * θα περνούσε από εκεί θα καταστρεφόταν. Ίδιος έλεγχος πρόσβασης, άλλο υλικό.
 *
 * ΔΕΝ ΥΠΑΡΧΕΙ ΦΡΕΝΟ ΔΙΑΓΡΑΦΗΣ όπως στις εικόνες, και είναι σκόπιμο: οι
 * εικόνες κατεβαίνουν ΚΑΘΕ φορά που ανοίγει το γράμμα, άρα η διαγραφή τις
 * σπάει αναδρομικά. Το συνημμένο ενός μηνύματος έχει ήδη φτάσει στο
 * γραμματοκιβώτιο — εκεί μένει. Σπάει μόνο ο σύνδεσμος λήψης, που είναι
 * εφεδρικός. Στο newsletter όμως ο σύνδεσμος είναι ο ΜΟΝΟΣ τρόπος, γι' αυτό
 * η οθόνη προειδοποιεί πριν τη διαγραφή.
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

/** 5 MB ανά αρχείο — ίδιο με τις εικόνες, και πολύ κάτω από το όριο του Resend */
const MAX_BYTES = 5 * 1024 * 1024

/**
 * Κλειστή λίστα, όχι μπαλαντέρ.
 *
 * Λείπουν επίτηδες τα εκτελέσιμα και ό,τι τα κουβαλά (.zip, .js, .html): ένα
 * γράμμα από το cultureforchange.net με εκτελέσιμο συνημμένο είναι ακριβώς το
 * σχήμα που μαθαίνουμε στα μέλη να ΜΗΝ εμπιστεύονται.
 */
const ALLOWED: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/vnd.oasis.opendocument.text': 'odt',
  'application/vnd.oasis.opendocument.spreadsheet': 'ods',
  'application/vnd.oasis.opendocument.presentation': 'odp',
  'text/csv': 'csv',
  'text/plain': 'txt',
  'image/png': 'png',
  'image/jpeg': 'jpg',
}

export async function POST(request: NextRequest) {
  const auth = await authorizeOcUpload()
  if (auth.error) return auth.error
  if (!STRAPI_URL || !STRAPI_API_TOKEN) {
    return NextResponse.json({ error: 'Λείπει η ρύθμιση του Strapi' }, { status: 500 })
  }

  let form: FormData
  try { form = await request.formData() } catch {
    return NextResponse.json({ error: 'Μη έγκυρο αίτημα' }, { status: 400 })
  }
  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Δεν στάλθηκε αρχείο' }, { status: 400 })
  }
  const ext = ALLOWED[file.type]
  if (!ext) {
    return NextResponse.json({
      error: `Ο τύπος «${file.type || 'άγνωστος'}» δεν επιτρέπεται. Δεκτά: PDF, Word, Excel, PowerPoint, OpenDocument, CSV, κείμενο, PNG, JPG.`,
    }, { status: 415 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({
      error: `Το αρχείο είναι ${(file.size / 1048576).toFixed(1).replace('.', ',')} MB — το όριο είναι 5 MB.`,
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
    console.error('oc/campaigns/file: upload failed', up.status, (await up.text()).slice(0, 300))
    return NextResponse.json({ error: 'Το αρχείο δεν ανέβηκε' }, { status: 502 })
  }
  const json = await up.json().catch(() => null)
  const saved = Array.isArray(json) ? json[0] : null
  if (!saved?.url) return NextResponse.json({ error: 'Το αρχείο δεν ανέβηκε' }, { status: 502 })

  return NextResponse.json({
    id: String(saved.id),
    url: String(saved.url),
    name: file.name,
    // Το Strapi επιστρέφει KB· κρατάμε bytes ώστε να συμφωνεί με το όριο του Resend
    size: file.size,
    ext,
  })
}

export async function DELETE(request: NextRequest) {
  const auth = await authorizeOcUpload()
  if (auth.error) return auth.error
  if (!STRAPI_URL || !STRAPI_API_TOKEN) {
    return NextResponse.json({ error: 'Λείπει η ρύθμιση του Strapi' }, { status: 500 })
  }
  const id = String(new URL(request.url).searchParams.get('id') || '').replace(/[^0-9]/g, '')
  if (!id) return NextResponse.json({ error: 'Λείπει το αναγνωριστικό' }, { status: 400 })

  const del = await fetch(`${STRAPI_URL}/api/upload/files/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
  })
  if (!del.ok && del.status !== 404) {
    return NextResponse.json({ error: 'Η διαγραφή απέτυχε' }, { status: 502 })
  }
  return NextResponse.json({ ok: true })
}
