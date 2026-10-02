/**
 * Τα δομικά στοιχεία του μηνύματος (V1).
 *
 * ΓΙΑΤΙ ΜΠΛΟΚ ΚΑΙ ΟΧΙ ΕΛΕΥΘΕΡΟ HTML
 * Το HTML των email δεν είναι HTML του web: το Outlook και το Apple Mail
 * θέλουν πίνακες και inline styles — όχι flexbox, όχι κλάσεις. Ένας κοινός
 * επεξεργαστής κειμένου βγάζει <div> με κλάσεις, και μια επικόλληση από Word
 * φέρνει μαζί της γραμματοσειρές και χρώματα. Το μπλοκ κάνει το εκτός
 * ταυτότητας αποτέλεσμα ΑΔΥΝΑΤΟ, αντί απλώς αποθαρρυμένο.
 *
 * ΤΙ ΡΥΘΜΙΖΕΤΑΙ ΚΑΙ ΤΙ ΟΧΙ
 * Ρυθμίζεται: το κείμενο, οι σύνδεσμοι, και μία παραλλαγή ανά μπλοκ από
 * κλειστή λίστα. ΔΕΝ ρυθμίζεται: γραμματοσειρά, μέγεθος, αποστάσεις,
 * στρογγυλότητα, το coral, η κεφαλίδα, το υποσέλιδο. Αυτά ΕΙΝΑΙ η ταυτότητα.
 *
 * ΤΑ ΧΡΩΜΑΤΑ ΔΕΝ ΕΠΙΝΟΗΘΗΚΑΝ
 * Κάθε τιμή παρακάτω μετρήθηκε στο lib/ocEmails.ts και ήδη ταξιδεύει σε
 * πραγματικά email: #2D2D2D ×198, #FF8B6A ×116, #F5F0EB ×95, #5A5A5A ×37,
 * #C9552F ×31. Έτσι μια καμπάνια και μια απόδειξη μοιάζουν αδέρφια.
 */

export const BRAND = {
  ink: '#2D2D2D',
  inkSoft: '#5A5A5A',
  inkMuted: '#8A8A8A',
  coral: '#FF8B6A',
  coralDeep: '#C9552F',
  cream: '#F5F0EB',
  white: '#FFFFFF',
  hairline: '#E0D8D0',
  /** Απαλή απόχρωση του κοραλί — για ζώνες που δεν πρέπει να φωνάζουν */
  coralTint: '#FFE7DF',
  /** Η λεπτή γραμμή πάνω από την υπογραφή — 38 χρήσεις στα αυτόματα email */
  rule: '#E5E7EB',
  warnBg: '#FFF4E5',
  warnBorder: '#E8A33D',
  warnInk: '#6B4A15',
  alertBg: '#FDECEA',
  alertBorder: '#D93025',
  alertInk: '#8A1F17',
} as const

const FONT = 'Arial,Helvetica,sans-serif'
/**
 * Το πλάτος της κάρτας.
 *
 * Ο κανόνας για email είναι 600–640px: πάνω από εκεί ο Outlook των Windows
 * (μηχανή του Word) γίνεται απρόβλεπτος, και το παράθυρο ανάγνωσης στενεύει.
 * Στα 640 κερδίζουμε λίγο αέρα μένοντας ΜΕΣΑ στον κανόνα — δεν είναι
 * αυθαίρετη επιλογή.
 */
const CONTENT_WIDTH = 640
/** Το πλάτος μέσα στα padding του 600άρη — όριο για εικόνες */
/**
 * Το πλάτος του πλαισίου προεπισκόπησης «Υπολογιστής».
 *
 * Ζει εδώ, δίπλα στο CONTENT_WIDTH, ώστε να μη μπορεί να συμπέσει με το
 * σημείο θραύσης — αν συμπέσουν, η προεπισκόπηση δείχνει τα πάντα
 * στοιβαγμένα ενώ στο γραμματοκιβώτιο είναι δίπλα-δίπλα.
 */
export const PREVIEW_DESKTOP_WIDTH = CONTENT_WIDTH + 40

/** Ό,τι μένει μέσα στα περιθώρια των 48px — παράγεται, δεν γράφεται */
export const INNER_WIDTH = CONTENT_WIDTH - 96

/**
 * Κεφαλαία στα ελληνικά: ο τόνος ΦΕΥΓΕΙ. Το σκέτο toUpperCase() τον κρατά
 * («Νέα» → «ΝΈΑ»), που είναι και τυπογραφικά λάθος και αμέσως ορατό σε
 * επικεφαλίδα. Το toLocaleUpperCase('el') τον ρίχνει αλλά πειράζει και το
 * τελικό ς, οπότε αφαιρούμε τα διακριτικά ρητά.
 */
export function upperGreek(v: string): string {
  return String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
}

export function escapeHtml(v: string): string {
  return String(v ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}

/**
 * Το μόνο σημείο όπου επιτρέπεται HTML από τον χρήστη, και μόνο έξι ετικέτες.
 * Ό,τι άλλο φεύγει — μαζί με κάθε style, class, onclick και javascript: link.
 * Χωρίς αυτό, μια επικόλληση από Word θα έσπαγε την ταυτότητα του γράμματος.
 */
export function sanitizeInline(html: string): string {
  let out = String(html ?? '')
  out = out.replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
  const allowed = /^(strong|b|em|i|u|br|ul|ol|li|a|p|h2|h3)$/i
  // Στοίβα για τα <a> που απορρίπτονται: χωρίς αυτήν το κλείσιμο </a> θα
  // επιβίωνε μόνο του και θα έμενε ορφανή ετικέτα μέσα στο γράμμα.
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
      // Μόνο απόλυτοι σύνδεσμοι: τα σχετικά δεν σημαίνουν τίποτα σε inbox
      if (!/^(https?:\/\/|mailto:|tel:)/i.test(url)) { anchorStack.push(false); return '' }
      anchorStack.push(true)
      return `<a href="${escapeHtml(url)}" style="color:${BRAND.coralDeep};text-decoration:underline;">`
    }
    if (t === 'b') return '<strong>'
    if (t === 'i') return '<em>'
    /**
     * Η ΣΤΟΙΧΙΣΗ επιβιώνει — τίποτε άλλο από το style.
     *
     * Ο καθαριστής πετά κάθε attribute, οπότε χωρίς αυτό η στοίχιση που
     * διάλεξε ο συντάκτης χανόταν σιωπηλά μεταξύ επεξεργαστή και γράμματος.
     * Δεκτές μόνο οι τέσσερις τιμές: ό,τι άλλο θα ήταν παράθυρο για
     * αυθαίρετο CSS μέσα στο γράμμα.
     */
    const al = /text-align\s*:\s*(left|right|center|justify)/i.exec(attrs)
    const align = al ? `text-align:${al[1].toLowerCase()};` : ''
    // Οι επικεφαλίδες χρειάζονται inline styles: τα γραμματοκιβώτια έχουν δικά
    // τους μεγέθη και περιθώρια για h2/h3, που δεν είναι τα δικά μας.
    if (t === 'h2') return `<h2 style="font-family:${FONT};font-size:22px;line-height:28px;font-weight:bold;color:${BRAND.ink};margin:18px 0 8px 0;${align}">`
    if (t === 'h3') return `<h3 style="font-family:${FONT};font-size:18px;line-height:24px;font-weight:bold;color:${BRAND.ink};margin:14px 0 6px 0;${align}">`
    if (t === 'p' && align) return `<p style="${align}">`
    return `<${t}>`
  })
  return out
}

/**
 * Το κείμενο των μπλοκ γράφεται σε textarea, όπου το Enter είναι αλλαγή
 * γραμμής. Στο HTML όμως το «\n» δεν είναι τίποτα — γι\u0027 αυτό γίνεται <br>.
 * Χωρίς αυτό, τρεις γραμμές στη φόρμα φτάνουν ως μία στο γραμματοκιβώτιο.
 *
 * Μπαίνει ΜΕΤΑ το sanitize, ώστε τα <br> που προσθέτουμε εμείς να μην
 * περνούν από φίλτρο, και ΔΕΝ διπλασιάζεται γύρω από ετικέτες μπλοκ (<p>,
 * <ul>, <li>), που ήδη αλλάζουν γραμμή μόνες τους.
 */
export function richText(html: string): string {
  return sanitizeInline(html)
    /**
     * Η ΚΕΝΗ ΠΑΡΑΓΡΑΦΟΣ πρέπει να πιάνει χώρο.
     *
     * Ο επεξεργαστής δίνει «<p></p>» όταν πατήσεις Enter σε άδεια γραμμή, και
     * ο καθαριστής τη διατηρεί — αλλά μια παράγραφος χωρίς περιεχόμενο δεν
     * φτιάχνει γραμμή, οπότε το κενό εξαφανιζόταν. Ένα &nbsp; της δίνει ύψος
     * σε κάθε γραμματοκιβώτιο.
     */
    .replace(/<p>\s*(<br\s*\/?>)?\s*<\/p>/gi, '<p>&nbsp;</p>')
    .replace(/\r\n?/g, '\n')
    .replace(/\n(?=\s*<\/?(p|ul|ol|li|h2|h3)\b)/gi, '')
    .replace(/(<\/(p|ul|ol|li|h2|h3)>)\n/gi, '$1')
    .replace(/\n/g, '<br>')
}

// ── Τα μπλοκ ────────────────────────────────────────────────────────────────

/**
 * Η επικεφαλίδα ενότητας, σε δύο κόσμους.
 *
 * ΜΟΝΤΕΡΝΑ (προεπιλογή): χρωματιστή ζώνη με στρογγυλεμένες γωνίες και,
 * προαιρετικά, το σήμα CforC — αυτό που χρησιμοποιεί ήδη το μηνιαίο τεύχος.
 * ΚΛΑΣΙΚΗ: το παλιό μικρό κεφαλαίο με τη γραμμή από κάτω.
 *
 * Και οι δύο μοιράζονται τις ίδιες επτά εμφανίσεις — πέντε σε πλήρες πλάτος
 * και δύο ένθετες — ώστε ένα τεύχος να μη μοιάζει με δύο διαφορετικά έντυπα.
 */
export type SectionBlock = {
  type: 'section'
  title: string
  variant?: 'modern' | 'classic'
  look?: 'coral' | 'dark' | 'cream' | 'tint' | 'outline' | 'pill' | 'pillOutline'
  logo?: boolean
  logoSide?: 'left' | 'right'
}
/**
 * Η παράγραφος, σε πέντε εμφανίσεις.
 *
 * Οι δύο πρώτες είναι σκέτο κείμενο· οι τρεις επόμενες βάζουν το κείμενο σε
 * χρωματιστή ζώνη, με το χρώμα γραμμάτων που ΤΑΙΡΙΑΖΕΙ — ο συντάκτης δεν
 * διαλέγει χρώματα, διαλέγει εμφάνιση. Έτσι δεν γίνεται ποτέ λευκό σε κρεμ.
 */
export type TextBlock = {
  type: 'text'
  html: string
  tone?: 'normal' | 'soft' | 'cream' | 'coral' | 'dark'
}
/**
 * Η εικόνα, σε τρεις ανεξάρτητους άξονες.
 *
 * ΜΕΓΕΘΟΣ πόσο πλατιά · ΣΤΟΙΧΙΣΗ πού κάθεται όταν δεν γεμίζει · ΖΩΝΗ αν
 * πατά σε χρωματιστό φόντο που πιάνει όλο το πλάτος. Παλιά υπήρχαν μόνο δύο
 * επιλογές μεγέθους και τίποτα άλλο.
 *
 * Το «inset» των παλιών μπλοκ διαβάζεται ως «medium» — καμία καμπάνια δεν
 * χαλάει επειδή άλλαξαν οι επιλογές.
 */
export type ImageBlock = {
  type: 'image'
  src: string
  alt: string
  href?: string
  size?: 'full' | 'large' | 'medium' | 'small' | 'inset'
  align?: 'left' | 'center' | 'right'
  band?: 'none' | 'coral' | 'dark' | 'cream' | 'tint'
}
/**
 * Εικόνα δίπλα σε κείμενο, με τους ίδιους άξονες που έχει και η σκέτη εικόνα.
 *
 * ΠΛΕΥΡΑ πού κάθεται η φωτογραφία · ΜΕΓΕΘΟΣ πόσο χώρο πιάνει · ΖΩΝΗ αν το
 * ζευγάρι πατά σε χρωματιστό φόντο · ΚΑΘ' ΥΨΟΣ πού ευθυγραμμίζεται το
 * κείμενο δίπλα σε ψηλή φωτογραφία.
 */
export type ImageTextBlock = {
  type: 'imageText'; src: string; alt: string; html: string
  side?: 'left' | 'right'; href?: string
  size?: 'small' | 'medium' | 'large'
  band?: 'none' | 'coral' | 'dark' | 'cream' | 'tint'
  valign?: 'top' | 'middle'
}
export type CardBlock = {
  type: 'card'; src?: string; alt?: string; title: string; html: string
  buttonLabel?: string; buttonHref?: string
  /** Πού κάθεται η φωτογραφία μέσα στην κάρτα */
  imgPos?: 'top' | 'bottom' | 'left' | 'right' | 'titleLeft' | 'titleRight'
  /** «full» μόνο για πάνω/κάτω — μια πλαϊνή στήλη δεν γίνεται πλήρους πλάτους */
  imgSize?: 'full' | 'large' | 'medium' | 'small'
  imgAlign?: 'left' | 'center' | 'right'
  tone?: 'cream' | 'coral' | 'tint' | 'dark' | 'white' | 'none'
  /** Ένθετη κάρτα ή ζώνη από άκρη σε άκρη του γράμματος */
  width?: 'inset' | 'full'
}
export type PersonBlock = { type: 'person'; src?: string; alt?: string; name: string; role?: string; html: string; side?: 'left' | 'right' }
export type LogosBlock = { type: 'logos'; items: Array<{ src: string; alt: string; href?: string }>; note?: string }
export type ButtonBlock = { type: 'button'; label: string; href: string; style?: 'coral' | 'outline' | 'dark' }
export type BoxBlock = { type: 'box'; title?: string; html: string; tone?: 'cream' | 'neutral' | 'warning' | 'alert' }
export type DividerBlock = { type: 'divider'; style?: 'line' | 'space' }
/**
 * Συνημμένα.
 *
 * ΤΟ ΙΔΙΟ ΜΠΛΟΚ, ΔΥΟ ΣΥΜΠΕΡΙΦΟΡΕΣ — και η διαφορά δεν είναι επιλογή μας:
 *  · Μήνυμα (Resend): τα αρχεία φεύγουν ΚΑΙ ως πραγματικά συνημμένα.
 *  · Newsletter / Bulk email (Sender): το create-campaign του Sender ΔΕΝ έχει
 *    πεδίο συνημμένου — μόνο html. Άρα φεύγουν ως κουμπιά λήψης.
 * Η λίστα τυπώνεται και στις δύο περιπτώσεις: ένα φίλτρο που κόβει συνημμένα
 * αφήνει τότε τον σύνδεσμο ζωντανό αντί για ένα γράμμα που δεν εξηγεί τίποτα.
 */
