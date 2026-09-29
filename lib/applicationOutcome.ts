/**
 * Απόδειξη ότι η διαδικασία τηρήθηκε — ΧΩΡΙΣ προσωπικά δεδομένα.
 *
 * Απόφαση ΟΣ, 29/9/2026, ρητή και επαναλαμβανόμενη: **το υποψήφιο μέλος ΔΕΝ
 * διαγράφεται ποτέ αυτόματα**. Η διαγραφή γίνεται ΧΕΙΡΟΚΙΝΗΤΑ.
 *
 * Ο ρόλος αυτής της εγγραφής είναι να γραφτεί ΟΤΑΝ ΛΗΞΕΙ Η ΠΡΟΘΕΣΜΙΑ και να
 * παραμείνει αφού κάποιος άνθρωπος κάνει τη διαγραφή — ώστε να μπορούμε να
 * αποδείξουμε ότι φύγαν οι υπενθυμίσεις των 15 και 28 ημερών και ότι η
 * προθεσμία όντως πέρασε, χωρίς να κρατάμε ποιος ήταν.
 *
 * ΤΙ ΔΕΝ ΜΠΑΙΝΕΙ ΕΔΩ: όνομα, email, τηλέφωνο, ούτε hash τους. Σε πληθυσμό
 * λίγων εκατοντάδων ένα hash email αντιστρέφεται με απλή δοκιμή, άρα θα ήταν
 * ψευδωνυμοποιημένο προσωπικό δεδομένο και όχι ανώνυμο — δηλαδή θα ακύρωνε
 * ακριβώς αυτό που υποσχεθήκαμε στα γράμματα.
 *
 * Το `ApplicationRef` είναι το παλιό documentId: τυχαία συμβολοσειρά του
 * Strapi που, μετά τη διαγραφή της αίτησης, δεν δείχνει πουθενά.
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

export type OutcomeKind = 'no-payment-30d' | 'rejected-by-vote'

export interface OutcomeRecord {
  ApplicationRef: string
  Outcome: OutcomeKind
  DecisionDate: string | null
  /** Πότε πέρασε η προθεσμία — ΟΧΙ πότε έγινε η διαγραφή */
  DeadlineExpiredAt: string
  DaysElapsed: number | null
  Reminder15SentAt?: string | null
  Reminder28SentAt?: string | null
  /** Πότε ζητήθηκε από την community@ να σβήσει */
  DeletionRequestedAt?: string | null
  /** Πότε επιβεβαιώθηκε η χειροκίνητη διαγραφή — μένει κενό ώσπου να γίνει */
  DeletionConfirmedAt?: string | null
}

async function strapi(path: string, method = 'GET', data?: unknown) {
  const res = await fetch(`${STRAPI_URL}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${STRAPI_API_TOKEN}` },
    ...(data !== undefined && { body: JSON.stringify({ data }) }),
    cache: 'no-store',
  })
  let json: any = null
  try { json = await res.json() } catch { /* 204 */ }
  return { ok: res.ok, status: res.status, json }
}

/** Υπάρχει ήδη απόδειξη γι' αυτή την αίτηση; (η διαγραφή μπορεί να ξαναδοκιμαστεί) */
export async function outcomeExists(applicationRef: string): Promise<boolean> {
  const r = await strapi(
    `/oc-application-outcomes?pagination[limit]=1&fields[0]=ApplicationRef`
    + `&filters[ApplicationRef][$eq]=${encodeURIComponent(applicationRef)}`)
  return !!(r.json?.data || []).length
}

/**
 * Γράφει την απόδειξη. Επιστρέφει `false` αν απέτυχε.
 *
 * Γράφεται μία φορά, όταν λήξει η προθεσμία — πολύ πριν τη χειροκίνητη
 * διαγραφή. Έτσι, όποτε κι αν γίνει η διαγραφή, η απόδειξη υπάρχει ήδη και
 * επιβιώνει. Το `outcomeExists` εμποδίζει τη διπλοεγγραφή στην επόμενη
 * ημερήσια εκτέλεση.
 */
export async function recordOutcome(rec: OutcomeRecord): Promise<boolean> {
  try {
    if (await outcomeExists(rec.ApplicationRef)) return true
    const r = await strapi('/oc-application-outcomes', 'POST', rec)
    return r.ok
  } catch {
    return false
  }
}

/** Οι αποδείξεις, νεότερη πρώτη — για την οθόνη και για έλεγχο */
export async function fetchOutcomes(limit = 100): Promise<OutcomeRecord[]> {
  const r = await strapi(`/oc-application-outcomes?pagination[limit]=${limit}&sort[0]=DeadlineExpiredAt:desc`)
  if (r.status === 404) throw new Error('η συλλογή δεν υπάρχει ακόμη στο Strapi Cloud')
  if (!r.ok) throw new Error(`Strapi ${r.status}`)
  return (r.json?.data || []) as OutcomeRecord[]
}
