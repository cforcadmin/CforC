/**
 * ΜΙΚΡΗ ΜΝΗΜΗ ΓΙΑ ΑΝΑΓΝΩΣΕΙΣ ΤΟΥ STRAPI — ΜΕ ΚΛΕΙΔΙ ΤΟ ΕΡΩΤΗΜΑ.
 *
 * ΤΙ ΜΕΤΡΗΘΗΚΕ (16/10/2026): 188 κλήσεις σε 8 λεπτά δουλειάς στο OC. Οι 44
 * ήταν πίνακες και εκκρεμότητες, οι 60 το μητρώο μελών — και σχεδόν όλες
 * ΙΔΙΑ ερωτήματα, ξαναρωτημένα. Η διαδρομή των εκκρεμοτήτων φέρνει ΟΛΟΥΣ
 * τους πίνακες, ΟΛΕΣ τις εκκρεμότητες και ΟΛΑ τα μέλη σε κάθε κλήση και
 * φιλτράρει στη μνήμη· ανοίγοντας τα οκτώ κουτιά των Διορθώσεων, το ίδιο
 * τρίο ταξίδευε οκτώ φορές.
 *
 * ΔΥΟ ΜΗΧΑΝΙΣΜΟΙ, ΟΧΙ ΕΝΑΣ:
 *
 *  · TTL — η ίδια ερώτηση μέσα στο παράθυρο απαντιέται από τη μνήμη.
 *  · ΕΝ ΠΤΗΣΕΙ — δύο ταυτόχρονες ίδιες ερωτήσεις μοιράζονται ΜΙΑ κλήση.
 *    Αυτό δεν το λύνει το TTL: όταν η οθόνη ζητά δυο φορές το ίδιο πράγμα
 *    στο ίδιο χιλιοστό, καμία από τις δύο δεν έχει προλάβει να γράψει στη
 *    μνήμη όταν ξεκινά η άλλη.
 *
 * ΦΡΕΣΚΑΔΑ: όποια διαδρομή ΓΡΑΦΕΙ, καλεί invalidate() — αλλιώς ο χρήστης
 * προσθέτει εκκρεμότητα και δεν τη βλέπει, που είναι χειρότερο από μια
 * κλήση παραπάνω.
 *
 * Η κατάσταση ζει στο globalThis: στην ανάπτυξη το ίδιο module φορτώνεται
 * σε πολλά πακέτα και δύο αντίγραφα θα κρατούσαν δύο μνήμες.
 */

interface Entry { at: number; value: unknown }

interface CacheState {
  entries: Map<string, Entry>
  inflight: Map<string, Promise<unknown>>
}

const KEY = Symbol.for('cforc.strapiCache')
const g = globalThis as any
const state: CacheState = g[KEY] || (g[KEY] = { entries: new Map(), inflight: new Map() })

/** Στα τεστ ΠΟΤΕ: η μνήμη ζει όσο η διεργασία και το ένα τεστ θα τάιζε το άλλο */
const enabled = () => process.env.NODE_ENV !== 'test'

export async function cachedJson<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  if (!enabled()) return loader()

  const hit = state.entries.get(key)
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as T

  const flying = state.inflight.get(key)
  if (flying) return flying as Promise<T>

  const p = (async () => {
    try {
      const value = await loader()
      state.entries.set(key, { at: Date.now(), value })
      return value
    } finally {
      state.inflight.delete(key)
    }
  })()
  state.inflight.set(key, p)
  return p as Promise<T>
}

/**
 * Σβήνει ό,τι αρχίζει με αυτό το πρόθεμα. Χωρίς όρισμα, τα πάντα.
 *
 * Καλείται ΜΕΤΑ από επιτυχημένη εγγραφή και πριν γυρίσει η απάντηση: έτσι
 * η επόμενη ανάγνωση — που συνήθως είναι η ίδια η οθόνη που μόλις έγραψε —
 * βλέπει το νέο δεδομένο.
 */
export function invalidate(prefix?: string): void {
  if (!prefix) {
    state.entries.clear()
    return
  }
  for (const k of state.entries.keys()) {
    if (k.startsWith(prefix)) state.entries.delete(k)
  }
}

/** Για διάγνωση: τι κρατιέται αυτή τη στιγμή */
export function cacheKeys(): string[] {
  return [...state.entries.keys()]
}
