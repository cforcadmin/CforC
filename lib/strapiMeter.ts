/**
 * ΜΕΤΡΗΤΗΣ ΚΛΗΣΕΩΝ ΠΡΟΣ ΤΟ STRAPI — ΜΟΝΟ ΣΤΗΝ ΑΝΑΠΤΥΞΗ.
 *
 * ΓΙΑΤΙ ΥΠΑΡΧΕΙ (16/10/2026): το μηνιαίο όριο είναι 50.000 και δύο ώρες
 * δουλειάς κόστισαν 1.200 κλήσεις — σαράντα φορές τη ρελαντί κατανάλωση.
 * Πριν κόψουμε κάτι, θέλουμε να ξέρουμε ΤΙ τρώει, όχι τι φανταζόμαστε ότι
 * τρώει: οι τρεις προηγούμενες εικασίες μου (επισκέπτες, cron, σελίδα μελών)
 * ήταν όλες λάθος.
 *
 * ΓΙΑΤΙ ΤΥΛΙΓΕΙ ΤΟ ΚΑΘΟΛΙΚΟ fetch: οι διαδρομές του OC ΔΕΝ περνούν από το
 * lib/strapi — καθεμιά έχει δικό της μικρό `strapi()`. Ένας μετρητής σε μία
 * βιβλιοθήκη θα έβλεπε το ένα τρίτο της εικόνας και θα μας έστελνε να
 * βελτιστοποιήσουμε λάθος πράγμα. Το fetch είναι το ΜΟΝΟ κοινό σημείο.
 *
 * ΔΕΝ ΤΡΕΧΕΙ ΠΟΤΕ ΣΤΗΝ ΠΑΡΑΓΩΓΗ: το instrumentation το καλεί μόνο όταν
 * NODE_ENV !== 'production'.
 */

interface Row { count: number; ms: number }

/**
 * Η ΚΑΤΑΣΤΑΣΗ ΖΕΙ ΣΤΟ globalThis, ΟΧΙ ΣΤΟ MODULE.
 *
 * Πρώτη εκδοχή την κρατούσε σε μεταβλητές του αρχείου και ο μετρητής
 * έδειχνε 0 ενώ οι κλήσεις γίνονταν: στην ανάπτυξη το instrumentation και η
 * διαδρομή του API μπαίνουν σε ΔΙΑΦΟΡΕΤΙΚΑ πακέτα, άρα κρατούσαν δύο
 * αντίγραφα του ίδιου module — το ένα μετρούσε, το άλλο διάβαζε.
 * Το globalThis είναι ένα ανά διεργασία. (16/10/2026)
 */
interface MeterState { tally: Map<string, Row>; since: number; installed: boolean }
const KEY = Symbol.for('cforc.strapiMeter')
const g = globalThis as any
const state: MeterState = g[KEY] || (g[KEY] = { tally: new Map(), since: Date.now(), installed: false })

/** Ομαδοποίηση ανά ΕΙΔΟΣ κλήσης, όχι ανά ακριβές URL — αλλιώς κάθε
 *  σελιδοποίηση και κάθε documentId γίνεται δική της γραμμή και δεν
 *  φαίνεται το μοτίβο. */
export function bucketOf(url: string): string | null {
  const m = url.match(/\/api\/([^/?]+)(\/[^/?]+)?/)
  if (!m) return url.includes('/_health') ? '_health' : null
  const collection = m[1]
  const one = m[2] ? ' (ένα)' : ''
  const q = url.includes('pagination[start]') ? ' +σελίδες' : ''
  return `${collection}${one}${q}`
}

export function record(url: string, ms: number): void {
  const key = bucketOf(url)
  if (!key) return
  const row = state.tally.get(key) || { count: 0, ms: 0 }
  row.count += 1
  row.ms += ms
  state.tally.set(key, row)
}

export function snapshot() {
  const rows = [...state.tally.entries()]
    .map(([key, r]) => ({ key, count: r.count, avgMs: Math.round(r.ms / r.count) }))
    .sort((a, b) => b.count - a.count)
  const total = rows.reduce((s, r) => s + r.count, 0)
  const minutes = Math.max(1, Math.round((Date.now() - state.since) / 60000))
  return { installed: state.installed, total, perHour: Math.round((total / minutes) * 60), minutes, rows }
}

export function reset(): void {
  state.tally.clear()
  state.since = Date.now()
}

/**
 * Τυλίγει το fetch ΜΙΑ φορά. Η μέτρηση δεν αλλάζει ούτε την απάντηση ούτε
 * τη σειρά: καταγράφει και παραδίδει ό,τι γύρισε, ακόμη κι όταν σκάει.
 */
export function install(): void {
  if (state.installed) return
  const host = (process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL || '')
    .replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  if (!host) return
  const original = globalThis.fetch
  globalThis.fetch = async (input: any, init?: any) => {
    const url = typeof input === 'string' ? input : input?.url || String(input)
    if (!url.includes(host)) return original(input, init)
    const t0 = Date.now()
    try {
      return await original(input, init)
    } finally {
      record(url, Date.now() - t0)
    }
  }
  state.installed = true
  console.log('[strapi-meter] ενεργός — /api/dev/strapi-meter για τη μέτρηση')
}
