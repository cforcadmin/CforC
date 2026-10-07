/**
 * ΠΡΟΤΑΣΕΙΣ ΝΕΩΝ ΟΜΑΔΩΝ ΕΡΓΑΣΙΑΣ — κανόνες, καταστάσεις, επικύρωση.
 *
 * Αντικαθιστά τη φόρμα Google (docs.google.com/forms/…/1FAIpQLSe6vrAA7j…):
 * τα ΕΝΝΕΑ πεδία της μεταφέρονται αυτούσια, συν πολλαπλοί σύνδεσμοι.
 *
 * ΓΙΑΤΙ ΕΔΩ ΚΑΙ ΟΧΙ ΜΕΣΑ ΣΤΗ ΔΙΑΔΡΟΜΗ: την ίδια επικύρωση τη χρειάζεται και
 * η φόρμα (για να δείξει το λάθος πριν σταλεί) και το endpoint (γιατί η
 * φόρμα δεν είναι φράγμα — ο καθένας στέλνει POST). Μία πηγή, δύο καλούντες.
 */

export type ProposalStatus = 'new' | 'under-review' | 'approved' | 'rejected'

export const PROPOSAL_STATUSES: ProposalStatus[] = ['new', 'under-review', 'approved', 'rejected']

export const PROPOSAL_STATUS_LABELS: Record<ProposalStatus, string> = {
  'new': 'Νέα',
  'under-review': 'Σε εξέταση',
  'approved': 'Εγκρίθηκε',
  'rejected': 'Απορρίφθηκε',
}

/** Οι αποφασισμένες: μια πρόταση ΚΡΙΝΕΤΑΙ, δεν «υλοποιείται». */
export const DECIDED_STATUSES: ProposalStatus[] = ['approved', 'rejected']

export const isDecided = (status: string): boolean =>
  DECIDED_STATUSES.includes(status as ProposalStatus)

/**
 * Αρχειοθετείται ΜΟΝΟ ό,τι έχει κριθεί. Μια πρόταση «σε εξέταση» που
 * αρχειοθετείται εξαφανίζεται χωρίς απάντηση — ακριβώς αυτό που κάνει τη
 * φόρμα Google μαύρο κουτί και που ήρθε να λύσει η μεταφορά.
 */
export const canArchive = (status: string): boolean => isDecided(status)

export interface ProposalDraft {
  title?: string
  theme?: string
  goal?: string
  moreInfo?: string
  contactPerson?: string
  proposerName?: string
  proposerEmail?: string
  phone?: string
  facebook?: string
  links?: string[]
}

export const MAX_LINKS = 10