export type AttachmentBlock = {
  type: 'attachment'
  items: Array<{ name: string; url: string; size: number; ext?: string }>
  note?: string
}
export type AmountsBlock = { type: 'amounts'; rows: Array<{ label: string; amount: string }>; total?: string }
/**
 * Το μονόστοιχο κουτί — IBAN, κωδικοί, ό,τι αντιγράφεται.
 *
 * Ίδιο λεξιλόγιο εμφανίσεων με την επικεφαλίδα ενότητας: πέντε σε πλήρες
 * πλάτος και δύο ένθετες. Ένα γράμμα με δύο διαφορετικά συστήματα χρωμάτων
 * μοιάζει με δύο διαφορετικά έντυπα.
 */
export type MonoBlock = {
  type: 'mono'
  label?: string
  value: string
  look?: 'cream' | 'coral' | 'dark' | 'tint' | 'outline' | 'pill' | 'pillOutline'
}
export type TocBlock = { type: 'toc'; title?: string }
export type GreetingBlock = { type: 'greeting'; html: string }
export type GridBlock = {
  type: 'grid'
  items: Array<{ src?: string; alt?: string; title: string; html: string; href?: string }>
  cols?: '2' | '3'
}
export type AgendaBlock = {
  type: 'agenda'
  rows: Array<{ date: string; title: string; place?: string; href?: string }>
}
export type QuoteBlock = { type: 'quote'; html: string; who?: string; tone?: 'cream' | 'coral' }
export type StatsBlock = { type: 'stats'; items: Array<{ value: string; label: string }> }
export type SocialBlock = {
  type: 'social'
  items: Array<{ network: string; href: string }>
  note?: string
}
export type SpacerBlock = { type: 'spacer'; size?: 'small' | 'medium' | 'large' }
/** Η λωρίδα «δεν εμφανίζεται σωστά;» — πάντα ΠΡΩΤΗ, πάνω από την κεφαλίδα */
export type BrowserViewBlock = {
  type: 'browserView'
  text?: string
  linkText?: string
  tone?: 'white' | 'cream' | 'dark' | 'coral'
}
/** Η κεφαλίδα του τεύχους: τίτλος δύο γραμμών + φωτογραφία */
/**
 * Η κεφαλίδα του τεύχους, σε ΤΕΣΣΕΡΙΣ ανεξάρτητους άξονες.
 *
 * Παλιά ήταν ένα «style» που έδενε μαζί διάταξη και χρώμα — οπότε «σκούρα με
 * εικόνα πρώτα» ήταν αδύνατο. Χωριστοί άξονες: πού κάθεται η εικόνα, τι
 * χρώμα έχει η ζώνη, αν υπάρχει εικόνα, πόσο μεγάλη.
 */
export type MastheadBlock = {
  type: 'masthead'
  eyebrow?: string
  title: string
  src?: string
  alt?: string
  mediaId?: number
  layout?: 'textTop' | 'imageTop' | 'imageLeft' | 'imageRight' | 'minimal'
  tone?: 'coral' | 'dark' | 'cream' | 'white'
  withImage?: boolean
  imageSize?: 'small' | 'medium' | 'large'
}

/** Ο προεπιλεγμένος τίτλος του πίνακα — ο συντάκτης μπορεί να τον αλλάξει */
export const TOC_DEFAULT_TITLE = 'Σε αυτό το τεύχος'

/**
 * Ό,τι ισχύει για ΚΑΘΕ μπλοκ.
 *
 * `hidden`: το στοιχείο μένει στο προσχέδιο αλλά ΔΕΝ αποδίδεται — ούτε στην
 * προεπισκόπηση ούτε στο γράμμα που φεύγει. Το «κρυφό μόνο στην
 * προεπισκόπηση» θα ήταν παγίδα: θα ενέκρινες ό,τι βλέπεις και θα έφευγε
 * κάτι άλλο.
 */
export type BlockCommon = { hidden?: boolean }

export type Block = (
  | SectionBlock | TextBlock | ImageBlock | ImageTextBlock | CardBlock | PersonBlock
  | LogosBlock | ButtonBlock | BoxBlock | DividerBlock | AttachmentBlock | AmountsBlock | MonoBlock | TocBlock
  | GreetingBlock | GridBlock | AgendaBlock | QuoteBlock | StatsBlock | SocialBlock | SpacerBlock
  | BrowserViewBlock | MastheadBlock
) & BlockCommon

/** Τα μπλοκ που όντως φτάνουν στον παραλήπτη */
export const visibleBlocks = (blocks: Block[]): Block[] => (blocks || []).filter(b => !b?.hidden)

export const BLOCK_LABELS: Record<Block['type'], string> = {
  section: 'Επικεφαλίδα ενότητας',
  text: 'Παράγραφος',
  image: 'Εικόνα',
  imageText: 'Εικόνα + κείμενο',
  card: 'Κάρτα δράσης',
  person: 'Πρόσωπο',
  logos: 'Σειρά λογοτύπων',
  button: 'Κουμπί',
  box: 'Κουτί',
  divider: 'Διαχωριστικό',
  attachment: 'Συνημμένα',
  amounts: 'Πίνακας ποσών',
  mono: 'Μονόστοιχο κουτί',
  toc: 'Πίνακας περιεχομένων',
  greeting: 'Χαιρετισμός',
  grid: 'Πλέγμα',
  agenda: 'Ατζέντα',
  quote: 'Απόσπασμα',
  stats: 'Αριθμοί',
  social: 'Κοινωνικά δίκτυα',
  spacer: 'Κενό',
  browserView: 'Λωρίδα «προβολή στον browser»',
  masthead: 'Κεφαλίδα τεύχους',
}

/** Οι μόνες επιλογές ανά μπλοκ — κλειστές λίστες, όχι ελεύθερα χρώματα */
export const BLOCK_VARIANTS: Partial<Record<Block['type'], { key: string; options: Array<{ value: string; label: string }> }>> = {
  mono: {
    key: 'look',
    options: [
      { value: 'cream', label: 'Κρεμ — πλήρες πλάτος' },
      { value: 'coral', label: 'Coral — πλήρες πλάτος' },
      { value: 'dark', label: 'Σκούρο — πλήρες πλάτος' },
      { value: 'tint', label: 'Απαλό coral — πλήρες πλάτος' },
      { value: 'outline', label: 'Περίγραμμα — πλήρες πλάτος' },
      { value: 'pill', label: 'Πλακέτα coral — ένθετη' },
      { value: 'pillOutline', label: 'Πλακέτα με περίγραμμα — ένθετη' },
    ],
  },
  section: {
    key: 'look',
    options: [
      { value: 'coral', label: 'Coral — πλήρες πλάτος' },
      { value: 'dark', label: 'Σκούρο — πλήρες πλάτος' },
      { value: 'cream', label: 'Κρεμ — πλήρες πλάτος' },
      { value: 'tint', label: 'Απαλό coral — πλήρες πλάτος' },
      { value: 'outline', label: 'Περίγραμμα — πλήρες πλάτος' },
      { value: 'pill', label: 'Πλακέτα coral — ένθετη' },
      { value: 'pillOutline', label: 'Πλακέτα με περίγραμμα — ένθετη' },
    ],
  },
  text: {
    key: 'tone',
    options: [
      { value: 'normal', label: 'Κανονικό' },
      { value: 'soft', label: 'Δευτερεύον' },
      { value: 'cream', label: 'Σε κρεμ ζώνη' },
      { value: 'coral', label: 'Σε coral ζώνη' },
      { value: 'dark', label: 'Σε σκούρη ζώνη' },
    ],
  },
  image: {
    key: 'size',
    options: [
      { value: 'full', label: 'Πλήρες πλάτος' },
      { value: 'large', label: 'Μεγάλη' },
      { value: 'medium', label: 'Μεσαία' },
      { value: 'small', label: 'Μικρή' },
    ],
  },
  imageText: {
    key: 'side',
    options: [{ value: 'left', label: 'Εικόνα αριστερά' }, { value: 'right', label: 'Εικόνα δεξιά' }],
  },
  card: {
    key: 'imgPos',
    options: [
      { value: 'top', label: 'Εικόνα πάνω' },
      { value: 'bottom', label: 'Εικόνα κάτω' },
      { value: 'left', label: 'Εικόνα αριστερά' },
      { value: 'right', label: 'Εικόνα δεξιά' },
      { value: 'titleLeft', label: 'Σήμα αριστερά από τον τίτλο' },
      { value: 'titleRight', label: 'Σήμα δεξιά από τον τίτλο' },
    ],
  },
  person: { key: 'side', options: [{ value: 'left', label: 'Φωτογραφία αριστερά' }, { value: 'right', label: 'Φωτογραφία δεξιά' }] },
  button: { key: 'style', options: [{ value: 'coral', label: 'Coral' }, { value: 'outline', label: 'Περίγραμμα' }, { value: 'dark', label: 'Σκούρο' }] },
  box: {
    key: 'tone',
    options: [
      { value: 'cream', label: 'Κρεμ' }, { value: 'neutral', label: 'Ουδέτερο' },
      { value: 'warning', label: 'Προσοχή' }, { value: 'alert', label: 'Επείγον' },
    ],
  },
  divider: { key: 'style', options: [{ value: 'line', label: 'Γραμμή' }, { value: 'space', label: 'Κενό' }] },
  grid: { key: 'cols', options: [{ value: '2', label: 'Δύο στήλες' }, { value: '3', label: 'Τρεις στήλες' }] },
  quote: { key: 'tone', options: [{ value: 'cream', label: 'Κρεμ' }, { value: 'coral', label: 'Coral' }] },
  browserView: {
    key: 'tone',
    options: [
      { value: 'white', label: 'Λευκή' }, { value: 'cream', label: 'Κρεμ' },
      { value: 'coral', label: 'Coral' }, { value: 'dark', label: 'Σκούρα' },
    ],
  },
  masthead: {
    key: 'layout',
    options: [
      { value: 'textTop', label: 'Τίτλος πάνω, φωτογραφία κάτω' },
      { value: 'imageTop', label: 'Φωτογραφία πάνω, τίτλος κάτω' },
      { value: 'imageLeft', label: 'Φωτογραφία αριστερά' },
      { value: 'imageRight', label: 'Φωτογραφία δεξιά' },
      { value: 'minimal', label: 'Λιτή, με γραμμή' },
    ],
  },
  spacer: {
    key: 'size',
    options: [
      { value: 'small', label: 'Μικρό' }, { value: 'medium', label: 'Μεσαίο' }, { value: 'large', label: 'Μεγάλο' },
    ],
  },
}

// ── Απόδοση σε HTML email ───────────────────────────────────────────────────

/** «1,2 MB» — σε bytes, με ελληνική υποδιαστολή */
export function fileSizeLabel(bytes: number): string {
  const n = Number(bytes) || 0
  if (n >= 1024 * 1024) return `${(n / 1048576).toFixed(1).replace('.', ',')} MB`
  return `${Math.max(1, Math.round(n / 1024))} KB`
}

const row = (inner: string, pad = '0 48px') => `
  <tr><td class="px" style="padding:${pad};">${inner}</td></tr>`

const bodyText = (tone: string = 'normal') =>
  `font-family:${FONT};font-size:${tone === 'soft' ? 14 : 16}px;line-height:${tone === 'soft' ? 22 : 26}px;color:${tone === 'soft' ? BRAND.inkSoft : BRAND.ink};mso-line-height-rule:exactly;`

/** Οι ζώνες της παραγράφου: φόντο και χρώμα γραμμάτων πάνε ΜΑΖΙ */
const TEXT_BANDS: Record<string, { bg: string; ink: string; link: string }> = {
  cream: { bg: BRAND.cream, ink: BRAND.ink, link: BRAND.coralDeep },
  coral: { bg: BRAND.coral, ink: BRAND.ink, link: BRAND.ink },
  dark: { bg: BRAND.ink, ink: BRAND.white, link: BRAND.white },
}

/** Σταθερό πλάτος και alt σε ΚΑΘΕ εικόνα: χωρίς αυτά, Outlook και οι
 *  αποκλεισμένες εικόνες δίνουν σπασμένη σελίδα αντί για κείμενο. */
function img(src: string, alt: string, width: number, href?: string): string {
  const tag = `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" width="${width}" style="display:block;width:100%;max-width:${width}px;height:auto;border:0;border-radius:12px;" />`
  return href ? `<a href="${escapeHtml(href)}" style="text-decoration:none;">${tag}</a>` : tag
}

function anchorId(title: string, i: number): string {
  return `s${i}-${String(title).toLowerCase().replace(/[^a-z0-9α-ω]+/gi, '-').slice(0, 24)}`
}

