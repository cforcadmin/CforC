/**
 * Σε ποιους μπορεί να φύγει ένα newsletter.
 *
 * ΤΟ ΟΝΟΜΑ ΤΟΥ ΑΡΧΕΙΟΥ ΛΕΕΙ ΤΑ ΜΙΣΑ. Ό,τι ζει εδώ εξυπηρετεί ΚΑΙ ΤΙΣ ΔΥΟ
 * μαζικές διαδρομές: το «Newsletter» της Επικοινωνίας και το «Bulk email»
 * της Διαχείρισης. Είναι η ΙΔΙΑ διαδρομή (Kind: 'newsletter', καμπάνια στον
 * Sender, υποχρεωτικός σύνδεσμος απεγγραφής) με δύο ετικέτες στην οθόνη —
 * βλ. NEWSLETTER_DESKS στο components/oc/ocPrefs.
 *
 * Γι' αυτό το SEAT_TEST_GROUPS εδώ κάτω πρέπει να καλύπτει και τη Γραμματεία:
 * στις 6/10/2026 η hello@ πήρε «η έδρα σου δεν έχει ομάδα δοκιμών» ενώ
 * συνέθετε αληθινή πρόσκληση, επειδή το γραφείο είχε ανοίξει και η ομάδα όχι.
 *
 * ΔΕΝ ΜΕΤΟΝΟΜΑΖΕΤΑΙ: το «newsletter» δεν είναι μόνο όνομα στον κώδικα, είναι
 * ΑΠΟΘΗΚΕΥΜΕΝΗ τιμή στο πεδίο Kind των oc-campaigns. Μετονομασία μόνο στον
 * κώδικα θα έλεγε «bulk» εκεί και «newsletter» στα δεδομένα — χειρότερα από
 * σήμερα. Θέλει μετάπτωση δεδομένων, όχι αντικατάσταση κειμένου.
 *
 * ΜΟΝΟ οι δύο λίστες του Sender — και ΚΑΜΙΑ χειροκίνητη διεύθυνση.
 *
 * Το newsletter δεν είναι επίσημη ανακοίνωση προς τα μέλη· είναι μαζική
 * επικοινωνία με ανθρώπους που ΕΓΓΡΑΦΗΚΑΝ και μπορούν να απεγγραφούν. Αν
 * επιτρέπαμε ελεύθερη πληκτρολόγηση, θα έφτανε σε ανθρώπους που ποτέ δεν
 * το ζήτησαν — κάτι που ούτε νόμιμο είναι ούτε το θέλουμε. Οι δύο λίστες
 * είναι η μόνη διαδρομή, και συντηρούνται από τις εγγραφές/απεγγραφές.
 *
 * Η ομάδα «Media» (επαφές τύπου) ΔΕΝ είναι επιλογή εδώ: τα δελτία τύπου
 * φεύγουν ως κανονικό μήνυμα από το γραφείο, όχι ως newsletter με σύνδεσμο
 * απεγγραφής.
 */

export type NewsletterAudienceId = 'paid' | 'external'

export interface NewsletterAudience {
  id: NewsletterAudienceId
  label: string
  hint: string
  /** Η μεταβλητή περιβάλλοντος που κρατά το id της ομάδας στον Sender */
  envKey: 'SENDER_PAID_GROUP_ID' | 'SENDER_GROUP_ID'
}

export const NEWSLETTER_AUDIENCES: NewsletterAudience[] = [
  { id: 'paid', label: 'Μέλη', hint: 'Όλα τα ενεργά μέλη του δικτύου', envKey: 'SENDER_PAID_GROUP_ID' },
  { id: 'external', label: 'Κοινό', hint: 'Όσοι εγγράφηκαν στο newsletter από τον ιστότοπο', envKey: 'SENDER_GROUP_ID' },
]

const IDS = new Set<string>(NEWSLETTER_AUDIENCES.map(a => a.id))

/** Καθαρίζει ό,τι έρχεται από το δίκτυο σε έγκυρες, μοναδικές ομάδες */
export function normaliseAudiences(input: unknown): NewsletterAudienceId[] {
  if (!Array.isArray(input)) return []
  const out: NewsletterAudienceId[] = []
  for (const v of input) {
    const id = String(v || '').trim()
    if (IDS.has(id) && !out.includes(id as NewsletterAudienceId)) out.push(id as NewsletterAudienceId)
  }
  return out
}

