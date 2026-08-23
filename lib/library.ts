/**
 * Ανοιχτή Βιβλιοθήκη — κοινός κώδικας για site και OC.
 */

export interface LibraryItem {
  documentId: string
  title: string
  description: string | null
  year: number | null
  theme: string
  subthemes: string[]
  docType: string
  sourceUrl: string | null
  fileId: string | null
  fileName: string | null
  mimeType: string | null
  fileSize: number | null
  language: string | null
  state: 'published' | 'pending' | 'rejected'
  submittedBy: string | null
  submittedAt: string | null
}

/**
 * Κανονικοποίηση τίτλου για τον εντοπισμό διπλοεγγραφών.
 *
 * Πέφτουν: τόνοι, πεζά/κεφαλαία, σημεία στίξης, διπλά κενά, και τα
 * εισαγωγικά που αλλάζουν σιωπηλά όταν κάποιος γράφει σε Word. Έτσι το
 * «CREATIVE FLIP: Final Study – Towards…» και το «Creative Flip - final
 * study, towards…» δίνουν το ίδιο κλειδί.
 *
 * ΠΡΟΣΟΧΗ: δεν αγγίζουμε τα λατινικά που μοιάζουν με ελληνικά — δύο τίτλοι
 * που διαφέρουν μόνο σε αυτά ΠΡΕΠΕΙ να θεωρηθούν διπλοεγγραφή, όχι
 * διαφορετικά τεκμήρια. Γι' αυτό μεταφράζουμε τους λατινικούς σωσίες σε
 * ελληνικούς πριν συγκρίνουμε.
 */
const LOOKALIKE: Record<string, string> = {
  A: 'Α', B: 'Β', E: 'Ε', Z: 'Ζ', H: 'Η', I: 'Ι', K: 'Κ', M: 'Μ', N: 'Ν',
  O: 'Ο', P: 'Ρ', T: 'Τ', X: 'Χ', Y: 'Υ',
}

export function titleKey(raw: string): string {
  let s = String(raw || '').trim().toUpperCase()
  s = [...s].map(c => LOOKALIKE[c] ?? c).join('')
  s = s.normalize('NFD').replace(/[̀-́͂ͅ]/g, '').normalize('NFC')
  s = s.toLocaleLowerCase('el')
  s = s.replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
  return s
}

/** Λέξεις που δεν ξεχωρίζουν τεκμήρια και μόνο θόρυβο προσθέτουν */
const STOP = new Set([
  'the', 'a', 'an', 'of', 'for', 'and', 'to', 'in', 'on', 'at', 'by', 'with',
  'from', 'its', 'this', 'that', 'towards', 'more',
  'ο', 'η', 'το', 'οι', 'τα', 'του', 'της', 'των', 'τον', 'την', 'στο', 'στη',
  'στην', 'στον', 'στα', 'στις', 'στους', 'και', 'για', 'με', 'σε', 'από',
  'προς', 'ως', 'μια', 'ενα', 'έναν',
])

/** Οι ουσιαστικές λέξεις ενός τίτλου, κανονικοποιημένες */
export function titleTokens(raw: string): Set<string> {
  return new Set(titleKey(raw).split(' ').filter(w => w.length > 2 && !STOP.has(w)))
}

/**
 * Πόσες ουσιαστικές λέξεις μοιράζονται δύο τίτλοι.
 */
export function sharedWordCount(a: string, b: string): number {
  const ta = titleTokens(a), tb = titleTokens(b)
  let n = 0
  for (const t of ta) if (tb.has(t)) n++
  return n
}

/**
 * Ομοιότητα 0–1 (Jaccard). Δεν αποφασίζει πια — μπαίνει στο email ως
 * ένδειξη για τον Βιβλιοθηκάριο.
 */
export function titleSimilarity(a: string, b: string): number {
  const ka = titleKey(a), kb = titleKey(b)
  if (!ka || !kb) return 0
  if (ka === kb) return 1
  const ta = titleTokens(ka), tb = titleTokens(kb)
  if (!ta.size || !tb.size) return 0
  const shared = sharedWordCount(a, b)
  return shared / (ta.size + tb.size - shared)
}

/**
 * ΤΡΕΙΣ κοινές ουσιαστικές λέξεις αρκούν για να σημανθεί το τεκμήριο.
 *
 * Ο προηγούμενος κανόνας ζητούσε 60% επικάλυψη και ήταν πολύ χαλαρός: ένας
 * σύντομος τίτλος για το ίδιο έγγραφο («CREATIVE FLIP: Final Study») έβγαζε
 * 40% απέναντι στον πλήρη και περνούσε σαν νέο τεκμήριο — οι επιπλέον λέξεις
 * του μεγάλου τίτλου μετρούσαν ΕΝΑΝΤΙΟΝ της ομοιότητας.
 *
 * Ο νέος κανόνας δεν κοιτά αναλογίες, μόνο πλήθος. Σημαίνει περισσότερες
 * σημάνσεις — σκόπιμα: το κόστος μιας περιττής σήμανσης είναι ένα κλικ του
 * Βιβλιοθηκάριου, το κόστος μιας χαμένης διπλοεγγραφής είναι μόνιμο.
 */
export const SHARED_WORDS_TO_FLAG = 3

export function isLikelyDuplicate(a: string, b: string): boolean {
  const ka = titleKey(a), kb = titleKey(b)
  if (!ka || !kb) return false
  if (ka === kb) return true

  const ta = titleTokens(a), tb = titleTokens(b)
  if (!ta.size || !tb.size) return false

  const shared = sharedWordCount(a, b)
  if (shared >= SHARED_WORDS_TO_FLAG) return true

  // Τίτλος με λιγότερες από τρεις ουσιαστικές λέξεις δεν ΜΠΟΡΕΙ να φτάσει
  // το τρία. Εκεί σημαίνουμε αν ο ένας περιέχεται ολόκληρος στον άλλο:
  // «Πολιτιστικός Χάρτης» μέσα στο «Πολιτιστικός Χάρτης της Αττικής».
  const shorter = ta.size <= tb.size ? ta : tb
  return shorter.size > 0 && shared === shorter.size
}

export function shapeItem(r: any): LibraryItem {
  const subs = r.Subthemes
  return {
    documentId: r.documentId,
    title: r.Title,
    description: r.Description ?? null,
    year: r.Year ?? null,
    theme: r.Theme,
    subthemes: Array.isArray(subs) ? subs : (typeof subs === 'string' && subs ? [subs] : []),
    docType: r.DocType,
    sourceUrl: r.SourceUrl || null,
    fileId: r.DriveFileId || null,
    fileName: r.FileName || null,
    mimeType: r.MimeType || null,
    fileSize: r.FileSize ?? null,
    language: r.Language || null,
    state: r.State || 'published',
    submittedBy: r.SubmittedByName || r.SubmittedBy?.Name || null,
    submittedAt: r.createdAt ?? null,
  }
}

/** Σύντομη ετικέτα είδους: «Report & Analysis (Έκθεση…)» → «Έκθεση…» */
export function shortDocType(full: string): string {
  const m = String(full || '').match(/\(([^)]+)\)\s*$/)
  return m ? m[1] : String(full || '')
}
