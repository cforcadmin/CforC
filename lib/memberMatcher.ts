/**
 * Ταίριασμα ονόματος πληρωτή (τράπεζα, greeklish) ↔ μέλους (Strapi, ελληνικά).
 *
 * Μετρημένο σε πραγματικά δεδομένα: το όνομα της τράπεζας είναι greeklish
 * («KITSELLIS EMMANOUIL»), με πατρώνυμα που περισσεύουν (ΕΘΝΙΚΗ), παύλες,
 * και ~14% περιπτώσεις όπου ο πληρωτής ΔΕΝ είναι το μέλος (εταιρείες,
 * τρίτοι). Γι' αυτό το αποτέλεσμα είναι ΠΑΝΤΑ πρόταση με βαθμό
 * εμπιστοσύνης — ποτέ αυτόματη ταυτοποίηση χωρίς έλεγχο Financer.
 *
 * Μέθοδος: και οι δύο πλευρές ανάγονται σε «σκελετό» (μεταγραφή ελληνικών
 * σε λατινικά + αναδίπλωση ορθογραφικών παραλλαγών: OU→U, TH→T, CH→X,
 * AI→E, EI/OI/Y/H→I, διπλά γράμματα→μονά) και συγκρίνονται ανά λέξη,
 * ανεξαρτήτως σειράς (επώνυμο-όνομα ή όνομα-επώνυμο).
 */

import { normalizeHomoglyphs } from '@/lib/bankStatement'

// ---------------------------------------------------------------- μεταγραφή

const GREEK_DIGRAPHS: Array<[RegExp, string]> = [
  [/ΟΥ/g, 'OU'], [/ΑΥ/g, 'AV'], [/ΕΥ/g, 'EV'],
  [/ΑΙ/g, 'AI'], [/ΕΙ/g, 'EI'], [/ΟΙ/g, 'OI'],
  [/ΜΠ/g, 'B'], [/ΝΤ/g, 'NT'], [/ΓΓ/g, 'NG'], [/ΓΚ/g, 'GK'],
]
const GREEK_SINGLE: Record<string, string> = {
  Α: 'A', Β: 'V', Γ: 'G', Δ: 'D', Ε: 'E', Ζ: 'Z', Η: 'I', Θ: 'TH',
  Ι: 'I', Κ: 'K', Λ: 'L', Μ: 'M', Ν: 'N', Ξ: 'X', Ο: 'O', Π: 'P',
  Ρ: 'R', Σ: 'S', Τ: 'T', Υ: 'Y', Φ: 'F', Χ: 'CH', Ψ: 'PS', Ω: 'O',
}

/** Αφαίρεση τόνων/διαλυτικών + κεφαλαία (el locale) + τελικό ς → σ */
function baseUpper(s: string): string {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/ς/g, 'σ')
    .toLocaleUpperCase('el')
}

/** Ελληνικό κείμενο → λατινική μεταγραφή (κεφαλαία) */
export function transliterateGreek(s: string): string {
  let t = baseUpper(s)
  for (const [re, out] of GREEK_DIGRAPHS) t = t.replace(re, out)
  return t.split('').map(c => GREEK_SINGLE[c] ?? c).join('')
}

/**
 * Σκελετός λέξης: μεταγραφή + αναδίπλωση παραλλαγών greeklish ώστε
 * KITSELLIS/Κιτσέλλης, FOTEINI/Φωτεινή, CHRISTINA/Χριστίνα να συμπέσουν.
 */
export function wordSkeleton(word: string): string {
  // Αμιγώς ελληνικά codepoints = γνήσιο ελληνικό κείμενο → μεταγραφή ΗΧΟΥ
  // (Ρ→R)· αλλιώς πιθανό greeklish με homoglyphs → κανονικοποίηση ΓΛΥΦΗΣ
  // (Ρ→P) πρώτα. Η διάκριση γίνεται στο codepoint, όχι στην εμφάνιση.
  const pureGreek = /^[Ͱ-Ͽἀ-῿]+$/.test(word)
  let t = pureGreek ? transliterateGreek(word) : transliterateGreek(normalizeHomoglyphs(word))
  t = t.replace(/[^A-Z]/g, '')
  t = t.replace(/OU/g, 'U').replace(/PH/g, 'F').replace(/TH/g, 'T')
  t = t.replace(/CH/g, 'X').replace(/KH/g, 'X').replace(/GH/g, 'G')
  t = t.replace(/AI/g, 'E').replace(/EI/g, 'I').replace(/OI/g, 'I')
  t = t.replace(/NT/g, 'D').replace(/MP/g, 'B').replace(/GK/g, 'G') // ΝΤ/ΜΠ/ΓΚ παραλλαγές
  t = t.replace(/Y/g, 'I').replace(/H/g, 'I').replace(/W/g, 'V').replace(/B/g, 'V')
  t = t.replace(/J/g, 'I')
  t = t.replace(/(.)\1+/g, '$1') // διπλά → μονά
  return t
}