/** Το id της ομάδας στον Sender, από το περιβάλλον */
export function senderGroupId(id: NewsletterAudienceId): string | undefined {
  const a = NEWSLETTER_AUDIENCES.find(x => x.id === id)
  return a ? process.env[a.envKey] : undefined
}

/**
 * Οι ομάδες «μιας θυρίδας» για την Τελική Δοκιμή.
 *
 * Κάθε έδρα δοκιμάζει στη ΔΙΚΗ της θυρίδα, μέσω του Sender — άρα με αληθινούς
 * συνδέσμους, αληθινή παρακολούθηση και αληθινό σύνδεσμο απεγγραφής.
 *
 * ΠΡΟΣΟΧΗ: η απεγγραφή στον Sender είναι ΚΑΘΟΛΙΚΗ και ΜΗ ΑΝΑΣΤΡΕΨΙΜΗ από το
 * API — μια θυρίδα που θα πατήσει «απεγγραφή» σε δοκιμή χάνει και το κανονικό
 * newsletter, και επιστρέφει μόνο με νέα εγγραφή από τη φόρμα. Γι' αυτό η
 * οθόνη προειδοποιεί πριν από την Τελική Δοκιμή.
 */
export const SEAT_TEST_GROUPS: Record<string, string> = {
  media: 'dPp8Xw',   // Δοκιμές — Media
  comms: 'aQqRZl',   // Δοκιμές — Επικοινωνία
  it: 'aOX8wR',      // Δοκιμές - ΙΤ (it@cultureforchange.net)
  admin: 'ep6121',   // Δοκιμές - Admin (hello@cultureforchange.net)
}

export interface NewsletterValidation { ok: boolean; errors: string[] }

/**
 * Έλεγχος πριν φύγει newsletter. Τα δύο λάθη που δεν συγχωρούνται είναι ίδια
 * με του μηνύματος (κενό θέμα, κενό σώμα) συν ένα δικό του: καμία λίστα.
 */
export function validateNewsletter(input: {
  subject?: string
  blocks?: unknown[]
  audiences?: unknown
}): NewsletterValidation {
  const errors: string[] = []
  const subject = String(input.subject || '').trim()
  if (!subject) errors.push('Λείπει το θέμα')
  else if (subject.length > 200) errors.push('Το θέμα ξεπερνά τους 200 χαρακτήρες')
  if (!Array.isArray(input.blocks) || input.blocks.length === 0) errors.push('Το μήνυμα είναι κενό')
  if (normaliseAudiences(input.audiences).length === 0) errors.push('Δεν έχει επιλεγεί λίστα παραληπτών')
  return { ok: errors.length === 0, errors }
}

/**
 * Τα δικά μας πεδία → ετικέτες του Sender.
 *
 * Το μήνυμα του γραφείου λύνει τα πεδία ΑΝΑ ΠΑΡΑΛΗΠΤΗ στον server μας. Το
 * newsletter δεν μπορεί: φεύγει ΕΝΑ html για όλη τη λίστα και τα πεδία τα
 * συμπληρώνει ο Sender. Άρα δεν αντικαθιστούμε τιμές — μεταφράζουμε ετικέτες.
 *
 * Ό,τι δεν έχει αντίστοιχο στον Sender (ΑΜ, έτος) ΔΕΝ μεταφράζεται: μένει ως
 * έχει και θα φανεί ως κείμενο. Καλύτερα ορατό λάθος στη δοκιμαστική αποστολή
 * παρά κενό στη θέση του ονόματος σε 400 γραμματοκιβώτια.
 */
export const SENDER_TAGS: Record<string, string> = {
  'όνομα': '{{ firstname }}',
  'επώνυμο': '{{ lastname }}',
}

export function applySenderTags(html: string): string {
  return String(html || '').replace(/\{\{\s*([^}]+?)\s*\}\}/g, (whole, token: string) => {
    const t = String(token).trim()
    // Ό,τι είναι ήδη ετικέτα του Sender μένει άθικτο
    if (/^(firstname|lastname|email|phone|unsubscribe)/i.test(t)) return whole
    return SENDER_TAGS[t] ?? whole
  })
}

/** Ποια δικά μας πεδία ΔΕΝ υποστηρίζονται σε newsletter — για προειδοποίηση */
export function unsupportedTags(html: string): string[] {
  const found = new Set<string>()
  for (const m of String(html || '').matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)) {
    const t = String(m[1]).trim()
    if (/^(firstname|lastname|email|phone|unsubscribe)/i.test(t)) continue
    if (!SENDER_TAGS[t]) found.add(t)
  }
  return [...found]
}
