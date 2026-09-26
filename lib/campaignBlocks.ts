/**
 * Τα δομικά στοιχεία της μαζικής αποστολής (V1).
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
const CONTENT_WIDTH = 600
/** Το πλάτος μέσα στα padding του 600άρη — όριο για εικόνες */
export const INNER_WIDTH = 504

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
    // Οι επικεφαλίδες χρειάζονται inline styles: τα γραμματοκιβώτια έχουν δικά
    // τους μεγέθη και περιθώρια για h2/h3, που δεν είναι τα δικά μας.
    if (t === 'h2') return `<h2 style="font-family:${FONT};font-size:22px;line-height:28px;font-weight:bold;color:${BRAND.ink};margin:18px 0 8px 0;">`
    if (t === 'h3') return `<h3 style="font-family:${FONT};font-size:18px;line-height:24px;font-weight:bold;color:${BRAND.ink};margin:14px 0 6px 0;">`
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
    .replace(/\r\n?/g, '\n')
    .replace(/\n(?=\s*<\/?(p|ul|ol|li|h2|h3)\b)/gi, '')
    .replace(/(<\/(p|ul|ol|li|h2|h3)>)\n/gi, '$1')
    .replace(/\n/g, '<br>')
}

// ── Τα μπλοκ ────────────────────────────────────────────────────────────────

export type SectionBlock = { type: 'section'; title: string }
export type TextBlock = { type: 'text'; html: string; tone?: 'normal' | 'soft' }
export type ImageBlock = { type: 'image'; src: string; alt: string; href?: string; size?: 'full' | 'inset' }
export type ImageTextBlock = {
  type: 'imageText'; src: string; alt: string; html: string
  side?: 'left' | 'right'; href?: string
}
export type CardBlock = {
  type: 'card'; src?: string; alt?: string; title: string; html: string
  buttonLabel?: string; buttonHref?: string
}
export type PersonBlock = { type: 'person'; src?: string; alt?: string; name: string; role?: string; html: string; side?: 'left' | 'right' }
export type LogosBlock = { type: 'logos'; items: Array<{ src: string; alt: string; href?: string }>; note?: string }
export type ButtonBlock = { type: 'button'; label: string; href: string; style?: 'coral' | 'outline' | 'dark' }
export type BoxBlock = { type: 'box'; title?: string; html: string; tone?: 'cream' | 'neutral' | 'warning' | 'alert' }
export type DividerBlock = { type: 'divider'; style?: 'line' | 'space' }
export type AmountsBlock = { type: 'amounts'; rows: Array<{ label: string; amount: string }>; total?: string }
export type MonoBlock = { type: 'mono'; label?: string; value: string }
export type TocBlock = { type: 'toc'; title?: string }

export type Block =
  | SectionBlock | TextBlock | ImageBlock | ImageTextBlock | CardBlock | PersonBlock
  | LogosBlock | ButtonBlock | BoxBlock | DividerBlock | AmountsBlock | MonoBlock | TocBlock

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
  amounts: 'Πίνακας ποσών',
  mono: 'Μονόστοιχο κουτί',
  toc: 'Πίνακας περιεχομένων',
}

/** Οι μόνες επιλογές ανά μπλοκ — κλειστές λίστες, όχι ελεύθερα χρώματα */
export const BLOCK_VARIANTS: Partial<Record<Block['type'], { key: string; options: Array<{ value: string; label: string }> }>> = {
  text: { key: 'tone', options: [{ value: 'normal', label: 'Κανονικό' }, { value: 'soft', label: 'Δευτερεύον' }] },
  image: { key: 'size', options: [{ value: 'full', label: 'Πλήρες πλάτος' }, { value: 'inset', label: 'Ένθετη' }] },
  imageText: { key: 'side', options: [{ value: 'left', label: 'Εικόνα αριστερά' }, { value: 'right', label: 'Εικόνα δεξιά' }] },
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
}

// ── Απόδοση σε HTML email ───────────────────────────────────────────────────

const row = (inner: string, pad = '0 48px') => `
  <tr><td class="px" style="padding:${pad};">${inner}</td></tr>`

