// Μία πηγή για τα στοιχεία πλοήγησης — τη διαβάζουν και τα τρία στυλ μενού
// (Modern κάψουλα, Classic τρέχον, Cool κολόνες). Βλ. docs/Nav-Modes.md.

export type NavMode = 'modern' | 'classic' | 'cool'

export const NAV_MODES: ReadonlyArray<{ key: NavMode; label: string }> = [
  { key: 'modern', label: 'Modern' },
  { key: 'classic', label: 'Classic' },
  { key: 'cool', label: 'Cool' },
]

export interface NavItem {
  key: string
  label: string
  href: string
  /** Cool: απόχρωση πορτοκαλί της κολόνας (μόνο αποχρώσεις, όχι άλλα χρώματα) */
  hue: string
  /** Cool: συμπληρωματικό περίγραμμα ανά κολόνα — ΑΝΕΝΕΡΓΟ από 27/8/26:
   *  οι γραμμές έγιναν ενιαίες από την παλέτα (charcoal/κρεμ ανά θέμα,
   *  βλ. .cool-col στο globals.css) γιατί τα hues χάνονταν στο γυαλί */
  edge: string
  /** Εμφανίζεται μόνο σε επισκέπτες (π.χ. ΣΥΜΜΕΤΟΧΗ) */
  anonOnly?: boolean
  /** Ποιο dropdown κουβαλά (τα περιεχόμενα ζουν στο header component) */
  dropdown?: 'about' | 'projects'
  /** Μόνο στις κολόνες του Cool — τα Modern/Classic έχουν το λογότυπο ως αρχική */
  coolOnly?: boolean
}

/** Το Google Translate μεταφράζει λάθος τη σκέτη λέξη «Χάρτης» ως «Paper/
 *  Papel/Papier» (επαληθευμένο σε en/es/de, 29/8/26) — χωρίς πρόταση-
 *  συμφραζόμενα διαβάζει «χαρτί». Χειροκίνητη μετάφραση ανά γλώσσα του
 *  switcher, με notranslate στο σημείο χρήσης ώστε να μην το ξαναπειράξει. */
export const MAP_LABELS: Record<string, string> = {
  en: 'MAP', de: 'KARTE', es: 'MAPA', pt: 'MAPA', fr: 'CARTE', it: 'MAPPA',
  ru: 'КАРТА', 'zh-CN': '地图', ja: '地図', ar: 'خريطة', tr: 'HARİTA',
  nl: 'KAART', pl: 'MAPA', sv: 'KARTA', no: 'KART', da: 'KORT', fi: 'KARTTA',
  cs: 'MAPA', ro: 'HARTĂ', hu: 'TÉRKÉP',
}

export const mapLabel = (lang: string): string =>
  lang && lang !== 'el' ? (MAP_LABELS[lang] || 'MAP') : 'ΧΑΡΤΗΣ'

export const NAV_ITEMS: NavItem[] = [
  { key: 'home', label: 'ΑΡΧΙΚΗ', href: '/', hue: '#FFC9B8', edge: '#2D2D2D', coolOnly: true },
  { key: 'about', label: 'ΣΧΕΤΙΚΑ ΜΕ ΕΜΑΣ', href: '/about', dropdown: 'about', hue: '#FFB199', edge: '#2A9D8F' },
  { key: 'news', label: 'ΝΕΑ', href: '/news', hue: '#FF9E80', edge: '#4A90D9' },
  { key: 'projects', label: 'ΕΡΓΑ', href: '/projects', dropdown: 'projects', hue: '#FF8B6A', edge: '#6A994E' },
  { key: 'map', label: 'ΧΑΡΤΗΣ', href: '/map', hue: '#F07551', edge: '#8E7CC3' },
  { key: 'participation', label: 'ΣΥΜΜΕΤΟΧΗ', href: '/participation', anonOnly: true, hue: '#E05A3A', edge: '#D96AA7' },
  { key: 'members', label: 'ΕΥΡΕΣΗ ΜΕΛΩΝ', href: '/members', hue: '#C74E2F', edge: '#1F6F78' },
  { key: 'policies', label: 'ΠΟΛΙΤΙΚΕΣ - ΟΡΟΙ & ΠΡΟΫΠΟΘΕΣΕΙΣ', href: '/terms', hue: '#B34426', edge: '#8E7CC3', coolOnly: true },
]
