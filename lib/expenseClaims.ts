/**
 * Εξοδολόγια μελών — κοινό λεξιλόγιο και κανόνες, ίδιοι σε φόρμα και server.
 *
 * Η φόρμα στο /expenses και η διαδρομή /api/expenses/claim διαβάζουν ΤΑ ΙΔΙΑ
 * σταθερά από εδώ: ό,τι βλέπει το μέλος είναι ό,τι ελέγχει ο server. Ο
 * έλεγχος στον browser είναι ευγένεια — η απόφαση είναι πάντα του server.
 */

/** Αφορμές μετακίνησης. Οι τρεις τελευταίες θέλουν όνομα δράσης/έργου. */
export const EVENT_TYPES = [
  'Γενική Συνέλευση',
  'Midterm',
  'ΟΣ meetup',
  'Δράση εσωτερικού',
  'Δράση εξωτερικού',
  'Project',
  'Άλλο',
] as const
export type EventType = (typeof EVENT_TYPES)[number]

/** Πότε ζητάμε επιπλέον ελεύθερο κείμενο («ποια δράση;») */
export const EVENT_NEEDS_NAME: readonly EventType[] = [
  'Δράση εσωτερικού', 'Δράση εξωτερικού', 'Project', 'Άλλο',
]

export const EXPENSE_CATEGORIES = [
  'Ταξίδι',
  'Διαμονή',
  'Τοπικές μετακινήσεις',
  'Διατροφή',
  'Άλλο',
] as const
export type ExpenseLineCategory = (typeof EXPENSE_CATEGORIES)[number]

/**
 * Τράπεζες που λειτουργούν στην Ελλάδα, όπως τις γράφουν στα IBAN τους.
 * Η τελευταία επιλογή αφήνει το μέλος να γράψει ό,τι δεν είναι στη λίστα
 * (ξένη τράπεζα, νέος πάροχος) — δεν κλειδώνουμε κανέναν έξω.
 */
export const BANKS = [
  'Alpha Bank',
  'Εθνική Τράπεζα',
  'Eurobank',
  'Τράπεζα Πειραιώς',
  'Attica Bank',
  'Optima Bank',
  'Παγκρήτια Τράπεζα',
  'Συνεταιριστική Τράπεζα Ηπείρου',
  'Συνεταιριστική Τράπεζα Θεσσαλίας',
  'Συνεταιριστική Τράπεζα Καρδίτσας',
  'Συνεταιριστική Τράπεζα Χανίων',
  'Viva.com',
  'Revolut',
  'Wise',
  'N26',
] as const
export const BANK_OTHER = 'Άλλη τράπεζα'

export interface ReceiptTypeSpec {
  label: string
  /** Απαιτεί ΔΥΟ αρχεία: το παραστατικό πληρωμής ΚΑΙ την απόδειξη επιβίβασης */
  pair?: { first: string; second: string }
}

/**
 * Είδη παραστατικών ανά κατηγορία. Το αεροπορικό εισιτήριο θέλει δύο
 * αρχεία: η πληρωμή δείχνει το ποσό, η κάρτα επιβίβασης δείχνει ότι το
 * ταξίδι έγινε — χωρίς το δεύτερο δεν τεκμηριώνεται η δαπάνη.
 */
export const RECEIPT_TYPES: Record<ExpenseLineCategory, ReceiptTypeSpec[]> = {
  'Ταξίδι': [
    { label: 'Αεροπορικό εισιτήριο', pair: { first: 'απόδειξη πληρωμής', second: 'κάρτα επιβίβασης' } },
    { label: 'Ακτοπλοϊκό εισιτήριο' },
    { label: 'Εισιτήριο τρένου' },
    { label: 'Εισιτήριο ΚΤΕΛ / λεωφορείου' },
    { label: 'Καύσιμα' },
    { label: 'Διόδια' },
    { label: 'Ενοικίαση αυτοκινήτου' },
    { label: 'Άλλο παραστατικό ταξιδιού' },
  ],
  'Διαμονή': [
    { label: 'Ξενοδοχείο' },
    { label: 'Ενοικιαζόμενο κατάλυμα' },
    { label: 'Άλλο παραστατικό διαμονής' },
  ],
  'Τοπικές μετακινήσεις': [
    { label: 'Ταξί' },
    { label: 'Αστική συγκοινωνία (λεωφορείο/μετρό)' },
    { label: 'Στάθμευση' },
    { label: 'Άλλη τοπική μετακίνηση' },
  ],
  'Διατροφή': [
    { label: 'Εστιατόριο / καφέ' },
    { label: 'Σούπερ μάρκετ' },
    { label: 'Άλλο παραστατικό διατροφής' },
  ],
  'Άλλο': [
    { label: 'Εκτυπώσεις / αναλώσιμα' },
    { label: 'Εισιτήριο εκδήλωσης' },
    { label: 'Άλλο' },
  ],
}

