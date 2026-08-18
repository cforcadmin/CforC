/**
 * Έλεγχος του φακέλου της Ψηφιακής Βιβλιοθήκης στο Drive.
 *
 * Απαντά σε δύο ερωτήματα που δεν φαίνονται με το μάτι:
 *  1. Βλέπει ο λογαριασμός υπηρεσίας τα αρχεία; (αλλιώς το site δεν σερβίρει τίποτα)
 *  2. Κατεβαίνει κάποιο αρχείο ΧΩΡΙΣ σύνδεση; Τα δικαιώματα του φακέλου δεν
 *     ακυρώνουν τον διαμοιρασμό ενός αρχείου: αρχείο μέσα σε ιδιωτικό φάκελο
 *     μπορεί να είναι δημόσιο σε όλο το διαδίκτυο.
 *
 * ΓΙΑΤΙ ΔΕΝ ΔΙΑΒΑΖΟΥΜΕ ΤΟ ΠΕΔΙΟ `permissions`: ο λογαριασμός υπηρεσίας είναι
 * απλός θεατής και το Drive του επιστρέφει `null` — όχι «καμία δημόσια άδεια»,
 * αλλά «δεν σου λέω». Έλεγχος που βασιζόταν εκεί θα έβγαζε ΚΑΘΕ αρχείο
 * ασφαλές, και τα δημόσια θα περνούσαν απαρατήρητα. Ρωτάμε λοιπόν το μόνο
 * πράγμα που μετράει: δοκιμάζουμε να το κατεβάσουμε σαν ανώνυμος επισκέπτης.
 *
 * Τρέξιμο:  npx tsx scripts/check-library-folder.ts <folderId>
 */
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const FOLDER = process.argv[2] || process.env.GOOGLE_LIBRARY_FOLDER_ID || ''

/** Κατεβαίνει το αρχείο χωρίς κανένα διαπιστευτήριο; */
async function isPubliclyDownloadable(id: string): Promise<boolean> {
  try {
    const r = await fetch(`https://drive.usercontent.google.com/download?id=${id}&export=download`, { redirect: 'follow' })
    if (!r.ok) return false
    const ct = r.headers.get('content-type') || ''
    // Η σελίδα σύνδεσης είναι HTML· το πραγματικό αρχείο δεν είναι.
    return !ct.includes('text/html')
  } catch { return false }
}

async function main() {
  if (!FOLDER) { console.error('Λείπει το folderId'); process.exit(1) }
  const { getAccessToken, SCOPES } = await import('../lib/googleAuth')
  const token = await getAccessToken(SCOPES.drive)
  if (!token) { console.error('✗ Δεν πάρθηκε token — έλεγξε GOOGLE_SERVICE_ACCOUNT_JSON και ότι το Drive API είναι ενεργό'); process.exit(1) }
  const auth = { Authorization: `Bearer ${token}` }

  const r = await fetch(`https://www.googleapis.com/drive/v3/files/${FOLDER}?fields=id,name&supportsAllDrives=true`, { headers: auth })
  const j: any = await r.json()
  if (!r.ok) { console.error('✗ Ο φάκελος δεν είναι προσβάσιμος:', r.status, j?.error?.message); process.exit(1) }
  console.log(`φάκελος: ${j.name}\n`)

  let files = 0, exposed = 0
  async function walk(id: string, depth = 0) {
    const q = encodeURIComponent(`'${id}' in parents and trashed=false`)
    const l = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}`
      + '&fields=files(id,name,mimeType,size)&pageSize=200&orderBy=folder,name'
      + '&supportsAllDrives=true&includeItemsFromAllDrives=true', { headers: auth })
    const lj: any = await l.json()
    for (const f of lj.files || []) {
      const pad = '   '.repeat(depth + 1)
      if (f.mimeType === 'application/vnd.google-apps.folder') {
        console.log(`${pad}📁 ${f.name}`)
        await walk(f.id, depth + 1)
        continue
      }
      files++
      const size = f.size ? ` (${Math.round(Number(f.size) / 1024)} KB)` : ''
      const pub = await isPubliclyDownloadable(f.id)
      if (pub) exposed++
      console.log(`${pad}📄 ${f.name}${size}   ${pub ? '⚠️  ΔΗΜΟΣΙΟ ΣΤΟ ΔΙΑΔΙΚΤΥΟ' : '✓ μόνο με πρόσβαση'}`)
    }
  }
  await walk(FOLDER)

  console.log(`\nαρχεία ${files} · δημόσια ${exposed}`)
  if (exposed) {
    console.log('Διόρθωση: δεξί κλικ στο αρχείο → Κοινή χρήση → Γενική πρόσβαση → «Περιορισμένη πρόσβαση».')
    process.exitCode = 1
  }
}
main()
