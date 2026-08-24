import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { titleKey, LIMITS } from '@/lib/library'
import { trashFile, ALLOWED_MIME, MAX_FILE_BYTES, LIBRARY_FOLDER_ID } from '@/lib/googleDrive'
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

  // Νέο αρχείο; Επαλήθευση ότι ζει στον φάκελό μας, και το παλιό στον κάδο.
  let fileFields: Record<string, unknown> = {}
  const newFileId = String(b.driveFileId || '').trim()
  if (newFileId && newFileId !== item.DriveFileId) {
    if (!/^[A-Za-z0-9_-]{10,}$/.test(newFileId)) return NextResponse.json({ error: 'Άκυρο αναγνωριστικό αρχείου.' }, { status: 400 })
    const tok = await getAccessToken(SCOPES.drive)
    const meta: any = await (await fetch(
      `https://www.googleapis.com/drive/v3/files/${newFileId}?fields=id,name,mimeType,size,parents&supportsAllDrives=true`,
      { headers: { Authorization: `Bearer ${tok}` }, cache: 'no-store' },
    )).json().catch(() => null)
    if (!meta?.id || !(meta.parents || []).includes(LIBRARY_FOLDER_ID)) {
      return NextResponse.json({ error: 'Το νέο αρχείο δεν βρέθηκε στον φάκελο της βιβλιοθήκης.' }, { status: 400 })
    }
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

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const auth = await requireLibrarian()
  if (!auth.ok) return auth.res

  const documentId = String(request.nextUrl.searchParams.get('documentId') || '')
  if (!documentId) return NextResponse.json({ error: 'Λείπει το τεκμήριο' }, { status: 400 })

  const cur = await strapi(`/library-items/${documentId}?fields[0]=Title&fields[1]=DriveFileId`)
  const item = (await cur.json().catch(() => null))?.data
  if (!cur.ok || !item) return NextResponse.json({ error: 'Δεν βρέθηκε' }, { status: 404 })

  // Κάδος, όχι οριστική διαγραφή — λάθος διαγραφή πρέπει να γυρίζει πίσω.
  if (item.DriveFileId) await trashFile(item.DriveFileId).catch(() => {})

  const del = await strapi(`/library-items/${documentId}`, { method: 'DELETE' })
  if (!del.ok) return NextResponse.json({ error: 'Η διαγραφή απέτυχε' }, { status: 502 })

  await clearLibraryRow(documentId).catch(() => {})
  return NextResponse.json({ ok: true })
}
