/**
 * ΤΟ fetch ΠΡΟΣ ΤΟ STRAPI, ΜΕ ΑΝΟΧΗ ΣΕ ΠΕΣΜΕΝΗ ΣΥΝΔΕΣΗ.
 *
 * ΤΟ ΠΡΟΒΛΗΜΑ (20/10/2026, μετρημένο): σε ~60 κλήσεις προς το Strapi Cloud
 * τέσσερις γύρισαν `ECONNRESET` — σε ριπές, και δύο φορές ΔΥΟ στη σειρά.
 * Δεν φταίει το μέγεθος, τα δεδομένα ή η ρύθμιση: η σύνδεση κόβεται από την
 * άλλη πλευρά, συνήθως στην πρώτη κλήση μετά από αδράνεια. Η δημοσίευση
 * ενός άρθρου έσκασε έτσι, και η οθόνη είπε «Εσωτερικό σφάλμα».
 *
 * ΓΙΑΤΙ ΔΕΝ ΜΠΗΚΕ ΣΕ ΕΝΑ ΣΗΜΕΙΟ: δεν υπάρχει ένα σημείο. Σαράντα επτά
 * διαδρομές γράφουν στο Strapi και καθεμιά έχει δικό της μικρό `strapi()`
 * — το ίδιο εύρημα που κατέγραψε ο `lib/strapiMeter`. Το καθολικό `fetch`
 * δεν είναι λύση εδώ: το Next το αντικαθιστά με δική του έκδοση κατά την
 * απόδοση, οπότε η περιτύλιξη παρακάμπτεται (αυτό ακριβώς έπαθε ο μετρητής
 * και γι' αυτό κατέληξε στο diagnostics_channel, που παρατηρεί αλλά δεν
 * μπορεί να ξαναστείλει). Άρα: αντικαταστάτης με ΙΔΙΑ υπογραφή, ώστε κάθε
 * κλήση να αλλάζει μόνο όνομα και τίποτε άλλο.
 *
 * ========================= Ο ΚΑΝΟΝΑΣ ΑΣΦΑΛΕΙΑΣ =========================
 * Επαναλαμβάνονται ΜΟΝΟ οι κλήσεις που δεν πειράζει να γίνουν δύο φορές:
 * GET, HEAD, PUT, DELETE. Το PUT και το DELETE είναι ταυτοδύναμα — γράφουν
 * την ίδια τελική κατάσταση όσες φορές κι αν σταλούν.
 *
 * Το POST ΔΕΝ επαναλαμβάνεται ΠΟΤΕ εδώ. Μια αποτυχία στο διάβασμα δεν λέει
 * αν το Strapi πρόλαβε να γράψει· τυφλή επανάληψη σημαίνει δεύτερο άρθρο,
 * δεύτερη απόδειξη, δεύτερη εγγραφή εσόδου. Όπου χρειάζεται δεύτερη
 * ευκαιρία σε δημιουργία, ρωτιέται πρώτα αν η εγγραφή υπάρχει ήδη — βλ.
 * `createWithWitness` στο app/api/oc/content/route.ts.
 * =======================================================================
 */

/** Αστοχία ΜΕΤΑΦΟΡΑΣ: δεν πήραμε απάντηση. Διαφέρει από «το Strapi είπε όχι». */
/**
 * Το ΕΡΩΤΗΜΑ απέτυχε — δεν είναι «δεν βρέθηκε».
 *
 * 23/10/2026: το `ConfirmTokenHash` ήταν `private` στο Strapi, που κόβει τα
 * private πεδία από τα φίλτρα και μετά απορρίπτει το ερώτημα με
 * 400 «Invalid key». Και οι τρεις διαδρομές διάβαζαν σκέτο `json?.data?.[0]`,
 * οπότε το σφάλμα έφτανε στον κόσμο ως «ο σύνδεσμος δεν ισχύει, ίσως
 * αντιγράφηκε μισός» — μήνυμα που έστειλε και τον κόσμο και εμάς να ψάχνουμε
 * κομμένο σύνδεσμο που δεν υπήρξε ποτέ. Δεκαέξι δηλώσεις κόλλησαν.
 *
 * Ένα αποτυχημένο ερώτημα ΔΕΝ επιτρέπεται να μοιάζει με άδειο αποτέλεσμα.
 */
export class StrapiQueryError extends Error {
  constructor(public status: number, public detail: string, public path: string) {
    super(`Strapi ${status} στο ${path}: ${detail}`)
    this.name = 'StrapiQueryError'
  }
}

/** Βγάζει το μήνυμα του Strapi από την απάντηση, για να μη χαθεί η αιτία. */
export function strapiErrorText(json: unknown): string {
  const e = (json as { error?: { name?: string; message?: string } } | null)?.error
  return [e?.name, e?.message].filter(Boolean).join(' — ') || 'άγνωστο σφάλμα'
}

export function isTransportFailure(err: unknown): boolean {
  if (err instanceof DOMException && err.name === 'AbortError') return false
  return err instanceof TypeError || !!(err as any)?.cause?.code
}

const RETRIABLE = new Set(['GET', 'HEAD', 'PUT', 'DELETE'])

/**
 * Τρεις προσπάθειες, όχι δύο: μετρήθηκαν ΔΥΟ διαδοχικές αστοχίες σε ριπή,
 * οπότε μία επανάληψη θα άφηνε ακριβώς εκείνη την περίπτωση ακάλυπτη.
 */
const ATTEMPTS = 3

export async function strapiFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const method = String(init?.method || 'GET').toUpperCase()
  /* Το σώμα ενός αιτήματος διαβάζεται ΜΙΑ φορά. Όταν είναι ροή (π.χ.
     FormData από ανέβασμα), η δεύτερη προσπάθεια θα έστελνε άδειο σώμα —
     χειρότερο από την αποτυχία, γιατί μοιάζει με επιτυχία. */
  const replayable = !init?.body || typeof init.body === 'string'
  const attempts = RETRIABLE.has(method) && replayable ? ATTEMPTS : 1

  let last: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      return await fetch(input as any, init)
    } catch (err) {
      last = err
      if (!isTransportFailure(err) || i === attempts - 1) throw err
      await new Promise(r => setTimeout(r, 250 * (i + 1)))
    }
  }
  throw last
}
