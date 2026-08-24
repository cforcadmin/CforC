import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { strapiAll } from '@/lib/strapiPaged'
import { titleKey, titleSimilarity, isLikelyDuplicate, sharedWordCount, LIMITS } from '@/lib/library'
import { uploadToLibrary, trashFile, ALLOWED_MIME, MAX_FILE_BYTES, LIBRARY_FOLDER_ID } from '@/lib/googleDrive'
import { LIBRARY_TAXONOMY, getSubLabel } from '@/lib/memberTaxonomy'
import { getAccessToken, SCOPES } from '@/lib/googleAuth'

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
    // Δευτερεύουσες θεματικές: [{ theme, subthemes: [] }]
    let secondary: Array<{ theme: string; subthemes: string[] }> = []
    try {
      const raw = JSON.parse(String(form.get('secondaryThemes') || '[]'))
      if (Array.isArray(raw)) {
        secondary = raw
          .filter((b: any) => b && typeof b.theme === 'string' && b.theme.trim())
          .map((b: any) => ({ theme: b.theme.trim(), subthemes: Array.isArray(b.subthemes) ? b.subthemes : [] }))
      }
    } catch { secondary = [] }

    // Το αρχείο έχει ήδη ανέβει κατευθείαν στο Drive από τον browser
    const clientFileId = String(form.get('driveFileId') || '').trim()

    // Κάθε αποτυχία λέει ΤΙ φταίει — το γενικό «απέτυχε» έστειλε τους
    // βιβλιοθηκάριους σε μάντεμα.
    const fail = async (msg: string) => {
      if (clientFileId) await trashFile(clientFileId).catch(() => {})
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    if (!title) return fail('Ο τίτλος είναι υποχρεωτικός.')
    if (title.length > LIMITS.title) return fail(`Ο τίτλος έχει ${title.length} χαρακτήρες — το όριο είναι ${LIMITS.title}.`)
    if (description.length > LIMITS.description) return fail(`Η περιγραφή έχει ${description.length} χαρακτήρες — το όριο είναι ${LIMITS.description}.`)
    if (sourceUrl.length > LIMITS.sourceUrl) return fail(`Ο σύνδεσμος πηγής ξεπερνά τους ${LIMITS.sourceUrl} χαρακτήρες.`)
    if (!theme) return fail('Διάλεξε θεματική.')
    if (!docType) return fail('Διάλεξε είδος αρχείου.')
    const taxErr = validateTaxonomy(theme, subthemes)
    if (taxErr) return fail(taxErr)
    for (const block of secondary) {
      if (block.theme === theme) return fail('Η δευτερεύουσα θεματική είναι ίδια με την κύρια.')
      const err = validateTaxonomy(block.theme, block.subthemes)
      if (err) return fail(err)
    }

    const year = yearRaw ? Number(yearRaw) : null
    if (year !== null && (!Number.isInteger(year) || year < LIMITS.yearMin || year > new Date().getFullYear() + 1)) {
      return fail(`Το έτος πρέπει να είναι αριθμός μεταξύ ${LIMITS.yearMin} και ${new Date().getFullYear() + 1}.`)
    }
    if (sourceUrl && !/^https?:\/\//i.test(sourceUrl)) {
      return fail('Ο σύνδεσμος πηγής πρέπει να ξεκινά με http:// ή https://.')
    }

    const file = form.get('file')
    if (!(file instanceof File) && !clientFileId && !sourceUrl) {
      return fail('Χρειάζεται αρχείο ή σύνδεσμος πηγής.')
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

    // ── Το αρχείο ───────────────────────────────────────────────
    let fileMeta: { id: string; name: string; mimeType: string; size?: number } | null = null

    if (clientFileId) {
      // Ανέβηκε κατευθείαν στο Drive από τον browser. ΔΕΝ εμπιστευόμαστε τα
      // στοιχεία του client: ρωτάμε το Drive και ελέγχουμε ότι το αρχείο
      // βρίσκεται όντως στον φάκελο της βιβλιοθήκης — αλλιώς ένα οποιοδήποτε
      // id που βλέπει ο λογαριασμός υπηρεσίας θα γινόταν «τεκμήριο».
      if (!/^[A-Za-z0-9_-]{10,}$/.test(clientFileId)) return fail('Άκυρο αναγνωριστικό αρχείου.')
      const tok = await getAccessToken(SCOPES.drive)
      const metaRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${clientFileId}?fields=id,name,mimeType,size,parents&supportsAllDrives=true`,
        { headers: { Authorization: `Bearer ${tok}` }, cache: 'no-store' },
      )
      const meta: any = await metaRes.json().catch(() => null)
      if (!metaRes.ok || !meta?.id) return fail('Το αρχείο δεν βρέθηκε στο Drive — δοκίμασε ξανά το ανέβασμα.')
      if (!(meta.parents || []).includes(LIBRARY_FOLDER_ID)) {
        return fail('Το αρχείο δεν ανήκει στον φάκελο της βιβλιοθήκης.')
      }
      if (Number(meta.size) > MAX_FILE_BYTES) return fail(`Το αρχείο ξεπερνά τα ${Math.round(MAX_FILE_BYTES / 1024 / 1024)} MB.`)
      if (!ALLOWED_MIME[meta.mimeType]) return fail(`Μη αποδεκτός τύπος αρχείου: ${meta.mimeType}.`)
      fileMeta = { id: meta.id, name: meta.name, mimeType: meta.mimeType, size: Number(meta.size) || undefined }
      uploadedId = meta.id
    } else if (file instanceof File) {
      // Παλιά διαδρομή μέσω server — μόνο για μικρά αρχεία (όριο multipart
      // του Drive: 5 MB). Μένει ως εφεδρεία αν αποτύχει η απευθείας.
      if (file.size > 4.5 * 1024 * 1024) {
        return fail('Το αρχείο είναι πάνω από 4,5 MB — χρησιμοποίησε το κανονικό ανέβασμα (δοκίμασε ξανά).')
      }
      if (!ALLOWED_MIME[file.type]) return fail(`Μη αποδεκτός τύπος αρχείου: ${file.type || 'άγνωστος'}.`)
      const bytes = Buffer.from(await file.arrayBuffer())
      fileMeta = await uploadToLibrary({ name: file.name, mimeType: file.type, bytes })
      uploadedId = fileMeta.id
    }

    const state = duplicateOf ? 'pending' : 'published'
    const payload = {
      data: {
        Title: title, TitleKey: key,
        Description: description || null,
        Year: year, Theme: theme, Subthemes: subthemes,
        // Το κλειδί μπαίνει ΜΟΝΟ αν υπάρχουν δευτερεύουσες: το Strapi
        // απορρίπτει άγνωστο κλειδί ακόμη και με τιμή null, και μέχρι να
        // γίνει deploy το πεδίο δεν υπάρχει στο Cloud. Με το σκέτο
        // «SecondaryThemes: null» ΚΑΘΕ καταχώρηση απέτυχε — και το γενικό
        // μήνυμα έκρυβε την αιτία.
        ...(secondary.length ? { SecondaryThemes: secondary } : {}),
        DocType: docType,
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
      // Η ΠΡΑΓΜΑΤΙΚΗ αιτία φτάνει στον χρήστη — το σκέτο «απέτυχε» έστειλε
      // τους βιβλιοθηκάριους σε μάντεμα και εμάς σε λάθος υποψήφιους.
      let detail = ''
      try { detail = JSON.parse(t)?.error?.message || '' } catch { /* όχι JSON */ }
      return NextResponse.json({
        error: `Η αποθήκευση στη βάση απέτυχε (${res.status}${detail ? `: ${detail}` : ''}). Το αρχείο μεταφέρθηκε στον κάδο — δοκίμασε ξανά.`,
      }, { status: 502 })
    }
    const created = (await res.json())?.data

    // Καθρέφτισμα στο φύλλο της ομάδας — μόνο για ό,τι δημοσιεύεται. Τα
    // εκκρεμή γράφονται μετά την έγκριση, ώστε να μην εμφανιστεί στο φύλλο
    // κάτι που τελικά απορρίπτεται.
    if (state === 'published' && created?.documentId) {
      const { appendLibraryRow } = await import('@/lib/librarySheet')
      await appendLibraryRow({
        documentId: created.documentId,
        title, description, year,
        theme: [theme, ...secondary.map(bl => bl.theme)].join(' · '),
        subthemes: [...subthemes, ...secondary.flatMap(bl => bl.subthemes)],
        docType,
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
