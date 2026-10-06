/**
 * Αιτήματα από τον ιστότοπο — η λογική τους, χωρίς δίκτυο.
 *
 * Ως σήμερα το feedback widget έστελνε ΜΟΝΟ email στο it@: μια εκκρεμότητα
 * που ζούσε σε γραμματοκιβώτιο, χωρίς κατάσταση και χωρίς τρόπο να κλείσει.
 * Εδώ ορίζονται οι καταστάσεις και οι ΜΕΤΑΒΑΣΕΙΣ τους, ώστε η διαδρομή και η
 * οθόνη να κρίνουν τα ΙΔΙΑ.
 */

export type RequestStatus = 'not-started' | 'in-progress' | 'completed'

export const REQUEST_STATUSES: RequestStatus[] = ['not-started', 'in-progress', 'completed']

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  'not-started': 'Δεν ξεκίνησε',
  'in-progress': 'Σε εξέλιξη',
  'completed': 'Ολοκληρώθηκε',
}

export const isRequestStatus = (v: unknown): v is RequestStatus =>
  typeof v === 'string' && (REQUEST_STATUSES as string[]).includes(v)

/**
 * ΜΟΝΟ ό,τι ΟΛΟΚΛΗΡΩΘΗΚΕ αρχειοθετείται.
 *
 * Το αρχείο σημαίνει «τελείωσε», όχι «δεν θέλω να το βλέπω». Αν αρχειοθετούσε
 * κανείς κάτι μισοτελειωμένο, θα εξαφανιζόταν από τη λίστα χωρίς να έχει γίνει
 * — που είναι ακριβώς ο τρόπος να χαθεί ένα αίτημα.
 */
export const canArchive = (status: unknown): boolean => status === 'completed'

/**
 * Στέλνεται ειδοποίηση ολοκλήρωσης;
 *
 * ΤΡΕΙΣ προϋποθέσεις, και οι τρεις απαραίτητες:
 *   1. μόλις ΤΩΡΑ έγινε «ολοκληρώθηκε» — όχι σε κάθε αποθήκευση μετά
 *   2. υπάρχει διεύθυνση· ο επισκέπτης μπορεί να έγραψε ανώνυμα, και τότε
 *      ΔΕΝ συμβαίνει τίποτα (ρητή οδηγία, 6/10/2026)
 *   3. δεν έχει ξανασταλεί — το NotifiedAt είναι η σφραγίδα που εμποδίζει
 *      δεύτερο γράμμα αν κάποιος πάει «σε εξέλιξη» και πίσω σε «ολοκληρώθηκε»
 */
export function shouldNotify(
  previous: { Status?: unknown; NotifiedAt?: unknown; SenderEmail?: unknown },
  nextStatus: unknown,
): boolean {
  if (nextStatus !== 'completed') return false
  if (previous.Status === 'completed') return false
  if (previous.NotifiedAt) return false
  return isValidEmail(previous.SenderEmail)
}

export const isValidEmail = (v: unknown): boolean =>
  /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(v ?? '').trim())

/** Τα πεδία που γράφονται όταν αλλάζει κατάσταση — ώρες μαζί με την κατάσταση */
export function statusPatch(next: RequestStatus, now: string = new Date().toISOString()) {
  return {
    Status: next,
    // Η ώρα ολοκλήρωσης μπαίνει ΜΟΝΟ όταν ολοκληρώνεται, και καθαρίζεται αν
    // κάποιος το ξαναανοίξει — αλλιώς το αρχείο θα έλεγε ότι έκλεισε κάτι
    // που ξαναδουλεύεται.
    CompletedAt: next === 'completed' ? now : null,
    // Ό,τι ξαναανοίγει, βγαίνει από το αρχείο: δεν υπάρχει «αρχειοθετημένο
    // και σε εξέλιξη» — θα ήταν κρυμμένη δουλειά.
    ...(next !== 'completed' && { Archived: false, ArchivedAt: null }),
  }
}

