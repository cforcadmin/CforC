/**
 * Alpha Bank statement intake — Φάση Β των Οικονομικών.
 *
 * Ο/η Financer επικολλά ΔΥΟ μπλοκ κειμένου από το myAlpha Web:
 *  1. «Κινήσεις» — όλες οι κινήσεις (ποσά, ημερομηνίες, Π/Χ, αρ. συναλλαγής)
 *  2. «Εισερχόμενες εντολές» — διατραπεζικές πιστώσεις ΜΕ όνομα εντολέα
 *
 * Το join γίνεται στον Αρ. Συναλλαγής (μετρημένο σε πραγματικά δεδομένα:
 * ταυτίζεται ανάμεσα στις δύο όψεις). Παγίδες που αντιμετωπίζονται εδώ:
 *  - Κινήσεις: ημερομηνίες DD/MM/YYYY — Εισερχόμενες: MM/DD/YYYY (!)
 *  - Πεδία τυλιγμένα σε ="..." (Excel-style quoting του export)
 *  - Ποσά «1.089,92» / «EUR 10.100,00» (τελεία χιλιάδων, κόμμα δεκαδικών)
 *  - Homoglyphs: ελληνικά κεφαλαία στη θέση λατινικών και αντίστροφα
 *    («SΤRΑΡΙ», «ΖΟΟΜ.CΟΜ») — κανονικοποίηση πριν από κάθε σύγκριση
 *  - Ονόματα ΕΘΝΙΚΗΣ σε στήλες με πολλαπλά κενά → ένα όνομα
 *  - Έλεγχος πληρότητας: το άθροισμα κινήσεων πρέπει να συμφωνεί με τη
 *    διαφορά υπολοίπων — κομμένη επικόλληση απορρίπτεται με μήνυμα
 */

export interface StatementMovement {
  /** Α/Α όπως στο export (φθίνουσα χρονολογικά λίστα) */
  index: number
  /** yyyy-MM-dd */
  date: string
  /** yyyy-MM-dd — «Τοκισμός από» (ημερομηνία αξίας), αν υπάρχει */
  valueDate: string | null
  /** Αιτιολογία, homoglyph-normalized */
  reason: string
  branch: string | null
  txnId: string
  amount: number
  direction: 'credit' | 'debit'
}

export interface KiniseisParse {
  movements: StatementMovement[]
  openingBalance: number | null
  closingBalance: number | null
  /** closing − opening (όταν υπάρχουν και τα δύο υπόλοιπα) */
  balanceDelta: number | null
  /** Σ(πιστώσεις) − Σ(χρεώσεις) */
  movementsDelta: number
  /** true/false όταν μπορεί να ελεγχθεί, null όταν λείπουν υπόλοιπα */
  balanced: boolean | null
  warnings: string[]
}

export interface IncomingOrder {
  /** yyyy-MM-dd */
  date: string
  payerName: string
  payerBank: string
  amount: number
  txnId: string
}

export interface IncomingParse {
  orders: IncomingOrder[]
  warnings: string[]
}

export type CreditKind = 'registration' | 'subscription' | 'grant-like' | 'unknown'

export interface JoinedCredit extends StatementMovement {
  payerName: string | null
  payerBank: string | null
  /** Χρέωση ΕΞΟΔΑ ΕΝΤΟΛΗΣ με ίδιο αρ. συναλλαγής (το 4€ του «όχι-OUR») */
  fee: number | null
  kind: CreditKind
}

export interface JoinResult {
  credits: JoinedCredit[]
  /** Χρεώσεις εκτός των fees που κόλλησαν σε πιστώσεις */
  debits: StatementMovement[]
  warnings: string[]
}

// ---------------------------------------------------------------- homoglyphs

const GREEK_TO_LATIN: Record<string, string> = {
  Α: 'A', Β: 'B', Ε: 'E', Ζ: 'Z', Η: 'H', Ι: 'I', Κ: 'K', Μ: 'M',
  Ν: 'N', Ο: 'O', Ρ: 'P', Τ: 'T', Υ: 'Y', Χ: 'X', ο: 'o', ν: 'v',
}
const LATIN_TO_GREEK: Record<string, string> = {
  A: 'Α', B: 'Β', E: 'Ε', Z: 'Ζ', H: 'Η', I: 'Ι', K: 'Κ', M: 'Μ',
  N: 'Ν', O: 'Ο', P: 'Ρ', T: 'Τ', Y: 'Υ', X: 'Χ',
}
// Γράμματα που υπάρχουν ΜΟΝΟ στο ένα αλφάβητο — κρίνουν την κατεύθυνση
const LATIN_ONLY = /[CDFGJLQRSUVWcdfgjlqrsuvw]/
const GREEK_ONLY = /[ΓΔΘΛΞΠΣΦΨΩάέήίόύώα-ω]/

