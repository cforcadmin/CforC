import fs from 'node:fs'
import path from 'node:path'

/**
 * ΚΑΝΕΝΑ ΠΕΔΙΟ ΠΟΥ ΤΟ ΦΙΛΤΡΑΡΟΥΜΕ ΔΕΝ ΕΠΙΤΡΕΠΕΤΑΙ ΝΑ ΕΙΝΑΙ `private`.
 *
 * 23/10/2026. Το `ConfirmTokenHash` ήταν `private: true`. Το Strapi v5 κόβει
 * τα private πεδία από τα φίλτρα και μετά απορρίπτει το ερώτημα με
 * 400 «Invalid key ConfirmTokenHash» — δηλαδή η επιβεβαίωση συμμετοχής δεν
 * έβρισκε ΠΟΤΕ τη δήλωση. Δεκαέξι άνθρωποι πήραν «ο σύνδεσμος δεν ισχύει»
 * για σύνδεσμο που ήταν σωστός, και το ίδιο έσπαγε και τα εξοδολόγια.
 *
 * Τίποτα δεν το έπιανε: ο κώδικας έκανε compile, τα τεστ περνούσαν, και το
 * σφάλμα ζούσε σε ΔΥΟ αρχεία που δεν κοιτάζει κανείς μαζί — ένα schema.json
 * και μια διαδρομή. Αυτό το τεστ τα κοιτάζει μαζί.
 */

const ROOT = path.join(__dirname, '..', '..')
const SCHEMAS = path.join(ROOT, 'StrapiDBforCforC', 'src', 'api')

/** Κάθε συλλογή → τα πεδία της που είναι private. */
function privateFieldsByCollection(): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>()
  if (!fs.existsSync(SCHEMAS)) return out
  for (const api of fs.readdirSync(SCHEMAS)) {
    const dir = path.join(SCHEMAS, api, 'content-types')
    if (!fs.existsSync(dir)) continue
    for (const ct of fs.readdirSync(dir)) {
      const file = path.join(dir, ct, 'schema.json')
      if (!fs.existsSync(file)) continue
      const s = JSON.parse(fs.readFileSync(file, 'utf8'))
      const plural = s?.info?.pluralName
      if (!plural) continue
      const priv = new Set<string>()
      for (const [k, v] of Object.entries<any>(s.attributes || {})) if (v?.private === true) priv.add(k)
      out.set(plural, priv)
    }
  }
  return out
}

/** Κάθε `filters[X]` στον κώδικα, μαζί με τη συλλογή της διαδρομής. */
function filtersInSource(): { collection: string; field: string; file: string }[] {
  const hits: { collection: string; field: string; file: string }[] = []
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name)
      if (e.isDirectory()) { if (e.name !== 'node_modules') walk(full); continue }
      if (!/\.tsx?$/.test(e.name)) continue
      const src = fs.readFileSync(full, 'utf8')
      // `/api/<plural>?...filters[Field]` στην ΙΔΙΑ συμβολοσειρά-διαδρομή
      for (const m of src.matchAll(/\/(?:api\/)?([a-z0-9-]+)\?([^`'"]*)/g)) {
        const [, collection, query] = m
        for (const f of query.matchAll(/filters\[([A-Za-z0-9_]+)\]/g)) {
          hits.push({ collection, field: f[1], file: path.relative(ROOT, full) })
        }
      }
    }
  }
  for (const d of ['app', 'lib', 'scripts']) {
    const p = path.join(ROOT, d)
    if (fs.existsSync(p)) walk(p)
  }
  return hits
}

describe('τα φιλτραρισμένα πεδία δεν είναι private', () => {
  const priv = privateFieldsByCollection()

  it('βρίσκει τα schema του Strapi — αλλιώς το τεστ δεν ελέγχει τίποτα', () => {
    expect(priv.size).toBeGreaterThan(5)
  })

  /** ΤΟ ΣΥΓΚΕΚΡΙΜΕΝΟ ΣΦΑΛΜΑ: αν ξαναμπεί το private, σπάει εδώ. */
  it.each(['ConfirmTokenHash', 'ClaimTokenHash'])(
    'το %s του event-registration ΔΕΝ είναι private', field => {
      expect(priv.get('event-registrations')?.has(field)).toBe(false)
    })

  it('καμία διαδρομή δεν φιλτράρει σε private πεδίο', () => {
    const bad = filtersInSource().filter(h => priv.get(h.collection)?.has(h.field))
    expect(bad.map(b => `${b.file}: filters[${b.field}] στο ${b.collection}`)).toEqual([])
  })
})
