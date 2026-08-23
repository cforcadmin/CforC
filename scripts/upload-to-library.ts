/**
 * Ανεβάζει ένα αρχείο στον φάκελο της Ψηφιακής Βιβλιοθήκης.
 *
 * ΠΡΟΣΟΧΗ ΣΤΗΝ ΚΥΡΙΟΤΗΤΑ: ένας λογαριασμός υπηρεσίας ΔΕΝ έχει δικό του χώρο
 * αποθήκευσης στο Drive. Ό,τι ανεβάζει σκέτος ανήκει σε αυτόν και η Google το
 * απορρίπτει με «Service Accounts do not have storage quota». Γι' αυτό το
 * ανέβασμα γίνεται με domain-wide delegation ως it@: το αρχείο ανήκει σε
 * πραγματικό λογαριασμό του Workspace και μετράει στον δικό του χώρο.
 *
 * Τρέξιμο: npx tsx scripts/upload-to-library.ts <αρχείο> [folderId] [--replace]
 */
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { readFileSync, statSync } from 'fs'
import { basename, extname } from 'path'

const MIME: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc': 'application/msword',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xls': 'application/vnd.ms-excel',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
}

export async function uploadToDrive(opts: {
  token: string
  folderId: string
  name: string
  mimeType: string
  bytes: Buffer
  replaceFileId?: string
}): Promise<{ id: string; name: string; owner?: string }> {
  const { token, folderId, name, mimeType, bytes, replaceFileId } = opts
  const boundary = 'cforc' + bytes.length.toString(36)
  const meta = replaceFileId ? { name } : { name, parents: [folderId] }
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
    bytes,
    Buffer.from(`\r\n--${boundary}--`),
  ])
  const url = replaceFileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${replaceFileId}?uploadType=multipart&supportsAllDrives=true&fields=id,name,owners(emailAddress)`
    : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,owners(emailAddress)`
  const res = await fetch(url, {
    method: replaceFileId ? 'PATCH' : 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
    body: body as any,
  })
  const j: any = await res.json()
  if (!res.ok) throw new Error(`${res.status} ${j?.error?.message || JSON.stringify(j).slice(0, 200)}`)
  return { id: j.id, name: j.name, owner: j.owners?.[0]?.emailAddress }
}

async function main() {
  const [file, folder = '1MxO4KRX9M5ae1ggsRD8jQ5eP0kv4HPMI'] = process.argv.slice(2).filter(a => !a.startsWith('--'))
  const replace = process.argv.includes('--replace')
  if (!file) { console.error('Χρήση: npx tsx scripts/upload-to-library.ts <αρχείο> [folderId] [--replace]'); process.exit(1) }
  const { getAccessToken, SCOPES } = await import('../lib/googleAuth')

  const name = basename(file)
  const mimeType = MIME[extname(file).toLowerCase()] || 'application/octet-stream'
  const bytes = readFileSync(file)
  console.log(`${name}  ${Math.round(statSync(file).size / 1024)} KB  ${mimeType}`)

  // Δοκιμάζουμε πρώτα σκέτο, για να ΞΕΡΟΥΜΕ αν όντως χρειάζεται delegation.
  for (const mode of ['σκέτος λογαριασμός υπηρεσίας', 'με delegation ως it@'] as const) {
    const token = await getAccessToken(SCOPES.driveWrite, mode === 'με delegation ως it@')
    if (!token) { console.log(`  ${mode}: ✗ δεν πάρθηκε token`); continue }
    let replaceId: string | undefined
    if (replace) {
      const q = encodeURIComponent(`'${folder}' in parents and name='${name.replace(/'/g, "\\'")}' and trashed=false`)
      // includeItemsFromAllDrives είναι ΑΠΑΡΑΙΤΗΤΟ: χωρίς αυτό το Drive
      // επιστρέφει κενή λίστα για φάκελο που είναι απλώς μοιρασμένος μαζί μας,
      // και το --replace θα έφτιαχνε σιωπηλά δεύτερο αρχείο αντί να αντικαταστήσει.
      const l: any = await (await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)&supportsAllDrives=true&includeItemsFromAllDrives=true`,
        { headers: { Authorization: `Bearer ${token}` } })).json()
      replaceId = l.files?.[0]?.id
    }
    try {
      const r = await uploadToDrive({ token, folderId: folder, name, mimeType, bytes, replaceFileId: replaceId })
      console.log(`  ${mode}: ✓ ${replaceId ? 'αντικαταστάθηκε' : 'ανέβηκε'} id=${r.id} κάτοχος=${r.owner ?? '—'}`)
      return
    } catch (err: any) {
      console.log(`  ${mode}: ✗ ${err.message}`)
    }
  }
  process.exitCode = 1
}
if (process.argv[1]?.includes('upload-to-library')) main()
