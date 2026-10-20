import { BRAND } from '@/lib/campaignBlocks'

/**
 * ΤΟ ΓΡΑΜΜΑ ΓΙΝΕΤΑΙ ΣΕΛΙΔΑ — ΚΑΙ Η ΣΕΛΙΔΑ ΕΧΕΙ ΣΚΟΤΕΙΝΟ ΘΕΜΑ.
 *
 * Ο συνθέτης βγάζει HTML για email: πίνακες με ΕΝΣΩΜΑΤΑ χρώματα, γιατί τα
 * γραμματοκιβώτια δεν διαβάζουν φύλλα στυλ. Σε σελίδα όμως αυτό σημαίνει ένα
 * λευκό χαρτί καρφωμένο μέσα σε σκοτεινό site: το `dark:` του Tailwind δεν
 * αγγίζει ποτέ ένα `style="color:#2D2D2D"`.
 *
 * ΓΙΑΤΙ ΟΧΙ ΑΠΛΗ ΑΝΤΙΚΑΤΑΣΤΑΣΗ ΧΡΩΜΑΤΩΝ: το ΙΔΙΟ hex σημαίνει άλλο πράγμα
 * ανάλογα με το ΠΟΥ βρίσκεται. Το #2D2D2D είναι το κείμενο του άρθρου — αλλά
 * και το ΦΟΝΤΟ ενός κουμπιού. Το #FFFFFF είναι η κάρτα — αλλά και το κείμενο
 * ΜΕΣΑ σε εκείνο το κουμπί. Ένα τυφλό replace θα έκανε, στο σκοτεινό θέμα,
 * σκούρα γράμματα πάνω σε σκούρο κουμπί. Γι' αυτό εδώ υπάρχει στοίβα: κάθε
 * στοιχείο κρίνεται με βάση το ΦΟΝΤΟ μέσα στο οποίο ζει.
 *
 * ΤΡΙΑ ΠΛΑΙΣΙΑ:
 *  · surface — η κάρτα. Τα χρώματα γίνονται μεταβλητές και αλλάζουν θέμα.
 *  · ink     — κουμπί ή σκούρα ζώνη. ΑΝΤΙΣΤΡΕΦΕΤΑΙ, αλλιώς στο σκοτεινό θέμα
 *              το σκούρο κουμπί χάνεται μέσα στη σκούρα κάρτα.
 *  · brand   — κοραλί, κρεμ, τονισμένες ζώνες. ΔΕΝ ΑΓΓΙΖΟΝΤΑΙ ΚΑΘΟΛΟΥ: είναι
 *              η ταυτότητα, όπως ένα λογότυπο. Μένουν ίδιες στα δύο θέματα.
 *
 * Κάθε μεταβλητή κρατά το αρχικό χρώμα ως εφεδρεία — `var(--x,#2D2D2D)` —
 * ώστε αν το φύλλο στυλ δεν φορτώσει, η σελίδα να δείχνει ακριβώς ό,τι
 * δείχνει το γράμμα.
 */

/**
 * Φόντα που σημαίνουν «ταυτότητα» — ό,τι ζει μέσα τους μένει ανέπαφο.
 *
 * ΤΟ ΚΡΕΜ ΔΕΝ ΕΙΝΑΙ ΕΔΩ, ΕΠΙΤΗΔΕΣ. Είναι απόχρωση ΕΠΙΦΑΝΕΙΑΣ — ένα ελαφρώς
 * βαμμένο χαρτί για παραθέματα και κουτιά — όχι χρώμα της μάρκας όπως το
 * κοραλί. Αφημένο σταθερό, στο σκοτεινό θέμα γινόταν ένα φωτεινό νησί στη
 * μέση του άρθρου που έμοιαζε με αστοχία. Ακολουθεί το θέμα, και τα γράμματά
 * του μαζί. Το κοραλί αντίθετα ΜΕΝΕΙ κοραλί: εκεί είναι η ταυτότητα.
 */
const BRAND_BACKGROUNDS = new Set([
  BRAND.coral, BRAND.coralDeep, BRAND.coralTint,
  BRAND.warnBg, (BRAND as any).alertBg,
].filter(Boolean).map(c => String(c).toUpperCase()))

type Context = 'surface' | 'ink' | 'brand'

/** Στοιχεία χωρίς κλείσιμο — δεν ανοίγουν περιοχή */
const VOID_TAGS = new Set(['img', 'br', 'hr', 'meta', 'input', 'source', 'col'])

const up = (s: string) => s.trim().toUpperCase()

/** Σε ποιο πλαίσιο βάζει τα παιδιά του ένα φόντο */
function contextOfBackground(hex: string | null, inherited: Context): Context {
  if (!hex) return inherited
  const h = up(hex)
  if (BRAND_BACKGROUNDS.has(h)) return 'brand'
  if (h === up(BRAND.ink)) return 'ink'
  if (h === up(BRAND.white)) return 'surface'
  return inherited
}

