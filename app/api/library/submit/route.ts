import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { strapiAll } from '@/lib/strapiPaged'
import { titleKey, titleSimilarity, isLikelyDuplicate, sharedWordCount } from '@/lib/library'
import { uploadToLibrary, trashFile, ALLOWED_MIME, MAX_FILE_BYTES } from '@/lib/googleDrive'
import { LIBRARY_TAXONOMY, getSubLabel } from '@/lib/memberTaxonomy'

// Ανέβασμα στο Drive + έλεγχος διπλοεγγραφών + email: πολύ πάνω από τα 10s
export const maxDuration = 60

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

const strapi = (path: string, init?: RequestInit) =>
  fetch(`${STRAPI_URL}/api${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}`, 'Content-Type': 'application/json', ...init?.headers },
    cache: 'no-store',
  })

/** Η θεματική και οι υποθεματικές ΠΡΕΠΕΙ να ανήκουν στην ταξινομία */
function validateTaxonomy(theme: string, subs: string[]): string | null {
  const cat = LIBRARY_TAXONOMY.find(c => c.label === theme)
  if (!cat) return `Άγνωστη θεματική: ${theme}`
  const allowed = new Set(cat.subcategories.map(getSubLabel))
  const bad = subs.filter(s => !allowed.has(s))
  return bad.length ? `Υποθεματικές εκτός «${theme}»: ${bad.join(', ')}` : null
}

