/**
 * Καθρέφτισμα του καταλόγου στη «Λίστα περιεχομένων» του Drive.
 *
 * Η ομάδα εργασίας δουλεύει στο φύλλο και θέλει να βλέπει εκεί ό,τι μπαίνει
 * από την ιστοσελίδα. Το φύλλο γίνεται έτσι ΚΑΙ είσοδος (η ομάδα γράφει) ΚΑΙ
 * έξοδος (γράφουμε εμείς) — γι' αυτό κάθε γραμμή που γράφουμε φέρει τον
 * κωδικό του τεκμηρίου στη στήλη «Κωδικός». Χωρίς αυτόν, μια μελλοντική
 * μαζική εισαγωγή από το φύλλο θα ξαναδιάβαζε τις δικές μας γραμμές και θα
 * δημιουργούσε διπλότυπα από τον ίδιο τον μηχανισμό αποφυγής διπλοτύπων.
 *
 * ΚΑΝΕΝΑ σφάλμα εδώ δεν ρίχνει την καταχώρηση: το φύλλο είναι αντίγραφο,
 * η βάση είναι η αλήθεια.
 */
import { getAccessToken, SCOPES } from '@/lib/googleAuth'

const SHEET_ID = process.env.GOOGLE_LIBRARY_SHEET_ID || '1lyOpSQ-NUSoaLWeMg8yo5uwjLsfQJxo9XmyGLcPoAko'
const TAB = 'Καταγραφή'

/** Στήλες A→M, στη σειρά του φύλλου */
export interface SheetRow {
  documentId: string
  title: string
  description?: string | null
  year?: number | null
  theme: string
  subthemes: string[]
  docType: string
  sourceUrl?: string | null
  driveFileId?: string | null
  language?: string | null
  submittedBy?: string | null
}

const api = (path: string) => `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}${path}`
const rng = (a1: string) => encodeURIComponent(`${TAB}!${a1}`)

async function values(token: string, a1: string): Promise<string[][]> {
  const r = await fetch(api(`/values/${rng(a1)}`), { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
  if (!r.ok) throw new Error(`ανάγνωση ${r.status}`)
  return (await r.json())?.values || []
}

/**
 * Προσθέτει το τεκμήριο στο φύλλο. Επιστρέφει τη γραμμή, ή null αν
 * παραλείφθηκε (υπάρχει ήδη / δεν έγινε).
 */
export async function appendLibraryRow(item: SheetRow): Promise<number | null> {
  try {
    const token = await getAccessToken(SCOPES.sheetsWrite)
    if (!token) { console.error('librarySheet: δεν πάρθηκε token'); return null }

    // Υπάρχει ήδη; Ο κωδικός είναι στη στήλη M.
    const codes = await values(token, 'M2:M1000')
    if (codes.some(r => (r[0] || '').trim() === item.documentId)) return null

    // Πρώτη ελεύθερη γραμμή. Ο Α/Α στη στήλη A είναι προσυμπληρωμένος σε 300
    // γραμμές, οπότε δεν δείχνει αν η γραμμή είναι άδεια — κοιτάμε τον τίτλο.
    // Η γραμμή-σημείωση («↑ γραμμή-παράδειγμα…») δεν μετράει ως περιεχόμενο.
    const titles = await values(token, 'B2:B1000')
    let lastUsed = 0
    titles.forEach((r, i) => {
      const v = (r[0] || '').trim()
      if (v && !v.startsWith('↑')) lastUsed = i + 2
    })
    const row = lastUsed ? lastUsed + 1 : 2

    const driveUrl = item.driveFileId ? `https://drive.google.com/file/d/${item.driveFileId}/view` : ''
    const today = new Date().toISOString().slice(0, 10)
    // ΔΕΝ γράφουμε τη στήλη A: το φύλλο έχει δικό του προσυμπληρωμένο Α/Α σε
    // 300 γραμμές. Γράφοντας κι εμείς, εμφανίστηκαν δύο γραμμές με τον ίδιο
    // αριθμό. Η αρίθμηση ανήκει στο φύλλο, όχι σε εμάς.
    const line = [
      item.title,                           // B
      item.description || '',               // C
      item.year ?? '',                      // D
      item.theme,                           // E
      item.subthemes.join(', '),            // F
      item.docType,                         // G
      item.sourceUrl || '',                 // H
      driveUrl,                             // I
      item.language || '',                  // J
      item.submittedBy || '',               // K
      today,                                // L
      item.documentId,                      // M
    ]

    const w = await fetch(
      api(`/values/${rng(`B${row}:M${row}`)}?valueInputOption=USER_ENTERED`),
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [line] }),
      },
    )
    if (!w.ok) throw new Error(`εγγραφή ${w.status} ${(await w.text()).slice(0, 160)}`)
    return row
  } catch (err) {
    // Το φύλλο είναι αντίγραφο· η καταχώρηση δεν ακυρώνεται επειδή απέτυχε.
    console.error('librarySheet: αποτυχία —', err)
    return null
  }
}

/** Βρίσκει τη γραμμή ενός τεκμηρίου από τη στήλη «Κωδικός» (M). */
async function findRowByCode(token: string, documentId: string): Promise<number | null> {
  const codes = await values(token, 'M2:M1000')
  for (let i = 0; i < codes.length; i++) {
    if ((codes[i]?.[0] || '').trim() === documentId) return i + 2
  }
  return null
}

/** Ενημερώνει τη γραμμή του τεκμηρίου στο φύλλο· αν δεν υπάρχει, την προσθέτει. */
export async function updateLibraryRow(item: SheetRow): Promise<boolean> {
  try {
    const token = await getAccessToken(SCOPES.sheetsWrite)
    if (!token) return false
    const row = await findRowByCode(token, item.documentId)
    if (row === null) return (await appendLibraryRow(item)) !== null

    const driveUrl = item.driveFileId ? `https://drive.google.com/file/d/${item.driveFileId}/view` : ''
    const today = new Date().toISOString().slice(0, 10)
    const line = [
      item.title, item.description || '', item.year ?? '',
      item.theme, item.subthemes.join(', '), item.docType,
      item.sourceUrl || '', driveUrl, item.language || '',
      item.submittedBy || '', today, item.documentId,
    ]
    const w = await fetch(api(`/values/${rng(`B${row}:M${row}`)}?valueInputOption=USER_ENTERED`), {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [line] }),
    })
    return w.ok
  } catch (err) {
    console.error('librarySheet.update:', err)
    return false
  }
}

/** Καθαρίζει τη γραμμή διαγραμμένου τεκμηρίου (B:M — το Α/Α μένει, είναι του φύλλου). */
export async function clearLibraryRow(documentId: string): Promise<boolean> {
  try {
    const token = await getAccessToken(SCOPES.sheetsWrite)
    if (!token) return false
    const row = await findRowByCode(token, documentId)
    if (row === null) return true
    const w = await fetch(api(`/values/${rng(`B${row}:M${row}`)}:clear`), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: '{}',
    })
    return w.ok
  } catch (err) {
    console.error('librarySheet.clear:', err)
    return false
  }
}