/** Οι αντιστοιχίσεις ανά πλαίσιο: χρώμα → μεταβλητή */
const TEXT_TOKENS: Record<string, string> = {
  [up(BRAND.ink)]: '--cfc-ink',
  [up(BRAND.inkSoft)]: '--cfc-ink-soft',
  [up(BRAND.inkMuted)]: '--cfc-ink-muted',
}
const LINE_TOKENS: Record<string, string> = {
  [up(BRAND.rule)]: '--cfc-line',
  [up(BRAND.hairline)]: '--cfc-hairline',
}

const varOf = (token: string, fallback: string) => `var(${token},${fallback})`

/** Αντικαθιστά ΜΟΝΟ το hex μέσα σε μια τιμή, κρατώντας ό,τι άλλο έχει (π.χ. «1px solid») */
function swapHex(value: string, hex: string, replacement: string): string {
  return value.replace(new RegExp(hex.replace('#', '#'), 'i'), replacement)
}

/**
 * Ξαναγράφει τις δηλώσεις ενός style, με βάση το πλαίσιο ΜΕΣΑ στο οποίο
 * ισχύουν. Δουλεύει ανά ΙΔΙΟΤΗΤΑ — έτσι το `color` και το `background-color`
 * δεν μπερδεύονται ποτέ μεταξύ τους, που είναι όλο το νόημα.
 */
function rewriteStyle(style: string, ctx: Context): string {
  if (ctx === 'brand') return style

  return style.split(';').map(decl => {
    const i = decl.indexOf(':')
    if (i < 0) return decl
    const prop = decl.slice(0, i).trim().toLowerCase()
    const value = decl.slice(i + 1)
    const hexes = value.match(/#[0-9a-fA-F]{6}/g)
    if (!hexes?.length) return decl

    let out = value
    for (const hex of hexes) {
      const H = up(hex)

      if (ctx === 'ink') {
        /* Σκούρα ζώνη: το φόντο και τα γράμματά της αντιστρέφονται μαζί,
           αλλιώς στο σκοτεινό θέμα το κουμπί γίνεται αόρατο. */
        if (prop.includes('background') && H === up(BRAND.ink)) {
          out = swapHex(out, hex, varOf('--cfc-invert-bg', hex)); continue
        }
        if (prop === 'color' && H === up(BRAND.white)) {
          out = swapHex(out, hex, varOf('--cfc-invert-fg', hex)); continue
        }
        continue
      }

      /* ctx === 'surface' */
      if (prop === 'color' && TEXT_TOKENS[H]) {
        out = swapHex(out, hex, varOf(TEXT_TOKENS[H], hex)); continue
      }
      if (prop.includes('background') && H === up(BRAND.white)) {
        out = swapHex(out, hex, varOf('--cfc-surface', hex)); continue
      }
      if (prop.includes('background') && (H === up(BRAND.cream) || H === '#F5F5F5')) {
        out = swapHex(out, hex, varOf('--cfc-tint', hex)); continue
      }
      if (prop.includes('border') && LINE_TOKENS[H]) {
        out = swapHex(out, hex, varOf(LINE_TOKENS[H], hex)); continue
      }
      /* Οριζόντιες γραμμές φτιάχνονται με κελί που έχει ΦΟΝΤΟ, όχι border */
      if (prop.includes('background') && LINE_TOKENS[H]) {
        out = swapHex(out, hex, varOf(LINE_TOKENS[H], hex)); continue
      }
    }
    return `${decl.slice(0, i)}:${out}`
  }).join(';')
}

const TAG_RE = /<(\/?)([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>])*)>/g
const STYLE_RE = /style\s*=\s*"([^"]*)"/i
const BG_RE = /background(?:-color)?\s*:\s*(#[0-9a-fA-F]{6})/i

/**
 * Περνά το HTML του συνθέτη σε «δέρμα σελίδας».
 *
 * Δεν αγγίζει ΤΙΠΟΤΑ στη διαδρομή του email: καλείται μόνο όταν το
 * περιεχόμενο πάει σε σελίδα του site.
 */
export function toPageSkin(html: string): string {
  const stack: Array<{ tag: string; ctx: Context }> = []
  let out = ''
  let last = 0

  for (const m of html.matchAll(TAG_RE)) {
    const [whole, closing, rawTag, attrs] = m
    const tag = rawTag.toLowerCase()
    out += html.slice(last, m.index)
    last = (m.index ?? 0) + whole.length

    if (closing) {
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].tag === tag) { stack.length = i; break }
      }
      out += whole
      continue
    }

    const inherited = stack.length ? stack[stack.length - 1].ctx : 'surface'
    const styleMatch = attrs.match(STYLE_RE)

    let rendered = whole
    let ctx = inherited

    if (styleMatch) {
      const style = styleMatch[1]
      ctx = contextOfBackground(style.match(BG_RE)?.[1] ?? null, inherited)
      const rewritten = rewriteStyle(style, ctx)
      if (rewritten !== style) {
        rendered = whole.replace(STYLE_RE, `style="${rewritten}"`)
      }
    }

    const selfClosing = attrs.trimEnd().endsWith('/')
    if (!VOID_TAGS.has(tag) && !selfClosing) stack.push({ tag, ctx })
    out += rendered
  }

  return out + html.slice(last)
}
