/**
 * Εργάσιμες ημέρες με ελληνικές αργίες τραπεζών.
 *
 * ΓΙΑΤΙ ΥΠΑΡΧΕΙ: ο/η Ταμίας βλέπει μια δήλωση «πλήρωσα» και δεν βρίσκει την
 * κατάθεση στον λογαριασμό. Αν πατήσει «Αποτυχία» πολύ νωρίς, στέλνει σε
 * μέλος που ΟΝΤΩΣ πλήρωσε ένα γράμμα που λέει ότι δεν πλήρωσε.
 *
 * Παρατηρημένο στην πράξη: υπενθύμιση Πέμπτη βράδυ, τα χρήματα φάνηκαν στην
 * τράπεζα Τρίτη πρωί. Πέμπτη βράδυ → Παρασκευή, Δευτέρα, Τρίτη = τρεις
 * εργάσιμες. Αυτό είναι το ΜΕΓΙΣΤΟ που περιμένουμε, άρα και το όριο.
 *
 * Οι αργίες είναι ΤΡΑΠΕΖΙΚΕΣ: η διατραπεζική εκκαθάριση δεν τρέχει τότε.
 * Όλα σε ώρα Αθήνας — ο server τρέχει σε UTC και μια πληρωμή στις 23:30
 * ανήκει στην ελληνική μέρα της, όχι στην επόμενη.
 */

/** Πόσες πλήρεις εργάσιμες πρέπει να περάσουν πριν επιτραπεί «Αποτυχία» */
export const REJECT_AFTER_BUSINESS_DAYS = 3

/** «yyyy-mm-dd» σε ώρα Αθήνας */
export function athensDay(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Athens', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d)
}

/**
 * Ορθόδοξο Πάσχα (Μεϊγιέ, ιουλιανό) μεταφερμένο στο γρηγοριανό ημερολόγιο.
 * Ισχύει για 1900–2099, όπου η διαφορά των ημερολογίων είναι 13 ημέρες.
 */
export function orthodoxEaster(year: number): Date {
  const a = year % 4
  const b = year % 7
  const c = year % 19
  const d = (19 * c + 15) % 30
  const e = (2 * a + 4 * b - d + 34) % 7
  const month = Math.floor((d + e + 114) / 31)   // 3 = Μάρτιος, 4 = Απρίλιος
  const day = ((d + e + 114) % 31) + 1
  // Ιουλιανή ημερομηνία → γρηγοριανή: +13 ημέρες
  return new Date(Date.UTC(year, month - 1, day + 13))
}

const iso = (d: Date) => d.toISOString().slice(0, 10)
const shift = (d: Date, days: number) => new Date(d.getTime() + days * 86400000)

/** Οι αργίες τραπεζών μιας χρονιάς, ως «yyyy-mm-dd» */
export function greekBankHolidays(year: number): Set<string> {
  const easter = orthodoxEaster(year)
  const fixed = [
    [1, 1],   // Πρωτοχρονιά
    [1, 6],   // Θεοφάνεια
    [3, 25],  // Ευαγγελισμός / Εθνική εορτή
    [5, 1],   // Εργατική Πρωτομαγιά
    [8, 15],  // Κοίμηση της Θεοτόκου
    [10, 28], // Επέτειος του «Όχι»
    [12, 25], // Χριστούγεννα
    [12, 26], // Σύναξη της Θεοτόκου
  ]
  const out = new Set(fixed.map(([m, d]) => iso(new Date(Date.UTC(year, m - 1, d)))))
  // Κινητές: Καθαρά Δευτέρα, Μ. Παρασκευή, Δευτέρα του Πάσχα, Αγίου Πνεύματος
  for (const off of [-48, -2, 1, 50]) out.add(iso(shift(easter, off)))
  return out
}

