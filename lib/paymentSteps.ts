/**
 * ΤΑ ΒΗΜΑΤΑ ΤΗΣ ΠΛΗΡΩΜΗΣ — και πώς ξέρουμε ποιο έγινε.
 *
 * ΤΟ ΠΕΡΙΣΤΑΤΙΚΟ (7/10/2026): το «Πληρώθηκε» προήγαγε το Μητρώο και η
 * συνάρτηση σκοτώθηκε στα 60 δευτερόλεπτα. Κανένα μέλος, καμία απόδειξη,
 * κανένα email — και η οθόνη δεν είπε ΤΙΠΟΤΑ, γιατί η απάντηση δεν γύρισε
 * ποτέ. Η μισοτελειωμένη εγγραφή έμεινε αόρατη ώσπου το πρόσεξε άνθρωπος.
 *
 * Η ΚΑΤΑΣΤΑΣΗ ΔΙΑΒΑΖΕΤΑΙ ΑΠΟ ΤΗΝ ΠΡΑΓΜΑΤΙΚΟΤΗΤΑ, ΟΧΙ ΑΠΟ ΗΜΕΡΟΛΟΓΙΟ.
 *
 * Θα ήταν πιο εύκολο να γράφαμε «βήμα 3: ok» κάπου και να το δείχναμε. Αλλά
 * ένα ημερολόγιο λέει τι ΝΟΜΙΣΑΜΕ ότι έγινε· αν η εγγραφή αποτύχει μετά το
 * γράψιμο, ή κάποιος σβήσει την απόδειξη από το Strapi, το ημερολόγιο μένει
 * να λέει ψέματα για πάντα. Εδώ κάθε βήμα ρωτάει το ΔΙΚΟ του αποδεικτικό:
 * υπάρχει μέλος; υπάρχει απόδειξη; έχει SentAt; έχει SheetSynced;
 *
 * Έτσι η οθόνη είναι σωστή ακόμη κι αν τα βήματα έγιναν αλλού — χειροκίνητα,
 * από άλλη διαδρομή, ή σε δεύτερη προσπάθεια.
 */

export type PaymentStepKey =
  | 'registry'      // Μητρώο: προαγωγή στο Sheet, επιστρέφει ΑΜ
  | 'member'        // Μέλος στο Strapi (δημιουργία ή ενεργοποίηση)
  | 'receipt'       // Έκδοση απόδειξης με αριθμό σειράς
  | 'receiptEmail'  // Αποστολή απόδειξης (PDF) στο μέλος
  | 'esoda'         // ΕΣΟΔΑ-ΕΞΟΔΑ + αρχειοθέτηση στο Drive
  | 'welcome'       // Welcome / πρώτη σύνδεση

export type StepState = 'done' | 'failed' | 'pending' | 'blocked'

export interface PaymentStep {
  key: PaymentStepKey
  label: string
  state: StepState
  /** Γιατί δεν μπορεί να τρέξει τώρα — μόνο για 'blocked' */
  because?: string
}

export const PAYMENT_STEP_ORDER: PaymentStepKey[] = [
  'registry', 'member', 'receipt', 'receiptEmail', 'esoda', 'welcome',
]

export const PAYMENT_STEP_LABELS: Record<PaymentStepKey, string> = {
  registry: 'Μητρώο (ΑΜ)',
  member: 'Μέλος',
  receipt: 'Απόδειξη',
  receiptEmail: 'Email απόδειξης',
  esoda: 'ΕΣΟΔΑ + Drive',
  welcome: 'Welcome email',
}

export interface StepEvidence {
  /** Το μέλος στο Strapi, αν βρέθηκε */
  member?: { documentId?: string; AM?: number | string | null } | null
  /** Η απόδειξη εγγραφής/συνδρομής για το έτος, αν βρέθηκε */
  receipt?: { Number?: number; SentAt?: string | null; SheetSynced?: boolean | null } | null
  /** Σφραγίδα welcome — το μόνο βήμα χωρίς δικό του αποδεικτικό */
  welcomeSentAt?: string | null
}

/**
 * Από τα αποδεικτικά στις καταστάσεις.
 *
 * ΤΟ ΚΛΕΙΔΩΜΕΝΟ ('blocked') ΔΕΝ ΕΙΝΑΙ ΑΠΟΤΥΧΙΑ: είναι βήμα που δεν ΜΠΟΡΕΙ να
 * τρέξει ακόμη, γιατί λείπει αυτό που χρειάζεται. Δεν βάφεται κόκκινο και
 * δεν πατιέται — αλλιώς ο χρήστης θα ξαναπατούσε κάτι που θα αποτύγχανε για
 * λόγο που δεν φταίει αυτός.
 */
export function deriveSteps(ev: StepEvidence): PaymentStep[] {
  const hasMember = !!ev.member?.documentId
  const hasAm = ev.member?.AM !== null && ev.member?.AM !== undefined && ev.member?.AM !== ''
  const r = ev.receipt
  const hasReceipt = !!r?.Number

  const state = (key: PaymentStepKey): { state: StepState; because?: string } => {
    switch (key) {
      // Το ΑΜ υπάρχει μόνο αν το Μητρώο προήγαγε — είναι το αποδεικτικό του.
      case 'registry': return { state: hasAm ? 'done' : 'pending' }
      case 'member': return { state: hasMember ? 'done' : 'pending' }
      case 'receipt':
        if (hasReceipt) return { state: 'done' }
        return hasMember ? { state: 'pending' }
          : { state: 'blocked', because: 'Χρειάζεται πρώτα το μέλος' }
      case 'receiptEmail':
        if (r?.SentAt) return { state: 'done' }
        return hasReceipt ? { state: 'pending' }
          : { state: 'blocked', because: 'Χρειάζεται πρώτα η απόδειξη' }
      case 'esoda':
        if (r?.SheetSynced) return { state: 'done' }
        return hasReceipt ? { state: 'pending' }
          : { state: 'blocked', because: 'Χρειάζεται πρώτα η απόδειξη' }
      case 'welcome':
        if (ev.welcomeSentAt) return { state: 'done' }
        return hasMember ? { state: 'pending' }
          : { state: 'blocked', because: 'Χρειάζεται πρώτα το μέλος' }
    }
  }

  return PAYMENT_STEP_ORDER.map(key => ({
    key, label: PAYMENT_STEP_LABELS[key], ...state(key),
  }))
}

/** Ολοκληρώθηκαν όλα; Τότε η αίτηση μπορεί να κλείσει. */
export const allStepsDone = (steps: PaymentStep[]): boolean =>
  steps.every(s => s.state === 'done')

/** Πόσα έγιναν — για τη σύνοψη «3 από 6» */
export const doneCount = (steps: PaymentStep[]): number =>
  steps.filter(s => s.state === 'done').length
