/**
 * Parser ονόματος αρχείου παραστατικού εξόδου — ΧΩΡΙΣ AI.
 *
 * Ο/η Financer ρίχνει τα τιμολόγια στον φάκελο του μήνα ονομάζοντάς τα
 * όπως ήδη κάνει: προμηθευτής + αριθμός/ΜΑΡΚ + ημερομηνία, σε όποια σειρά.
 * Εδώ αναγνωρίζονται ντετερμινιστικά:
 *
 *   ΜΑΡΚ      — 15ψήφιο που ξεκινά με 4000 (κανόνας myDATA, επαληθευμένος
 *               σε όλα τα παραστατικά Μαρτίου 2026)
 *   ΑΡΙΘΜΟΣ   — άλλο αριθμητικό/αλφαριθμητικό token (π.χ. 72152, 3123-55984,
 *               ΤΠΥ205), εξαιρώντας ημερομηνίες και το ΜΑΡΚ
 *   ΗΜ/ΝΙΑ    — 6 μορφές που εμφανίζονται στα πραγματικά αρχεία
 *   ΠΟΣΟ      — προαιρετικό, όταν το γράφεις (π.χ. «36,26»)
 *   ΠΡΟΜΗΘΕΥΤΗΣ — ό,τι απομένει· ταιριάζει με το μητρώο (supplier-alias)
 *
 * Ό,τι δεν βρεθεί εδώ έρχεται από το μητρώο προμηθευτών ή από την
 * τραπεζική επικόλληση — ποτέ από μαντεψιά.
 */

export interface ParsedInvoiceName {
  /** Το αρχικό όνομα, όπως στο Drive */
  original: string
  /** Α/Α αν το όνομα το έχει ήδη (π.χ. «3.12_…») — αλλιώς null */
  aa: string | null
  /** ΜΑΡΚ (15ψήφιο 4000…) */
  mark: string | null
  /** Αριθμός παραστατικού */
  docNumber: string | null
  /** Ημερομηνία έκδοσης, ISO yyyy-MM-dd */
  issueDate: string | null
  /** Ποσό αν γράφτηκε στο όνομα */
  amount: number | null
  /** Ελεύθερο κείμενο → υποψήφιος προμηθευτής */
  supplierHint: string
  /** Κλειδί αναζήτησης στο μητρώο (κανονικοποιημένο) */
  aliasKey: string
  /** Επέκταση αρχείου, πεζά (pdf/png/jpg…) */
  ext: string
}

const MARK_RE = /^4000\d{11}$/

/** Ένα «token» είναι ημερομηνία; Επιστρέφει ISO ή null. */
export function parseDateToken(token: string): string | null {
  const t = token.trim()

  // 21.03.2026 · 21-03-2026 · 21/03/2026 · 2.3.26 · 26-3-26 · 1.3.26
  let m = /^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2}|\d{4})$/.exec(t)
  if (m) {
    const d = Number(m[1]), mo = Number(m[2])
    let y = Number(m[3])
    if (m[3].length === 2) y += 2000
    return isoIfValid(y, mo, d)
  }

  // 21_03_2026 · 3_3_26 (κάτω παύλες ως διαχωριστικά ημερομηνίας)
  m = /^(\d{1,2})_(\d{1,2})_(\d{2}|\d{4})$/.exec(t)
  if (m) {
    const d = Number(m[1]), mo = Number(m[2])
    let y = Number(m[3])
    if (m[3].length === 2) y += 2000
    return isoIfValid(y, mo, d)
  }

  // 20260324 (συμπαγές yyyyMMdd)
  m = /^(20\d{2})(\d{2})(\d{2})$/.exec(t)
  if (m) return isoIfValid(Number(m[1]), Number(m[2]), Number(m[3]))

  return null
}

