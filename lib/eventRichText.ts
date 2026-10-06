/**
 * Η περιγραφή της δράσης, έτοιμη για απόδοση.
 *
 * ΤΟ ΠΡΟΒΛΗΜΑ ΠΟΥ ΛΥΝΕΙ: ως σήμερα η περιγραφή γραφόταν σε textarea και η
 * σελίδα την τύπωνε ως ΚΕΙΜΕΝΟ (`{ev.Description}` με whitespace-pre-line).
 * Μόλις ο συντάκτης αποκτά έντονα και συνδέσμους, το αποθηκευμένο γίνεται
 * HTML — και η ίδια σελίδα θα έδειχνε «<p><strong>…» με τις ετικέτες ορατές.
 *
 * ΔΥΟ ΜΟΡΦΕΣ ΣΤΗΝ ΙΔΙΑ ΣΤΗΛΗ, άρα η απόφαση παίρνεται από το περιεχόμενο:
 *   - έχει ετικέτες  → καθαρίζεται και περνά ως HTML
 *   - δεν έχει       → είναι παλιό απλό κείμενο· διαφεύγει και οι αλλαγές
 *                      γραμμής γίνονται παράγραφοι, όπως φαινόταν πριν
 *
 * ΔΕΝ ΜΕΤΑΤΡΕΠΟΥΜΕ ΤΑ ΠΑΛΙΑ ΔΕΔΟΜΕΝΑ. Μια μαζική μετατροπή σε HTML θα
 * άλλαζε 1.527 χαρακτήρες ζωντανού κειμένου για να γλιτώσει δέκα γραμμές
 * κώδικα — και αν κάτι πήγαινε στραβά, η πρόσκληση θα έσπαγε.
 */

/** Μοιάζει με HTML; Μία ετικέτα αρκεί. */
export function looksLikeHtml(value: string | null | undefined): boolean {
  return /<\/?[a-z][a-z0-9]*(\s[^>]*)?>/i.test(String(value ?? ''))
}

const escapeHtml = (s: string): string => s
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')

/**
 * Απλό κείμενο → παράγραφοι.
 *
 * Κενή γραμμή χωρίζει παραγράφους· μονή αλλαγή γραμμής γίνεται <br>. Αυτό
 * είναι ακριβώς ό,τι έδειχνε το `whitespace-pre-line`, άρα οι υπάρχουσες
 * περιγραφές φαίνονται ΙΔΙΕΣ μετά την αλλαγή.
 */
function plainToHtml(value: string): string {
  return value
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map(block => block.trim())
    .filter(Boolean)
    .map(block => `<p>${escapeHtml(block).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

/**
 * Καθαριστής ΓΙΑ ΣΕΛΙΔΑ — ίδια λίστα ετικετών με τα γράμματα, καμία όμως
 * inline σήμανση.
 *
 * ΓΙΑΤΙ ΟΧΙ ΤΟ sanitizeInline ΤΟΥ campaignBlocks: εκείνο είναι renderer
 * γραμματοκιβωτίου. Καρφώνει `font-family:Arial` και `color:#2D2D2D` στα h2/h3
 * επειδή οι mail clients έχουν δικά τους μεγέθη — στη σελίδα όμως το ίδιο
 * style δίνει σχεδόν μαύρο κείμενο πάνω σε σκούρο φόντο στο dark mode, και
 * γραμματοσειρά που δεν είναι του ιστότοπου.
 *
 * Εδώ ΔΕΝ μπαίνει κανένα style: το `prose prose-lg dark:prose-invert` που ήδη
 * τυλίγει την περιγραφή ξέρει να ντύσει επικεφαλίδες, λίστες και συνδέσμους
 * και στα δύο θέματα. Κρατιούνται μόνο δύο attributes — το `href` (απόλυτο)
 * και η στοίχιση. Όλα τα υπόλοιπα πέφτουν, άρα δεν υπάρχει onclick, style,
 * class ή srcdoc να ξεφύγει.
 */
export function sanitizeDescription(html: string): string {
  let out = String(html ?? '')
  out = out.replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
  const allowed = /^(strong|b|em|i|u|br|ul|ol|li|a|p|h2|h3)$/i
  // Στοίβα για τα <a> που απορρίπτονται, ώστε να μη μείνει ορφανό </a>
  const anchorStack: boolean[] = []
  out = out.replace(/<\s*(\/?)\s*([a-zA-Z0-9]+)((?:[^>"']|"[^"]*"|'[^']*')*)>/g, (_m, slash, tag, attrs) => {
    if (!allowed.test(tag)) return ''
    const t = tag.toLowerCase()
    if (slash) {
      if (t === 'a') return anchorStack.pop() === false ? '' : '</a>'
      return `</${t === 'b' ? 'strong' : t === 'i' ? 'em' : t}>`
    }
    if (t === 'a') {
      const href = /href\s*=\s*("([^"]*)"|'([^']*)')/i.exec(attrs)
      const url = (href?.[2] ?? href?.[3] ?? '').trim()
      // Μόνο απόλυτοι σύνδεσμοι — και ποτέ javascript:
      if (!/^(https?:\/\/|mailto:|tel:)/i.test(url)) { anchorStack.push(false); return '' }
      anchorStack.push(true)
      // rel: ο σύνδεσμος γράφεται από συντάκτη, ανοίγει σε νέα καρτέλα
      return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">`
    }
    if (t === 'b') return '<strong>'
    if (t === 'i') return '<em>'
    const al = /text-align\s*:\s*(left|right|center|justify)/i.exec(attrs)
    if (al && (t === 'p' || t === 'h2' || t === 'h3')) {
      return `<${t} style="text-align:${al[1].toLowerCase()}">`
    }
    return `<${t}>`
  })
  return out
}

/**
 * Η ΚΕΝΗ ΠΑΡΑΓΡΑΦΟΣ ΠΡΕΠΕΙ ΝΑ ΠΙΑΝΕΙ ΧΩΡΟ.
 *
 * Ο επεξεργαστής δίνει «<p></p>» (ή «<p><br></p>») για κάθε Enter σε άδεια
 * γραμμή, και ο καθαριστής σωστά τα κρατά. Μια παράγραφος χωρίς περιεχόμενο
 * όμως έχει ύψος μηδέν, και τα περιθώριά της ΣΥΜΠΤΥΣΣΟΝΤΑΙ με των γειτόνων
 * της — άρα δύο κενές γραμμές στον επεξεργαστή έδιναν ΜΗΔΕΝ επιπλέον κενό
 * στη σελίδα. Ένα &nbsp; τους δίνει ύψος γραμμής.
 *
 * Ίδια λύση με το γράμμα (richText του campaignBlocks), για τον ίδιο λόγο:
 * εκεί γράφτηκε πρώτα, όταν εξαφανίζονταν τα κενά μέσα στα email.
 */
const fillEmptyParagraphs = (html: string): string =>
  html.replace(/<p>\s*(?:<br\s*\/?>)?\s*<\/p>/gi, '<p>&nbsp;</p>')

/** Το HTML που μπαίνει στη σελίδα, από όποια από τις δύο μορφές κι αν ήρθε. */
export function descriptionHtml(value: string | null | undefined): string {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  return looksLikeHtml(raw) ? fillEmptyParagraphs(sanitizeDescription(raw)) : plainToHtml(raw)
}

/** Έχει πραγματικό περιεχόμενο; Κενό <p> από τον επεξεργαστή δεν μετράει. */
export function hasDescription(value: string | null | undefined): boolean {
  return descriptionHtml(value).replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim().length > 0
}
