/**
 * Ποιοι λαμβάνουν μια μαζική αποστολή, και σε πόσες ημέρες.
 *
 * Καθαρές συναρτήσεις: η διαδρομή φέρνει τα μέλη από το Strapi και τα δίνει
 * εδώ. Έτσι η επιλογή παραληπτών —το πιο επικίνδυνο κομμάτι, γιατί καθορίζει
 * σε ποιους ανθρώπους θα φτάσει το γράμμα— ελέγχεται με tests χωρίς δίκτυο.
 */

/**
 * Πόσα email την ημέρα δίνουμε σε μια καμπάνια.
 *
 * Το Resend επιτρέπει 100 transactional/ημέρα στο δωρεάν πλάνο. Κρατάμε 20
 * για την αυτόματη κίνηση (αποδείξεις, εγκρίσεις, υπενθυμίσεις) — και ΠΡΟΣΟΧΗ:
 * κάθε CC μετράει ξεχωριστά, οπότε μια απόδειξη με 3 CC κοστίζει 4, όχι 1.
 * Με ~5 αποδείξεις την ημέρα, τα 20 επαρκούν.
 *
 * Τα marketing broadcasts του Resend ΔΕΝ έχουν ημερήσιο όριο, αλλά επιβάλλουν
 * σύνδεσμο διαγραφής — και αυτά εδώ είναι επίσημες ανακοινώσεις σωματείου
 * προς τα μέλη του, που δεν έχουν opt-out. Γι' αυτό μένουμε στο transactional
 * και πληρώνουμε το τίμημα σε ημέρες.
 */
export const DAILY_EMAIL_BUDGET = 80

/**
 * Οι έδρες στέλνονται στη ΘΥΡΙΔΑ, όχι στο προσωπικό email του κατόχου.
 *
 * Έτσι το γράμμα φτάνει στον ρόλο και όχι στο πρόσωπο: επιβιώνει των εκλογών,
 * το βλέπει όποιος κρατά τη θυρίδα, και μένει στο αρχείο της θέσης. Παράπλευρο
 * κέρδος: δεν εξαρτάται από το αν ο κάτοχος έχει ΑΜ — η Γραμματεία δεν είναι
 * μέλος του ΔΣ και έπεφτε έξω από το φίλτρο του μητρώου.
 *
 * Οι διευθύνσεις είναι ΟΙ ΙΔΙΕΣ με το SEAT_MAILBOX του lib/ocRoles — μία πηγή
 * αλήθειας, που χρησιμοποιούν ήδη οι προσκλήσεις του ημερολογίου.
 */
export const SEAT_AUDIENCES: Array<{ id: string; label: string; email: string }> = [
  { id: 'admin', label: 'Admin', email: 'hello@cultureforchange.net' },
  { id: 'comms', label: 'Επικοινωνία', email: 'communication@cultureforchange.net' },
  { id: 'community', label: 'Κοινότητα', email: 'community@cultureforchange.net' },
  { id: 'coordinator', label: 'Συντονισμός', email: 'coordination@cultureforchange.net' },
  { id: 'financer', label: 'Ταμίας', email: 'finance@cultureforchange.net' },
  { id: 'it', label: 'IT', email: 'it@cultureforchange.net' },
  { id: 'outreach', label: 'Outreach', email: 'outreach@cultureforchange.net' },
]

/** Τα ελληνικά ονόματα των εδρών, για να μη μπερδεύονται με ομάδες εργασίας */
export const SEAT_LABEL_SET = new Set([
  'Γραμματεία', 'Επικοινωνία', 'Κοινότητα', 'Συντονισμός', 'Ταμίας', 'IT', 'Outreach',
])

export interface CampaignMember {
  docId: string
  name: string
  email: string
  am: number | null
  /** { "2026": 1 } — 1 πληρωμένο, 0 απλήρωτο */
  payments?: Record<string, number> | null
  /** Ονόματα ομάδων εργασίας και έδρες OC που κατέχει */
  groups?: string[]
}

export interface RecipientSelection {
  allMembers?: boolean
  /** π.χ. { year: 2026, paid: false } → όσοι ΔΕΝ έχουν πληρώσει το 2026 */
  paymentStatus?: { year: number; paid: boolean }
  /** Ταυτότητες εδρών (SEAT_AUDIENCES) — πάνε στη θυρίδα, όχι σε πρόσωπο */
  seats?: string[]
  groups?: string[]
  memberDocIds?: string[]
  external?: string[]
}

