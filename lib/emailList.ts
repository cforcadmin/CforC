/**
 * Εξαγωγή διευθύνσεων email από ελεύθερο κείμενο — στήλη φύλλου, λίστα με
 * κόμματα/ερωτηματικά, γραμμές «Όνομα <email>» από πρόγραμμα αλληλογραφίας.
 *
 * ΧΩΡΙΣ μορφή: ό,τι περιέχει «@» κρίνεται ως διεύθυνση (έγκυρη ή άκυρη),
 * ό,τι δεν περιέχει (ονόματα, επικεφαλίδες στήλης) αγνοείται σιωπηλά.
 * Πεζά παντού, χωρίς διπλά — η πρώτη εμφάνιση κρατιέται, με τη σειρά της.
 */
export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export function isValidEmail(v: string): boolean {
  return EMAIL_RE.test(v)
}

export function normaliseEmail(raw: string): string {
  return String(raw ?? '').trim().replace(/^mailto:/i, '').replace(/^[("'<[]+|[)"'>\],.;:]+$/g, '').toLowerCase()
}

/** Όλα τα υποψήφια email (με «@») του κειμένου, κανονικοποιημένα, χωρίς διπλά, με τη σειρά τους. */
export function emailCandidates(text: string): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const token of String(text ?? '').split(/[\s,;<>"'()\[\]]+/)) {
    if (!token.includes('@')) continue
    const e = normaliseEmail(token)
    if (!e || seen.has(e)) continue
    seen.add(e)
    out.push(e)
  }
  return out
}

export function extractEmails(text: string): { valid: string[]; invalid: string[] } {
  const valid: string[] = []
  const invalid: string[] = []
  for (const e of emailCandidates(text)) (isValidEmail(e) ? valid : invalid).push(e)
  return { valid, invalid }
}

/** Αληθές όταν το κείμενο μοιάζει με ΛΙΣΤΑ (διαχωριστικό ή δεύτερο «@»), όχι με μία διεύθυνση. */
export function looksLikeEmailList(text: string): boolean {
  const t = String(text ?? '').trim()
  return /[\s,;<>]/.test(t) || (t.split('@').length - 1) > 1
}