/** Σύντομη περιγραφή για λίστα — το πλήρες κείμενο ανοίγει με κλικ */
export function requestPreview(message: unknown, max = 120): string {
  const flat = String(message ?? '').replace(/\s*\n+\s*/g, ' ').trim()
  return flat.length <= max ? flat : `${flat.slice(0, max - 1).trimEnd()}…`
}

/* ─────────────── ΕΙΔΟΣ ΚΑΙ ΚΑΤΗΓΟΡΙΑ ─────────────── */

/**
 * ΔΥΟ ΑΞΟΝΕΣ, ΓΙΑΤΙ ΑΠΑΝΤΟΥΝ ΣΕ ΔΥΟ ΔΙΑΦΟΡΕΤΙΚΕΣ ΕΡΩΤΗΣΕΙΣ.
 *
 *   ΕΙΔΟΣ      — τι ζητά ο άνθρωπος· ορίζει την ΕΠΕΙΓΟΥΣΑ. Ένα σφάλμα
 *                σταματά κάποιον τώρα· μια πρόταση περιμένει.
 *   ΚΑΤΗΓΟΡΙΑ  — πού αφορά· ορίζει ΠΟΙΟΣ το κοιτάζει.
 *
 * Ένας άξονας θα ανάγκαζε να διαλέξει κανείς ανάμεσα στα δύο, και η λίστα θα
 * γινόταν «Σφάλμα στο OC», «Πρόταση για το OC», … — γινόμενο αντί για άθροισμα.
 */
export type RequestKind = 'bug' | 'suggestion' | 'question'

export const REQUEST_KINDS: RequestKind[] = ['bug', 'suggestion', 'question']

export const REQUEST_KIND_LABELS: Record<RequestKind, string> = {
  bug: 'Σφάλμα',
  suggestion: 'Πρόταση',
  question: 'Ερώτηση',
}

export type RequestCategory =
  | 'oc' | 'site' | 'profile' | 'events' | 'email' | 'finance' | 'other'

export const REQUEST_CATEGORIES: RequestCategory[] =
  ['oc', 'site', 'profile', 'events', 'email', 'finance', 'other']

export const REQUEST_CATEGORY_LABELS: Record<RequestCategory, string> = {
  oc: 'OC',
  site: 'Ιστότοπος',
  profile: 'Προφίλ / Ο χώρος μου',
  events: 'Δράσεις & δηλώσεις',
  email: 'Email / Newsletter',
  finance: 'Οικονομικά',
  other: 'Άλλο',
}

export const isRequestKind = (v: unknown): v is RequestKind =>
  typeof v === 'string' && (REQUEST_KINDS as string[]).includes(v)

export const isRequestCategory = (v: unknown): v is RequestCategory =>
  typeof v === 'string' && (REQUEST_CATEGORIES as string[]).includes(v)

/**
 * Η ΚΑΤΗΓΟΡΙΑ ΜΑΝΤΕΥΕΤΑΙ ΑΠΟ ΤΗ ΣΕΛΙΔΑ — και μένει επεξεργάσιμη.
 *
 * Ο άνθρωπος που αναφέρει πρόβλημα δεν είναι υποχρεωμένος να ταξινομήσει το
 * σύστημά μας. Ξέρουμε ήδη ΠΟΥ βρισκόταν· η προεπιλογή βγαίνει από εκεί και
 * είναι σωστή τις περισσότερες φορές. Αν δεν είναι, την αλλάζει με ένα κλικ.
 */
export function guessCategory(pathOrUrl: unknown): RequestCategory {
  let path = String(pathOrUrl ?? '')
  try { if (/^https?:\/\//i.test(path)) path = new URL(path).pathname } catch { /* ό,τι δόθηκε */ }
  path = path.toLowerCase()
  if (path.startsWith('/oc')) return 'oc'
  if (path.startsWith('/profile') || path.startsWith('/members')) return 'profile'
  if (path.startsWith('/events') || path.startsWith('/expenses')) return 'events'
  if (path.startsWith('/newsletter') || path.startsWith('/subscribe')) return 'email'
  if (path.startsWith('/apply') || path.startsWith('/payment')) return 'finance'
  return 'site'
}
