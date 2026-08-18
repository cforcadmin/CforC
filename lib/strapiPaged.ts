/**
 * Σελιδοποιημένη ανάγνωση από το Strapi.
 *
 * ΤΟ ΠΡΟΒΛΗΜΑ: το Strapi **αγνοεί σιωπηλά** το `pagination[limit]` πάνω από
 * 100. Ζητάς 1000, παίρνεις 100, και τίποτα δεν σου το λέει — ούτε σφάλμα,
 * ούτε προειδοποίηση. Στις 18/8/2026 το μητρώο είχε 116 μέλη και κάθε
 * τέτοιο ερώτημα έβλεπε τα 100· ο matcher της τράπεζας δεν έβρισκε 16 μέλη
 * και οι δείκτες υπολόγιζαν σε λάθος παρονομαστή.
 *
 * Κανόνας: για οτιδήποτε μπορεί να ξεπεράσει τα 100, ΠΑΝΤΑ από εδώ.
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

const PAGE_SIZE = 100
/** Δικλείδα: 50 σελίδες = 5.000 εγγραφές. Πέρα από εκεί κάτι πάει λάθος. */
const MAX_PAGES = 50

export interface PagedResult<T = any> {
  ok: boolean
  data: T[]
  total: number
  /** true αν φτάσαμε στο όριο σελίδων — τα δεδομένα είναι ΕΛΛΙΠΗ */
  truncated: boolean
  status?: number
}

/**
 * `path` χωρίς παραμέτρους σελιδοποίησης — προστίθενται εδώ.
 * Δέχεται και ερωτηματικό μέσα (φίλτρα/πεδία): κολλάει σωστά το & ή το ?.
 */
export async function strapiAll<T = any>(path: string): Promise<PagedResult<T>> {
  if (!STRAPI_URL || !STRAPI_API_TOKEN) {
    console.error('strapiAll: λείπει STRAPI_URL ή STRAPI_API_TOKEN')
    return { ok: false, data: [], total: 0, truncated: false }
  }
  const join = path.includes('?') ? '&' : '?'
  const out: T[] = []
  let total = 0
  let page = 1

  while (page <= MAX_PAGES) {
    const url = `${STRAPI_URL}/api${path}${join}pagination[page]=${page}&pagination[pageSize]=${PAGE_SIZE}`
    let res: Response
    try {
      res = await fetch(url, {
        headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
        cache: 'no-store',
      })
    } catch (err) {
      console.error('strapiAll: fetch threw', path, err)
      return { ok: false, data: out, total, truncated: true }
    }
    if (!res.ok) {
      console.error('strapiAll:', res.status, path)
      return { ok: false, data: out, total, truncated: page > 1, status: res.status }
    }
    const json: any = await res.json().catch(() => null)
    const batch: T[] = json?.data || []
    out.push(...batch)
    total = json?.meta?.pagination?.total ?? out.length
    const pageCount = json?.meta?.pagination?.pageCount ?? 1
    if (page >= pageCount || batch.length === 0) {
      return { ok: true, data: out, total, truncated: false }
    }
    page++
  }
  console.error(`strapiAll: έφτασε το όριο ${MAX_PAGES} σελίδων — ${path}`)
  return { ok: true, data: out, total, truncated: true }
}