export function receiptSpec(category: string, receiptType: string): ReceiptTypeSpec | null {
  const list = RECEIPT_TYPES[category as ExpenseLineCategory]
  return list?.find(r => r.label === receiptType) || null
}

/**
 * Τα μέσα μετακίνησης είναι ΤΑ ΙΔΙΑ με τα παραστατικά της κατηγορίας
 * «Ταξίδι»: ό,τι δηλώνεις ως μέσο, το ίδιο παραστατικό θα ανεβάσεις.
 */
export const TRAVEL_MODES = RECEIPT_TYPES['Ταξίδι'].map(r => r.label)

export interface TravelLeg {
  from: string
  to: string
  mode: string
  /** Η επιστροφή παράγεται από τα σκέλη μετάβασης όταν ζητηθεί */
  direction: 'outbound' | 'return'
}

/**
 * Η επιστροφή είναι η διαδρομή ανάποδα: τελευταίος σταθμός → πρώτος.
 * Με μία στάση (Α→Β) γίνεται Β→Α· με δύο (Α→Β→Γ) γίνεται Γ→Β→Α, ώστε να
 * τεκμηριώνεται και το ενδιάμεσο σκέλος.
 */
export function buildReturnLegs(outbound: TravelLeg[]): TravelLeg[] {
  return outbound
    .filter(l => l.from.trim() && l.to.trim())
    .slice()
    .reverse()
    .map(l => ({ from: l.to, to: l.from, mode: l.mode, direction: 'return' as const }))
}

export function allLegs(outbound: TravelLeg[], returnIncluded: boolean): TravelLeg[] {
  const out = outbound.filter(l => l.from.trim() && l.to.trim())
  return returnIncluded ? [...out, ...buildReturnLegs(out)] : out
}

export interface ClaimLineFile {
  /** Θέση στο ζεύγος: 1 = πληρωμή, 2 = κάρτα επιβίβασης */
  slot: 1 | 2
  name: string
  size: number
  /** id στη Media Library του Strapi (Μονάδα 1) */
  mediaId?: number
  url?: string
  /** id στο Drive (Μονάδα 2) */
  driveId?: string
}

export interface ClaimLine {
  category: string
  receiptType: string
  description: string
  /** Έναρξη του εξόδου — και η ημερομηνία που μπαίνει στο όνομα του αρχείου */
  date: string          // yyyy-MM-dd
  /** Λήξη· ίδια με την έναρξη σε έξοδα μιας ημέρας (π.χ. ταξί) */
  dateEnd?: string      // yyyy-MM-dd
  amount: number
  files: ClaimLineFile[]
}

/**
 * Σκέλη της διαδρομής που δεν έχουν ακόμη το έξοδό τους.
 *
 * Κάθε σκέλος δηλώνει το δικό του μέσο, οπότε μια μικτή διαδρομή —
 * αεροπλάνο πήγαινε, ΚΤΕΛ επιστροφή — παράγει δύο διαφορετικές υποδείξεις.
 * Μετράμε ανά μέσο: αν η διαδρομή έχει δύο αεροπορικά σκέλη και μία γραμμή
 * «Αεροπορικό εισιτήριο», λείπει ένα.
 *
 * Είναι ΥΠΟΔΕΙΞΗ, όχι κανόνας: μπορεί ένα εισιτήριο να καλύπτει και τις δύο
 * κατευθύνσεις, ή να πλήρωσε κάποιος άλλος (π.χ. συνεπιβάτης σε αυτοκίνητο).
 * Γι' αυτό επιστρέφουμε τι λείπει και αποφασίζει το μέλος.
 */
export function missingTravelLines(
  legs: TravelLeg[],
  lines: Array<{ receiptType: string }>,
): TravelLeg[] {
  const counted = new Map<string, number>()
  for (const l of lines) {
    const t = String(l.receiptType || '').trim()
    if (t) counted.set(t, (counted.get(t) || 0) + 1)
  }
  const missing: TravelLeg[] = []
  for (const leg of legs) {
    const mode = String(leg.mode || '').trim()
    if (!mode || !leg.from.trim() || !leg.to.trim()) continue
    const left = counted.get(mode) ?? 0
    if (left > 0) counted.set(mode, left - 1)
    else missing.push(leg)
  }
  return missing
}

