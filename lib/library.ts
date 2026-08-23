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
const STOP = new Set(['the', 'a', 'an', 'of', 'for', 'and', 'to', 'in', 'on',
  'ο', 'η', 'το', 'οι', 'τα', 'του', 'της', 'των', 'στο', 'στη', 'στην', 'και', 'για'])

function tokens(key: string): Set<string> {
  return new Set(key.split(' ').filter(w => w.length > 2 && !STOP.has(w)))
}

/**
 * Ομοιότητα δύο τίτλων, 0–1 (Jaccard πάνω στις ουσιαστικές λέξεις).
 * Δεν είναι έξυπνο, είναι προβλέψιμο — και ο άνθρωπος αποφασίζει στο τέλος.
 */
export function titleSimilarity(a: string, b: string): number {
  const ka = titleKey(a), kb = titleKey(b)
  if (!ka || !kb) return 0
  if (ka === kb) return 1
  const ta = tokens(ka), tb = tokens(kb)
  if (!ta.size || !tb.size) return 0
  let shared = 0
  for (const t of ta) if (tb.has(t)) shared++
  return shared / (ta.size + tb.size - shared)
}

/** Πάνω από αυτό, το τεκμήριο πάει στον Βιβλιοθηκάριο αντί να δημοσιευτεί */
export const DUPLICATE_THRESHOLD = 0.6

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