/**
 * Κανονικοποίηση homoglyphs ανά λέξη: λέξη με αδιαμφισβήτητα λατινικά
 * γράμματα → όλα λατινικά· με αδιαμφισβήτητα ελληνικά → όλα ελληνικά·
 * αμφίσημη → λατινικά (τα δεδομένα της τράπεζας είναι κυρίως greeklish).
 */
export function normalizeHomoglyphs(s: string): string {
  return s.split(/(\s+)/).map(token => {
    if (/^\s+$/.test(token) || token === '') return token
    const hasLatin = LATIN_ONLY.test(token)
    const hasGreek = GREEK_ONLY.test(token)
    if (hasGreek && !hasLatin) {
      return token.split('').map(c => LATIN_TO_GREEK[c] || c).join('')
    }
    // λατινική ή αμφίσημη λέξη → λατινικά
    return token.split('').map(c => GREEK_TO_LATIN[c] || c).join('')
  }).join('')
}

// ---------------------------------------------------------------- helpers

/** «="202607300994585428"» ή «"..."» → καθαρή τιμή */
function unwrap(field: string): string {
  return field.trim().replace(/^="?/, '').replace(/"$/, '').trim()
}

/** «1.089,92» / «EUR 10.100,00» / «15,99» → αριθμός */
export function parseAmount(s: string): number | null {
  const t = s.replace(/EUR/i, '').replace(/€/g, '').replace(/\s/g, '')
  if (!/\d/.test(t)) return null
  const n = parseFloat(t.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function pad2(n: number): string { return String(n).padStart(2, '0') }

/** DD/MM/YYYY (Κινήσεις) → yyyy-MM-dd */
function parseDateDMY(s: string): string | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s.trim())
  if (!m) return null
  const [, d, mo, y] = m
  if (+mo > 12 || +d > 31) return null
  return `${y}-${pad2(+mo)}-${pad2(+d)}`
}

/** MM/DD/YYYY (Εισερχόμενες — αμερικάνικο format του export) → yyyy-MM-dd */
function parseDateMDY(s: string, warnings: string[]): string | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s.trim())
  if (!m) return null
  let [, first, second, y] = m
  if (+first > 12 && +second <= 12) {
    // δεν είναι MM/DD — μοιάζει DD/MM· δέξου το με προειδοποίηση
    warnings.push(`Ημερομηνία «${s.trim()}» δεν είναι MM/DD — διαβάστηκε ως DD/MM`)
    ;[first, second] = [second, first]
  }
  if (+first > 12 || +second > 31) return null
  return `${y}-${pad2(+first)}-${pad2(+second)}`
}

// ---------------------------------------------------------------- Κινήσεις

export function parseKiniseis(text: string): KiniseisParse {
  const warnings: string[] = []
  const movements: StatementMovement[] = []
  let openingBalance: number | null = null
  let closingBalance: number | null = null

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue
    if (/Νέο\s+Μ[ιε]κτό\s+Υπόλοιπο/i.test(line)) {
      closingBalance = parseAmount(line.split(';')[1] || '')
      continue
    }
    if (/Προηγούμενο\s+Μ[ιε]κτό\s+Υπόλοιπο/i.test(line)) {
      openingBalance = parseAmount(line.split(';')[1] || '')
      continue
    }
    // Γραμμή κίνησης: Α/Α;Ημ/νία;Αιτιολογία;Κατάστημα;Τοκισμός;Αρ.συν.;Ποσό;Πρόσημο;
    const parts = line.split(';')
    if (parts.length < 8 || !/^\d+$/.test(parts[0].trim())) continue
    const date = parseDateDMY(parts[1])
    if (!date) { warnings.push(`Γραμμή ${parts[0]}: μη αναγνώσιμη ημερομηνία «${parts[1]}»`); continue }
    const amount = parseAmount(parts[6])
    const sign = unwrap(parts[7]).toUpperCase()
    const direction = sign === 'Π' ? 'credit' as const : sign === 'Χ' || sign === 'X' ? 'debit' as const : null
    if (amount === null || direction === null) {
      warnings.push(`Γραμμή ${parts[0]}: μη αναγνώσιμο ποσό/πρόσημο`)
      continue
    }
    movements.push({
      index: parseInt(parts[0], 10),
      date,
      valueDate: parseDateDMY(parts[4]) || null,
      reason: normalizeHomoglyphs(unwrap(parts[2])),
      branch: unwrap(parts[3]) || null,
      txnId: unwrap(parts[5]),
      amount,
      direction,
    })
  }

  const movementsDelta = Math.round(movements.reduce(
    (sum, m) => sum + (m.direction === 'credit' ? m.amount : -m.amount), 0) * 100) / 100
  const balanceDelta = openingBalance !== null && closingBalance !== null
    ? Math.round((closingBalance - openingBalance) * 100) / 100
    : null
  const balanced = balanceDelta === null ? null : Math.abs(balanceDelta - movementsDelta) < 0.005
  if (balanced === false) {
    warnings.push(
      `Οι κινήσεις δεν συμφωνούν με τα υπόλοιπα (διαφορά υπολοίπων ${balanceDelta}, ` +
      `άθροισμα κινήσεων ${movementsDelta}) — μάλλον η επικόλληση είναι ελλιπής`)
  }
  if (movements.length === 0) warnings.push('Δεν βρέθηκε καμία κίνηση στο κείμενο')

  return { movements, openingBalance, closingBalance, balanceDelta, movementsDelta, balanced, warnings }
}

