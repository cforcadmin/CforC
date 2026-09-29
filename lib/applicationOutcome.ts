/**
 * Απόδειξη ότι η διαδικασία απόρριψης τηρήθηκε — ΧΩΡΙΣ προσωπικά δεδομένα.
 *
 * Απόφαση ΟΣ, 29/9/2026: μια αίτηση που δεν πληρώθηκε μέσα σε 30 ημέρες από
 * την έγκριση σβήνεται ολόκληρη, αλλά πρέπει να μπορούμε να αποδείξουμε ότι
 * ακολουθήσαμε τη σωστή διαδικασία — ότι φύγαν οι υπενθυμίσεις των 15 και 28
 * ημερών και ότι η προθεσμία όντως πέρασε. Ο ίδιος κανόνας ισχύει και για τις
 * απορριφθείσες με ψήφο.
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
  ClosedAt: string
  DaysElapsed: number | null
  Reminder15SentAt?: string | null
  Reminder28SentAt?: string | null
  PhotoRemoved: boolean
  SheetRowRemoved: boolean
  Pending?: string | null
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
 * Ο ΚΑΛΩΝ ΔΕΝ ΕΠΙΤΡΕΠΕΤΑΙ ΝΑ ΣΒΗΣΕΙ ΑΝ ΑΥΤΟ ΓΥΡΙΣΕΙ `false`.
 *
 * Η σειρά είναι ΠΡΩΤΑ η απόδειξη και ΜΕΤΑ η διαγραφή, όχι το αντίστροφο: αν
 * σβήσουμε πρώτα και αποτύχει η εγγραφή, η απόδειξη χάθηκε για πάντα και δεν
 * υπάρχει από πού να ξαναγραφτεί. Ανάποδα, μια απόδειξη για αίτηση που τελικά
 * δεν σβήστηκε διορθώνεται μόνη της: η επόμενη εκτέλεση ξαναδοκιμάζει τη
 * διαγραφή και το `outcomeExists` εμποδίζει τη διπλοεγγραφή.
 */
export async function recordOutcome(rec: OutcomeRecord): Promise<boolean> {
  try {
    if (await outcomeExists(rec.ApplicationRef)) return true
    const r = await strapi('/oc-application-outcomes', 'POST', {
      ...rec,
      Pending: rec.Pending?.slice(0, 900) || null,
    })
    return r.ok
  } catch {
    return false
  }
}

/** Οι αποδείξεις, νεότερη πρώτη — για την οθόνη και για έλεγχο */
export async function fetchOutcomes(limit = 200): Promise<OutcomeRecord[]> {
  const r = await strapi(`/oc-application-outcomes?pagination[limit]=${limit}&sort[0]=ClosedAt:desc`)
  if (r.status === 404) throw new Error('η συλλογή δεν υπάρχει ακόμη στο Strapi Cloud')
  if (!r.ok) throw new Error(`Strapi ${r.status}`)
  return (r.json?.data || []) as OutcomeRecord[]
}
