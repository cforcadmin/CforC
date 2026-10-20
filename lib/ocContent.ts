import { campaignPageHtml, type Block, type HeaderStyle } from '@/lib/campaignBlocks'
import { toPageSkin } from '@/lib/pageSkin'

/**
 * ΤΑ ΤΡΙΑ ΕΙΔΗ ΠΕΡΙΕΧΟΜΕΝΟΥ ΤΟΥ SITE — ΔΗΛΩΜΕΝΑ ΜΙΑ ΦΟΡΑ.
 *
 * Νέα, Έργα και Καταχωρήσεις έχουν διαφορετικά πεδία, διαφορετικά ονόματα
 * πεδίων (άλλα κεφαλαία, άλλα πεζά) και διαφορετικές διαδρομές στο Strapi.
 * Αν αυτό γραφόταν τρεις φορές — μία στη διαδρομή, μία στην οθόνη, μία στη
 * σελίδα — θα απέκλιναν στην πρώτη αλλαγή.
 *
 * ΤΑ ΟΝΟΜΑΤΑ ΔΕΝ ΤΑ ΔΙΑΛΕΞΑ ΕΓΩ. Το Strapi έχει `Title` στα Νέα και `title`
 * στα Έργα, `Slug` και `slug`. Αντιγράφονται ΟΠΩΣ ΕΙΝΑΙ: μια «τακτοποίηση»
 * εδώ θα έσπαγε κάθε υπάρχουσα εγγραφή.
 */

export type ContentTypeKey = 'news' | 'projects' | 'entries'

export interface ContentField {
  name: string
  label: string
  kind: 'text' | 'textarea' | 'date' | 'datetime' | 'number' | 'boolean' | 'select' | 'media'
  required?: boolean
  options?: Array<{ value: string; label: string }>
  /** Πεδίο media που δέχεται ΠΟΛΛΑ αρχεία — το Strapi θέλει πίνακα, όχι id */
  multiple?: boolean
  /** Τι κάνει το πεδίο στη ΣΕΛΙΔΑ — ο συντάκτης δεν μαντεύει */
  hint?: string
}

export interface ContentType {
  label: string
  singular: string
  /** Η συλλογή στο Strapi */
  path: string
  titleField: string
  slugField: string
  engTitleField?: string
  englishField?: boolean
  sort: string
  listFields: string[]
  fields: ContentField[]
}