// ---------------------------------------------------------------- Εισερχόμενες

export function parseIncoming(text: string): IncomingParse {
  const warnings: string[] = []
  const orders: IncomingOrder[] = []

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue
    // Α/Α;Ημ/νία;Τράπεζα οφειλέτη;Επωνυμία εντολέα;Ποσό;Αρ. συναλλαγής;
    const parts = line.split(';')
    if (parts.length < 6 || !/^\d+$/.test(parts[0].trim())) continue
    const date = parseDateMDY(parts[1], warnings)
    if (!date) { warnings.push(`Εισερχόμενη ${parts[0]}: μη αναγνώσιμη ημερομηνία «${parts[1]}»`); continue }
    const amount = parseAmount(parts[4])
    if (amount === null) { warnings.push(`Εισερχόμενη ${parts[0]}: μη αναγνώσιμο ποσό «${parts[4]}»`); continue }
    orders.push({
      date,
      payerBank: normalizeHomoglyphs(unwrap(parts[2])).replace(/\s+/g, ' ').trim(),
      payerName: normalizeHomoglyphs(unwrap(parts[3])).replace(/\s+/g, ' ').trim(),
      amount,
      txnId: unwrap(parts[5]),
    })
  }
  if (orders.length === 0) warnings.push('Δεν βρέθηκε καμία εισερχόμενη εντολή στο κείμενο')
  return { orders, warnings }
}

// ---------------------------------------------------------------- join

export function classifyCredit(amount: number): CreditKind {
  if (amount === 45) return 'registration'
  if (amount >= 30 && amount <= 40) return 'subscription'
  if (amount >= 500) return 'grant-like'
  return 'unknown'
}

const FEE_REASON = /ΕΞΟΔΑ/

export function joinStatement(kiniseis: KiniseisParse, incoming: IncomingParse): JoinResult {
  const warnings: string[] = []
  const byTxn = new Map<string, IncomingOrder>()
  for (const o of incoming.orders) {
    if (o.txnId) byTxn.set(o.txnId, o)
  }

  // fees: χρεώσεις ΕΞΟΔΑ που μοιράζονται txn με πίστωση
  const creditTxns = new Set(
    kiniseis.movements.filter(m => m.direction === 'credit').map(m => m.txnId))
  const feeByTxn = new Map<string, number>()
  const debits: StatementMovement[] = []
  for (const m of kiniseis.movements) {
    if (m.direction !== 'debit') continue
    if (FEE_REASON.test(m.reason) && creditTxns.has(m.txnId)) {
      feeByTxn.set(m.txnId, (feeByTxn.get(m.txnId) || 0) + m.amount)
    } else {
      debits.push(m)
    }
  }

  const credits: JoinedCredit[] = []
  for (const m of kiniseis.movements) {
    if (m.direction !== 'credit') continue
    const order = byTxn.get(m.txnId) || null
    if (order && Math.abs(order.amount - m.amount) > 0.005) {
      warnings.push(
        `Συναλλαγή ${m.txnId}: το ποσό της κίνησης (${m.amount}) διαφέρει από την ` +
        `εισερχόμενη εντολή (${order.amount}) — το όνομα πληρωτή αγνοήθηκε`)
    }
    const matched = order && Math.abs(order.amount - m.amount) <= 0.005 ? order : null
    credits.push({
      ...m,
      payerName: matched?.payerName || null,
      payerBank: matched?.payerBank || null,
      fee: feeByTxn.get(m.txnId) || null,
      kind: classifyCredit(m.amount),
    })
  }

  const identified = credits.filter(c => c.payerName).length
  if (credits.length > 0 && identified < credits.length) {
    warnings.push(
      `${credits.length - identified} από ${credits.length} πιστώσεις χωρίς όνομα πληρωτή ` +
      '(ενδοτραπεζικές Alpha ή εκτός λίστας εισερχομένων) — θα ταυτοποιηθούν στον έλεγχο')
  }

  return { credits, debits, warnings }
}
