/**
 * Google Drive — ό,τι χρειάζεται η Ανοιχτή Βιβλιοθήκη.
 *
 * ΔΥΟ ΠΑΓΙΔΕΣ ΠΟΥ ΜΑΣ ΚΟΣΤΙΣΑΝ ΗΔΗ:
 *
 * 1. `includeItemsFromAllDrives=true` ΔΕΝ είναι προαιρετικό. Χωρίς αυτό, η
 *    λίστα ενός φακέλου που είναι απλώς μοιρασμένος μαζί μας γυρίζει κενή —
 *    με status 200 και χωρίς σφάλμα. Ένα «αντικατάστησε αν υπάρχει» έγινε
 *    έτσι «φτιάξε σιωπηλά δεύτερο αντίγραφο».
 *
 * 2. Το πεδίο `permissions` δεν λέει την αλήθεια σε απλό θεατή: επιστρέφει
 *    null, που ΔΕΝ σημαίνει «δεν είναι δημόσιο». Για το αν ένα αρχείο είναι
 *    προσβάσιμο απ' έξω, το μόνο αξιόπιστο είναι να δοκιμάσεις να το
 *    κατεβάσεις χωρίς διαπιστευτήρια (isPubliclyDownloadable).
 */
import { getAccessToken, SCOPES } from '@/lib/googleAuth'

export const LIBRARY_FOLDER_ID = process.env.GOOGLE_LIBRARY_FOLDER_ID || '1QrZV0ixXvjITBsU95AHmoeg2Kqa2RJj9'

export interface DriveFile {
  id: string
  name: string
  mimeType: string
  size?: number
}

/** Τι δεχόμαστε: έγγραφα, όχι εκτελέσιμα. */
export const ALLOWED_MIME: Record<string, string> = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
  'application/vnd.ms-powerpoint': '.ppt',
  'application/vnd.oasis.opendocument.text': '.odt',
  'application/vnd.oasis.opendocument.spreadsheet': '.ods',
  'application/vnd.oasis.opendocument.presentation': '.odp',
  'application/epub+zip': '.epub',
  'text/plain': '.txt',
  'text/csv': '.csv',
  'image/png': '.png',
  'image/jpeg': '.jpg',
}

/** 40 MB: πάνω από κάθε ρεαλιστική μελέτη, κάτω από τα όρια της Vercel. */
export const MAX_FILE_BYTES = 40 * 1024 * 1024

export async function listFolder(folderId: string): Promise<DriveFile[]> {
  const token = await getAccessToken(SCOPES.drive)
  if (!token) return []
  const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`)
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,size)`
    + '&pageSize=1000&supportsAllDrives=true&includeItemsFromAllDrives=true',
    { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
  )
  if (!res.ok) {
    console.error('googleDrive.listFolder:', res.status)
    return []
  }
  const j: any = await res.json()
  return (j.files || []).map((f: any) => ({ ...f, size: Number(f.size) || undefined }))
}

/**
 * Ανεβάζει αρχείο στον φάκελο και επιστρέφει το id.
 *
 * Δοκιμάζει πρώτα με τον σκέτο λογαριασμό υπηρεσίας. Αν χτυπήσει το όριο
 * χώρου (ένας λογαριασμός υπηρεσίας δεν έχει δικό του), ξαναδοκιμάζει ως
 * it@ μέσω delegation, ώστε το αρχείο να ανήκει σε πραγματικό λογαριασμό.
 */
export async function uploadToLibrary(opts: {
  name: string
  mimeType: string
  bytes: Buffer
  folderId?: string
}): Promise<DriveFile> {
  const folderId = opts.folderId || LIBRARY_FOLDER_ID
  let lastError = 'άγνωστο σφάλμα'

  for (const delegate of [false, true]) {
    const token = await getAccessToken(SCOPES.driveWrite, delegate)
    if (!token) { lastError = 'δεν πάρθηκε token'; continue }

    const boundary = `cforc${Date.now().toString(36)}`
    const meta = JSON.stringify({ name: opts.name, parents: [folderId] })
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: ${opts.mimeType}\r\n\r\n`),
      opts.bytes,
      Buffer.from(`\r\n--${boundary}--`),
    ])
    const res = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,mimeType,size',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
        body: body as any,
      },
    )
    const j: any = await res.json().catch(() => null)
    if (res.ok && j?.id) return { id: j.id, name: j.name, mimeType: j.mimeType, size: Number(j.size) || undefined }
    lastError = j?.error?.message || `HTTP ${res.status}`
    console.error(`googleDrive.uploadToLibrary (delegate=${delegate}):`, lastError)
  }
  throw new Error(lastError)
}

/** Διαγράφει ανεβασμένο αρχείο — για καθάρισμα όταν αποτύχει η καταχώρηση. */
export async function trashFile(fileId: string): Promise<boolean> {
  const token = await getAccessToken(SCOPES.driveWrite)
  if (!token) return false
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?supportsAllDrives=true`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ trashed: true }),
  })
  return res.ok
}