function isoIfValid(y: number, mo: number, d: number): string | null {
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null
  if (y < 2015 || y > 2100) return null
  const dt = new Date(Date.UTC(y, mo - 1, d))
  if (dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** «19.03.2026» κολλημένο σε αριθμό: 346368100 + 19.03.2026 */
function splitTrailingDate(token: string): { head: string; date: string | null } {
  const m = /^(.*?)(\d{1,2}[.\-/]\d{1,2}[.\-/]\d{4})$/.exec(token)
  if (m && m[1]) {
    const iso = parseDateToken(m[2])
    if (iso) return { head: m[1], date: iso }
  }
  return { head: token, date: null }
}

/**
 * Ποσό γραμμένο στο όνομα αρχείου. Δύο τρόποι:
 *   1. κόμμα με 2 δεκαδικά: «36,26», «1.299,52», «1089,92»
 *   2. με σύμβολο ευρώ (τότε δεκτή και η τελεία): «16.20€», «€16,20», «45€»
 * Το € κάνει την πρόθεση σαφή, οπότε δεν μπερδεύεται με αριθμό παραστατικού.
 */
function parseAmountToken(token: string): number | null {
  const hasEuro = /€|EUR$/i.test(token)
  const t = token.replace(/€/g, '').replace(/EUR$/i, '').trim()
  if (!t) return null
  if (hasEuro) {
    // με ρητό νόμισμα: δεκτή τελεία ή κόμμα, με ή χωρίς δεκαδικά
    if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+([.,]\d{1,2})?$/.test(t)) return null
    const normalized = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t
    const n = parseFloat(normalized)
    return Number.isFinite(n) ? n : null
  }
  // χωρίς νόμισμα: μόνο κόμμα + ΑΚΡΙΒΩΣ 2 δεκαδικά (αλλιώς μπορεί να είναι
  // αριθμός παραστατικού ή ημερομηνία)
  if (!/^\d{1,3}(\.\d{3})*,\d{2}$|^\d+,\d{2}$/.test(t)) return null
  const n = parseFloat(t.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/** Κανονικοποίηση κειμένου προμηθευτή για το μητρώο */
export function supplierAliasKey(hint: string): string {
  return hint
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase('el')
    .replace(/[^a-zα-ω0-9]+/gi, ' ')
    .trim()
}

/**
 * Parse ενός ονόματος αρχείου. Ανθεκτικό: ποτέ δεν πετά, τα άγνωστα
 * μένουν null και συμπληρώνονται στην οθόνη ελέγχου.
 */
export function parseInvoiceFilename(filename: string): ParsedInvoiceName {
  const extMatch = /\.([A-Za-z0-9]+)$/.exec(filename)
  const ext = extMatch ? extMatch[1].toLowerCase() : ''
  const base = extMatch ? filename.slice(0, -(extMatch[0].length)) : filename

  // Α/Α στην αρχή: «3.12_…» (μήνας.αύξων)
  let rest = base
  let aa: string | null = null
  const aaMatch = /^(\d{1,2}\.\d{1,2})[_\s-]+/.exec(base)
  if (aaMatch) {
    aa = aaMatch[1]
    rest = base.slice(aaMatch[0].length)
  }

  let mark: string | null = null
  let issueDate: string | null = null

  // ΠΡΙΝ το tokenize: ημερομηνίες με ΚΑΤΩ ΠΑΥΛΕΣ («3_3_26», «21_03_2026»)
  // — η κάτω παύλα είναι και διαχωριστικό tokens, οπότε θα κατακερματίζονταν
  rest = rest.replace(
    /(^|[_\s])(\d{1,2})_(\d{1,2})_(\d{2}|\d{4})(pdf|png|jpe?g)?(?=$|[_\s])/gi,
    (whole, lead: string, d: string, m: string, y: string) => {
      const iso = parseDateToken(`${d}.${m}.${y}`)
      if (!iso) return whole
      if (!issueDate) issueDate = iso
      return lead
    },
  )

  const rawTokens = rest.split(/[_\s]+/).filter(Boolean)
  let amount: number | null = null
  const docCandidates: string[] = []
  const words: string[] = []

  for (const raw of rawTokens) {
    // καθάρισμα από σκουπίδια άκρων («.4.03.2026», «26pdf», «#»)
    let token = raw.replace(/^[.,\-#]+/, '').replace(/[.,\-#]+(?=$)/, '')
    if (!token) continue
    // «3_3_26pdf» → «3_3_26»
    token = token.replace(/(pdf|png|jpg|jpeg)$/i, '')
    if (!token) continue

    // 1) ημερομηνία σκέτη
    const asDate = parseDateToken(token)
    if (asDate) {
      if (!issueDate) issueDate = asDate
      continue
    }
    // 2) ποσό
    const asAmount = parseAmountToken(token)
    if (asAmount !== null) {
      if (amount === null) amount = asAmount
      continue
    }
    // 3) αριθμός με κολλημένη ημερομηνία («34636810019.03.2026»)
    const split = splitTrailingDate(token)
    if (split.date) {
      if (!issueDate) issueDate = split.date
      token = split.head
      if (!token) continue
    }
    // 4) ΜΑΡΚ
    if (MARK_RE.test(token)) {
      if (!mark) mark = token
      continue
    }
    // 5) αριθμός παραστατικού (περιέχει ψηφίο, δεν είναι καθαρό κείμενο)
    if (/\d/.test(token)) {
      docCandidates.push(token)
      continue
    }
    // 6) κείμενο → προμηθευτής
    words.push(token)
  }

  // Ταυτότητα Οφειλής ΑΑΔΕ: τρεις αριθμητικές ομάδες που ξεκινούν με το
  // ΑΦΜ μας — κρατιέται ενιαία ως αριθμός παραστατικού
  let docNumber: string | null = null
  if (docCandidates.length >= 3 && /^\d{9}$/.test(docCandidates[0])) {
    docNumber = docCandidates.join(' ')
  } else if (docCandidates.length > 0) {
    // προτίμησε το πρώτο· τα υπόλοιπα δεν χάνονται — μπαίνουν στο hint
    docNumber = docCandidates[0]
    words.push(...docCandidates.slice(1))
  }

  const supplierHint = words.join(' ').trim()
  return {
    original: filename,
    aa,
    mark,
    docNumber,
    issueDate,
    amount,
    supplierHint,
    aliasKey: supplierAliasKey(supplierHint),
    ext,
  }
}

/**
 * Τελικό όνομα αρχείου μετά την έγκριση:
 *   {Α/Α}_{ό,τι έδωσε ο χρήστης}_{ημ. έκδοσης DD-MM-YYYY}.{ext}
 * Δεν ξαναγράφει ό,τι υπάρχει ήδη (Α/Α ή ημερομηνία στο τέλος).
 */
export function buildApprovedFilename(parsed: ParsedInvoiceName, aa: string, issueDate: string): string {
  const [y, m, d] = issueDate.split('-')
  const dateStr = `${d}-${m}-${y}`
  // αφαίρεσε τυχόν υπάρχον Α/Α prefix και ημερομηνία-ουρά από το αρχικό
  let core = parsed.original.replace(/\.[A-Za-z0-9]+$/, '')
  core = core.replace(/^\d{1,2}\.\d{1,2}[_\s-]+/, '')
  core = core.replace(/[_\s-]*\d{1,2}[.\-/_]\d{1,2}[.\-/_]\d{2,4}\s*$/, '')
  core = core.replace(/(pdf|png|jpg|jpeg)$/i, '').replace(/[_\s-]+$/, '').trim()
  return `${aa}_${core}_${dateStr}.${parsed.ext || 'pdf'}`
}