const LIMITS: Record<string, number> = {
  title: 200, theme: 2000, goal: 2000, moreInfo: 5000,
  contactPerson: 200, proposerName: 200, proposerEmail: 200, phone: 40,
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Ένας σύνδεσμος όπως τον γράφει άνθρωπος: «cultureforchange.net»,
 * «www.…», με κενά γύρω. Επιστρέφει κανονικοποιημένο URL ή null.
 *
 * ΜΟΝΟ http/https: ένα «javascript:» σε πεδίο που μπαίνει σε email και σε
 * οθόνη του OC είναι κλικ που δεν θέλει κανείς να ξέρει πού πάει.
 */
export function normalizeLink(raw: string): string | null {
  const s = String(raw || '').trim()
  if (!s) return null
  // Σχήμα που ΔΕΝ είναι http/https απορρίπτεται εδώ, πριν μπει μπροστά το
  // «https://»: το «mailto:a@b.gr» θα γινόταν αλλιώς «https://mailto:a@b.gr»,
  // δηλαδή έγκυρο URL που δεν πάει πουθενά.
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(s)
  if (hasScheme && !/^https?:\/\//i.test(s)) return null
  const withScheme = hasScheme ? s : `https://${s}`
  let url: URL
  try { url = new URL(withScheme) } catch { return null }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  // Χρειάζεται τελεία στο host: το «https://κάτι» χωρίς τομέα δεν είναι σύνδεσμος
  if (!url.hostname.includes('.')) return null
  return url.toString()
}

/** Κρατά όσους είναι σύνδεσμοι, πετά τα κενά, χωρίς διπλότυπα. */
export function normalizeLinks(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw : []
  const out: string[] = []
  for (const item of list) {
    const link = normalizeLink(String(item ?? ''))
    if (link && !out.includes(link)) out.push(link)
    if (out.length >= MAX_LINKS) break
  }
  return out
}

export interface ValidationResult {
  ok: boolean
  /** Ανά πεδίο — η φόρμα δείχνει το μήνυμα κάτω από το σωστό κουτί */
  errors: Record<string, string>
  /** Καθαρισμένα δεδομένα, έτοιμα για το Strapi */
  clean: Required<Pick<ProposalDraft, 'title' | 'theme' | 'goal' | 'contactPerson' | 'proposerName' | 'proposerEmail' | 'phone'>>
    & { moreInfo: string; facebook: string; links: string[] }
}

export function validateProposal(draft: ProposalDraft): ValidationResult {
  const errors: Record<string, string> = {}
  const t = (v?: string) => String(v ?? '').trim()

  const clean = {
    title: t(draft.title),
    theme: t(draft.theme),
    goal: t(draft.goal),
    moreInfo: t(draft.moreInfo),
    contactPerson: t(draft.contactPerson),
    proposerName: t(draft.proposerName),
    proposerEmail: t(draft.proposerEmail).toLowerCase(),
    phone: t(draft.phone),
    facebook: '',
    links: normalizeLinks(draft.links),
  }

  const required: Array<[keyof typeof clean, string]> = [
    ['title', 'Συμπλήρωσε τον τίτλο της ομάδας'],
    ['theme', 'Συμπλήρωσε τη θεματική'],
    ['goal', 'Συμπλήρωσε τον στόχο'],
    ['contactPerson', 'Συμπλήρωσε το προσωρινό άτομο επικοινωνίας'],
    ['proposerName', 'Συμπλήρωσε το ονοματεπώνυμό σου'],
    ['proposerEmail', 'Συμπλήρωσε το email σου'],
    ['phone', 'Συμπλήρωσε τηλέφωνο επικοινωνίας'],
  ]
  for (const [field, message] of required) {
    if (!clean[field]) errors[field] = message
  }

  if (clean.proposerEmail && !EMAIL_RE.test(clean.proposerEmail)) {
    errors.proposerEmail = 'Το email δεν μοιάζει έγκυρο'
  }

  for (const [field, max] of Object.entries(LIMITS)) {
    const value = (clean as Record<string, unknown>)[field]
    if (typeof value === 'string' && value.length > max) {
      errors[field] = `Πολύ μεγάλο κείμενο (έως ${max} χαρακτήρες)`
    }
  }

  // Το Facebook είναι σύνδεσμος σαν τους άλλους — αν δοθεί, πρέπει να ανοίγει.
  const fb = t(draft.facebook)
  if (fb) {
    const normalized = normalizeLink(fb)
    if (!normalized) errors.facebook = 'Ο σύνδεσμος δεν μοιάζει έγκυρος'
    else clean.facebook = normalized
  }

  // Σύνδεσμος που γράφτηκε αλλά ΔΕΝ πέρασε: σιωπηλή απόρριψη θα έστελνε την
  // πρόταση χωρίς το υλικό που ο προτείνων νόμιζε ότι επισύναψε.
  const typed = (Array.isArray(draft.links) ? draft.links : []).filter(l => String(l ?? '').trim())
  if (typed.length > MAX_LINKS) {
    errors.links = `Έως ${MAX_LINKS} σύνδεσμοι`
  } else if (typed.length > clean.links.length) {
    errors.links = 'Κάποιος σύνδεσμος δεν μοιάζει έγκυρος'
  }

  return { ok: Object.keys(errors).length === 0, errors, clean }
}

/** Τι γράφεται στο Strapi όταν αλλάζει η κατάσταση από το OC. */
export function statusPatch(status: ProposalStatus): Record<string, unknown> {
  return {
    Status: status,
    DecidedAt: isDecided(status) ? new Date().toISOString() : null,
  }
}
