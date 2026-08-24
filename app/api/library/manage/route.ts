import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { titleKey, LIMITS } from '@/lib/library'
import { trashFile, untrashFile, ALLOWED_MIME, MAX_FILE_BYTES, LIBRARY_FOLDER_ID } from '@/lib/googleDrive'
import { getAccessToken, SCOPES } from '@/lib/googleAuth'
import { LIBRARY_TAXONOMY, getSubLabel } from '@/lib/memberTaxonomy'
import { updateLibraryRow, clearLibraryRow } from '@/lib/librarySheet'

export const maxDuration = 60

/**
 * Επεξεργασία και διαγραφή τεκμηρίου — ΜΟΝΟ Βιβλιοθηκάριος.
 * Οι βιβλιοθηκάριοι το ζήτησαν με το πρώτο τους λάθος («ξέχασα το έτος
 * και δεν βρήκα πώς να κάνω Edit») — μέχρι τώρα γινόταν μόνο από το Strapi.
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
  { ok: true; name: string } | { ok: false; res: NextResponse }
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
  return { ok: true, name: m.Name || '' }
}

function validateTaxonomy(theme: string, subs: string[]): string | null {
  const cat = LIBRARY_TAXONOMY.find(c => c.label === theme)
  if (!cat) return `Άγνωστη θεματική: ${theme}`
  const allowed = new Set(cat.subcategories.map(getSubLabel))
  const bad = subs.filter(s => !allowed.has(s))
  return bad.length ? `Υποθεματικές εκτός «${theme}»: ${bad.join(', ')}` : null
}

export async function PUT(request: NextRequest) {
  const auth = await requireLibrarian()
  if (!auth.ok) return auth.res

  const b = await request.json().catch(() => ({}))
  const documentId = String(b.documentId || '')
  if (!documentId) return NextResponse.json({ error: 'Λείπει το τεκμήριο' }, { status: 400 })

  const title = String(b.title || '').trim()
  const description = String(b.description || '').trim()
  const theme = String(b.theme || '').trim()
  const docType = String(b.docType || '').trim()
  const language = String(b.language || '').trim()
  const sourceUrl = String(b.sourceUrl || '').trim()
  const year = b.year ? Number(b.year) : null
  const subthemes: string[] = Array.isArray(b.subthemes) ? b.subthemes : []
  const secondary: Array<{ theme: string; subthemes: string[] }> =
    Array.isArray(b.secondaryThemes)
      ? b.secondaryThemes.filter((x: any) => x?.theme).map((x: any) => ({
          theme: String(x.theme), subthemes: Array.isArray(x.subthemes) ? x.subthemes : [],
        }))
      : []

  if (!title) return NextResponse.json({ error: 'Ο τίτλος είναι υποχρεωτικός.' }, { status: 400 })
  if (title.length > LIMITS.title) return NextResponse.json({ error: `Ο τίτλος ξεπερνά τους ${LIMITS.title} χαρακτήρες.` }, { status: 400 })
  if (description.length > LIMITS.description) return NextResponse.json({ error: `Η περιγραφή ξεπερνά τους ${LIMITS.description} χαρακτήρες.` }, { status: 400 })
  if (!theme || !docType) return NextResponse.json({ error: 'Λείπει θεματική ή είδος.' }, { status: 400 })
  if (year !== null && (!Number.isInteger(year) || year < LIMITS.yearMin || year > new Date().getFullYear() + 1)) {
    return NextResponse.json({ error: 'Μη έγκυρο έτος.' }, { status: 400 })
  }
  const taxErr = validateTaxonomy(theme, subthemes)
  if (taxErr) return NextResponse.json({ error: taxErr }, { status: 400 })
  for (const block of secondary) {
    if (block.theme === theme) return NextResponse.json({ error: 'Η δευτερεύουσα θεματική είναι ίδια με την κύρια.' }, { status: 400 })
    const err = validateTaxonomy(block.theme, block.subthemes)
    if (err) return NextResponse.json({ error: err }, { status: 400 })
  }

  const cur = await strapi(`/library-items/${documentId}?populate[SubmittedBy][fields][0]=Name`)
  const item = (await cur.json().catch(() => null))?.data
  if (!cur.ok || !item) return NextResponse.json({ error: 'Δεν βρέθηκε' }, { status: 404 })

  // Το «πριν», σε σχήμα που ξαναταΐζεται σε αυτό το PUT — η αναίρεση της
  // επεξεργασίας είναι απλώς μια δεύτερη επεξεργασία με τις παλιές τιμές.
  const previous = {
    documentId,
    title: item.Title, description: item.Description ?? '',
    year: item.Year ?? null, theme: item.Theme,
    subthemes: Array.isArray(item.Subthemes) ? item.Subthemes : [],
    secondaryThemes: Array.isArray(item.SecondaryThemes) ? item.SecondaryThemes : [],
    docType: item.DocType, language: item.Language ?? '',
    sourceUrl: item.SourceUrl ?? '', driveFileId: item.DriveFileId ?? null,
  }

  // Νέο αρχείο; Επαλήθευση ότι ζει στον φάκελό μας, και το παλιό στον κάδο.
  let fileFields: Record<string, unknown> = {}
  const newFileId = String(b.driveFileId || '').trim()
  if (newFileId && newFileId !== item.DriveFileId) {
    if (!/^[A-Za-z0-9_-]{10,}$/.test(newFileId)) return NextResponse.json({ error: 'Άκυρο αναγνωριστικό αρχείου.' }, { status: 400 })
    const tok = await getAccessToken(SCOPES.drive)
    const meta: any = await (await fetch(
      `https://www.googleapis.com/drive/v3/files/${newFileId}?fields=id,name,mimeType,size,parents,trashed&supportsAllDrives=true`,
      { headers: { Authorization: `Bearer ${tok}` }, cache: 'no-store' },
    )).json().catch(() => null)
    if (!meta?.id || !(meta.parents || []).includes(LIBRARY_FOLDER_ID)) {
      return NextResponse.json({ error: 'Το νέο αρχείο δεν βρέθηκε στον φάκελο της βιβλιοθήκης.' }, { status: 400 })
    }
    // Η αναίρεση γυρίζει σε αρχείο που η επεξεργασία είχε στείλει στον κάδο
    if (meta.trashed) await untrashFile(newFileId)
    if (Number(meta.size) > MAX_FILE_BYTES || !ALLOWED_MIME[meta.mimeType]) {
      return NextResponse.json({ error: 'Μη αποδεκτό αρχείο.' }, { status: 400 })
    }
    fileFields = { DriveFileId: meta.id, FileName: meta.name, MimeType: meta.mimeType, FileSize: Number(meta.size) || null }
    if (item.DriveFileId) await trashFile(item.DriveFileId).catch(() => {})
  }

  const up = await strapi(`/library-items/${documentId}`, {
    method: 'PUT',
    body: JSON.stringify({
      data: {
        Title: title, TitleKey: titleKey(title),
        Description: description || null, Year: year,
        Theme: theme, Subthemes: subthemes,
        ...(secondary.length ? { SecondaryThemes: secondary } : {}),
        DocType: docType, Language: language || null, SourceUrl: sourceUrl || null,
        ...fileFields,
        ReviewedBy: auth.name, ReviewedAt: new Date().toISOString(),
      },
    }),
  })
  if (!up.ok) {
    console.error('library/manage PUT:', up.status, (await up.text()).slice(0, 200))
    return NextResponse.json({ error: 'Η ενημέρωση απέτυχε' }, { status: 502 })
  }

  // Το φύλλο ακολουθεί — αντίγραφο, όχι αλήθεια· η αποτυχία δεν ακυρώνει.
  await updateLibraryRow({
    documentId, title, description, year,
    theme: [theme, ...secondary.map(bl => bl.theme)].join(' · '),
    subthemes: [...subthemes, ...secondary.flatMap(bl => bl.subthemes)],
    docType, sourceUrl,
    driveFileId: (fileFields.DriveFileId as string) || item.DriveFileId || null,
    language, submittedBy: item.SubmittedBy?.Name || item.SubmittedByName || null,
  }).catch(() => {})

  return NextResponse.json({ ok: true, previous })
}

export async function DELETE(request: NextRequest) {
  const auth = await requireLibrarian()
  if (!auth.ok) return auth.res

  const documentId = String(request.nextUrl.searchParams.get('documentId') || '')
  if (!documentId) return NextResponse.json({ error: 'Λείπει το τεκμήριο' }, { status: 400 })

  const cur = await strapi(`/library-items/${documentId}?populate[SubmittedBy][fields][0]=Name`)
  const item = (await cur.json().catch(() => null))?.data
  if (!cur.ok || !item) return NextResponse.json({ error: 'Δεν βρέθηκε' }, { status: 404 })

  // Πλήρες στιγμιότυπο ΠΡΙΝ χαθεί οτιδήποτε: η αναίρεση της διαγραφής το
  // ξαναχτίζει από αυτό — μαζί με τη σχέση του μέλους που το κατέθεσε,
  // που αλλιώς δεν ανακτάται.
  const snapshot = {
    title: item.Title, titleKey: item.TitleKey ?? null,
    description: item.Description ?? '', year: item.Year ?? null,
    theme: item.Theme,
    subthemes: Array.isArray(item.Subthemes) ? item.Subthemes : [],
    secondaryThemes: Array.isArray(item.SecondaryThemes) ? item.SecondaryThemes : [],
    docType: item.DocType, language: item.Language ?? '',
    sourceUrl: item.SourceUrl ?? '',
    driveFileId: item.DriveFileId ?? null, fileName: item.FileName ?? null,
    mimeType: item.MimeType ?? null, fileSize: item.FileSize ?? null,
    submittedById: item.SubmittedBy?.documentId ?? null,
    submittedByName: item.SubmittedByName ?? item.SubmittedBy?.Name ?? null,
  }

  // Κάδος, όχι οριστική διαγραφή — λάθος διαγραφή πρέπει να γυρίζει πίσω.
  if (item.DriveFileId) await trashFile(item.DriveFileId).catch(() => {})

  const del = await strapi(`/library-items/${documentId}`, { method: 'DELETE' })
  if (!del.ok) return NextResponse.json({ error: 'Η διαγραφή απέτυχε' }, { status: 502 })

  await clearLibraryRow(documentId).catch(() => {})
  return NextResponse.json({ ok: true, snapshot })
}

/**
 * Αναίρεση διαγραφής: ξαναχτίζει το τεκμήριο από το στιγμιότυπο που
 * επέστρεψε το DELETE και επαναφέρει το αρχείο από τον κάδο. Το τεκμήριο
 * παίρνει ΝΕΟ αναγνωριστικό — το παλιό έχει πάψει να υπάρχει.
 */
