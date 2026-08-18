/**
 * Έλεγχος του φακέλου της Ψηφιακής Βιβλιοθήκης στο Drive.
 *
 * Απαντά σε δύο ερωτήματα που δεν φαίνονται με το μάτι:
 *  1. Βλέπει ο λογαριασμός υπηρεσίας τον φάκελο; (αλλιώς το site δεν σερβίρει τίποτα)
 *  2. Υπάρχει αρχείο με «Οποιοσδήποτε έχει τον σύνδεσμο»; Τα δικαιώματα του
 *     φακέλου ΔΕΝ ακυρώνουν τον διαμοιρασμό ενός αρχείου: ένα αρχείο μέσα σε
 *     ιδιωτικό φάκελο μπορεί να είναι δημόσιο σε όλο το διαδίκτυο.
 *
 * Τρέξιμο:  npx tsx scripts/check-library-folder.ts <folderId>
 */
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const FOLDER = process.argv[2] || process.env.GOOGLE_LIBRARY_FOLDER_ID || ''

async function main() {
  if (!FOLDER) { console.error('Λείπει το folderId'); process.exit(1) }
  const { getAccessToken, SCOPES } = await import('../lib/googleAuth')
  const token = await getAccessToken(SCOPES.drive)
  if (!token) { console.error('✗ Δεν πάρθηκε token — έλεγξε GOOGLE_SERVICE_ACCOUNT_JSON και ότι το Drive API είναι ενεργό'); process.exit(1) }
  const auth = { Authorization: `Bearer ${token}` }

  const r = await fetch(`https://www.googleapis.com/drive/v3/files/${FOLDER}`
    + '?fields=id,name,permissions(type,role,emailAddress)&supportsAllDrives=true', { headers: auth })
  const j: any = await r.json()
  if (!r.ok) { console.error('✗ Ο φάκελος δεν είναι προσβάσιμος:', r.status, j?.error?.message); process.exit(1) }

  console.log(`φάκελος: ${j.name}`)
  console.log('δικαιώματα:')
  for (const p of j.permissions || []) console.log(`   ${p.type} · ${p.role} · ${p.emailAddress || '—'}`)

  let files = 0, exposed = 0
  async function walk(id: string, depth = 0) {
    const q = encodeURIComponent(`'${id}' in parents and trashed=false`)
    const l = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}`
      + '&fields=files(id,name,mimeType,size,permissions(type,role,emailAddress))'
      + '&pageSize=200&supportsAllDrives=true&includeItemsFromAllDrives=true', { headers: auth })
    const lj: any = await l.json()
    for (const f of lj.files || []) {
      const isDir = f.mimeType === 'application/vnd.google-apps.folder'
      const pub = (f.permissions || []).some((p: any) => p.type === 'anyone')
      const size = f.size ? ` (${Math.round(Number(f.size) / 1024)} KB)` : ''
      if (!isDir) { files++; if (pub) exposed++ }
      console.log('   '.repeat(depth + 1) + (isDir ? '📁 ' : '📄 ') + f.name + size
        + (isDir ? '' : pub ? '   ⚠️  ΔΗΜΟΣΙΟ ΣΤΟ ΔΙΑΔΙΚΤΥΟ' : '   ✓'))
      if (isDir) await walk(f.id, depth + 1)
    }
  }
  console.log('\nπεριεχόμενα:')
  await walk(FOLDER)
  console.log(`\nσύνολο αρχείων ${files} · δημόσια ${exposed}`)
  if (exposed) console.log('Διόρθωση: δεξί κλικ στο αρχείο → Κοινή χρήση → Γενική πρόσβαση → «Περιορισμένη πρόσβαση».')
}
main()