function renderBlock(b: Block, i: number): string {
  switch (b.type) {
    case 'section': {
      const anchor = `<a id="${anchorId(b.title, i)}" name="${anchorId(b.title, i)}"></a>`
      const look = b.look || 'coral'
      const inset = look === 'pill' || look === 'pillOutline'
      /**
       * Οι επτά εμφανίσεις: φόντο, γράμματα, σήμα και περίγραμμα ΜΑΖΙ.
       *
       * Ο συντάκτης διαλέγει εμφάνιση, όχι χρώματα — γι' αυτό δεν γίνεται
       * ποτέ λευκό σήμα πάνω σε κρεμ ούτε σκούρα γράμματα σε ανθρακί.
       */
      const skins: Record<string, { bg: string; ink: string; logo: string; border?: string }> = {
        coral: { bg: BRAND.coral, ink: BRAND.white, logo: LOGO_LIGHT },
        dark: { bg: BRAND.ink, ink: BRAND.white, logo: LOGO_LIGHT },
        cream: { bg: BRAND.cream, ink: BRAND.ink, logo: LOGO_DARK },
        tint: { bg: BRAND.coralTint, ink: BRAND.ink, logo: LOGO_DARK },
        outline: { bg: BRAND.white, ink: BRAND.ink, logo: LOGO_DARK, border: BRAND.coral },
        pill: { bg: BRAND.coral, ink: BRAND.white, logo: LOGO_LIGHT },
        pillOutline: { bg: BRAND.white, ink: BRAND.ink, logo: LOGO_DARK, border: BRAND.coral },
      }
      const sk = skins[look] || skins.coral

      if (b.variant === 'classic') {
        // Η κλασική κρατά τη λιτή της μορφή· από την εμφάνιση παίρνει μόνο
        // το χρώμα των γραμμάτων και της γραμμής.
        const accent = look === 'dark' ? BRAND.ink : look === 'cream' || look === 'tint' ? BRAND.coralDeep : BRAND.coralDeep
        return row(`${anchor}
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="${inset ? '' : '100%'}" style="margin:8px 0 4px 0;">
        <tr><td style="font-family:${FONT};font-size:12px;line-height:16px;letter-spacing:1.2px;color:${accent};font-weight:bold;mso-line-height-rule:exactly;">${escapeHtml(upperGreek(b.title))}</td></tr>
        <tr><td height="6" style="height:6px;line-height:6px;font-size:0;">&nbsp;</td></tr>
        <tr><td style="border-top:2px solid ${look === 'dark' ? BRAND.ink : BRAND.coral};font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>`, '20px 48px 0 48px')
      }

      // ΜΟΝΤΕΡΝΑ: ζώνη με στρογγυλεμένες γωνίες
      const showLogo = b.logo !== false
      const mark = showLogo
        ? `<td width="40" style="width:40px;vertical-align:middle;padding:0 12px;"><img src="${sk.logo}" alt="" width="26" style="display:block;width:26px;max-width:26px;height:auto;border:0;" /></td>`
        : ''
      const title = `<td style="vertical-align:middle;padding:14px 18px;font-family:${FONT};font-size:19px;line-height:26px;color:${sk.ink};font-weight:bold;mso-line-height-rule:exactly;" align="${b.logoSide === 'right' ? 'left' : 'right'}">${escapeHtml(b.title)}</td>`
      const cells = b.logoSide === 'right' ? `${title}${mark}` : `${mark}${title}`
      const band = `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" ${inset ? '' : 'width="100%"'} bgcolor="${sk.bg}"
        style="${inset ? '' : 'width:100%;'}background-color:${sk.bg};border-radius:14px;${sk.border ? `border:2px solid ${sk.border};` : ''}">
        <tr>${cells}</tr>
      </table>`
      return row(`${anchor}${band}`, '20px 48px 0 48px')
    }

    case 'text': {
      const band = b.tone ? TEXT_BANDS[b.tone] : undefined
      if (!band) return row(`<div style="${bodyText(b.tone)}">${richText(b.html)}</div>`, '16px 48px 0 48px')
      // Οι σύνδεσμοι μέσα στη ζώνη πρέπει να αλλάξουν κι αυτοί χρώμα, αλλιώς
      // ένα coralDeep πάνω σε σκούρο φόντο γίνεται αδιάβαστο.
      const inner = richText(b.html).replace(
        new RegExp(`color:${BRAND.coralDeep};`, 'g'), `color:${band.link};`)
      return row(`
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="${band.bg}" style="background-color:${band.bg};border-radius:16px;">
        <tr><td style="padding:20px 22px;">
          <div style="${bodyText()}color:${band.ink};">${inner}</div>
        </td></tr>
      </table>`, '16px 48px 0 48px')
    }

    case 'image': {
      // Χωρίς αρχείο δεν αποδίδεται τίποτα: ένα <img> με κενό src δίνει
      // σπασμένο πλαίσιο με στρογγυλεμένες γωνίες, όχι κενό.
      if (!b.src) return ''
      const size = b.size === 'inset' ? 'medium' : (b.size || 'full')
      const w = size === 'full' ? INNER_WIDTH : size === 'large' ? 420 : size === 'medium' ? 300 : 200
      const align = b.align || 'center'
      const pic = img(b.src, b.alt, w, b.href)
      // Πίνακας με ΡΗΤΟ πλάτος και align: το max-width μόνο του δεν φτάνει
      // στον Outlook, και το margin:auto δεν κεντράρει σε γραμματοκιβώτιο.
      const framed = size === 'full' ? pic : `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="${w}" align="${align}" style="width:${w}px;max-width:100%;">
        <tr><td>${pic}</td></tr>
      </table>`

      const bands: Record<string, string> = {
        coral: BRAND.coral, dark: BRAND.ink, cream: BRAND.cream, tint: BRAND.coralTint,
      }
      const bg = b.band && b.band !== 'none' ? bands[b.band] : ''
      if (!bg) return row(framed, '16px 48px 0 48px')

      /**
       * Η ζώνη πιάνει ΟΛΟ το πλάτος του γράμματος — φεύγει έξω από το
       * κανονικό περιθώριο, αλλιώς θα έμοιαζε με κουτί και όχι με ζώνη.
       */
      return `
  <tr><td bgcolor="${bg}" align="${align}" style="background-color:${bg};padding:22px 48px;">
    ${framed}
  </td></tr>`
    }

    case 'imageText': {
      const w = b.size === 'large' ? 280 : b.size === 'small' ? 140 : 200
      const va = b.valign === 'middle' ? 'middle' : 'top'
      /**
       * Χωρίς φωτογραφία, η στήλη μένει ΚΕΝΗ — δεν εξαφανίζεται.
       *
       * Ένα <img> με κενό src ζωγραφίζει σπασμένο πλαίσιο με στρογγυλεμένες
       * γωνίες. Κρατάμε όμως το πλάτος της στήλης, γιατί το μπλοκ
       * χρησιμοποιείται και σκέτο, για να σπρώξει κείμενο στη μία πλευρά.
       */
      const pic = b.src
        ? `<td class="stack" width="${w}" style="width:${w}px;vertical-align:${va};">${img(b.src, b.alt, w, b.href)}</td>`
        : `<td class="stack" width="${w}" style="width:${w}px;font-size:0;line-height:0;">&nbsp;</td>`
      const gap = `<td class="stack" width="16" style="width:16px;font-size:0;line-height:16px;">&nbsp;</td>`

      const bands: Record<string, { bg: string; ink: string }> = {
        coral: { bg: BRAND.coral, ink: BRAND.ink },
        dark: { bg: BRAND.ink, ink: BRAND.white },
        cream: { bg: BRAND.cream, ink: BRAND.ink },
        tint: { bg: BRAND.coralTint, ink: BRAND.ink },
      }
      const band = b.band && b.band !== 'none' ? bands[b.band] : undefined
      // Οι σύνδεσμοι μέσα σε σκούρη ζώνη πρέπει να αλλάξουν κι αυτοί χρώμα
      const inner = band
        ? richText(b.html).replace(new RegExp(`color:${BRAND.coralDeep};`, 'g'),
            `color:${band.bg === BRAND.ink ? BRAND.white : BRAND.ink};`)
        : richText(b.html)
      const txt = `<td class="stack" style="vertical-align:${va};${bodyText()}${band ? `color:${band.ink};` : ''}">${inner}</td>`
      const cells = b.side === 'right' ? `${txt}${gap}${pic}` : `${pic}${gap}${txt}`
      const table = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>${cells}</tr></table>`

      if (!band) return row(table, '16px 48px 0 48px')
      // Η ζώνη πιάνει ΟΛΟ το πλάτος — αλλιώς μοιάζει με κουτί, όχι με ζώνη
      return `
  <tr><td bgcolor="${band.bg}" style="background-color:${band.bg};padding:22px 48px;">
    ${table}
  </td></tr>`
    }

    case 'card': {
      /**
       * Η φωτογραφία της κάρτας: έξι θέσεις, με δικό της μέγεθος.
       *
       * Ήταν πάντα πάνω και σε πλήρες πλάτος, που σε μια λίστα με δώδεκα
       * open calls έκανε το γράμμα ατέλειωτο. Οι πλαϊνές θέσεις δίνουν
       * μικρογραφία δίπλα στο κείμενο, και οι «δίπλα στον τίτλο» ένα σήμα
       * στο ύψος της επικεφαλίδας με το κείμενο να τρέχει από κάτω.
       */
      /**
       * Φόντο και πλάτος.
       *
       * «Πλήρες πλάτος» σημαίνει ζώνη από άκρη σε άκρη του γράμματος, όπως
       * στην Εικόνα + Κείμενο: τότε ΔΕΝ υπάρχει εσωτερικό περιθώριο ούτε
       * στρογγυλή γωνία, γιατί μια ζώνη με γωνίες μοιάζει με κουτί που
       * ξεχείλισε. Στην ένθετη κάρτα μένουν και τα δύο.
       */
      const tones: Record<string, { bg: string; ink: string; border?: string }> = {
        cream: { bg: BRAND.cream, ink: BRAND.ink },
        coral: { bg: BRAND.coral, ink: BRAND.ink },
        tint: { bg: BRAND.coralTint, ink: BRAND.ink },
        dark: { bg: BRAND.ink, ink: BRAND.white },
        white: { bg: BRAND.white, ink: BRAND.ink, border: BRAND.hairline },
        none: { bg: '', ink: BRAND.ink },
      }
      const tone = tones[b.tone || 'cream'] || tones.cream!
      const full = b.width === 'full'
      const PAD = full || (b.tone || 'cream') === 'none' ? 0 : 16
      const INSET = INNER_WIDTH - PAD * 2
      const pos = b.imgPos || 'top'
      const size = b.imgSize || 'full'

      const title = b.title
        ? `<div style="font-family:${FONT};font-size:18px;line-height:24px;font-weight:bold;color:${tone.ink};">${escapeHtml(b.title)}</div>`
        : ''
      // Σε σκούρο φόντο το #C9552F των συνδέσμων σβήνει — γίνονται λευκοί
      const cardHtml = tone.ink === BRAND.white
        ? richText(b.html).replace(new RegExp(`color:${BRAND.coralDeep};`, 'g'), `color:${BRAND.white};`)
        : richText(b.html)
      const text = `<div style="${bodyText()}color:${tone.ink};${title ? 'padding-top:8px;' : ''}">${cardHtml}</div>`
      const btn = b.buttonLabel && b.buttonHref
        ? `<div style="padding-top:14px;">${buttonHtml(b.buttonLabel, b.buttonHref, 'coral', false)}</div>` : ''
      const body = `${title}${text}${btn}`
      const gap = (w: number) => `<td class="stack" width="${w}" style="width:${w}px;font-size:0;line-height:${w}px;">&nbsp;</td>`
      const col = (w: number, inner: string, va = 'top') =>
        `<td class="stack" width="${w}" style="width:${w}px;vertical-align:${va};">${inner}</td>`

      let inner: string
      if (!b.src) {
        inner = `<tr><td style="padding:${PAD}px;">${body}</td></tr>`
      } else if (pos === 'left' || pos === 'right') {
        const w = size === 'large' ? 220 : size === 'small' ? 120 : 170
        const pic = col(w, img(b.src, b.alt || b.title, w))
        const txt = `<td class="stack" style="vertical-align:top;">${body}</td>`
        inner = `<tr><td style="padding:${PAD}px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>${
            pos === 'right' ? `${txt}${gap(16)}${pic}` : `${pic}${gap(16)}${txt}`}</tr></table>
        </td></tr>`
      } else if (pos === 'titleLeft' || pos === 'titleRight') {
        // Σήμα στο ύψος του τίτλου — δεν στοιβάζεται σε κινητό: 76px χωρούν
        // πάντα δίπλα σε μια επικεφαλίδα, και από κάτω θα έμοιαζε με λάθος.
        const w = size === 'large' ? 96 : size === 'small' ? 56 : 76
        const pic = `<td width="${w}" style="width:${w}px;vertical-align:middle;">${img(b.src, b.alt || b.title, w)}</td>`
        const ttl = `<td style="vertical-align:middle;">${title}</td>`
        inner = `<tr><td style="padding:${PAD}px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>${
            pos === 'titleRight' ? `${ttl}${gap(12)}${pic}` : `${pic}${gap(12)}${ttl}`}</tr></table>
          <div style="${bodyText()}color:${tone.ink};padding-top:10px;">${cardHtml}</div>${btn}
        </td></tr>`
      } else {
        const w = size === 'full' ? INSET : size === 'large' ? 420 : size === 'medium' ? 320 : 200
        const align = size === 'full' ? 'left' : (b.imgAlign || 'center')
        const pic = img(b.src, b.alt || b.title, w)
        // Πίνακας με ΡΗΤΟ πλάτος και align: το max-width μόνο του δεν φτάνει
        // στον Outlook, και το margin:auto δεν κεντράρει σε γραμματοκιβώτιο.
        const framed = size === 'full' ? pic : `
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="${w}" align="${align}" style="width:${w}px;max-width:100%;">
            <tr><td>${pic}</td></tr>
          </table>`
        const picRow = (padding: string) =>
          `<tr><td align="${align}" style="padding:${padding};">${framed}</td></tr>`
        const txtRow = `<tr><td style="padding:${PAD}px;">${body}</td></tr>`
        inner = pos === 'bottom'
          ? txtRow + picRow(`0 ${PAD}px ${PAD}px ${PAD}px`)
          : picRow(`${PAD}px ${PAD}px 0 ${PAD}px`) + txtRow
      }

      const skin = `${tone.bg ? `background-color:${tone.bg};` : ''}${tone.border ? `border:1px solid ${tone.border};` : ''}`
      const table = (extra: string) => `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="${skin}${extra}">
        ${inner}
      </table>`

      // Η ζώνη πιάνει ΟΛΟ το πλάτος του γράμματος — φεύγει έξω από το κανονικό
      // περιθώριο, αλλιώς θα έμοιαζε με κουτί και όχι με ζώνη.
      if (full) {
        return `
  <tr><td ${tone.bg ? `bgcolor="${tone.bg}" ` : ''}style="${tone.bg ? `background-color:${tone.bg};` : ''}padding:22px 48px;">
    ${table('')}
  </td></tr>`
      }
      return row(table(tone.bg || tone.border ? 'border-radius:16px;' : ''), '16px 48px 0 48px')
    }

    case 'person': {
      const photo = b.src
        ? `<td class="stack" width="120" style="width:120px;vertical-align:top;">${img(b.src, b.alt || b.name, 120)}</td>
        <td class="stack" width="16" style="width:16px;font-size:0;line-height:16px;">&nbsp;</td>`
        : ''
      const text = `<td class="stack" style="vertical-align:top;">
          <div style="font-family:${FONT};font-size:17px;line-height:22px;font-weight:bold;color:${BRAND.ink};">${escapeHtml(b.name)}</div>
          ${b.role ? `<div style="font-family:${FONT};font-size:13px;line-height:18px;color:${BRAND.coralDeep};padding-top:2px;">${escapeHtml(b.role)}</div>` : ''}
          <div style="${bodyText()}padding-top:8px;">${richText(b.html)}</div>
        </td>`
      // Με τη φωτογραφία δεξιά, το κενό μπαίνει ΠΡΙΝ από αυτήν — αλλιώς
      // κολλάει στο κείμενο και η άλλη πλευρά αποκτά περιττό περιθώριο.
      const cells = b.side === 'right' && photo
        ? `${text}<td class="stack" width="16" style="width:16px;font-size:0;line-height:16px;">&nbsp;</td><td class="stack" width="120" style="width:120px;vertical-align:top;">${img(b.src!, b.alt || b.name, 120)}</td>`
        : `${photo}${text}`
      return row(`<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>${cells}</tr></table>`, '16px 48px 0 48px')
    }

    case 'logos': {
      // Λογότυπα συνεργατών: ΠΟΤΕ φίλτρα ή grayscale — μόνο λευκό πλαίσιο
      const cells = b.items.map(l =>
        `<td align="center" style="padding:8px;background-color:${BRAND.white};">${img(l.src, l.alt, 110, l.href)}</td>`).join('')
      return row(`
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${BRAND.white};border:1px solid ${BRAND.hairline};border-radius:12px;">
        <tr>${cells}</tr>
      </table>
      ${b.note ? `<div style="${bodyText('soft')}padding-top:6px;">${escapeHtml(b.note)}</div>` : ''}`, '16px 48px 0 48px')
    }

    case 'button':
      return row(buttonHtml(b.label, b.href, b.style || 'coral', true), '20px 48px 0 48px')

    case 'attachment': {
      const items = (b.items || []).filter(it => it && it.url && it.name)
      if (!items.length) return ''
      const rows = items.map(it => `
        <tr><td style="padding:8px 0;border-bottom:1px solid ${BRAND.hairline};">
          <a href="${escapeHtml(it.url)}" style="font-family:${FONT};font-size:15px;line-height:22px;color:${BRAND.coralDeep};text-decoration:underline;font-weight:bold;">${escapeHtml(it.name)}</a>
          <span style="font-family:${FONT};font-size:13px;color:${BRAND.inkMuted};">&nbsp;·&nbsp;${escapeHtml(fileSizeLabel(it.size))}</span>
        </td></tr>`).join('')
      return row(`
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${BRAND.cream};border-radius:16px;">
        <tr><td style="padding:20px;">
          <strong style="display:block;font-family:${FONT};font-size:13px;letter-spacing:.06em;color:${BRAND.inkMuted};margin-bottom:8px;">ΣΥΝΗΜΜΕΝΑ</strong>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${rows}</table>
          ${b.note ? `<p style="margin:12px 0 0;font-family:${FONT};font-size:13px;line-height:20px;color:${BRAND.inkSoft};">${escapeHtml(b.note)}</p>` : ''}
        </td></tr>
      </table>`, '20px 48px 0 48px')
    }

    case 'box': {
      const tone = b.tone || 'cream'
      const skin =
        tone === 'warning' ? `background-color:${BRAND.warnBg};border:2px solid ${BRAND.warnBorder};` :
        tone === 'alert' ? `background-color:${BRAND.alertBg};border:2px solid ${BRAND.alertBorder};` :
        tone === 'neutral' ? `border:1px solid ${BRAND.hairline};` :
        `background-color:${BRAND.cream};`
      const ink = tone === 'warning' ? BRAND.warnInk : tone === 'alert' ? BRAND.alertInk : BRAND.ink
      return row(`
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="${skin}border-radius:16px;">
        <tr><td style="padding:20px;font-family:${FONT};font-size:15px;line-height:24px;color:${ink};mso-line-height-rule:exactly;">
          ${b.title ? `<strong style="display:block;margin-bottom:6px;">${escapeHtml(b.title)}</strong>` : ''}
          ${richText(b.html)}
        </td></tr>
      </table>`, '16px 48px 0 48px')
    }

    case 'divider':
      return b.style === 'space'
        ? `<tr><td height="24" style="height:24px;line-height:24px;font-size:0;">&nbsp;</td></tr>`
        : row(`<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="border-top:1px solid ${BRAND.hairline};font-size:0;line-height:0;">&nbsp;</td></tr></table>`, '20px 48px 0 48px')

    case 'amounts':
      return row(`
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${BRAND.cream};border-radius:16px;">
        <tr><td style="padding:20px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            ${b.rows.map(r => `<tr>
              <td style="${bodyText()}">${escapeHtml(r.label)}</td>
              <td align="right" style="${bodyText()}">${escapeHtml(r.amount)}</td></tr>`).join('')}
            ${b.total ? `<tr>
              <td style="padding-top:10px;font-family:${FONT};font-size:17px;line-height:26px;color:${BRAND.ink};font-weight:bold;">Σύνολο</td>
              <td align="right" style="padding-top:10px;font-family:${FONT};font-size:17px;line-height:26px;color:${BRAND.ink};font-weight:bold;">${escapeHtml(b.total)}</td></tr>` : ''}
          </table>
        </td></tr>
      </table>`, '16px 48px 0 48px')

    case 'mono': {
      const look = b.look || 'cream'
      const inset = look === 'pill' || look === 'pillOutline'
      const skins: Record<string, { bg: string; ink: string; label: string; border?: string }> = {
        cream: { bg: BRAND.cream, ink: BRAND.ink, label: BRAND.coralDeep },
        coral: { bg: BRAND.coral, ink: BRAND.ink, label: BRAND.ink },
        dark: { bg: BRAND.ink, ink: BRAND.white, label: BRAND.coral },
        tint: { bg: BRAND.coralTint, ink: BRAND.ink, label: BRAND.coralDeep },
        outline: { bg: BRAND.white, ink: BRAND.ink, label: BRAND.coralDeep, border: BRAND.coral },
        pill: { bg: BRAND.coral, ink: BRAND.ink, label: BRAND.ink },
        pillOutline: { bg: BRAND.white, ink: BRAND.ink, label: BRAND.coralDeep, border: BRAND.coral },
      }
      const sk = skins[look] || skins.cream
      return row(`
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" ${inset ? '' : 'width="100%"'} bgcolor="${sk.bg}"
        style="${inset ? '' : 'width:100%;'}background-color:${sk.bg};border-radius:16px;${sk.border ? `border:2px solid ${sk.border};` : ''}">
        <tr><td style="padding:18px 20px;">
          ${b.label ? `<div style="font-family:${FONT};font-size:12px;line-height:16px;letter-spacing:1px;color:${sk.label};font-weight:bold;">${escapeHtml(upperGreek(b.label))}</div>` : ''}
          <div style="font-family:'Courier New',Courier,monospace;font-size:17px;line-height:26px;color:${sk.ink};font-weight:bold;word-break:break-all;padding-top:4px;">${escapeHtml(b.value)}</div>
        </td></tr>
      </table>`, '16px 48px 0 48px')
    }

    case 'toc':
      return '' // παράγεται στο renderCampaignBody, όπου φαίνονται όλες οι ενότητες

    case 'greeting':
      // Ξεχωριστό από την παράγραφο ΜΟΝΟ για τον χώρο: ο χαιρετισμός ανοίγει
      // το γράμμα και θέλει αέρα από πάνω, πριν από κάθε ενότητα.
      return row(`<div style="${bodyText()}">${richText(b.html)}</div>`, '28px 48px 0 48px')

    case 'spacer': {
      const h = b.size === 'large' ? 48 : b.size === 'small' ? 12 : 28
      return `<tr><td height="${h}" style="height:${h}px;line-height:${h}px;font-size:0;">&nbsp;</td></tr>`
    }

    case 'quote': {
      const coral = b.tone === 'coral'
      const bg = coral ? BRAND.coral : BRAND.cream
      const ink = BRAND.ink
      return row(`
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${bg};border-radius:16px;">
        <tr><td style="padding:22px 24px;">
          <div style="font-family:${FONT};font-size:19px;line-height:29px;color:${ink};font-style:italic;mso-line-height-rule:exactly;">${richText(b.html)}</div>
          ${b.who ? `<div style="font-family:${FONT};font-size:13px;line-height:20px;color:${coral ? ink : BRAND.inkSoft};font-weight:bold;padding-top:10px;">— ${escapeHtml(b.who)}</div>` : ''}
        </td></tr>
      </table>`, '16px 48px 0 48px')
    }

    case 'stats': {
      const items = (b.items || []).filter(x => x.value || x.label)
      if (!items.length) return ''
      // ΠΙΝΑΚΑΣ και όχι flex: το Outlook δεν ξέρει flexbox. Κάθε κελί
      // στοιβάζεται σε στενή οθόνη με το .stack.
      return row(`
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${BRAND.cream};border-radius:16px;">
        <tr><td style="padding:18px 12px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
            ${items.map(x => `<td class="stack" align="center" style="padding:6px 8px;">
              <div style="font-family:${FONT};font-size:26px;line-height:32px;color:${BRAND.coralDeep};font-weight:bold;">${escapeHtml(x.value)}</div>
              <div style="font-family:${FONT};font-size:13px;line-height:19px;color:${BRAND.inkSoft};">${escapeHtml(x.label)}</div>
            </td>`).join('')}
          </tr></table>
        </td></tr>
      </table>`, '16px 48px 0 48px')
    }

    case 'agenda': {
      const rows = (b.rows || []).filter(r => r.title || r.date)
      if (!rows.length) return ''
      return row(`
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        ${rows.map((r, n) => `<tr>
          <td class="stack" width="110" style="width:110px;vertical-align:top;padding:12px 12px 12px 0;${n ? `border-top:1px solid ${BRAND.hairline};` : ''}">
            <div style="font-family:${FONT};font-size:13px;line-height:19px;letter-spacing:0.6px;color:${BRAND.coralDeep};font-weight:bold;">${escapeHtml(upperGreek(r.date || ''))}</div>
          </td>
          <td class="stack" style="vertical-align:top;padding:12px 0;${n ? `border-top:1px solid ${BRAND.hairline};` : ''}">
            <div style="font-family:${FONT};font-size:16px;line-height:24px;color:${BRAND.ink};font-weight:bold;">${
              r.href ? `<a href="${escapeHtml(r.href)}" style="color:${BRAND.ink};text-decoration:underline;">${escapeHtml(r.title)}</a>` : escapeHtml(r.title)
            }</div>
            ${r.place ? `<div style="font-family:${FONT};font-size:14px;line-height:21px;color:${BRAND.inkSoft};">${escapeHtml(r.place)}</div>` : ''}
          </td>
        </tr>`).join('')}
      </table>`, '16px 48px 0 48px')
    }

    case 'grid': {
      const items = (b.items || []).filter(x => x.title || x.html || x.src)
      if (!items.length) return ''
      const per = b.cols === '3' ? 3 : 2
      // Σπάμε σε σειρές των 2 ή 3: μια ενιαία σειρά με πέντε κελιά θα
      // στρίμωχνε το κείμενο σε στήλη ενός γράμματος.
      const chunks: typeof items[] = []
      for (let n = 0; n < items.length; n += per) chunks.push(items.slice(n, n + per))
      const cellW = per === 3 ? 160 : 250
      const body = chunks.map(chunk => `<tr>${chunk.map((x, n) => `
        ${n ? `<td class="stack" width="16" style="width:16px;font-size:0;line-height:16px;">&nbsp;</td>` : ''}
        <td class="stack" width="${cellW}" style="width:${cellW}px;vertical-align:top;padding-bottom:16px;">
          ${x.src ? `${img(x.src, x.alt || x.title || '', cellW, x.href)}<div style="height:10px;line-height:10px;font-size:0;">&nbsp;</div>` : ''}
          <div style="font-family:${FONT};font-size:16px;line-height:23px;color:${BRAND.ink};font-weight:bold;">${
            x.href ? `<a href="${escapeHtml(x.href)}" style="color:${BRAND.ink};text-decoration:none;">${escapeHtml(x.title)}</a>` : escapeHtml(x.title)
          }</div>
          <div style="${bodyText('soft')}padding-top:4px;">${richText(x.html)}</div>
        </td>`).join('')}</tr>`).join('')
      return row(`<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${body}</table>`, '16px 48px 0 48px')
    }

    case 'browserView': {
      /**
       * Η λωρίδα φεύγει ΕΞΩ από την κάρτα, πάνω από τα πάντα.
       *
       * Ο σύνδεσμος δείχνει στο ΔΙΚΟ μας αρχείο τεύχους, όχι σε φιλοξενούμενη
       * σελίδα του Sender: ίδια ταυτότητα, δικιά μας διεύθυνση, και συνεχίζει
       * να δουλεύει αν κάποτε αλλάξουμε πάροχο. Το URL μπαίνει τη στιγμή της
       * αποστολής — στην προεπισκόπηση δεν υπάρχει ακόμη τεύχος.
       */
      const skin = b.tone === 'dark'
        ? { bg: BRAND.ink, ink: BRAND.white, link: BRAND.white }
        : b.tone === 'coral' ? { bg: BRAND.coral, ink: BRAND.ink, link: BRAND.ink }
        : b.tone === 'cream' ? { bg: BRAND.cream, ink: BRAND.inkSoft, link: BRAND.coralDeep }
        : { bg: BRAND.white, ink: BRAND.inkSoft, link: BRAND.coralDeep }
      const text = b.text || 'Δεν εμφανίζεται σωστά αυτό το μήνυμα;'
      const linkText = b.linkText || 'Δες το στον browser'
      return `
  <tr>
    <td class="px" align="center" bgcolor="${skin.bg}" style="background-color:${skin.bg};padding:12px 24px;font-family:${FONT};font-size:12px;line-height:18px;color:${skin.ink};">
      ${escapeHtml(text)}
      <a href="{{ARCHIVE_URL}}" style="color:${skin.link};text-decoration:underline;">${escapeHtml(linkText)}</a>
    </td>
  </tr>`
    }

    case 'masthead': {
      const layout = b.layout || 'textTop'
      const tone = b.tone || 'coral'
      const band =
        tone === 'dark' ? { bg: BRAND.ink, ink: BRAND.white, eyebrow: BRAND.coral } :
        tone === 'cream' ? { bg: BRAND.cream, ink: BRAND.ink, eyebrow: BRAND.coralDeep } :
        tone === 'white' ? { bg: BRAND.white, ink: BRAND.ink, eyebrow: BRAND.coralDeep } :
        { bg: BRAND.coral, ink: BRAND.white, eyebrow: BRAND.white }

      const heading = (align: 'center' | 'left') => `
        ${b.eyebrow ? `<div style="font-family:${FONT};font-size:13px;line-height:18px;letter-spacing:1.6px;font-weight:bold;color:${band.eyebrow};padding-bottom:8px;text-align:${align};">${escapeHtml(upperGreek(b.eyebrow))}</div>` : ''}
        <div class="h1" style="font-family:${FONT};font-size:30px;line-height:38px;font-weight:bold;color:${band.ink};text-align:${align};">${escapeHtml(upperGreek(b.title || ''))}</div>`

      // Η εικόνα είναι ΠΑΝΤΑ στρογγυλεμένη — ταυτότητα, όχι επιλογή
      const show = b.withImage !== false && !!b.src
      const wide = layout === 'imageLeft' || layout === 'imageRight' ? 240 : INNER_WIDTH
      const scale = b.imageSize === 'small' ? 0.62 : b.imageSize === 'large' ? 1 : 0.82
      const w = Math.round(wide * (layout === 'imageLeft' || layout === 'imageRight' ? 1 : scale))
      /**
       * ΡΗΤΟ ΠΛΑΤΟΣ ΣΕ ΠΙΝΑΚΑ, όχι max-width στην εικόνα.
       *
       * Το img() δίνει `width:100%;max-width:Xpx`. Το max-width όμως ΔΕΝ το
       * υποστηρίζει ο Outlook: εκεί κάθε μέγεθος έβγαινε ίδιο, σε πλήρες
       * πλάτος. Ένας πίνακας με σταθερό width το σέβονται όλα τα
       * γραμματοκιβώτια, και η εικόνα γεμίζει αυτόν.
       */
      const hero = show
        ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="${w}" align="center" style="width:${w}px;max-width:100%;"><tr><td>${img(b.src!, b.alt || b.title || '', w)}</td></tr></table>`
        : ''
      // Κενό ΠΑΝΩ από τη φωτογραφία: κολλημένη στο χείλος της ζώνης έμοιαζε
      // με λάθος στοίχιση
      const heroBlock = show ? `<div style="height:22px;line-height:22px;font-size:0;">&nbsp;</div>${hero}` : ''

      if (layout === 'minimal') {
        return `
  <tr><td class="px" bgcolor="${band.bg}" style="background-color:${band.bg};padding:32px 48px;">
    ${heading('left')}
    <div style="height:14px;line-height:14px;font-size:0;">&nbsp;</div>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
      <td style="border-top:3px solid ${BRAND.coral};font-size:0;line-height:0;">&nbsp;</td></tr></table>
    ${heroBlock}
  </td></tr>`
      }

      if (layout === 'imageLeft' || layout === 'imageRight') {
        const pic = show ? `<td class="stack" width="${w}" style="width:${w}px;vertical-align:middle;">${hero}</td>
          <td class="stack" width="20" style="width:20px;font-size:0;line-height:20px;">&nbsp;</td>` : ''
        const txt = `<td class="stack" style="vertical-align:middle;">${heading('left')}</td>`
        return `
  <tr><td class="px" bgcolor="${band.bg}" style="background-color:${band.bg};padding:32px 48px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
      ${layout === 'imageLeft' ? `${pic}${txt}` : `${txt}${show ? `<td class="stack" width="20" style="width:20px;font-size:0;line-height:20px;">&nbsp;</td><td class="stack" width="${w}" style="width:${w}px;vertical-align:middle;">${hero}</td>` : ''}`}
    </tr></table>
  </td></tr>`
      }

      if (layout === 'imageTop') {
        return `
  <tr><td class="px" bgcolor="${band.bg}" align="center" style="background-color:${band.bg};padding:32px 48px;">
    ${show ? hero + '<div style="height:22px;line-height:22px;font-size:0;">&nbsp;</div>' : ''}
    ${heading('center')}
  </td></tr>`
      }

      return `
  <tr><td class="px" bgcolor="${band.bg}" align="center" style="background-color:${band.bg};padding:32px 48px;">
    ${heading('center')}${heroBlock}
  </td></tr>`
    }

    case 'social': {
      const items = (b.items || []).filter(x => x.network && x.href)
      if (!items.length) return ''
      // ΚΕΙΜΕΝΟ, όχι εικονίδια: τα εικονίδια θα ήταν εικόνες που τα
      // γραμματοκιβώτια μπλοκάρουν, αφήνοντας μια σειρά από σπασμένα κουτιά.
      return row(`
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td align="center" style="padding:4px 0;">
          ${items.map(x => `<a href="${escapeHtml(x.href)}" style="font-family:${FONT};font-size:14px;line-height:22px;color:${BRAND.coralDeep};text-decoration:underline;padding:0 8px;">${escapeHtml(x.network)}</a>`).join('<span style="color:' + BRAND.inkSoft + ';">·</span>')}
        </td></tr>
        ${b.note ? `<tr><td align="center" style="font-family:${FONT};font-size:12px;line-height:18px;color:${BRAND.inkSoft};padding-top:6px;">${escapeHtml(b.note)}</td></tr>` : ''}
      </table>`, '16px 48px 0 48px')
    }
  }
}

function buttonHtml(label: string, href: string, style: 'coral' | 'outline' | 'dark', fullWidth: boolean): string {
  const skin =
    style === 'coral' ? `background-color:${BRAND.coral};` :
    style === 'dark' ? `background-color:${BRAND.ink};` :
    `border:1px solid ${BRAND.ink};`
  const ink = style === 'dark' ? BRAND.white : BRAND.ink
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" ${fullWidth ? 'width="100%"' : ''}>
    <tr><td class="btn" align="center" ${style === 'coral' ? `bgcolor="${BRAND.coral}"` : style === 'dark' ? `bgcolor="${BRAND.ink}"` : ''} style="${skin}border-radius:999px;">
      <a href="${escapeHtml(href)}" style="display:block;padding:14px 28px;font-family:${FONT};font-size:15px;line-height:20px;font-weight:bold;color:${ink};text-decoration:none;border-radius:999px;mso-line-height-rule:exactly;">${escapeHtml(label)}</a>
    </td></tr></table>`
}

