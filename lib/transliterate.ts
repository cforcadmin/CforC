/**
 * Greek ↔ Latin transliteration for search matching.
 *
 * Converts Greek text to a Latin approximation so users can search
 * for Greek names using a Latin keyboard (e.g., "Ntziora" finds "Ντζιώρα").
 */

// Greek digraphs must be checked BEFORE single characters
const GREEK_TO_LATIN: [string, string][] = [
  // Digraphs (order matters — longer patterns first)
  ['ντζ', 'ntz'],
  ['τζ', 'tz'],
  ['μπ', 'mp'],
  ['ντ', 'nt'],
  ['γκ', 'gk'],
  ['γγ', 'ng'],
  ['τσ', 'ts'],
  ['ού', 'u'],
  ['ου', 'u'],
  ['αι', 'ai'],
  ['ει', 'ei'],
  ['οι', 'oi'],
  ['υι', 'yi'],
  ['αυ', 'av'],
  ['ευ', 'ev'],

  // Single characters
  ['α', 'a'],
  ['β', 'v'],
  ['γ', 'g'],
  ['δ', 'd'],
  ['ε', 'e'],
  ['ζ', 'z'],
  ['η', 'i'],
  ['θ', 'th'],
  ['ι', 'i'],
  ['κ', 'k'],
  ['λ', 'l'],
  ['μ', 'm'],
  ['ν', 'n'],
  ['ξ', 'x'],
  ['ο', 'o'],
  ['π', 'p'],
  ['ρ', 'r'],
  ['σ', 's'],
  ['ς', 's'],
  ['τ', 't'],
  ['υ', 'i'],
  ['φ', 'f'],
  ['χ', 'ch'],
  ['ψ', 'ps'],
  ['ω', 'o'],

  // Accented vowels
  ['ά', 'a'],
  ['έ', 'e'],
  ['ή', 'i'],
  ['ί', 'i'],
  ['ό', 'o'],
  ['ύ', 'i'],
  ['ώ', 'o'],
  ['ϊ', 'i'],
  ['ϋ', 'i'],
  ['ΐ', 'i'],
  ['ΰ', 'i'],
]

/**
 * Convert Greek text to a Latin approximation.
 * Used so that a Latin-keyboard query can match Greek names.
 */
export function greekToLatin(text: string): string {
  let result = ''
  const lower = text.toLowerCase()
  let i = 0

  while (i < lower.length) {
    let matched = false

    // Try digraphs first (2-3 char patterns)
    for (const [greek, latin] of GREEK_TO_LATIN) {
      if (greek.length > 1 && lower.startsWith(greek, i)) {
        result += latin
        i += greek.length
        matched = true
        break
      }
    }

    if (!matched) {
      // Try single character
      for (const [greek, latin] of GREEK_TO_LATIN) {
        if (greek.length === 1 && lower[i] === greek) {
          result += latin
          i++
          matched = true
          break
        }
      }
    }

    if (!matched) {
      // Pass through non-Greek characters (spaces, Latin letters, etc.)
      result += lower[i]
      i++
    }
  }

  return result
}

/**
 * Normalize Latin text for fuzzy comparison.
 * Maps common equivalent spellings so "chouli" matches "choyli", etc.
 */
function normalizeLatin(text: string): string {
  return text
    .replace(/ou/g, 'u')  // ου → u (users may type "ou" for the Greek "ου" sound)
    .replace(/y/g, 'i')   // y ≈ i (Greek υ can be written as y, u, or i)
    .replace(/ph/g, 'f')  // ph ≈ f (Greek φ)
    .replace(/ks/g, 'x')  // ks ≈ x (Greek ξ)
}

/**
 * Check if a search query matches a name, supporting:
 * 1. Direct Greek match (existing behavior)
 * 2. Direct English name match (if EngName is populated)
 * 3. Latin query → transliterated Greek name match (with fuzzy normalization)
 */
export function matchesName(
  query: string,
  greekName: string,
  engName?: string | null
): boolean {
  const q = query.toLowerCase().trim()
  if (!q) return true

  // 1. Direct match on Greek name
  if (greekName.toLowerCase().includes(q)) return true

  // 2. Direct match on English name (if available)
  if (engName && engName.toLowerCase().includes(q)) return true

  // 3. Match Latin query against transliterated Greek name
  const transliterated = greekToLatin(greekName)
  if (transliterated.includes(q)) return true

  // 4. Fuzzy match with normalized equivalents (y≈u≈i, ph≈f, etc.)
  if (normalizeLatin(transliterated).includes(normalizeLatin(q))) return true

  return false
}