export const MAX_LINES = 40
export const MAX_FILE_BYTES = 10 * 1024 * 1024
export const MAX_TOTAL_BYTES = 40 * 1024 * 1024
export const ALLOWED_FILE_TYPES = [
  'application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic',
]

/** Στρογγυλοποίηση σε λεπτά — ποτέ αθροίσματα με δεκαδικά σκουπίδια */
export const round2 = (n: number) => Math.round((Number(n) + Number.EPSILON) * 100) / 100

export function computeTotals(lines: ClaimLine[], advance: number) {
  const total = round2(lines.reduce((s, l) => s + (Number(l.amount) || 0), 0))
  const adv = round2(Math.max(0, Number(advance) || 0))
  return { total, advance: adv, payable: round2(total - adv) }
}

/** Ημέρες διεξαγωγής, με τις δύο άκρες να μετράνε (1η–3η = 3 ημέρες) */
export function eventDays(start: string, end: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) return null
  const a = Date.parse(`${start}T00:00:00Z`)
  const b = Date.parse(`${end}T00:00:00Z`)
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return null
  return Math.round((b - a) / 86400000) + 1
}

export interface ClaimInput {
  eventType: string
  eventName?: string
  eventStart: string
  eventEnd: string
  travelLegs?: TravelLeg[]
  returnIncluded?: boolean
  coTravellers?: string
  lines: ClaimLine[]
  advance: number
  bankName: string
  accountHolder: string
  iban: string
  signature?: string
  notes?: string
}

/** Ελληνικό IBAN: GR + 25 χαρακτήρες· δεχόμαστε και ξένα (15-34) */
export function normaliseIban(raw: string): string {
  return String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
}
export function ibanLooksValid(raw: string): boolean {
  const v = normaliseIban(raw)
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(v)) return false
  if (v.startsWith('GR') && v.length !== 27) return false
  // Έλεγχος mod-97 (ISO 13616) — πιάνει τα τυπογραφικά, όχι λάθος λογαριασμό
  const re = v.slice(4) + v.slice(0, 4)
  let rem = 0
  for (const ch of re) {
    const part = /\d/.test(ch) ? ch : String(ch.charCodeAt(0) - 55)
    for (const d of part) rem = (rem * 10 + Number(d)) % 97
  }
  return rem === 1
}