/** Ο πίνακας περιεχομένων χτίζεται ΑΠΟ τις ενότητες — δεν συντηρείται με το χέρι */
function renderToc(blocks: Block[], title?: string): string {
  const items = blocks
    .map((b, i) => (b.type === 'section' && !b.hidden ? { title: b.title, id: anchorId(b.title, i) } : null))
    .filter(Boolean) as Array<{ title: string; id: string }>
  if (items.length < 2) return ''
  return row(`
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${BRAND.cream};border-radius:16px;">
    <tr><td style="padding:20px;">
      <div style="font-family:${FONT};font-size:12px;line-height:16px;letter-spacing:1.2px;color:${BRAND.coralDeep};font-weight:bold;">${escapeHtml(upperGreek(title || TOC_DEFAULT_TITLE))}</div>
      <div style="height:10px;line-height:10px;font-size:0;">&nbsp;</div>
      ${items.map(it => `<div style="${bodyText()}padding:3px 0;">→ <a href="#${it.id}" style="color:${BRAND.coralDeep};text-decoration:underline;">${escapeHtml(it.title)}</a></div>`).join('')}
    </td></tr>
  </table>`, '16px 48px 0 48px')
}

/**
 * Σημαδεύει κάθε μπλοκ με τη θέση του, για το «κλικ στην προεπισκόπηση».
 *
 * ΜΟΝΟ στην προεπισκόπηση: στο γράμμα που φεύγει δεν έχουν καμία δουλειά
 * — θα ήταν άχρηστα bytes σε κάθε παραλήπτη. Μπαίνει στο ΠΡΩΤΟ <td κάθε
 * μπλοκ, οπότε δεν χρειάζεται να αλλάξει κανένας renderer.
 */