export const CONTENT_TYPES: Record<ContentTypeKey, ContentType> = {
  news: {
    label: 'Νέα',
    singular: 'άρθρο',
    path: 'activities',
    titleField: 'Title',
    slugField: 'Slug',
    engTitleField: 'EngTitle',
    englishField: true,
    sort: 'Date:desc',
    listFields: ['Title', 'Date', 'Category', 'Slug', 'Featured'],
    fields: [
      { name: 'Title', label: 'Τίτλος', kind: 'text', required: true },
      { name: 'EngTitle', label: 'Τίτλος (EN)', kind: 'text',
        hint: 'Χωρίς αυτόν, η αγγλική προβολή δείχνει τον ελληνικό τίτλο.' },
      { name: 'Date', label: 'Ημερομηνία', kind: 'date', required: true,
        hint: 'Ορίζει αν το άρθρο μπαίνει στα «Τρέχοντα» ή στα «Προηγούμενα».' },
      { name: 'Category', label: 'Κατηγορία', kind: 'text',
        hint: 'Γίνεται φίλτρο με κλικ στην πίσω όψη της κάρτας.' },
      { name: 'Tags', label: 'Ετικέτες', kind: 'text',
        hint: 'Χωρισμένες με κόμμα. Κάθε μία γίνεται φίλτρο.' },
      { name: 'Excerpt', label: 'Περίληψη', kind: 'textarea', required: true,
        hint: 'Τρεις χρήσεις: πίσω όψη κάρτας · περιγραφή στο Google · αναζήτηση στο site.' },
      { name: 'ExcerptEn', label: 'Περίληψη (EN)', kind: 'textarea' },
      { name: 'Visuals', label: 'Εικόνα κάρτας', kind: 'media', required: true, multiple: true,
        hint: 'Η πρώτη εικόνα είναι η μπροστινή όψη της κάρτας στη σελίδα Νέα.' },
      { name: 'ImageAltText', label: 'Περιγραφή εικόνας (alt)', kind: 'text', required: true,
        hint: 'Τη διαβάζει ο αναγνώστης οθόνης. Υποχρεωτική ήδη στο Strapi.' },
      { name: 'Slug', label: 'Διεύθυνση (slug)', kind: 'text',
        hint: 'Κενό = υπολογίζεται από τον τίτλο.' },
      { name: 'Featured', label: 'Προβεβλημένο', kind: 'boolean' },
    ],
  },

  projects: {
    label: 'Έργα',
    singular: 'έργο',
    path: 'projects',
    titleField: 'title',
    slugField: 'slug',
    sort: 'sort_order:asc',
    listFields: ['title', 'slug', 'project_status', 'sort_order', 'featured'],
    fields: [
      { name: 'title', label: 'Τίτλος', kind: 'text', required: true },
      { name: 'CforC_project_role', label: 'Ρόλος της CforC', kind: 'text',
        hint: 'Φαίνεται στην ΜΠΡΟΣΤΙΝΗ όψη της κάρτας.' },
      { name: 'project_status', label: 'Κατάσταση', kind: 'select', options: [
        { value: 'active', label: 'Ενεργό' },
        { value: 'in_progress', label: 'Σε εξέλιξη' },
        { value: 'completed', label: 'Ολοκληρωμένο' },
      ] },
      { name: 'start_date', label: 'Από', kind: 'date' },
      { name: 'end_date', label: 'Έως', kind: 'date' },
      { name: 'category', label: 'Κατηγορίες', kind: 'text', hint: 'Χωρισμένες με κόμμα.' },
      { name: 'project_partners', label: 'Εταίροι', kind: 'text', hint: 'Χωρισμένοι με κόμμα.' },
      { name: 'project_link', label: 'Σύνδεσμος έργου', kind: 'text' },
      { name: 'cover_image', label: 'Εικόνα εξωφύλλου', kind: 'media', required: true,
        hint: 'Η μπροστινή όψη της κάρτας του έργου.' },
      { name: 'Excerpt', label: 'Περίληψη', kind: 'textarea', required: true,
        hint: 'Πίσω όψη κάρτας · περιγραφή στο Google · αναζήτηση.' },
      { name: 'sort_order', label: 'Σειρά εμφάνισης', kind: 'number',
        hint: 'Μικρότερο = ψηλότερα στη λίστα.' },
      { name: 'slug', label: 'Διεύθυνση (slug)', kind: 'text', hint: 'Κενό = από τον τίτλο.' },
      { name: 'featured', label: 'Προβεβλημένο', kind: 'boolean' },
    ],
  },

  entries: {
    label: 'Καταχωρήσεις',
    singular: 'καταχώρηση',
    path: 'project-entries',
    titleField: 'title',
    slugField: 'slug',
    sort: 'publication_date:desc',
    listFields: ['title', 'slug', 'visibility', 'publication_date'],
    fields: [
      { name: 'title', label: 'Τίτλος', kind: 'text', required: true },
      { name: 'category', label: 'Κατηγορία', kind: 'text' },
      { name: 'tags', label: 'Ετικέτες', kind: 'text', hint: 'Χωρισμένες με κόμμα.' },
      { name: 'entry_link', label: 'Σύνδεσμος', kind: 'text' },
      { name: 'visibility', label: 'Ορατότητα', kind: 'select', options: [
        { value: 'public', label: 'Δημόσια' },
        { value: 'private', label: 'Ιδιωτική' },
      ], hint: 'Ιδιωτική = δεν εμφανίζεται στο site.' },
      { name: 'publication_date', label: 'Ημερομηνία δημοσίευσης', kind: 'datetime' },
      { name: 'expiration_date', label: 'Λήξη', kind: 'datetime',
        hint: 'Κενό = δεν λήγει ποτέ.' },
      { name: 'cover_image', label: 'Εικόνα', kind: 'media' },
      { name: 'Excerpt', label: 'Περίληψη', kind: 'textarea', required: true },
      { name: 'slug', label: 'Διεύθυνση (slug)', kind: 'text', hint: 'Κενό = από τον τίτλο.' },
    ],
  },
}