export interface Recipient {
  email: string
  name: string
  docId?: string
  am?: number | null
  /** Από πού μπήκε — για να εξηγεί η οθόνη γιατί είναι στη λίστα */
  via: 'all' | 'payment' | 'seat' | 'group' | 'individual' | 'external'
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export function isValidEmail(v: string): boolean {
  return EMAIL_RE.test(String(v || '').trim())
}

/** Το μικρό όνομα, για το {{όνομα}} */
export function firstNameOf(fullName: string): string {
  return String(fullName || '').trim().split(/\s+/)[0] || ''
}

/**
 * Μετατρέπει την επιλογή σε συγκεκριμένη λίστα.
 *
 * Η σειρά των πηγών έχει σημασία μόνο για το `via`: το email είναι το κλειδί
 * μοναδικότητας, οπότε όποιος πιάνεται από δύο κριτήρια μπαίνει ΜΙΑ φορά και
 * κρατά την πρώτη αιτία. Χωρίς αυτό, ένα μέλος που είναι και απλήρωτο και σε
 * ομάδα θα λάμβανε δύο αντίγραφα — και θα κόστιζε δύο από το ημερήσιο όριο.
 */
export function resolveRecipients(
  members: CampaignMember[],
  selection: RecipientSelection,
): Recipient[] {
  const out = new Map<string, Recipient>()
  const add = (r: Recipient) => {
    const key = r.email.trim().toLowerCase()
    if (!key || !isValidEmail(key)) return
    if (!out.has(key)) out.set(key, { ...r, email: key })
  }

  const eligible = members.filter(m => m.am != null && isValidEmail(m.email))

  if (selection.allMembers) {
    for (const m of eligible) add({ email: m.email, name: m.name, docId: m.docId, am: m.am, via: 'all' })
  }

  if (selection.paymentStatus) {
    const { year, paid } = selection.paymentStatus
    for (const m of eligible) {
      // ΠΡΟΣΟΧΗ: το «δεν έχει 1» δεν είναι το ίδιο με «έχει 0». Μέλος χωρίς
      // καμία εγγραφή για τη χρονιά μετράει ως ΑΠΛΗΡΩΤΟ — αλλιώς τα νέα μέλη
      // θα έλειπαν σιωπηλά από κάθε υπενθύμιση.
      const isPaid = (m.payments || {})[String(year)] === 1
      if (isPaid === paid) add({ email: m.email, name: m.name, docId: m.docId, am: m.am, via: 'payment' })
    }
  }

  if (selection.seats?.length) {
    const want = new Set(selection.seats)
    for (const seat of SEAT_AUDIENCES) {
      if (want.has(seat.id)) add({ email: seat.email, name: seat.label, via: 'seat' })
    }
  }

  if (selection.groups?.length) {
    const want = new Set(selection.groups.map(g => g.trim().toLowerCase()).filter(Boolean))
    // ΟΧΙ `eligible`: η επιλογή κατά έδρα ή ομάδα απευθύνεται στον ΡΟΛΟ, όχι
    // στην ιδιότητα μέλους. Η Γραμματεία δεν είναι μέλος του ΔΣ και δεν έχει
    // ΑΜ — με το φίλτρο του μητρώου έπεφτε σιωπηλά έξω, και η επιλογή δύο
    // εδρών έδινε έναν παραλήπτη.
    for (const m of members.filter(x => isValidEmail(x.email))) {
      if ((m.groups || []).some(g => want.has(String(g).trim().toLowerCase()))) {
        add({ email: m.email, name: m.name, docId: m.docId, am: m.am, via: 'group' })
      }
    }
  }

  if (selection.memberDocIds?.length) {
    const want = new Set(selection.memberDocIds)
    // Εδώ ΔΕΝ φιλτράρουμε με ΑΜ: αν κάποιος διάλεξε ρητά ένα άτομο, το εννοεί
    for (const m of members) {
      if (want.has(m.docId) && isValidEmail(m.email)) {
        add({ email: m.email, name: m.name, docId: m.docId, am: m.am, via: 'individual' })
      }
    }
  }

  for (const e of selection.external || []) {
    const email = String(e || '').trim()
    if (isValidEmail(email)) add({ email, name: email, via: 'external' })
  }

  return [...out.values()]
}

/** Πόσες ημέρες θα πάρει, με το ημερήσιο όριο */
export function daysNeeded(count: number, budget = DAILY_EMAIL_BUDGET): number {
  if (count <= 0) return 0
  return Math.ceil(count / Math.max(1, budget))
}

/** «147 παραλήπτες · 2 ημέρες» */
export function recipientSummary(count: number, budget = DAILY_EMAIL_BUDGET): string {
  const d = daysNeeded(count, budget)
  const p = count === 1 ? '1 παραλήπτης' : `${count} παραλήπτες`
  if (d <= 1) return `${p} · μία αποστολή`
  return `${p} · ${d} ημέρες`
}

export type RecipientStatus = 'pending' | 'sent' | 'failed'

export interface QueuedRecipient extends Recipient {
  status: RecipientStatus
  sentAt?: string
  error?: string
  attempts?: number
}

export function toQueue(recipients: Recipient[]): QueuedRecipient[] {
  return recipients.map(r => ({ ...r, status: 'pending' as const, attempts: 0 }))
}

export interface CampaignValidation { ok: boolean; errors: string[] }

/**
 * Έλεγχος πριν μπει στην ουρά. Το «άδειο σώμα» και οι «μηδέν παραλήπτες»
 * είναι τα δύο λάθη που δεν συγχωρούνται: το πρώτο στέλνει κενό γράμμα σε
 * αληθινούς ανθρώπους, το δεύτερο δείχνει επιτυχία χωρίς να στείλει τίποτα.
 */
export function validateCampaign(input: {
  subject?: string
  blocks?: unknown[]
  recipients?: unknown[]
}): CampaignValidation {
  const errors: string[] = []
  const subject = String(input.subject || '').trim()
  if (!subject) errors.push('Λείπει το θέμα')
  else if (subject.length > 200) errors.push('Το θέμα ξεπερνά τους 200 χαρακτήρες')
  if (!Array.isArray(input.blocks) || input.blocks.length === 0) errors.push('Το μήνυμα είναι κενό')
  if (!Array.isArray(input.recipients) || input.recipients.length === 0) errors.push('Δεν έχει επιλεγεί κανένας παραλήπτης')
  return { ok: errors.length === 0, errors }
}