function annotateBlock(html: string, i: number): string {
  return html.replace(/<td\b/, `<td data-b="${i}"`)
}

export function renderCampaignBody(blocks: Block[], annotate = false): string {
  return blocks
    .map((b, i) => {
      // Τα κρυφά δεν αποδίδονται — αλλά ΚΡΑΤΟΥΝ τη θέση τους στη σειρά, ώστε
      // το κλικ στην προεπισκόπηση να δείχνει στο σωστό μπλοκ του συνθέτη.
      if (b?.hidden) return ''
      const html = b.type === 'toc' ? renderToc(blocks, b.title) : renderBlock(b, i)
      return annotate && html ? annotateBlock(html, i) : html
    })
    .join('\n')
}

/**
 * Το σενάριο που στέλνει «πατήθηκε το μπλοκ Ν» στον γονέα.
 *
 * Μικρό επίτηδες: το πλαίσιο τρέχει με sandbox="allow-scripts" και ΧΩΡΙΣ
 * allow-same-origin, οπότε δεν μπορεί να αγγίξει τη σελίδα μας — μόνο να
 * στείλει μήνυμα.
 */
const PICK_SCRIPT = `<script>
document.addEventListener('click', function (e) {
  var el = e.target;
  while (el && el !== document.body && !el.getAttribute?.('data-b')) el = el.parentElement;
  var i = el && el.getAttribute && el.getAttribute('data-b');
  if (i !== null && i !== undefined) {
    e.preventDefault();
    parent.postMessage({ source: 'oc-preview', index: Number(i) }, '*');
  }
}, true);
addEventListener('message', function (e) {
  var d = e.data || {};
  if (d.source !== 'oc-editor' || typeof d.index !== 'number') return;
  var el = document.querySelector('[data-b="' + d.index + '"]');
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  // Σύντομη λάμψη, ίδια λογική με τον συνθέτη: δείχνει πού πήγες και σβήνει
  var prev = el.style.outline;
  el.style.outline = '3px solid #FF8B6A';
  el.style.outlineOffset = '-3px';
  setTimeout(function () { el.style.outline = prev; }, 1200);
});
var st;
addEventListener('scroll', function () {
  clearTimeout(st);
  st = setTimeout(function () {
    parent.postMessage({ source: 'oc-preview', scroll: window.scrollY }, '*');
  }, 120);
}, { passive: true });
document.addEventListener('mouseover', function (e) {
  var el = e.target;
  while (el && el !== document.body && !el.getAttribute?.('data-b')) el = el.parentElement;
  document.querySelectorAll('[data-b]').forEach(function (n) { n.style.outline = ''; });
  if (el && el.style) { el.style.outline = '2px solid #FF8B6A'; el.style.outlineOffset = '-2px'; el.style.cursor = 'pointer'; }
}, true);
<\/script>`

/**
 * Απλό κείμενο από τα ΙΔΙΑ μπλοκ — ποτέ γραμμένο στο χέρι, ώστε να μην
 * αποκλίνει. Βελτιώνει και την παραδοσιμότητα.
 */
export function renderCampaignText(blocks: Block[]): string {
  const strip = (h: string) => sanitizeInline(h).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
  const out: string[] = []
  for (const b of blocks) {
    if (b?.hidden) continue
    switch (b.type) {
      case 'section': out.push(`\n${upperGreek(b.title)}\n${'─'.repeat(Math.min(b.title.length, 40))}`); break
      case 'text': out.push(strip(b.html)); break
      case 'box': out.push((b.title ? `${b.title}: ` : '') + strip(b.html)); break
      case 'card': out.push(`${b.title}\n${strip(b.html)}${b.buttonHref ? `\n${b.buttonHref}` : ''}`); break
      case 'person': out.push(`${b.name}${b.role ? ` — ${b.role}` : ''}\n${strip(b.html)}`); break
      case 'imageText': out.push(strip(b.html)); break
      case 'button': out.push(`${b.label}: ${b.href}`); break
      case 'attachment': out.push((b.items || []).map(it => `${it.name} (${fileSizeLabel(it.size)}): ${it.url}`).join('\n')); break
      case 'amounts': out.push(b.rows.map(r => `${r.label}: ${r.amount}`).join('\n') + (b.total ? `\nΣύνολο: ${b.total}` : '')); break
      case 'mono': out.push(`${b.label ? `${b.label}: ` : ''}${b.value}`); break
      case 'image': out.push(b.alt ? `[${b.alt}]` : ''); break
      case 'logos': out.push(b.items.map(l => l.alt).join(' · ')); break
      case 'greeting': out.push(strip(b.html)); break
      case 'masthead': out.push(`${b.eyebrow ? `${upperGreek(b.eyebrow)}\n` : ''}${upperGreek(b.title || '')}`); break
      // Η λωρίδα «προβολή στον browser» δεν έχει νόημα σε απλό κείμενο
      case 'browserView': break
      case 'quote': out.push(`«${strip(b.html)}»${b.who ? `\n— ${b.who}` : ''}`); break
      case 'stats': out.push((b.items || []).map(x => `${x.value} ${x.label}`).join(' · ')); break
      case 'agenda': out.push((b.rows || []).map(r =>
        `${r.date} — ${r.title}${r.place ? `, ${r.place}` : ''}${r.href ? `\n  ${r.href}` : ''}`).join('\n')); break
      case 'grid': out.push((b.items || []).map(x =>
        `${x.title}\n${strip(x.html)}${x.href ? `\n  ${x.href}` : ''}`).join('\n\n')); break
      case 'social': out.push((b.items || []).map(x => `${x.network}: ${x.href}`).join('\n')); break
      // Το «spacer» δεν έχει κείμενο — ο κενός χώρος δεν διαβάζεται
      default: break
    }
  }
  return out.filter(Boolean).join('\n\n')
}

// ── Έτοιμα σχέδια ───────────────────────────────────────────────────────────

/**
 * Τα preset δεν είναι πρότυπα κλειδωμένα: είναι ένα ΞΕΚΙΝΗΜΑ. Ο χρήστης
 * προσθέτει, σβήνει και αναδιατάσσει ελεύθερα — απλώς δεν ξεκινά από λευκή
 * σελίδα, που είναι και ο λόγος που το MailChimp φαίνεται γρήγορο.
 */
export interface Preset { id: string; label: string; hint: string; blocks: Block[] }