/**
 * ΕΘΝΙΚΗ: «ΕΠΩΝΥΜΟ␣␣␣…ΟΝΟΜΑ␣␣␣…ΠΑΤΡΩΝΥΜΟ» σε τρεις στήλες με padding.
 * Το ΠΑΤΡΩΝΥΜΟ πετιέται: αλλιώς «VLACHOS NIKOLAOS GEORGIOS» ταιριάζει με
 * το επώνυμο «Γεωργίου» άλλου μέλους (πραγματικό περιστατικό, 16/8/26).
 */
export function stripPatronymic(payerName: string): string {
  const cols = payerName.split(/\s{3,}/).map(c => c.trim()).filter(Boolean)
  if (cols.length === 3) return `${cols[0]} ${cols[1]}`
  return payerName
}

/** Όνομα → σκελετοί λέξεων (χωρίζει σε κενά/παύλες, πετά μονογράμματα) */
export function nameSkeletons(name: string): string[] {
  return name.split(/[\s\-–—.,·]+/)
    .map(wordSkeleton)
    .filter(w => w.length > 1)
}

// ---------------------------------------------------------------- ομοιότητα

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  const m = a.length, n = b.length
  if (m === 0) return n
  if (n === 0) return m
  let prev = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    const cur = [i]
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
    }
    prev = cur
  }
  return prev[n]
}

/** Ομοιότητα δύο σκελετών 0..1 */
export function wordSimilarity(a: string, b: string): number {
  if (!a || !b) return 0
  const maxLen = Math.max(a.length, b.length)
  return 1 - levenshtein(a, b) / maxLen
}

/**
 * Ομοιότητα ονομάτων 0..1, ανεξαρτήτως σειράς λέξεων.
 * Κατεύθυνση: κάθε λέξη του ΜΕΛΟΥΣ πρέπει να βρίσκει καλό ταίρι στου
 * πληρωτή — έτσι το πατρώνυμο/extra λέξεις της τράπεζας δεν τιμωρούν.
 */
export function nameSimilarity(payer: string, memberName: string): number {
  const p = nameSkeletons(payer)
  const m = nameSkeletons(memberName)
  if (p.length === 0 || m.length === 0) return 0
  let total = 0
  for (const mw of m) {
    total += Math.max(...p.map(pw => wordSimilarity(mw, pw)))
  }
  return total / m.length
}

// ---------------------------------------------------------------- matching

export interface MatchableMember {
  docId: string
  name: string
  am: number
  email: string
}

export interface MatchCandidate extends MatchableMember {
  score: number
  confidence: 'high' | 'medium'
}

const HIGH_THRESHOLD = 0.9
const MEDIUM_THRESHOLD = 0.72

/**
 * Κορυφαίες προτάσεις μέλους για ένα όνομα πληρωτή (max 3, ταξινομημένες).
 * Κενή λίστα = καμία αξιόπιστη πρόταση → ουρά «ποιος είναι αυτός;».
 */
export function matchPayerToMembers(
  payerName: string,
  members: MatchableMember[],
  max = 3,
): MatchCandidate[] {
  const cleanPayer = stripPatronymic(payerName)
  const payerWords = nameSkeletons(cleanPayer)
  const scored: MatchCandidate[] = []
  for (const member of members) {
    const score = nameSimilarity(cleanPayer, member.name)
    // Ένα μόνο κοινό επώνυμο ΔΕΝ αρκεί: για δίλεκτα ονόματα μελών
    // απαιτούνται δύο λέξεις που ταιριάζουν καλά — αλλιώς «Γεωργία
    // Γεωργίου» ταιριάζει με οποιονδήποτε «…GEORGIOS/GEORGIOU»
    const memberWords = nameSkeletons(member.name)
    const strongWordHits = memberWords.filter(mw =>
      payerWords.some(pw => wordSimilarity(mw, pw) >= 0.85)
    ).length
    const needed = Math.min(2, memberWords.length)
    if (strongWordHits < needed) continue
    if (score >= MEDIUM_THRESHOLD) {
      scored.push({
        ...member,
        score: Math.round(score * 1000) / 1000,
        confidence: score >= HIGH_THRESHOLD ? 'high' : 'medium',
      })
    }
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, max)
}

/** Κανονικοποιημένο κλειδί πληρωτή για τα learned aliases (payer-alias) */
export function payerAliasKey(payerName: string): string {
  return nameSkeletons(payerName).sort().join(' ')
}