/** Ο server ΔΕΝ εμπιστεύεται τη φόρμα: ό,τι φτάνει εδώ ξαναελέγχεται */
export function validateClaim(input: ClaimInput): string | null {
  if (!EVENT_TYPES.includes(input.eventType as EventType)) return 'Διάλεξε αφορμή μετακίνησης'
  if (EVENT_NEEDS_NAME.includes(input.eventType as EventType) && !String(input.eventName || '').trim()) {
    return 'Συμπλήρωσε για ποια δράση ή project πρόκειται'
  }
  const days = eventDays(input.eventStart, input.eventEnd)
  if (days === null) return 'Οι ημερομηνίες διεξαγωγής δεν είναι έγκυρες'
  if (days > 60) return 'Οι ημερομηνίες διεξαγωγής μοιάζουν λάθος (πάνω από 60 ημέρες)'

  const legs = Array.isArray(input.travelLegs) ? input.travelLegs : []
  for (const [i, l] of legs.entries()) {
    const from = String(l?.from || '').trim()
    const to = String(l?.to || '').trim()
    if (!from && !to) continue
    if (!from || !to) return `Σκέλος ${i + 1}: συμπλήρωσε και τις δύο πόλεις`
    if (!String(l?.mode || '').trim()) return `Σκέλος ${i + 1}: διάλεξε μέσο μετακίνησης`
  }

  const lines = Array.isArray(input.lines) ? input.lines : []
  if (!lines.length) return 'Πρόσθεσε τουλάχιστον ένα έξοδο'
  if (lines.length > MAX_LINES) return `Το πολύ ${MAX_LINES} γραμμές εξόδων`
  for (const [i, l] of lines.entries()) {
    const n = i + 1
    if (!EXPENSE_CATEGORIES.includes(l.category as ExpenseLineCategory)) return `Γραμμή ${n}: διάλεξε κατηγορία`
    const spec = receiptSpec(l.category, l.receiptType)
    if (!spec) return `Γραμμή ${n}: διάλεξε είδος παραστατικού`
    if (!(Number(l.amount) > 0)) return `Γραμμή ${n}: το ποσό πρέπει να είναι μεγαλύτερο από 0`
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(l.date || ''))) return `Γραμμή ${n}: συμπλήρωσε ημερομηνία έναρξης`
    if (l.dateEnd) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(l.dateEnd))) return `Γραμμή ${n}: μη έγκυρη ημερομηνία ολοκλήρωσης`
      if (l.dateEnd < l.date) return `Γραμμή ${n}: η ολοκλήρωση δεν μπορεί να προηγείται της έναρξης`
    }
    const files = Array.isArray(l.files) ? l.files : []
    if (!files.some(f => f.slot === 1)) return `Γραμμή ${n}: επισύναψε το παραστατικό`
    if (spec.pair && !files.some(f => f.slot === 2)) {
      return `Γραμμή ${n} (${spec.label}): λείπει η ${spec.pair.second}`
    }
  }

  const { total, payable } = computeTotals(lines, input.advance)
  if (total <= 0) return 'Το σύνολο πρέπει να είναι μεγαλύτερο από 0'
  if (payable < 0) return 'Η προκαταβολή δεν μπορεί να ξεπερνά το σύνολο των εξόδων'
  if (payable === 0) return 'Το πληρωτέο είναι 0 — δεν χρειάζεται εξοδολόγιο'

  if (!String(input.accountHolder || '').trim()) return 'Συμπλήρωσε το όνομα δικαιούχου'
  if (!ibanLooksValid(input.iban)) return 'Το IBAN δεν είναι έγκυρο'
  return null
}

/** Ο αριθμός εξοδολογίου: ΕΞ-2026-014 */
export function formatClaimNumber(year: number, seq: number): string {
  return `ΕΞ-${year}-${String(seq).padStart(3, '0')}`
}

const clean = (s: string) =>
  String(s || '').replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim()

/**
 * Όνομα αρχείου παραστατικού — φτιαγμένο για να ξαναβρίσκεται:
 *   ΜΠΑΡΑΤΑ ΑΡΓΥΡΩ_Αεροπορικό εισιτήριο_22-12-2026_148,50_ΕΞ-2026-014_1of2-πληρωμή.pdf
 */
export function buildAttachmentName(opts: {
  memberName: string
  receiptType: string
  date: string
  amount: number
  claimNumber: string
  slot: 1 | 2
  pair?: { first: string; second: string }
  ext: string
}): string {
  const [y, m, d] = opts.date.split('-')
  const amount = opts.amount.toFixed(2).replace('.', ',')
  const part = opts.pair
    ? `_${opts.slot}of2-${clean(opts.slot === 1 ? opts.pair.first : opts.pair.second)}`
    : ''
  const ext = opts.ext.replace(/^\./, '').toLowerCase() || 'pdf'
  return `${clean(opts.memberName)}_${clean(opts.receiptType)}_${d}-${m}-${y}_${amount}_${opts.claimNumber}${part}.${ext}`
}

/**
 * Όνομα του ίδιου του εξοδολογίου, φτιαγμένο για τον parser των παραστατικών
 * (lib/invoiceFilename): το ΠΟΣΟ στο όνομα είναι το ΠΛΗΡΩΤΕΟ — αυτό που θα
 * βρεθεί στις χρεώσεις της τράπεζας στο τέλος του μήνα. Μόνο όταν υπάρχει
 * προκαταβολή γράφουμε «σύνολο→πληρωτέο», όπως ήδη κάνουν τα τιμολόγια.
 */
export function buildClaimPdfName(opts: {
  memberName: string
  claimNumber: string
  submittedDate: string   // yyyy-MM-dd
  total: number
  payable: number
}): string {
  const [y, m, d] = opts.submittedDate.split('-')
  const money = (n: number) => n.toFixed(2).replace('.', ',')
  const amount = opts.total - opts.payable > 0.004
    ? `${money(opts.total)}→${money(opts.payable)}`
    : money(opts.payable)
  return `ΕΞΟΔΟΛΟΓΙΟ ${clean(opts.memberName)}_${opts.claimNumber}_${d}-${m}-${y}_${amount}.pdf`
}