export const PRESETS: Preset[] = [
  {
    id: 'announcement',
    label: 'Ανακοίνωση',
    hint: 'Ένα θέμα, μία ενέργεια — το πιο συνηθισμένο',
    blocks: [
      { type: 'section', title: 'Ανακοίνωση' },
      { type: 'text', html: 'Γράψε εδώ την ανακοίνωση προς τα μέλη.' },
      { type: 'button', label: 'Δες περισσότερα', href: 'https://www.cultureforchange.net', style: 'coral' },
    ],
  },
  {
    id: 'event',
    label: 'Πρόσκληση σε εκδήλωση',
    hint: 'Με κουτί ημερομηνίας και τόπου',
    blocks: [
      { type: 'section', title: 'Πρόσκληση' },
      { type: 'text', html: 'Σε προσκαλούμε στη…' },
      { type: 'box', tone: 'cream', title: 'Πότε και πού', html: 'Κυριακή 12 Οκτωβρίου, 18:00<br>Αθήνα — η ακριβής διεύθυνση θα σταλεί.' },
      { type: 'button', label: 'Δηλώνω συμμετοχή', href: 'https://www.cultureforchange.net', style: 'coral' },
    ],
  },
  {
    id: 'newsletter',
    label: 'Ενημερωτικό δελτίο',
    hint: 'Πολλές ενότητες, κάρτες, λογότυπα — σαν το μηνιαίο',
    blocks: [
      { type: 'toc' },
      { type: 'section', title: 'Νέα του δικτύου' },
      { type: 'card', title: 'Τίτλος δράσης', html: 'Λίγες γραμμές για τη δράση.', buttonLabel: 'Περισσότερα', buttonHref: 'https://www.cultureforchange.net' },
      { type: 'card', title: 'Δεύτερη δράση', html: 'Λίγες γραμμές ακόμη.' },
      { type: 'divider', style: 'line' },
      { type: 'section', title: 'Συνέντευξη' },
      { type: 'person', name: 'Όνομα Επώνυμο', role: 'Ιδιότητα', html: 'Απόσπασμα από τη συνέντευξη.' },
      { type: 'divider', style: 'line' },
      { type: 'section', title: 'Με τη στήριξη' },
      { type: 'logos', items: [], note: 'Πρόσθεσε τα λογότυπα των υποστηρικτών.' },
    ],
  },
  {
    id: 'reminder',
    label: 'Υπενθύμιση',
    hint: 'Με κουτί προσοχής και προθεσμία',
    blocks: [
      { type: 'section', title: 'Υπενθύμιση' },
      { type: 'text', html: 'Σου υπενθυμίζουμε ότι…' },
      { type: 'box', tone: 'warning', title: 'Προθεσμία', html: 'Γράψε εδώ την ημερομηνία και τι συμβαίνει αν περάσει.' },
      { type: 'button', label: 'Τακτοποίησέ το', href: 'https://www.cultureforchange.net', style: 'coral' },
    ],
  },
]

/**
 * Τα έτοιμα σχέδια του NEWSLETTER — άλλα από του μηνύματος.
 *
 * Τα τέσσερα παραπάνω (Ανακοίνωση, Πρόσκληση, Ενημερωτικό δελτίο, Υπενθύμιση)
 * αφορούν ΜΟΝΟ την αποστολή email· σε newsletter δεν έχουν νόημα.
 *
 * Και τα δύο είναι ΣΤΙΓΜΙΟΤΥΠΑ υπαρκτών καμπανιών:
 *   · Εσωτερικό NL → «CforC Community Journal», 101 μπλοκ (29/9/2026)
 *   · Εξωτερικό NL → «CforC Newsletter #8», 41 μπλοκ (30/9/2026)
 *
 * Σκόπιμα αντιγραφή και όχι ζωντανή αναφορά: ένα έτοιμο σχέδιο που αλλάζει
 * από κάτω σου επειδή κάποιος πείραξε ένα προσχέδιο είναι παγίδα, όχι
 * διευκόλυνση. Όταν αλλάξει το πρότυπο, ξανατρέχει η αντιγραφή συνειδητά.
 */
import INTERNAL_NL_BLOCKS from '@/lib/presets/internalNewsletter.json'
import EXTERNAL_NL_BLOCKS from '@/lib/presets/externalNewsletter.json'

export const NEWSLETTER_PRESETS: Preset[] = [
  {
    id: 'internal-nl',
    label: 'Εσωτερικό NL',
    hint: 'Το CforC Community Journal — πλήρης δομή με ενότητες, κάρτες και ημερολόγιο',
    blocks: INTERNAL_NL_BLOCKS as unknown as Block[],
  },
  {
    id: 'external-nl',
    label: 'Εξωτερικό NL',
    hint: 'Το CforC Newsletter #8 — πιο σύντομη δομή, για το κοινό εκτός δικτύου',
    blocks: EXTERNAL_NL_BLOCKS as unknown as Block[],
  },
]

/** Πεδία που αντικαθίστανται ανά παραλήπτη — από μενού, όχι πληκτρολογημένα */
export const MERGE_FIELDS = [
  { token: '{{όνομα}}', label: 'Μικρό όνομα', sample: 'Μαρία' },
  { token: '{{επώνυμο}}', label: 'Επώνυμο', sample: 'Κολιοπούλου' },
  { token: '{{ΑΜ}}', label: 'Αριθμός μέλους', sample: '34' },
  { token: '{{έτος}}', label: 'Τρέχον έτος', sample: String(new Date().getFullYear()) },
] as const

export function applyMergeFields(html: string, values: Record<string, string>): string {
  return html.replace(/\{\{([^}]+)\}\}/g, (m, k) => {
    const v = values[String(k).trim()]
    return v === undefined ? m : escapeHtml(v)
  })
}

// ── Η κεφαλίδα ──────────────────────────────────────────────────────────────

/**
 * Τέσσερις κεφαλίδες. Αλλάζει το χρώμα και η διάταξη — ΟΧΙ η γραμματοσειρά,
 * το μέγεθος ή οι αποστάσεις. Κάθε χρώμα είναι ήδη της ταυτότητας.
 *
 * Το λογότυπο είναι PNG και όχι SVG: τα περισσότερα γραμματοκιβώτια δεν
 * αποδίδουν SVG, και μια κεφαλίδα που λείπει είναι χειρότερη από μια απλή.
 */
export const HEADER_STYLES = [
  { id: 'coral', label: 'Coral', hint: 'Πορτοκαλί ζώνη με τον τίτλο — η προεπιλογή' },
  { id: 'light', label: 'Ανοιχτή', hint: 'Κρεμ ζώνη με σκούρο τίτλο — πιο ήσυχη' },
  { id: 'dark', label: 'Σκούρα', hint: 'Ανθρακί ζώνη με λευκό τίτλο — για σοβαρές ανακοινώσεις' },
] as const

export type HeaderStyle = (typeof HEADER_STYLES)[number]['id']

/**
 * Το σήμα ζει στη Βιβλιοθήκη Πολυμέσων, όχι στο /public: το email το ζητά από
 * το γραμματοκιβώτιο του παραλήπτη, οπότε η διεύθυνση πρέπει να δουλεύει
 * ΠΑΝΤΑ — και όχι μόνο αφού βγει το επόμενο deploy του site.
 */
const MEDIA = 'https://helpful-wealth-0a46a9eabb.media.strapiapp.com'
/** Σκούρο σήμα για ανοιχτό φόντο, λευκό για σκούρο — αλλιώς εξαφανίζεται */
export const LOGO_DARK = `${MEDIA}/cforc_mark_dark_cd4a38ef80.png`
export const LOGO_LIGHT = `${MEDIA}/cforc_mark_light_7677ed6e9c.png`
const LOGO_URL = LOGO_LIGHT

function headerHtml(style: HeaderStyle, subject: string, withLogo: boolean): string {
  const title = escapeHtml(subject)

  /** Κάθε κεφαλίδα: φόντο, χρώμα τίτλου και eyebrow· η απόχρωση του σήματος
   *  ακολουθεί το φόντο, δεν επιλέγεται — λευκό σε σκούρο, ανθρακί σε ανοιχτό. */
  const skins: Record<string, { bg: string; ink: string; eyebrow: string; logo: string; rule?: string }> = {
    coral: { bg: BRAND.coral, ink: BRAND.ink, eyebrow: BRAND.white, logo: LOGO_LIGHT },
    light: { bg: BRAND.cream, ink: BRAND.ink, eyebrow: BRAND.coralDeep, logo: LOGO_DARK, rule: BRAND.coral },
    dark: { bg: BRAND.ink, ink: BRAND.white, eyebrow: BRAND.coral, logo: LOGO_LIGHT },
  }
  const skin = skins[style] || skins.coral

  const eyebrow = `<div style="font-family:${FONT};font-size:13px;line-height:16px;letter-spacing:1.6px;color:${skin.eyebrow};font-weight:bold;">CULTURE FOR CHANGE</div>`
  const heading = `<div class="h1" style="font-family:${FONT};font-size:30px;line-height:36px;color:${skin.ink};font-weight:bold;">${title}</div>`
  const spacer = '<div style="height:20px;line-height:20px;font-size:0;">&nbsp;</div>'
  // Η κρεμ ζώνη πάνω σε λευκή κάρτα δεν ξεχωρίζει χωρίς γραμμή
  const border = skin.rule ? `border-bottom:3px solid ${skin.rule};` : ''

  if (withLogo) {
    return `
  <tr>
    <td class="px" style="background-color:${skin.bg};padding:32px 48px;${border}">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
        <td style="vertical-align:middle;">${eyebrow}${spacer}${heading}</td>
        <td class="logocell" width="88" style="width:88px;vertical-align:middle;text-align:right;">
          <img class="logoimg" src="${skin.logo}" alt="Culture for Change" width="72" style="display:inline-block;width:72px;max-width:72px;height:auto;border:0;" />
        </td>
      </tr></table>
    </td>
  </tr>`
  }

  return `
  <tr>
    <td class="px" style="background-color:${skin.bg};padding:36px 48px 32px 48px;${border}">
      ${eyebrow}${spacer}${heading}
    </td>
  </tr>`
}

// ── Υπογραφή και υποσέλιδο ──────────────────────────────────────────────────

/**
 * Ποιος στέλνει. Η θυρίδα και ο ρόλος βγαίνουν από την ΕΔΡΑ που συνθέτει —
 * finance@ για τον Ταμία, community@ για την Κοινότητα, coordination@ για τον
 * Συντονισμό, outreach@ για το Outreach, communication@ για την Επικοινωνία,
 * hello@ για τη Γραμματεία — και το όνομα από τον τρέχοντα κάτοχό της, ποτέ
 * γραμμένο στο χέρι: οι εκλογές αλλάζουν πρόσωπα, όχι πρότυπα.
 */
export interface CampaignSigner {
  name: string
  role: string
  email: string
}

/**
 * Δύο ΑΝΕΞΑΡΤΗΤΟΙ άξονες, όχι τέσσερις συνδυασμοί: ΤΙ λέει η υπογραφή και ΠΩΣ
 * δείχνει. Συνδυασμένοι θα έδιναν δεκαέξι επιλογές με ονόματα σαν
 * «Σύντομη σε σκούρα ζώνη» — και κάθε νέα ιδέα θα πολλαπλασίαζε τη λίστα.
 */
export const FOOTER_STYLES = [
  { id: 'signature', label: 'Υπογραφή', hint: '«Φιλικά», όνομα, ρόλος και θυρίδα — όπως στα αυτόματα email' },
  { id: 'compact', label: 'Σύντομη', hint: 'Όνομα και θυρίδα, χωρίς χαιρετισμό' },
  { id: 'organisation', label: 'Ως δίκτυο', hint: 'Χωρίς πρόσωπο — υπογράφει το CforC' },
  { id: 'detailed', label: 'Αναλυτική', hint: 'Υπογραφή, θυρίδα και σύνδεσμος στην πλατφόρμα' },
] as const

export const FOOTER_LOOKS = [
  { id: 'plain', label: 'Λευκό', hint: 'Λεπτή γραμμή πάνω από την υπογραφή' },
  { id: 'cream', label: 'Κρεμ ζώνη', hint: 'Η υπογραφή σε χρωματιστή ζώνη με στρογγυλές γωνίες' },
  { id: 'coral', label: 'Coral ζώνη', hint: 'Πορτοκαλί ζώνη με στρογγυλές γωνίες' },
  { id: 'dark', label: 'Σκούρα ζώνη', hint: 'Ανθρακί ζώνη με λευκά γράμματα' },
  { id: 'creamFull', label: 'Κρεμ φουλ', hint: 'Ζώνη από άκρη σε άκρη, σαν την κεφαλίδα' },
  { id: 'coralFull', label: 'Coral φουλ', hint: 'Πορτοκαλί από άκρη σε άκρη, σαν την κεφαλίδα' },
  { id: 'darkFull', label: 'Σκούρα φουλ', hint: 'Ανθρακί από άκρη σε άκρη, σαν την κεφαλίδα' },
] as const

export type FooterLook = (typeof FOOTER_LOOKS)[number]['id']

export type FooterStyle = (typeof FOOTER_STYLES)[number]['id']

const HAIRLINE = BRAND.rule