export async function POST(request: NextRequest) {
  const auth = await requireLibrarian()
  if (!auth.ok) return auth.res

  const body = await request.json().catch(() => ({}))
  const sn = body?.snapshot
  if (!sn?.title || !sn?.theme || !sn?.docType) {
    return NextResponse.json({ error: 'Ελλιπές στιγμιότυπο' }, { status: 400 })
  }

  if (sn.driveFileId) await untrashFile(String(sn.driveFileId)).catch(() => {})

  const secondary = Array.isArray(sn.secondaryThemes)
    ? sn.secondaryThemes.filter((x: any) => x?.theme)
    : []
  const res = await strapi('/library-items', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        Title: String(sn.title), TitleKey: sn.titleKey || titleKey(String(sn.title)),
        Description: sn.description || null, Year: sn.year ?? null,
        Theme: String(sn.theme),
        Subthemes: Array.isArray(sn.subthemes) ? sn.subthemes : [],
        ...(secondary.length ? { SecondaryThemes: secondary } : {}),
        DocType: String(sn.docType), Language: sn.language || null,
        SourceUrl: sn.sourceUrl || null,
        DriveFileId: sn.driveFileId || null, FileName: sn.fileName || null,
        MimeType: sn.mimeType || null, FileSize: sn.fileSize ?? null,
        State: 'published',
        ...(sn.submittedById ? { SubmittedBy: sn.submittedById } : {}),
        SubmittedByName: sn.submittedByName || null,
        ReviewedBy: auth.name, ReviewedAt: new Date().toISOString(),
      },
    }),
  })
  const j: any = await res.json().catch(() => null)
  if (!res.ok) {
    let detail = ''
    try { detail = j?.error?.message || '' } catch { /* όχι JSON */ }
    return NextResponse.json({ error: `Η επαναφορά απέτυχε (${res.status}${detail ? `: ${detail}` : ''}).` }, { status: 502 })
  }
  const newId = j?.data?.documentId

  const { appendLibraryRow } = await import('@/lib/librarySheet')
  await appendLibraryRow({
    documentId: newId,
    title: String(sn.title), description: sn.description || null, year: sn.year ?? null,
    theme: [String(sn.theme), ...secondary.map((bl: any) => bl.theme)].join(' · '),
    subthemes: [
      ...(Array.isArray(sn.subthemes) ? sn.subthemes : []),
      ...secondary.flatMap((bl: any) => bl.subthemes || []),
    ],
    docType: String(sn.docType), sourceUrl: sn.sourceUrl || null,
    driveFileId: sn.driveFileId || null, language: sn.language || null,
    submittedBy: sn.submittedByName || null,
  }).catch(() => {})

  return NextResponse.json({ ok: true, documentId: newId })
}