export async function POST(request: NextRequest) {
  const store = await cookies()
  const session = store.get('session')
  const decoded = session ? verifyToken(session.value) : null
  if (!decoded || decoded.type !== 'session') {
    return NextResponse.json({ error: 'Απαιτείται σύνδεση' }, { status: 401 })
  }

  let uploadedId: string | null = null
  try {
    const form = await request.formData()
    const title = String(form.get('title') || '').trim()
    const description = String(form.get('description') || '').trim()
    const theme = String(form.get('theme') || '').trim()
    const docType = String(form.get('docType') || '').trim()
    const language = String(form.get('language') || '').trim()
    const sourceUrl = String(form.get('sourceUrl') || '').trim()
    const yearRaw = String(form.get('year') || '').trim()
    let subthemes: string[] = []
    try { subthemes = JSON.parse(String(form.get('subthemes') || '[]')) } catch { subthemes = [] }

    if (!title) return NextResponse.json({ error: 'Ο τίτλος είναι υποχρεωτικός' }, { status: 400 })
    if (!theme) return NextResponse.json({ error: 'Η θεματική είναι υποχρεωτική' }, { status: 400 })
    if (!docType) return NextResponse.json({ error: 'Το είδος αρχείου είναι υποχρεωτικό' }, { status: 400 })
    const taxErr = validateTaxonomy(theme, subthemes)
    if (taxErr) return NextResponse.json({ error: taxErr }, { status: 400 })

    const year = yearRaw ? Number(yearRaw) : null
    if (year !== null && (!Number.isInteger(year) || year < 1800 || year > new Date().getFullYear() + 1)) {
      return NextResponse.json({ error: 'Μη έγκυρο έτος' }, { status: 400 })
    }
    if (sourceUrl && !/^https?:\/\//i.test(sourceUrl)) {
      return NextResponse.json({ error: 'Ο σύνδεσμος πηγής πρέπει να ξεκινά με http:// ή https://' }, { status: 400 })
    }

    const file = form.get('file')
    if (!(file instanceof File) && !sourceUrl) {
      return NextResponse.json({ error: 'Χρειάζεται αρχείο ή σύνδεσμος πηγής' }, { status: 400 })
    }

    // Ποιος καταχωρεί — και ο δείκτης δραστηριότητας στο OC
    const meRes = await strapi(`/members/${decoded.memberId}?fields[0]=Name&fields[1]=Email`)
    const me = (await meRes.json().catch(() => null))?.data

    // ── Έλεγχος διπλοεγγραφής ΠΡΙΝ ανέβει οτιδήποτε ──────────────
    const key = titleKey(title)
    const existing = await strapiAll('/library-items?fields[0]=Title&fields[1]=TitleKey&fields[2]=State&filters[State][$ne]=rejected')
    // Κρατάμε το ΠΙΟ κοντινό από όσα σημαίνονται — αν μοιάζει με δύο, ο
    // Βιβλιοθηκάριος πρέπει να δει το πιο πιθανό δίπλα.
    let duplicateOf: any = null
    let best = 0
    let bestShared = 0
    for (const row of existing.data) {
      const other = row.Title || ''
      if (!isLikelyDuplicate(title, other)) continue
      const shared = row.TitleKey === key ? 99 : sharedWordCount(title, other)
      if (shared > bestShared) {
        bestShared = shared
        best = row.TitleKey === key ? 1 : titleSimilarity(title, other)
        duplicateOf = row
      }
    }

    // ── Ανέβασμα ────────────────────────────────────────────────
    let fileMeta: { id: string; name: string; mimeType: string; size?: number } | null = null
    if (file instanceof File) {
      if (file.size > MAX_FILE_BYTES) {
        return NextResponse.json({ error: `Το αρχείο ξεπερνά τα ${Math.round(MAX_FILE_BYTES / 1024 / 1024)} MB` }, { status: 400 })
      }
      if (!ALLOWED_MIME[file.type]) {
        return NextResponse.json({ error: `Μη αποδεκτός τύπος αρχείου: ${file.type || 'άγνωστος'}` }, { status: 400 })
      }
      const bytes = Buffer.from(await file.arrayBuffer())
      fileMeta = await uploadToLibrary({ name: file.name, mimeType: file.type, bytes })
      uploadedId = fileMeta.id
    }

    const state = duplicateOf ? 'pending' : 'published'
    const payload = {
      data: {
        Title: title, TitleKey: key,
        Description: description || null,
        Year: year, Theme: theme, Subthemes: subthemes, DocType: docType,
        SourceUrl: sourceUrl || null,
        DriveFileId: fileMeta?.id || null,
        FileName: fileMeta?.name || null,
        MimeType: fileMeta?.mimeType || null,
        FileSize: fileMeta?.size ?? null,
        Language: language || null,
        State: state,
        DuplicateOf: duplicateOf?.documentId || null,
        SubmittedBy: decoded.memberId,
        SubmittedByName: me?.Name || null,
      },
    }
    const res = await strapi('/library-items', { method: 'POST', body: JSON.stringify(payload) })
    if (!res.ok) {
      const t = await res.text()
      console.error('library/submit: strapi', res.status, t.slice(0, 300))
      // Το αρχείο ανέβηκε αλλά η εγγραφή απέτυχε: χωρίς καθάρισμα θα έμενε
      // ορφανό στο Drive, αόρατο από τη βιβλιοθήκη και αμέτρητο.
      if (uploadedId) await trashFile(uploadedId)
      return NextResponse.json({ error: 'Η καταχώρηση απέτυχε' }, { status: 502 })
    }
    const created = (await res.json())?.data

    // Καθρέφτισμα στο φύλλο της ομάδας — μόνο για ό,τι δημοσιεύεται. Τα
    // εκκρεμή γράφονται μετά την έγκριση, ώστε να μην εμφανιστεί στο φύλλο
    // κάτι που τελικά απορρίπτεται.
    if (state === 'published' && created?.documentId) {
      const { appendLibraryRow } = await import('@/lib/librarySheet')
      await appendLibraryRow({
        documentId: created.documentId,
        title, description, year, theme, subthemes, docType,
        sourceUrl, driveFileId: fileMeta?.id ?? null,
        language, submittedBy: me?.Name ?? null,
      })
    }

    // Κάθε email γίνεται await: un-awaited fetch πεθαίνει με το πάγωμα της
    // συνάρτησης — το έχουμε ήδη πληρώσει στα email αποχώρησης.
    const { sendSubmissionThanks, notifyLibrariansOfDuplicate } = await import('@/lib/libraryEmails')

    await sendSubmissionThanks({
      to: me?.Email || '',
      name: me?.Name || '',
      title, theme, pending: state === 'pending',
    }).catch((err: unknown) => console.error('library/submit: ευχαριστία', err))

    if (duplicateOf) {
      await notifyLibrariansOfDuplicate({
        newItem: { documentId: created?.documentId, title },
        existing: { documentId: duplicateOf.documentId, title: duplicateOf.Title },
        submitter: me?.Name || 'μέλος',
        similarity: best,
        sharedWords: bestShared === 99 ? undefined : bestShared,
      }).catch((err: unknown) => console.error('library/submit: ειδοποίηση διπλοεγγραφής', err))
    }

    return NextResponse.json({
      ok: true,
      state,
      documentId: created?.documentId,
      duplicateOf: duplicateOf ? { title: duplicateOf.Title } : null,
    })
  } catch (err: any) {
    console.error('library/submit failed:', err)
    if (uploadedId) await trashFile(uploadedId).catch(() => {})
    return NextResponse.json({ error: err?.message || 'Απρόσμενο σφάλμα' }, { status: 500 })
  }
}