function footerHtml(
  style: FooterStyle, look: FooterLook, signer: CampaignSigner, year: number, withLogo: boolean,
): string {
  const name = escapeHtml(signer.name)
  const role = escapeHtml(signer.role)
  const mail = escapeHtml(signer.email)
  const org = escapeHtml(`Culture for Change — Δίκτυο Επαγγελματιών Πολιτισμού · ${year}`)

  // Η ΕΜΦΑΝΙΣΗ: χρώματα, και αν η ζώνη είναι ένθετη ή από άκρη σε άκρη
  const skins: Record<string, {
    bg: string; ink: string; soft: string; link: string; tiny: string; logo: string; full?: boolean
  }> = {
    plain: { bg: '', ink: BRAND.ink, soft: BRAND.inkSoft, link: BRAND.coralDeep, tiny: BRAND.inkMuted, logo: LOGO_DARK },
    cream: { bg: BRAND.cream, ink: BRAND.ink, soft: BRAND.inkSoft, link: BRAND.coralDeep, tiny: BRAND.inkMuted, logo: LOGO_DARK },
    // Πάνω σε coral το #C9552F των συνδέσμων χάνεται· εδώ ο σύνδεσμος
    // ξεχωρίζει με υπογράμμιση, όχι με χρώμα.
    coral: { bg: BRAND.coral, ink: BRAND.ink, soft: BRAND.ink, link: BRAND.ink, tiny: BRAND.inkSoft, logo: LOGO_LIGHT },
    dark: { bg: BRAND.ink, ink: BRAND.white, soft: '#D8D8D8', link: BRAND.coral, tiny: '#A0A0A0', logo: LOGO_LIGHT },
    creamFull: { bg: BRAND.cream, ink: BRAND.ink, soft: BRAND.inkSoft, link: BRAND.coralDeep, tiny: BRAND.inkMuted, logo: LOGO_DARK, full: true },
    coralFull: { bg: BRAND.coral, ink: BRAND.ink, soft: BRAND.ink, link: BRAND.ink, tiny: BRAND.inkSoft, logo: LOGO_LIGHT, full: true },
    darkFull: { bg: BRAND.ink, ink: BRAND.white, soft: '#D8D8D8', link: BRAND.coral, tiny: '#A0A0A0', logo: LOGO_LIGHT, full: true },
  }
  const skin = skins[look] || skins.plain

  const big = `font-family:${FONT};font-size:17px;line-height:24px;color:${skin.ink};font-weight:bold;mso-line-height-rule:exactly;`
  const small = `font-family:${FONT};font-size:15px;line-height:22px;color:${skin.soft};mso-line-height-rule:exactly;`
  const tiny = `font-family:${FONT};font-size:13px;line-height:20px;color:${skin.tiny};mso-line-height-rule:exactly;`
  const linkRow = `<tr><td style="font-family:${FONT};font-size:15px;line-height:22px;"><a href="mailto:${mail}" style="color:${skin.link};text-decoration:underline;">${mail}</a></td></tr>`
  const gap = (h: number) => `<tr><td height="${h}" style="height:${h}px;line-height:${h}px;font-size:0;">&nbsp;</td></tr>`

  // ΤΟ ΠΕΡΙΕΧΟΜΕΝΟ: ποιες γραμμές λέει η υπογραφή
  const bodies: Record<string, string> = {
    signature: `<tr><td style="${big}">${name}</td></tr>
        <tr><td style="${small}">${role}<br>Culture for Change</td></tr>${gap(6)}${linkRow}`,
    compact: `<tr><td style="${big}">${name}</td></tr>
        <tr><td style="${small}">${role}</td></tr>${gap(6)}${linkRow}`,
    organisation: `<tr><td style="${big}">Culture for Change</td></tr>${gap(6)}${linkRow}${gap(10)}
        <tr><td style="${tiny}">${org}</td></tr>`,
    detailed: `<tr><td style="${big}">${name}</td></tr>
        <tr><td style="${small}">${role}<br>Culture for Change</td></tr>${gap(6)}${linkRow}
        <tr><td style="font-family:${FONT};font-size:15px;line-height:22px;"><a href="https://www.cultureforchange.net" style="color:${skin.link};text-decoration:underline;">www.cultureforchange.net</a></td></tr>${gap(14)}
        <tr><td style="${tiny}">${org}</td></tr>`,
  }
  const rows = bodies[style] || bodies.signature

  /** Το σήμα μπαίνει δεξιά από την υπογραφή, σε οποιαδήποτε εμφάνιση */
  const withMark = (inner: string) => withLogo ? `
        <tr>
          <td style="vertical-align:middle;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${inner}</table>
          </td>
          <td class="markcell" width="64" style="width:64px;vertical-align:middle;text-align:right;">
            <img class="markimg" src="${skin.logo}" alt="Culture for Change" width="48" style="display:inline-block;width:48px;max-width:48px;height:auto;border:0;" />
          </td>
        </tr>` : inner

  // Το «Φιλικά,» δεν ταιριάζει σε υπογραφή χωρίς πρόσωπο, και μπαίνει ΕΞΩ από
  // τη χρωματιστή ζώνη: μέσα της διαβάζεται σαν τίτλος, όχι σαν κλείσιμο.
  const greeting = style === 'organisation' ? '' : `
  <tr>
    <td class="px" style="padding:32px 48px 0 48px;font-family:${FONT};font-size:16px;line-height:26px;color:${BRAND.ink};mso-line-height-rule:exactly;">
      <p style="margin:0;">Φιλικά,</p>
    </td>
  </tr>`

  // «Φουλ»: η ζώνη πιάνει όλο το πλάτος της κάρτας, όπως η κεφαλίδα — χωρίς
  // στρογγυλές γωνίες, γιατί η ίδια η κάρτα τις κόβει (overflow:hidden).
  if (skin.full) {
    return greeting + `
  <tr><td height="28" style="height:28px;line-height:28px;font-size:0;">&nbsp;</td></tr>
  <tr>
    <td class="px" style="background-color:${skin.bg};padding:32px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${withMark(rows)}</table>
    </td>
  </tr>`
  }

  if (look === 'cream' || look === 'coral' || look === 'dark') {
    return greeting + `
  <tr>
    <td class="px" style="padding:16px 48px 40px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${skin.bg};border-radius:16px;">
        <tr><td style="padding:24px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${withMark(rows)}</table>
        </td></tr>
      </table>
    </td>
  </tr>`
  }

  return greeting + `
  <tr>
    <td class="px" style="padding:16px 48px 40px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td colspan="${withLogo ? 2 : 1}" height="1" style="height:1px;line-height:1px;font-size:0;background-color:${BRAND.rule};">&nbsp;</td></tr>
        <tr><td colspan="${withLogo ? 2 : 1}" height="20" style="height:20px;line-height:20px;font-size:0;">&nbsp;</td></tr>
        ${withMark(rows)}
      </table>
    </td>
  </tr>`
}

/** Το εξωτερικό περίβλημα — ίδιο με τα αυτόματα email (600px, κρεμ, coral) */
/**
 * Η γραμμή απεγγραφής ενός newsletter.
 *
 * Χαμηλός τόνος και έξω από τη ζώνη της υπογραφής: είναι υποχρέωση, όχι
 * κάλεσμα. Οι ετικέτες μένουν ΑΚΕΡΑΙΕΣ για τον Sender.
 */
function unsubscribeRow(): string {
  return `
  <tr>
    <td class="px" align="center" style="padding:0 48px 28px 48px;font-family:${FONT};font-size:12px;line-height:18px;color:${BRAND.inkSoft};">
      Λαμβάνεις αυτό το μήνυμα επειδή εγγράφηκες στο newsletter του Culture for Change.<br>
      <a href="{{unsubscribe_link}}" style="color:${BRAND.inkSoft};text-decoration:underline;">{{unsubscribe_text}}</a>
    </td>
  </tr>`
}

// ── Υποσέλιδο newsletter ────────────────────────────────────────────────────

/** Το ΠΛΗΡΕΣ λογότυπο (σήμα + λεκτικό) — όχι το σκέτο σήμα των υπογραφών */
export const LOCKUP_LIGHT = `${MEDIA}/cforc_lockup_light_2a324b9a5f.png`
export const LOCKUP_DARK = `${MEDIA}/cforc_lockup_dark_9d66f78693.png`

/**
 * Τα εικονίδια σε δύο εκδοχές, ανάλογα με το φόντο.
 *
 * Το ίδιο το σήμα κάθε δικτύου μένει ΑΘΙΚΤΟ και στις δύο — αλλάζει μόνο ο
 * δίσκος από κάτω: λευκός πάνω σε coral ή ανθρακί, coral πάνω σε κρεμ ή λευκό.
 */
export const SOCIAL_ICONS: Record<string, { onDark: string; onLight: string }> = {
  Instagram: {
    onDark: `${MEDIA}/social_instagram_on_coral_5439a478f2.png`,
    onLight: `${MEDIA}/social_instagram_on_light_e65a54d0a9.png`,
  },
  Facebook: {
    onDark: `${MEDIA}/social_facebook_on_coral_56d959b2fb.png`,
    onLight: `${MEDIA}/social_facebook_on_light_dd16aeec9b.png`,
  },
  LinkedIn: {
    onDark: `${MEDIA}/social_linkedin_on_coral_6e44787ce4.png`,
    onLight: `${MEDIA}/social_linkedin_on_light_44ee1ebfc2.png`,
  },
  YouTube: {
    onDark: `${MEDIA}/social_youtube_on_coral_026d85e69b.png`,
    onLight: `${MEDIA}/social_youtube_on_light_57d8aa65c8.png`,
  },
}

export interface SocialLink { network: string; href: string }

export interface NewsletterFooter {
  arrangement: NewsletterFooterId
  /** «Copyright © 2026 Culture for Change, All rights reserved.» */
  copyright: string
  /** Γιατί το λαμβάνεις και τι κάνουμε με τα στοιχεία σου */
  notice: string
  /** Η θυρίδα επικοινωνίας που δείχνει το υποσέλιδο */
  email: string
  socials: SocialLink[]
  /** Η γραμμή πάνω από τον σύνδεσμο απεγγραφής */
  unsubscribeLead: string
}

/**
 * Επτά διατάξεις του ΙΔΙΟΥ υλικού: λογότυπο, εικονίδια, δικαιώματα, σημείωμα
 * GDPR, θυρίδα, απεγγραφή. Αλλάζει η διάταξη και το φόντο — ποτέ το τι λέει,
 * γιατί το σημείωμα και η απεγγραφή είναι υποχρέωση, όχι διακόσμηση.
 */
export const NEWSLETTER_FOOTERS = [
  { id: 'stack', label: 'Στοίβα', hint: 'Εικονίδια πάνω, λογότυπο αριστερά και κείμενο δεξιά — όπως τα τωρινά τεύχη' },
  { id: 'centred', label: 'Κεντραρισμένη', hint: 'Όλα στο κέντρο: λογότυπο, εικονίδια, κείμενο' },
  { id: 'split', label: 'Δίστηλη', hint: 'Λογότυπο και θυρίδα αριστερά, εικονίδια και κείμενο δεξιά' },
  { id: 'logoBanner', label: 'Λωρίδα λογοτύπου', hint: 'Μεγάλο λογότυπο σε coral λωρίδα, το κείμενο από κάτω σε κρεμ' },
  { id: 'textBand', label: 'Κείμενο πρώτα', hint: 'Το σημείωμα σε κρεμ, από κάτω λεπτή coral λωρίδα με λογότυπο και εικονίδια' },
  { id: 'dark', label: 'Σκούρα', hint: 'Η στοίβα σε ανθρακί φόντο' },
  { id: 'slim', label: 'Λιτή', hint: 'Χωρίς ζώνη: λεπτή γραμμή, μικρό λογότυπο, μία σειρά κείμενο' },
] as const

export type NewsletterFooterId = (typeof NEWSLETTER_FOOTERS)[number]['id']

export const NEWSLETTER_FOOTER_DEFAULTS: NewsletterFooter = {
  arrangement: 'stack',
  copyright: `Copyright © ${new Date().getFullYear()} Culture for Change, All rights reserved.`,
  notice: 'Λαμβάνετε αυτό το email, επειδή έχετε εγγραφεί στη λίστα συνδρομητών του Culture for Change. '
    + 'Το Culture for Change χρησιμοποιεί τα στοιχεία επικοινωνίας σας αποκλειστικά για ενημέρωση των δράσεων '
    + 'και των πρωτοβουλιών του και δεν τα χρησιμοποιεί για άλλους σκοπούς ούτε τα παραχωρεί σε τρίτους.',
  email: 'hello@cultureforchange.net',
  socials: [
    { network: 'Instagram', href: 'https://www.instagram.com/culture_for_change/' },
    { network: 'Facebook', href: 'https://www.facebook.com/cultureforchange' },
    { network: 'LinkedIn', href: 'https://www.linkedin.com/company/culture-for-change-gr/' },
    { network: 'YouTube', href: 'https://www.youtube.com/channel/UCKFq7TQlenx36UPc3F63Opw' },
  ],
  unsubscribeLead: 'If you would like to unsubscribe, please click here.',
}

/** Συμπληρώνει ό,τι λείπει από ένα αποθηκευμένο υποσέλιδο */
export function normaliseNewsletterFooter(v: Partial<NewsletterFooter> | null | undefined): NewsletterFooter {
  const d = NEWSLETTER_FOOTER_DEFAULTS
  const ids = NEWSLETTER_FOOTERS.map(f => f.id) as readonly string[]
  return {
    arrangement: ids.includes(String(v?.arrangement)) ? v!.arrangement as NewsletterFooterId : d.arrangement,
    copyright: typeof v?.copyright === 'string' ? v.copyright : d.copyright,
    notice: typeof v?.notice === 'string' ? v.notice : d.notice,
    email: typeof v?.email === 'string' ? v.email : d.email,
    // Άγνωστο δίκτυο = δεν έχουμε εικονίδιο· πέφτει έξω αντί να βγει σπασμένη εικόνα
    socials: Array.isArray(v?.socials)
      ? v!.socials.filter(s => s && s.href && SOCIAL_ICONS[s.network])
      : d.socials,
    unsubscribeLead: typeof v?.unsubscribeLead === 'string' ? v.unsubscribeLead : d.unsubscribeLead,
  }
}