const bodyText = (tone: 'normal' | 'soft' = 'normal') =>
  `font-family:${FONT};font-size:${tone === 'soft' ? 14 : 16}px;line-height:${tone === 'soft' ? 22 : 26}px;color:${tone === 'soft' ? BRAND.inkSoft : BRAND.ink};mso-line-height-rule:exactly;`

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
    case 'section':
      return row(`<a id="${anchorId(b.title, i)}" name="${anchorId(b.title, i)}"></a>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:8px 0 4px 0;">
        <tr><td style="font-family:${FONT};font-size:12px;line-height:16px;letter-spacing:1.2px;color:${BRAND.coralDeep};font-weight:bold;mso-line-height-rule:exactly;">${escapeHtml(upperGreek(b.title))}</td></tr>
        <tr><td height="6" style="height:6px;line-height:6px;font-size:0;">&nbsp;</td></tr>
        <tr><td style="border-top:2px solid ${BRAND.coral};font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>`, '20px 48px 0 48px')

    case 'text':
      return row(`<div style="${bodyText(b.tone)}">${richText(b.html)}</div>`, '16px 48px 0 48px')

    case 'image':
      return row(img(b.src, b.alt, b.size === 'inset' ? 280 : INNER_WIDTH, b.href), '16px 48px 0 48px')

    case 'imageText': {
      const pic = `<td class="stack" width="200" style="width:200px;vertical-align:top;">${img(b.src, b.alt, 200, b.href)}</td>`
      const gap = `<td class="stack" width="16" style="width:16px;font-size:0;line-height:16px;">&nbsp;</td>`
      const txt = `<td class="stack" style="vertical-align:top;${bodyText()}">${richText(b.html)}</td>`
      const cells = b.side === 'right' ? `${txt}${gap}${pic}` : `${pic}${gap}${txt}`
      return row(`<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>${cells}</tr></table>`, '16px 48px 0 48px')
    }

    case 'card':
      return row(`
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${BRAND.cream};border-radius:16px;">
        ${b.src ? `<tr><td style="padding:16px 16px 0 16px;">${img(b.src, b.alt || b.title, 472)}</td></tr>` : ''}
        <tr><td style="padding:16px;">
          <div style="font-family:${FONT};font-size:18px;line-height:24px;font-weight:bold;color:${BRAND.ink};">${escapeHtml(b.title)}</div>
          <div style="${bodyText()}padding-top:8px;">${richText(b.html)}</div>
          ${b.buttonLabel && b.buttonHref ? `<div style="padding-top:14px;">${buttonHtml(b.buttonLabel, b.buttonHref, 'coral', false)}</div>` : ''}
        </td></tr>
      </table>`, '16px 48px 0 48px')

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

    case 'mono':
      return row(`
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${BRAND.cream};border-radius:16px;">
        <tr><td style="padding:18px 20px;">
          ${b.label ? `<div style="font-family:${FONT};font-size:12px;line-height:16px;letter-spacing:1px;color:${BRAND.coralDeep};font-weight:bold;">${escapeHtml(upperGreek(b.label))}</div>` : ''}
          <div style="font-family:'Courier New',Courier,monospace;font-size:17px;line-height:26px;color:${BRAND.ink};font-weight:bold;word-break:break-all;padding-top:4px;">${escapeHtml(b.value)}</div>
        </td></tr>
      </table>`, '16px 48px 0 48px')

    case 'toc':
      return '' // παράγεται στο renderCampaignBody, όπου φαίνονται όλες οι ενότητες
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
    .map((b, i) => (b.type === 'section' ? { title: b.title, id: anchorId(b.title, i) } : null))
    .filter(Boolean) as Array<{ title: string; id: string }>
  if (items.length < 2) return ''
  return row(`
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${BRAND.cream};border-radius:16px;">
    <tr><td style="padding:20px;">
      <div style="font-family:${FONT};font-size:12px;line-height:16px;letter-spacing:1.2px;color:${BRAND.coralDeep};font-weight:bold;">${escapeHtml(title || 'ΣΕ ΑΥΤΟ ΤΟ ΤΕΥΧΟΣ')}</div>
      <div style="height:10px;line-height:10px;font-size:0;">&nbsp;</div>
      ${items.map(it => `<div style="${bodyText()}padding:3px 0;">→ <a href="#${it.id}" style="color:${BRAND.coralDeep};text-decoration:underline;">${escapeHtml(it.title)}</a></div>`).join('')}
    </td></tr>
  </table>`, '16px 48px 0 48px')
}

