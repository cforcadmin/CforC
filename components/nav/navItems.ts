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
  /** Cool: συμπληρωματικό περίγραμμα — ΜΟΝΟ στην αριστερή πλευρά της κολόνας */
  edge: string
  /** Εμφανίζεται μόνο σε επισκέπτες (π.χ. ΣΥΜΜΕΤΟΧΗ) */
  anonOnly?: boolean
  /** Ποιο dropdown κουβαλά (τα περιεχόμενα ζουν στο header component) */
  dropdown?: 'about' | 'projects'
}

export const NAV_ITEMS: NavItem[] = [
  { key: 'about', label: 'ΣΧΕΤΙΚΑ ΜΕ ΕΜΑΣ', href: '/about', dropdown: 'about', hue: '#FFB199', edge: '#2A9D8F' },
  { key: 'news', label: 'ΝΕΑ', href: '/news', hue: '#FF9E80', edge: '#4A90D9' },
  { key: 'projects', label: 'ΕΡΓΑ', href: '/projects', dropdown: 'projects', hue: '#FF8B6A', edge: '#6A994E' },
  { key: 'map', label: 'ΧΑΡΤΗΣ', href: '/map', hue: '#F07551', edge: '#8E7CC3' },
  { key: 'participation', label: 'ΣΥΜΜΕΤΟΧΗ', href: '/participation', anonOnly: true, hue: '#E05A3A', edge: '#D96AA7' },
  { key: 'members', label: 'ΕΥΡΕΣΗ ΜΕΛΩΝ', href: '/members', hue: '#C74E2F', edge: '#1F6F78' },
]