function newsletterFooterHtml(cfg: NewsletterFooter): string {
  interface Skin { bg: string; ink: string; soft: string; logo: string; icon: 'onDark' | 'onLight' }
  const skins: Record<'coral' | 'dark' | 'cream' | 'white', Skin> = {
    coral: { bg: BRAND.coral, ink: BRAND.ink, soft: BRAND.ink, logo: LOCKUP_LIGHT, icon: 'onDark' },
    dark: { bg: BRAND.ink, ink: BRAND.white, soft: '#D8D8D8', logo: LOCKUP_LIGHT, icon: 'onDark' },
    cream: { bg: BRAND.cream, ink: BRAND.ink, soft: BRAND.inkSoft, logo: LOCKUP_DARK, icon: 'onLight' },
    white: { bg: BRAND.white, ink: BRAND.ink, soft: BRAND.inkSoft, logo: LOCKUP_DARK, icon: 'onLight' },
  }

  const icons = (sk: Skin, align: 'left' | 'center' | 'right', size = 34) => {
    const items = cfg.socials.filter(s => SOCIAL_ICONS[s.network])
    if (!items.length) return ''
    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="${align}" style="${align === 'center' ? 'margin:0 auto;' : ''}">
        <tr>${items.map(s => `<td style="padding:0 6px;">
          <a href="${escapeHtml(s.href)}"><img src="${SOCIAL_ICONS[s.network]![sk.icon]}" alt="${escapeHtml(s.network)}" width="${size}" height="${size}" style="display:block;width:${size}px;height:${size}px;border:0;" /></a>
        </td>`).join('')}</tr>
      </table>`
  }

  const logo = (sk: Skin, width: number) =>
    `<img src="${sk.logo}" alt="Culture for Change" width="${width}" style="display:block;width:${width}px;max-width:${width}px;height:auto;border:0;" />`

  const mailLink = (sk: Skin, align: 'left' | 'center' = 'left') =>
    `<div style="font-family:${FONT};font-size:14px;line-height:22px;text-align:${align};"><a href="mailto:${escapeHtml(cfg.email)}" style="color:${sk.ink};text-decoration:underline;">${escapeHtml(cfg.email)}</a></div>`

  const copy = (sk: Skin, align: 'left' | 'center' = 'left') => `
    <div style="font-family:${FONT};font-size:14px;line-height:22px;color:${sk.ink};font-weight:bold;text-align:${align};mso-line-height-rule:exactly;">${escapeHtml(cfg.copyright)}</div>
    <div style="height:10px;line-height:10px;font-size:0;">&nbsp;</div>
    <div style="font-family:${FONT};font-size:13px;line-height:21px;color:${sk.soft};text-align:${align};mso-line-height-rule:exactly;">${escapeHtml(cfg.notice)}</div>`

  /**
   * Η ζώνη απεγγραφής: πάντα έξω από το χρώμα, σε ουδέτερο γκρι.
   *
   * Στρογγυλή σαν τις υπόλοιπες ζώνες — εκτός από τη «Λωρίδα λογοτύπου»,
   * που είναι εξ ορισμού από άκρη σε άκρη.
   */
  const unsub = (rounded = true) => {
    const text = `<a href="{{unsubscribe_link}}" style="color:${BRAND.inkSoft};text-decoration:underline;">${escapeHtml(cfg.unsubscribeLead)}</a>`
    const cell = `font-family:${FONT};font-size:13px;line-height:20px;color:${BRAND.inkSoft};`
    if (!rounded) {
      return `
  <tr><td class="px" align="center" style="background-color:#F5F5F5;padding:22px 48px;${cell}">${text}</td></tr>`
    }
    return `
  <tr>
    <td class="px" style="padding:0 24px 24px 24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F5F5F5;border-radius:16px;">
        <tr><td align="center" style="padding:18px 24px;${cell}">${text}</td></tr>
      </table>
    </td>
  </tr>`
  }

  /**
   * Μια ζώνη του υποσέλιδου.
   *
   * Στρογγυλή εξ ορισμού: η ταυτότητα είναι στρογγυλεμένη παντού αλλού —
   * κουμπιά, κάρτες, επικεφαλίδες ενοτήτων, η ίδια η κάρτα του γράμματος.
   * ΠΡΟΣΟΧΗ: το Outlook αγνοεί το border-radius και θα δείξει ορθή γωνία —
   * το ίδιο ισχύει ήδη για τις επικεφαλίδες, οπότε μένει συνεπές.
   */
  const band = (bg: string, inner: string, pad = '26px 24px', rounded = true) => rounded
    ? `<tr><td class="px" style="padding:0 24px 16px 24px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${bg};border-radius:20px;">
          <tr><td class="px" style="padding:${pad};">${inner}</td></tr>
        </table>
      </td></tr>`
    : `<tr><td class="px" style="background-color:${bg};padding:${pad};">${inner}</td></tr>`

  switch (cfg.arrangement) {
    case 'centred': {
      const sk = skins.coral
      return band(sk.bg, `
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr><td align="center">${logo(sk, 240)}</td></tr>
          <tr><td height="20" style="height:20px;line-height:20px;font-size:0;">&nbsp;</td></tr>
          <tr><td align="center">${icons(sk, 'center')}</td></tr>
          <tr><td height="20" style="height:20px;line-height:20px;font-size:0;">&nbsp;</td></tr>
          <tr><td align="center">${copy(sk, 'center')}${mailLink(sk, 'center')}</td></tr>
        </table>`) + unsub()
    }

    case 'split': {
      const sk = skins.coral
      return band(sk.bg, `
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td class="stack" width="220" style="width:220px;vertical-align:top;padding-right:24px;">
              ${logo(sk, 200)}
              <div style="height:12px;line-height:12px;font-size:0;">&nbsp;</div>
              ${mailLink(sk)}
            </td>
            <td class="stack" style="vertical-align:top;">
              ${icons(sk, 'left', 30)}
              <div style="height:14px;line-height:14px;font-size:0;">&nbsp;</div>
              ${copy(sk)}
            </td>
          </tr>
        </table>`) + unsub()
    }

    case 'logoBanner': {
      const top = skins.coral
      const low = skins.cream
      return band(top.bg, `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr><td align="center">${logo(top, 300)}</td></tr>
        </table>`, '36px 48px', false)
        + band(low.bg, `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr><td align="center">${icons(low, 'center')}</td></tr>
          <tr><td height="18" style="height:18px;line-height:18px;font-size:0;">&nbsp;</td></tr>
          <tr><td align="center">${copy(low, 'center')}${mailLink(low, 'center')}</td></tr>
        </table>`, '28px 48px', false)
        + unsub(false)
    }

    case 'textBand': {
      const top = skins.cream
      const low = skins.coral
      return band(top.bg, `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr><td align="center">${copy(top, 'center')}</td></tr>
        </table>`, '24px')
        + band(low.bg, `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td class="stack" width="220" style="width:220px;vertical-align:middle;">${logo(low, 200)}</td>
            <td class="stack" align="right" style="vertical-align:middle;">${icons(low, 'right', 30)}</td>
          </tr>
          <tr><td class="stack" colspan="2" style="padding-top:14px;">${mailLink(low)}</td></tr>
        </table>`, '22px 24px')
        + unsub()
    }

    case 'slim': {
      const sk = skins.white
      return `
  <tr>
    <td class="px" style="padding:28px 48px 8px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td height="1" style="height:1px;line-height:1px;font-size:0;background-color:${BRAND.rule};">&nbsp;</td></tr>
      </table>
    </td>
  </tr>` + band(sk.bg, `
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr><td align="center">${logo(sk, 170)}</td></tr>
          <tr><td height="14" style="height:14px;line-height:14px;font-size:0;">&nbsp;</td></tr>
          <tr><td align="center">${icons(sk, 'center', 28)}</td></tr>
          <tr><td height="14" style="height:14px;line-height:14px;font-size:0;">&nbsp;</td></tr>
          <tr><td align="center" style="font-family:${FONT};font-size:13px;line-height:20px;color:${sk.soft};">
            ${escapeHtml(cfg.copyright)} · <a href="mailto:${escapeHtml(cfg.email)}" style="color:${sk.soft};text-decoration:underline;">${escapeHtml(cfg.email)}</a>
          </td></tr>
          <tr><td height="8" style="height:8px;line-height:8px;font-size:0;">&nbsp;</td></tr>
          <tr><td align="center" style="font-family:${FONT};font-size:12px;line-height:18px;color:${BRAND.inkMuted};">${escapeHtml(cfg.notice)}</td></tr>
        </table>`, '0 48px 20px 48px', false) + unsub()
    }

    // «Στοίβα» — και σε coral και σε ανθρακί είναι η ΙΔΙΑ διάταξη
    case 'dark':
    case 'stack':
    default: {
      const sk = cfg.arrangement === 'dark' ? skins.dark : skins.coral
      // Ο διαχωριστής είναι ημιδιαφανές λευκό σε coral, ημιδιαφανές δεν
      // υπάρχει στο Outlook — γι' αυτό σταθερό χρώμα, όχι rgba.
      const rule = cfg.arrangement === 'dark' ? '#454545' : '#FFB59D'
      return band(sk.bg, `
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr><td>${icons(sk, 'left')}</td></tr>
          <tr><td height="24" style="height:24px;line-height:24px;font-size:0;">&nbsp;</td></tr>
          <tr><td height="1" style="height:1px;line-height:1px;font-size:0;background-color:${rule};">&nbsp;</td></tr>
          <tr><td height="24" style="height:24px;line-height:24px;font-size:0;">&nbsp;</td></tr>
        </table>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td class="stack" width="240" style="width:240px;vertical-align:top;padding-right:24px;">
              ${logo(sk, 220)}
              <div style="height:12px;line-height:12px;font-size:0;">&nbsp;</div>
              ${mailLink(sk)}
            </td>
            <td class="stack" style="vertical-align:top;">${copy(sk)}</td>
          </tr>
        </table>`) + unsub()
    }
  }
}

/**
 * Το ΙΔΙΟ γράμμα, αλλά για σελίδα: κεφαλίδα, μπλοκ, υποσέλιδο.
 *
 * ΓΙΑΤΙ ΔΕΝ ΧΡΗΣΙΜΟΠΟΙΕΙΤΑΙ ΤΟ campaignEmailHtml: εκείνο παράγει ΟΛΟΚΛΗΡΟ
 * έγγραφο HTML — <html>, <head>, metas — που δεν μπαίνει μέσα σε σελίδα.
 * Εδώ βγαίνει μόνο το περιεχόμενο, με την ίδια ακριβώς κεφαλίδα και
 * υπογραφή που βλέπουν τα μέλη στα email τους. Αντιγραφή της μορφής θα
 * σήμαινε δύο ταυτότητες που αποκλίνουν στην πρώτη αλλαγή χρώματος.
 */
export function renderDocumentHtml(opts: {
  title: string
  blocks: Block[]
  headerStyle?: HeaderStyle
  headerLogo?: boolean
  footerStyle?: FooterStyle
  footerLook?: FooterLook
  footerLogo?: boolean
  signer?: CampaignSigner
}): string {
  const signer = opts.signer || {
    name: 'Ομάδα Συντονισμού', role: 'Culture for Change', email: 'hello@cultureforchange.net',
  }
  /**
   * ΤΟ ΠΕΡΙΤΥΛΙΓΜΑ ΔΕΝ ΕΙΝΑΙ ΔΙΑΚΟΣΜΗΣΗ — ΕΙΝΑΙ Η ΔΟΜΗ.
   *
   * Κάθε μπλοκ βγαίνει ως <tr>. Χωρίς <table> γύρω του, ο browser πετάει τα
   * tr/td και κρατά μόνο το περιεχόμενο: χάνονται ΟΛΑ τα περιθώρια των 48px
   * (το κείμενο κολλάει στις άκρες), εξαφανίζεται η ζώνη της κεφαλίδας, και
   * μένουν όρθιοι μόνο όσοι εσωτερικοί πίνακες στέκονται μόνοι τους.
   * (Διαπιστώθηκε 2/10/2026, από στιγμιότυπα — όχι από τεστ: ο έλεγχος
   * κοίταζε ΑΝ υπάρχει το κείμενο, ποτέ πού κάθεται.)
   */
  const inner = [
    headerHtml(opts.headerStyle || 'coral', opts.title, opts.headerLogo !== false),
    renderCampaignBody(opts.blocks),
    footerHtml(
      opts.footerStyle || 'organisation',
      opts.footerLook || 'cream',
      signer,
      new Date().getFullYear(),
      opts.footerLogo !== false,
    ),
  ].join('\n')

  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="${CONTENT_WIDTH}" style="width:100%;max-width:${CONTENT_WIDTH}px;margin:0 auto;background-color:${BRAND.white};border-radius:24px;overflow:hidden;">
${inner}
</table>`
}

export function campaignEmailHtml(opts: {
  subject: string
  blocks: Block[]
  preheader?: string
  signer?: CampaignSigner
  footerStyle?: FooterStyle
  footerLook?: FooterLook
  footerLogo?: boolean
  headerStyle?: HeaderStyle
  headerLogo?: boolean
  /** Προεπισκόπηση: σημαδεύει τα μπλοκ ώστε το κλικ να βρίσκει ποιο πατήθηκε */
  annotate?: boolean
  /**
   * Newsletter: προσθέτει τη γραμμή απεγγραφής κάτω από το υποσέλιδο.
   *
   * ΜΟΝΟ στα newsletter. Τα μηνύματα του γραφείου είναι επίσημη αλληλογραφία
   * προς μέλη και συνεργάτες — μια «απεγγραφή» εκεί θα υπονοούσε ότι μπορείς
   * να μη λάβεις την απόδειξη ή την έγκρισή σου.
   *
   * Οι ετικέτες είναι του Sender και ΔΕΝ αποδίδονται από εμάς: τις γεμίζει
   * εκείνος τη στιγμή της αποστολής, ανά παραλήπτη. Αν λείψουν, ο Sender
   * κολλάει δικό του υποσέλιδο — οπότε το βάζουμε εμείς, με τη δική μας
   * τυπογραφία.
   */
  unsubscribe?: boolean
  /**
   * Το υποσέλιδο του newsletter — αντικαθιστά ΟΛΟΚΛΗΡΗ την υπογραφή.
   *
   * Ένα τεύχος δεν το υπογράφει άνθρωπος: το στέλνει το δίκτυο. Γι' αυτό εδώ
   * μπαίνει λογότυπο, κοινωνικά δίκτυα, δικαιώματα, σημείωμα GDPR και
   * απεγγραφή — και η γραμμή απεγγραφής ζει ΜΕΣΑ σε αυτό, ώστε να μη
   * διπλασιάζεται με το `unsubscribe`.
   */
  newsletterFooter?: Partial<NewsletterFooter> | null
}): { subject: string; html: string; text: string } {
  const { subject, blocks, preheader, footerStyle = 'signature', footerLook = 'plain', footerLogo = false, headerStyle = 'coral', headerLogo = false, unsubscribe = false, annotate = false } = opts
  const signer: CampaignSigner = opts.signer || {
    name: 'Culture for Change', role: 'Γραμματεία', email: 'hello@cultureforchange.net',
  }
  const year = new Date().getFullYear()
  const html = `<!DOCTYPE html>
<html lang="el">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(subject)}</title>
<style>
  /**
   * Στοιβάζει ΜΟΝΟ όταν η κάρτα δεν χωράει πια.
   *
   * Η κάρτα θέλει CONTENT_WIDTH + 12px περιθώριο εκατέρωθεν = ${CONTENT_WIDTH + 24}px.
   * Το όριο μπαίνει ΕΝΑ pixel πιο κάτω, αλλιώς στοιβάζει και στο ακριβές
   * πλάτος όπου ακόμη χωράει — ακριβώς αυτό συνέβη όταν το όριο συνέπεσε με
   * το πλάτος του πλαισίου προεπισκόπησης και όλα έπεσαν το ένα κάτω από το άλλο.
   */
  @media only screen and (max-width:${CONTENT_WIDTH + 23}px){
    .px{padding-left:24px !important;padding-right:24px !important;}
    .h1{font-size:26px !important;line-height:32px !important;}
    /* Στοιβάζεται το ΠΕΡΙΕΧΟΜΕΝΟ (φωτογραφία δίπλα σε κείμενο), ΟΧΙ το σήμα:
       ένα λογότυπο 72px χωράει πάντα δίπλα στον τίτλο, και όταν έπεφτε από
       κάτω το γράμμα φαινόταν σπασμένο σε σχέση με την προεπισκόπηση. */
    .stack{display:block !important;width:100% !important;}
    .logocell{width:64px !important;}
    .logoimg{width:56px !important;max-width:56px !important;}
    .markcell{width:52px !important;}
    .markimg{width:44px !important;max-width:44px !important;}
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.cream};">
<span style="display:none;font-size:1px;color:${BRAND.cream};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(preheader || subject)}</span>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${BRAND.cream};">
<tr><td align="center" style="padding:32px 12px 48px 12px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="${CONTENT_WIDTH}" style="width:100%;max-width:${CONTENT_WIDTH}px;background-color:${BRAND.white};border-radius:24px;overflow:hidden;">

${headerHtml(headerStyle, subject, headerLogo)}

${renderCampaignBody(blocks, annotate)}

${opts.newsletterFooter
  ? newsletterFooterHtml(normaliseNewsletterFooter(opts.newsletterFooter))
  : footerHtml(footerStyle, footerLook, signer, year, footerLogo) + (unsubscribe ? unsubscribeRow() : '')}
</table>
</td></tr>
</table>
${annotate ? PICK_SCRIPT : ''}
</body>
</html>
`
  return { subject, html, text: renderCampaignText(blocks) }
}