/** Ελληνικά → λατινικά, για διευθύνσεις που διαβάζονται και κολλιούνται */
const GREEKLISH: Record<string, string> = {
  α: 'a', β: 'v', γ: 'g', δ: 'd', ε: 'e', ζ: 'z', η: 'i', θ: 'th', ι: 'i',
  κ: 'k', λ: 'l', μ: 'm', ν: 'n', ξ: 'x', ο: 'o', π: 'p', ρ: 'r', σ: 's',
  ς: 's', τ: 't', υ: 'y', φ: 'f', χ: 'h', ψ: 'ps', ω: 'o',
}

/** Η σειρά μετράει: πρώτα φεύγουν οι τόνοι, μετά γίνεται η μεταγραφή */
export function slugify(title: string): string {
  return String(title || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .split('').map(ch => GREEKLISH[ch] ?? ch).join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70).replace(/-+$/, '') || 'arthro'
}

/**
 * Το HTML του άρθρου.
 *
 * ΠΡΟΕΠΙΛΟΓΗ «none»: και οι τρεις σελίδες λεπτομέρειας τυπώνουν ΗΔΗ δικό τους
 * `<h1>` (ActivityDetailClient, ProjectDetail, EntryDetail). Μια κοραλί ζώνη
 * με τον τίτλο θα τον έδειχνε δεύτερη φορά.
 */
export function articleHtmlFor(opts: {
  title: string
  blocks: Block[]
  headerStyle?: HeaderStyle | 'none'
  annotate?: boolean
}): string {
  return toPageSkin(campaignPageHtml({
    title: opts.title,
    blocks: opts.blocks,
    headerStyle: opts.headerStyle || 'none',
    annotate: opts.annotate,
  }))
}

export interface ContentValidation { ok: boolean; errors: string[] }

/** Ό,τι είναι υποχρεωτικό στο Strapi, είναι υποχρεωτικό και εδώ — αλλιώς η
 *  αποθήκευση γυρίζει 400 χωρίς να λέει ποιο πεδίο φταίει. */
export function validateContent(
  key: ContentTypeKey, fields: Record<string, any>, blocks: Block[],
): ContentValidation {
  const t = CONTENT_TYPES[key]
  const errors: string[] = []

  for (const f of t.fields) {
    if (!f.required) continue
    const v = fields[f.name]
    const empty = f.kind === 'media'
      ? !Number.isInteger(v?.mediaId)
      : (v === undefined || v === null || String(v).trim() === '')
    if (empty) errors.push(`Λείπει: ${f.label}`)
  }
  if (!blocks.length) errors.push('Το άρθρο δεν έχει περιεχόμενο')

  return { ok: errors.length === 0, errors }
}

/**
 * Τα πεδία όπως τα θέλει το Strapi.
 *
 * Η εικόνα ταξιδεύει από την οθόνη ως `{ mediaId, src }` — η οθόνη χρειάζεται
 * το `src` για να τη δείξει. Το Strapi όμως θέλει ΜΟΝΟ το αναγνωριστικό, και
 * πίνακα όταν το πεδίο δέχεται πολλά. Χωρίς αυτή τη μετατροπή η αποθήκευση
 * γυρίζει 400 χωρίς να λέει γιατί.
 */
export function toStrapiFields(
  key: ContentTypeKey, fields: Record<string, any>,
): Record<string, any> {
  const out: Record<string, any> = {}
  const byName = new Map(CONTENT_TYPES[key].fields.map(f => [f.name, f]))

  for (const [name, value] of Object.entries(fields)) {
    const f = byName.get(name)
    if (!f) continue
    if (f.kind === 'media') {
      const id = value?.mediaId
      if (!Number.isInteger(id)) continue
      out[name] = f.multiple ? [id] : id
    } else if (f.kind === 'number') {
      out[name] = value === '' || value === null || value === undefined ? null : Number(value)
    } else if (f.kind === 'boolean') {
      out[name] = !!value
    } else {
      const s = value === null || value === undefined ? '' : String(value)
      out[name] = s.trim() === '' ? null : s
    }
  }
  return out
}