export function renderCampaignBody(blocks: Block[]): string {
  return blocks.map((b, i) => (b.type === 'toc' ? renderToc(blocks, b.title) : renderBlock(b, i))).join('\n')
}

/**
 * Απλό κείμενο από τα ΙΔΙΑ μπλοκ — ποτέ γραμμένο στο χέρι, ώστε να μην
 * αποκλίνει. Βελτιώνει και την παραδοσιμότητα.
 */
export function renderCampaignText(blocks: Block[]): string {
  const strip = (h: string) => sanitizeInline(h).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
  const out: string[] = []
  for (const b of blocks) {
    switch (b.type) {
      case 'section': out.push(`\n${upperGreek(b.title)}\n${'─'.repeat(Math.min(b.title.length, 40))}`); break
      case 'text': out.push(strip(b.html)); break
      case 'box': out.push((b.title ? `${b.title}: ` : '') + strip(b.html)); break
      case 'card': out.push(`${b.title}\n${strip(b.html)}${b.buttonHref ? `\n${b.buttonHref}` : ''}`); break
      case 'person': out.push(`${b.name}${b.role ? ` — ${b.role}` : ''}\n${strip(b.html)}`); break
      case 'imageText': out.push(strip(b.html)); break
      case 'button': out.push(`${b.label}: ${b.href}`); break
      case 'amounts': out.push(b.rows.map(r => `${r.label}: ${r.amount}`).join('\n') + (b.total ? `\nΣύνολο: ${b.total}` : '')); break
      case 'mono': out.push(`${b.label ? `${b.label}: ` : ''}${b.value}`); break
      case 'image': out.push(b.alt ? `[${b.alt}]` : ''); break
      case 'logos': out.push(b.items.map(l => l.alt).join(' · ')); break
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
        <td class="stack" style="vertical-align:middle;">${eyebrow}${spacer}${heading}</td>
        <td class="stack" width="88" style="width:88px;vertical-align:middle;text-align:right;">
          <img src="${skin.logo}" alt="Culture for Change" width="72" style="display:inline-block;width:72px;max-width:72px;height:auto;border:0;" />
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
 * για τη Διαχείριση είναι το hello@ — και το όνομα από τον τρέχοντα κάτοχό
 * της, ποτέ γραμμένο στο χέρι: οι εκλογές αλλάζουν πρόσωπα, όχι πρότυπα.
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
          <td class="stack" style="vertical-align:middle;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${inner}</table>
          </td>
          <td class="stack" width="64" style="width:64px;vertical-align:middle;text-align:right;">
            <img src="${skin.logo}" alt="Culture for Change" width="48" style="display:inline-block;width:48px;max-width:48px;height:auto;border:0;" />
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
}): { subject: string; html: string; text: string } {
  const { subject, blocks, preheader, footerStyle = 'signature', footerLook = 'plain', footerLogo = false, headerStyle = 'coral', headerLogo = false } = opts
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
  @media only screen and (max-width:620px){
    .px{padding-left:24px !important;padding-right:24px !important;}
    .h1{font-size:26px !important;line-height:32px !important;}
    .stack{display:block !important;width:100% !important;}
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.cream};">
<span style="display:none;font-size:1px;color:${BRAND.cream};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(preheader || subject)}</span>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${BRAND.cream};">
<tr><td align="center" style="padding:32px 12px 48px 12px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="${CONTENT_WIDTH}" style="width:${CONTENT_WIDTH}px;max-width:${CONTENT_WIDTH}px;background-color:${BRAND.white};border-radius:24px;overflow:hidden;">

${headerHtml(headerStyle, subject, headerLogo)}

${renderCampaignBody(blocks)}

${footerHtml(footerStyle, footerLook, signer, year, footerLogo)}

</table>
</td></tr>
</table>
</body>
</html>
`
  return { subject, html, text: renderCampaignText(blocks) }
}