/** Σαββατοκύριακο ή αργία; Η ημέρα κρίνεται σε ώρα Αθήνας. */
export function isBusinessDay(d: Date): boolean {
  const day = athensDay(d)
  const [y, m, dd] = day.split('-').map(Number)
  // Η ημέρα της εβδομάδας από την ΗΜΕΡΟΛΟΓΙΑΚΗ ημέρα Αθήνας, όχι από το UTC
  const dow = new Date(Date.UTC(y!, m! - 1, dd!)).getUTCDay()
  if (dow === 0 || dow === 6) return false
  return !greekBankHolidays(y!).has(day)
}

/**
 * Πόσες ΠΛΗΡΕΙΣ εργάσιμες πέρασαν από τη δήλωση μέχρι τώρα.
 *
 * «Πλήρης» σημαίνει ότι η ημέρα τελείωσε: η ίδια η ημέρα της δήλωσης δεν
 * μετράει, ούτε η σημερινή. Έτσι μια δήλωση Πέμπτη βράδυ μετράει Παρασκευή
 * και Δευτέρα ως πλήρεις, και γίνεται 3 μόλις τελειώσει η Τρίτη — δηλαδή
 * την Τετάρτη. Αυστηρότερο κατά μία ημέρα από το «Τρίτη πρωί», σκόπιμα:
 * το λάθος προς τα εκεί στοιχίζει μια μέρα αναμονή, το αντίθετο στοιχίζει
 * ένα άδικο γράμμα σε μέλος που πλήρωσε.
 */
export function fullBusinessDaysSince(claimedAt: Date, now: Date = new Date()): number {
  const start = athensDay(claimedAt)
  const today = athensDay(now)
  if (start >= today) return 0
  let count = 0
  const cursor = new Date(`${start}T12:00:00Z`)
  for (let i = 0; i < 400; i++) {
    cursor.setUTCDate(cursor.getUTCDate() + 1)
    const day = athensDay(cursor)
    if (day >= today) break        // η σημερινή δεν είναι πλήρης
    if (isBusinessDay(cursor)) count++
  }
  return count
}

export interface RejectGate {
  allowed: boolean
  daysPassed: number
  /** Πόσες εργάσιμες λείπουν ακόμη */
  remaining: number
  /** Έτοιμο μήνυμα για την οθόνη και για το API */
  message: string
}

/**
 * Επιτρέπεται να σημειωθεί «Αποτυχία πληρωμής»;
 *
 * Χωρίς ημερομηνία δήλωσης ΔΕΝ μπλοκάρουμε: δεν ξέρουμε από πότε να
 * μετρήσουμε, και μια άρνηση εδώ θα κλείδωνε μόνιμα παλιές εγγραφές.
 */
export function canRejectPayment(
  claimedAt: string | Date | null | undefined,
  now: Date = new Date(),
): RejectGate {
  const d = claimedAt instanceof Date ? claimedAt : new Date(String(claimedAt || ''))
  if (!claimedAt || Number.isNaN(d.getTime())) {
    return { allowed: true, daysPassed: 0, remaining: 0, message: '' }
  }
  const daysPassed = fullBusinessDaysSince(d, now)
  const remaining = Math.max(0, REJECT_AFTER_BUSINESS_DAYS - daysPassed)
  if (remaining === 0) return { allowed: true, daysPassed, remaining: 0, message: '' }
  const declared = d.toLocaleDateString('el-GR', { day: 'numeric', month: 'long', timeZone: 'Europe/Athens' })
  return {
    allowed: false,
    daysPassed,
    remaining,
    message: `Η δήλωση έγινε στις ${declared}. Έχουν περάσει ${daysPassed} από τις `
      + `${REJECT_AFTER_BUSINESS_DAYS} εργάσιμες που χρειάζεται η τράπεζα — περίμενε ακόμη `
      + `${remaining} ${remaining === 1 ? 'εργάσιμη' : 'εργάσιμες'} πριν σημειώσεις αποτυχία.`,
  }
}
