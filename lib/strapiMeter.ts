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

interface Row { count: number }

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

export function record(url: string): void {
  const key = bucketOf(url)
  if (!key) return
  const row = state.tally.get(key) || { count: 0 }
  row.count += 1
  state.tally.set(key, row)
}

export function snapshot() {
  const rows = [...state.tally.entries()]
    .map(([key, r]) => ({ key, count: r.count }))
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
 * ΑΚΟΥΕΙ ΤΟ ΙΔΙΟ ΤΟ undici, ΟΧΙ ΤΟ fetch.
 *
 * Πρώτη εκδοχή τύλιγε το globalThis.fetch. Εγκαταστάθηκε κανονικά
 * (installed: true) και μετρούσε ΜΗΔΕΝ ενώ το OC έκανε δεκάδες κλήσεις: το
 * ίδιο το Next αντικαθιστά το fetch με δική του έκδοση που ξέρει από cache
 * (το φωνάζουν τα «Failed to set fetch cache» στο log), και μέσα στην
 * απόδοση η δική μου περιτύλιξη παρακάμπτεται.
 *
 * Το diagnostics_channel είναι ΚΑΤΩ από όλα αυτά: το undici — η μηχανή που
 * τελικά κάνει κάθε fetch του Node — δημοσιεύει κάθε αίτημα εκεί, όποιος κι
 * αν το ζήτησε και όσες περιτυλίξεις κι αν μεσολαβούν. Μηδέν εξαρτήσεις,
 * μέρος του Node. (16/10/2026)
 */
export function install(): void {
  if (state.installed) return
  const host = (process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL || '')
    .replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  if (!host) return

  try {
    // require, όχι import: το instrumentation τρέχει πριν στηθεί το ESM graph
    // σε ορισμένες εκδόσεις, και το diagnostics_channel είναι ενσωματωμένο.
    const dc = require('node:diagnostics_channel')
    dc.subscribe('undici:request:create', (msg: any) => {
      try {
        const origin = String(msg?.request?.origin || '')
        const path = String(msg?.request?.path || '')
        if (!origin.includes(host)) return
        record(origin + path)
      } catch { /* η μέτρηση δεν ρίχνει ΠΟΤΕ αίτημα */ }
    })
    state.installed = true
    console.log(`[strapi-meter] ενεργός (undici) — μετράει ${host}`)
  } catch (err) {
    console.error('[strapi-meter] δεν στήθηκε:', (err as Error).message)
  }
}
