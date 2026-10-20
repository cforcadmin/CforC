import {
  campaignPageHtml, renderCampaignText, visibleBlocks, type Block, type HeaderStyle,
} from '@/lib/campaignBlocks'
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
  kind: 'text' | 'textarea' | 'date' | 'datetime' | 'number' | 'boolean' | 'select' | 'media' | 'relation'
  required?: boolean
  options?: Array<{ value: string; label: string }>
  /**
   * Πεδίο που δείχνει σε ΑΛΛΗ συλλογή. Οι επιλογές δεν γράφονται εδώ —
   * διαβάζονται από το Strapi όταν ανοίγει η καρτέλα, μία κλήση.
   */
  relation?: { path: string; labelField: string; sort: string }
  /** Πεδίο media που δέχεται ΠΟΛΛΑ αρχεία — το Strapi θέλει πίνακα, όχι id */
  multiple?: boolean
  /**
   * Λίστα χωρισμένη με κόμματα. Η οθόνη τη δείχνει ως φυσαλίδες και το
   * Enter/κόμμα κλείνει την τρέχουσα — αλλιώς κανείς δεν ξέρει αν το κενό
   * μετά το κόμμα μετράει, και οι ετικέτες βγαίνουν με κενά μπροστά.
   */
  chips?: boolean
  /** Τι κάνει το πεδίο στη ΣΕΛΙΔΑ — ο συντάκτης δεν μαντεύει */
  hint?: string
}

/**
 * ΟΙ ΚΛΙΣΕΙΣ ΓΡΑΦΟΝΤΑΙ, ΔΕΝ ΠΑΡΑΓΟΝΤΑΙ.
 *
 * Το κουμπί έλεγε «Δημοσίευση άρθρο» — ονομαστική εκεί που η γλώσσα θέλει
 * γενική. Και το ίδιο μοτίβο έβγαζε «Κανένα καταχώρηση», λάθος γένος. Δεν
 * υπάρχει κανόνας που να βγάλει με ασφάλεια «καταχώρησης» από «καταχώρηση»·
 * οι τέσσερις τύποι που χρειάζεται η οθόνη δηλώνονται.
 */
export interface ContentForms {
  /** «Δημοσίευση ___» */
  genitive: string
  /** «___ αποθηκεύτηκε» — με το άρθρο του */
  nominative: string
  /** «___ γράφτηκε στο Strapi» */
  demonstrative: string
  /** «___ ακόμη» */
  none: string
}

export interface ContentType {
  label: string
  singular: string
  forms: ContentForms
  /** Η συλλογή στο Strapi */
  path: string
  /**
   * ΤΟ ΠΑΛΙΟ ΠΕΔΙΟ ΚΕΙΜΕΝΟΥ ΤΗΣ ΣΥΛΛΟΓΗΣ (τύπου `blocks` στο Strapi).
   *
   * Δεν το γράφει ο συνθέτης — το σώμα του άρθρου ζει στο `Html`. Αλλά στα
   * Νέα είναι `required: true`, οπότε ΚΑΘΕ δημιουργία γύριζε 400. Γεμίζει
   * με το κείμενο του άρθρου, ΜΟΝΟ στη δημιουργία: σε υπάρχουσα εγγραφή θα
   * έσβηνε ό,τι είχε γράψει κάποιος στο Strapi.
   */
  bodyField: string
  titleField: string
  slugField: string
  engTitleField?: string
  englishField?: boolean
  sort: string
  listFields: string[]
  /** Το πεδίο με το οποίο φιλτράρεται η λίστα στο OC — όπως στο site */
  filterField?: { name: string; label: string }
  fields: ContentField[]
}

export const CONTENT_TYPES: Record<ContentTypeKey, ContentType> = {
  news: {
    label: 'Νέα',
    singular: 'άρθρο',
    forms: { genitive: 'άρθρου', nominative: 'Το άρθρο', demonstrative: 'Αυτό το άρθρο', none: 'Κανένα άρθρο' },
    path: 'activities',
    bodyField: 'Description',
    titleField: 'Title',
    slugField: 'Slug',
    engTitleField: 'EngTitle',
    englishField: true,
    sort: 'Date:desc',
    listFields: ['Title', 'Date', 'Category', 'Slug', 'Featured'],
    filterField: { name: 'Category', label: 'Κατηγορία' },
    fields: [
      { name: 'Title', label: 'Τίτλος', kind: 'text', required: true },
      { name: 'EngTitle', label: 'Τίτλος (EN)', kind: 'text',
        hint: 'Χωρίς αυτόν, η αγγλική προβολή δείχνει τον ελληνικό τίτλο.' },
      { name: 'Date', label: 'Ημερομηνία', kind: 'date', required: true,
        hint: 'Ορίζει αν το άρθρο μπαίνει στα «Τρέχοντα» ή στα «Προηγούμενα».' },
      { name: 'Category', label: 'Κατηγορία', kind: 'text',
        hint: 'Γίνεται φίλτρο με κλικ στην πίσω όψη της κάρτας.' },
      { name: 'Tags', label: 'Ετικέτες', kind: 'text', chips: true,
        hint: 'Enter ή κόμμα για την επόμενη. Κάθε μία γίνεται φίλτρο στη σελίδα Νέα.' },
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
    forms: { genitive: 'έργου', nominative: 'Το έργο', demonstrative: 'Αυτό το έργο', none: 'Κανένα έργο' },
    path: 'projects',
    bodyField: 'full_description',
    titleField: 'title',
    slugField: 'slug',
    sort: 'sort_order:asc',
    listFields: ['title', 'slug', 'project_status', 'sort_order', 'featured'],
    filterField: { name: 'project_status', label: 'Κατάσταση' },
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
      { name: 'category', label: 'Κατηγορίες', kind: 'text', chips: true,
        hint: 'Enter ή κόμμα για την επόμενη.' },
      { name: 'project_partners', label: 'Εταίροι', kind: 'text', chips: true,
        hint: 'Enter ή κόμμα για τον επόμενο.' },
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
    forms: { genitive: 'καταχώρησης', nominative: 'Η καταχώρηση', demonstrative: 'Αυτή η καταχώρηση', none: 'Καμία καταχώρηση' },
    path: 'project-entries',
    bodyField: 'description',
    titleField: 'title',
    slugField: 'slug',
    sort: 'publication_date:desc',
    listFields: ['title', 'slug', 'visibility', 'publication_date'],
    filterField: { name: 'visibility', label: 'Ορατότητα' },
    fields: [
      { name: 'title', label: 'Τίτλος', kind: 'text', required: true },
      /**
       * ΥΠΟΧΡΕΩΤΙΚΟ, ΚΑΙ ΟΧΙ ΑΠΟ ΑΥΣΤΗΡΟΤΗΤΑ.
       *
       * Μια καταχώρηση ΔΕΝ έχει δική της σελίδα: η διεύθυνσή της είναι
       * `/projects/<έργο>/entries/<καταχώρηση>`, και το site τη φτάνει
       * μόνο μέσα από το έργο της. Χωρίς έργο αποθηκεύεται κανονικά και
       * δεν τη βλέπει ΚΑΝΕΙΣ — υπάρχει και είναι αόρατη.
       */
      { name: 'project', label: 'Έργο', kind: 'relation', required: true,
        relation: { path: 'projects', labelField: 'title', sort: 'title:asc' },
        hint: 'Η καταχώρηση ζει μέσα στο έργο — χωρίς αυτό δεν έχει διεύθυνση στο site.' },
      { name: 'category', label: 'Κατηγορία', kind: 'text' },
      { name: 'tags', label: 'Ετικέτες', kind: 'text', chips: true,
        hint: 'Enter ή κόμμα για την επόμενη.' },
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

/**
 * Η ΕΓΓΡΑΦΗ ΟΠΩΣ ΦΤΑΝΕΙ ΣΤΟ STRAPI — ΣΕ ΣΥΝΑΡΤΗΣΗ, ΟΧΙ ΜΕΣΑ ΣΤΗ ΔΙΑΔΡΟΜΗ.
 *
 * Όσο χτιζόταν μέσα στο POST, το μόνο που μπορούσε να την ελέγξει ήταν μια
 * πραγματική αποστολή στο Strapi — δηλαδή κανείς. Έτσι έλειπε το
 * υποχρεωτικό `Description` και φάνηκε μόνο ως «HTTP 400» στην οθόνη του
 * συντάκτη. Εδώ, ένα τεστ τη συγκρίνει με το ΑΛΗΘΙΝΟ schema.json της
 * συλλογής και η επόμενη τέτοια παράλειψη σκάει στο `npm test`.
 */
export function contentRecord(opts: {
  key: ContentTypeKey
  fields: Record<string, any>
  blocks: Block[]
  blocksEn?: Block[]
  headerStyle?: HeaderStyle | 'none'
  /** Δημιουργία ή ενημέρωση — αλλάζει ΤΙ επιτρέπεται να γραφτεί */
  isNew: boolean
}): Record<string, any> {
  const t = CONTENT_TYPES[opts.key]
  const fields = opts.fields || {}
  const title = String(fields[t.titleField] || '').trim()
  const html = articleHtmlFor({ title, blocks: opts.blocks, headerStyle: opts.headerStyle })
  const htmlEn = t.englishField && opts.blocksEn?.length
    ? articleHtmlFor({
      title: String(fields[t.engTitleField!] || title),
      blocks: opts.blocksEn, headerStyle: opts.headerStyle,
    })
    : null

  return {
    ...toStrapiFields(opts.key, fields),
    [t.slugField]: String(fields[t.slugField] || '').trim() || slugify(title),
    Blocks: {
      blocks: opts.blocks,
      ...(htmlEn ? { blocksEn: opts.blocksEn } : {}),
      headerStyle: opts.headerStyle || 'none',
    },
    Html: html,
    ...(htmlEn ? { HtmlEn: htmlEn } : {}),
    /* ΜΟΝΟ ΣΤΗ ΔΗΜΙΟΥΡΓΙΑ. Στα Νέα το παλιό πεδίο κειμένου είναι
       υποχρεωτικό, οπότε χωρίς αυτό καμία νέα εγγραφή δεν περνά. Σε
       ΥΠΑΡΧΟΥΣΑ εγγραφή δεν ακουμπιέται: θα έσβηνε ό,τι είχε γράψει
       κάποιος στο Strapi πριν υπάρξει αυτή η οθόνη. */
    ...(opts.isNew
      ? { [t.bodyField]: legacyBodyBlocks(opts.blocks, String(fields.Excerpt || title)) }
      : {}),
  }
}

/**
 * ΤΟ ΠΑΛΙΟ ΠΕΔΙΟ ΚΕΙΜΕΝΟΥ, ΓΕΜΙΣΜΕΝΟ ΜΕ ΤΟ ΑΡΘΡΟ ΣΕ ΑΠΛΟ ΚΕΙΜΕΝΟ.
 *
 * Το `Description` των Νέων είναι `required: true` στο Strapi και δεν γίνεται
 * να μείνει κενό — η δημιουργία γύριζε 400 χωρίς να πει ποιο πεδίο φταίει.
 * Δεν μπαίνει γέμισμα: μπαίνει το ΙΔΙΟ κείμενο, περασμένο από τον κειμενικό
 * αποδότη του newsletter. Έτσι ό,τι διαβάζει ακόμη το παλιό πεδίο — η
 * αναζήτηση στα Νέα, η περιγραφή στο Google, η πίσω όψη της κάρτας όταν
 * λείπει η Περίληψη — βρίσκει αληθινό κείμενο αντί για παύλα.
 *
 * Η μορφή είναι αυτή που θέλει ο τύπος `blocks` του Strapi: κόμβοι
 * παραγράφου με παιδιά κειμένου.
 */
export function legacyBodyBlocks(blocks: Block[], fallback: string): Array<Record<string, any>> {
  const text = renderCampaignText(visibleBlocks(blocks))
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  /* Άρθρο μόνο από εικόνες δίνει κενό κείμενο — και κενό `blocks` ξανασκάει
     στον ίδιο υποχρεωτικό έλεγχο. Πέφτει στην Περίληψη ή στον τίτλο. */
  if (!lines.length) lines.push(String(fallback || '').trim() || '—')
  return lines.map(line => ({ type: 'paragraph', children: [{ type: 'text', text: line }] }))
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
 *
 * ΚΑΙ ΤΟ ΥΠΟΛΟΙΠΟ ΑΛΜΠΟΥΜ ΕΠΙΖΕΙ. Τα Νέα κρατούν ΠΟΛΛΕΣ εικόνες (καρουζέλ
 * στη σελίδα), αλλά η οθόνη δείχνει μόνο την πρώτη — την κάρτα. Αν έφευγε
 * σκέτο `[πρώτη]`, το άνοιγμα ενός παλιού άρθρου και μια αποθήκευση θα
 * έσβηνε τις υπόλοιπες φωτογραφίες του, χωρίς να το ζητήσει κανείς. Το
 * `mediaIds` κουβαλά ολόκληρο το άλμπουμ και χάνεται μόνο όταν ο συντάκτης
 * ΑΝΤΙΚΑΤΑΣΤΗΣΕΙ την εικόνα.
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
      if (!f.multiple) { out[name] = id; continue }
      const album: number[] = Array.isArray(value?.mediaIds)
        ? value.mediaIds.filter((x: any) => Number.isInteger(x)) : []
      out[name] = album.length && album[0] === id ? album : [id]
    } else if (f.kind === 'relation') {
      /* Το Strapi v5 δέχεται το documentId απευθείας για manyToOne. */
      const id = String(value ?? '').trim()
      out[name] = id || null
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

/**
 * Η ΚΟΡΥΦΗ ΤΗΣ ΣΕΛΙΔΑΣ, ΓΙΑ ΤΗΝ ΠΡΟΕΠΙΣΚΟΠΗΣΗ.
 *
 * Το άρθρο από μόνο του δεν δείχνει τι βλέπει ο επισκέπτης: η σελίδα ξεκινά
 * με κοραλί ήρωα και τον τίτλο, από κάτω τα πλακίδια με ημερομηνία,
 * κατηγορία και ετικέτες, ΚΑΙ ΜΕΤΑ Η ΕΙΚΟΝΑ. Χωρίς αυτά η προεπισκόπηση
 * κρίνεται στο κενό.
 *
 * Η εικόνα έλειπε, και είναι το μεγαλύτερο στοιχείο της σελίδας: και οι
 * τρεις σελίδες λεπτομέρειας (ActivityDetailClient, ProjectDetail,
 * EntryDetail) τη δείχνουν ΠΑΝΩ από το κείμενο. Μια προεπισκόπηση που την
 * παραλείπει απαντά σε άλλη ερώτηση από το «πώς θα φαίνεται».
 *
 * Είναι ΑΝΑΠΑΡΑΣΤΑΣΗ, όχι η ίδια η σελίδα: εκεί τα φτιάχνει ο React με
 * Tailwind, που δεν υπάρχει μέσα στο πλαίσιο της προεπισκόπησης. Αντιγράφει
 * μεγέθη και χρώματα από ActivityDetailClient/ProjectDetail/EntryDetail.
 */
export function pageChromeHtml(key: ContentTypeKey, fields: Record<string, any>): string {
  const t = CONTENT_TYPES[key]
  const esc = (v: any) => String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  const title = esc(fields[t.titleField] || `(χωρίς τίτλο)`)
  const pills: string[] = []

  const dateVal = fields.Date || fields.publication_date
  if (dateVal) {
    const label = greekDate(String(dateVal))
    if (label) pills.push(pill(esc(label), 'date'))
  }
  if (key === 'projects' && fields.project_status) {
    const label = t.fields.find(f => f.name === 'project_status')
      ?.options?.find(o => o.value === fields.project_status)?.label
    if (label) pills.push(pill(esc(label), 'accent'))
  }
  if (key === 'entries' && fields.visibility === 'private') {
    pills.push(pill('Ιδιωτική — δεν φαίνεται στο site', 'accent'))
  }
  const cat = fields.Category || (key === 'projects' ? fields.category : '')
  for (const c of splitList(cat)) pills.push(pill(esc(c), 'accent'))
  for (const tag of splitList(fields.Tags || fields.tags)) pills.push(pill(esc(tag), 'tag'))

  /* Η ΠΡΩΤΗ εικόνα του πρώτου πεδίου media — αυτή που γίνεται η μπροστινή
     όψη της κάρτας και η κορυφή της σελίδας. Το πεδίο δεν γράφεται με το
     χέρι εδώ: τα τρία είδη το λένε αλλιώς (Visuals / cover_image). */
  const mediaField = t.fields.find(f => f.kind === 'media')
  const shot = mediaField ? fields[mediaField.name] : null
  const src = shot?.src ? mediaUrl(String(shot.src)) : ''
  const altText = esc(fields.ImageAltText || shot?.alt || fields[t.titleField] || '')
  const image = src
    ? `<div style="padding:20px 32px 0 32px;">`
      + `<img src="${esc(src)}" alt="${altText}" `
      + `style="display:block;width:100%;border-radius:16px;"></div>`
    : ''

  return `<div style="background-color:#FF8B6A;border-radius:0 0 24px 24px;padding:40px 32px;">
  <div style="font-family:Arial,Helvetica,sans-serif;font-size:30px;line-height:1.2;font-weight:bold;color:#2D2D2D;">${title}</div>
</div>
<div style="padding:22px 32px 4px 32px;display:flex;flex-wrap:wrap;gap:8px;">${pills.join('')}</div>${image}`
}

/**
 * Το πλαίσιο της προεπισκόπησης είναι άλλο έγγραφο: μια σχετική διαδρομή
 * (`/uploads/…`) θα ζητιόταν από το OC, όχι από το Strapi, και θα έβγαινε
 * σπασμένη εικόνα. Το Strapi Cloud γυρίζει απόλυτες — αλλά όχι το τοπικό.
 */
const mediaUrl = (u: string): string =>
  /^(https?:)?\/\//i.test(u) || u.startsWith('data:')
    ? u
    : `${(process.env.NEXT_PUBLIC_STRAPI_URL || '').replace(/\/+$/, '')}${u}`

/**
 * ΗΜΕΡΟΜΗΝΙΑ ΧΩΡΙΣ ΩΡΑ ΔΕΝ ΕΧΕΙ ΖΩΝΗ — ΚΑΙ ΔΕΝ ΠΡΕΠΕΙ ΝΑ ΑΠΟΚΤΗΣΕΙ.
 *
 * Το `new Date('2026-11-14')` το διαβάζει ως μεσάνυχτα UTC. Σε μηχάνημα πίσω
 * από το UTC, το toLocaleDateString γυρίζει την ΠΡΟΗΓΟΥΜΕΝΗ μέρα: γράφτηκε
 * 14 Νοεμβρίου και η προεπισκόπηση έδειχνε 13. Τα μέρη διαβάζονται αυτούσια.
 *
 * Μια ώρα (publication_date) είναι ΣΤΙΓΜΗ και σωστά μεταφράζεται σε τοπική
 * ώρα — γι' αυτό κρατιέται μόνο το ημερολογιακό μέρος της.
 */
export function greekDate(value: string): string {
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return ''
  const [, y, mo, d] = m
  const months = ['Ιανουαρίου', 'Φεβρουαρίου', 'Μαρτίου', 'Απριλίου', 'Μαΐου', 'Ιουνίου',
    'Ιουλίου', 'Αυγούστου', 'Σεπτεμβρίου', 'Οκτωβρίου', 'Νοεμβρίου', 'Δεκεμβρίου']
  const name = months[Number(mo) - 1]
  return name ? `${Number(d)} ${name} ${y}` : ''
}

const splitList = (v: any): string[] =>
  String(v ?? '').split(',').map(x => x.trim()).filter(Boolean)

/**
 * ΤΟ ΧΡΩΜΑ ΤΟΥ ΚΕΙΜΕΝΟΥ ΑΚΟΛΟΥΘΕΙ ΤΟ ΦΟΝΤΟ ΤΟΥ, ΟΧΙ ΤΟ ΘΕΜΑ.
 *
 * Πρώτη εκδοχή έβαζε σταθερό ανοιχτό φόντο (κοραλί απόχρωση) και κείμενο
 * `var(--cfc-ink)`. Στο σκοτεινό θέμα το ink γίνεται ΑΝΟΙΧΤΟ — ανοιχτά
 * γράμματα πάνω σε ανοιχτό πλακίδιο, δηλαδή αόρατα. Φάνηκε μόνο κοιτώντας
 * την προεπισκόπηση· κανένα τεστ δεν θα το έπιανε.
 *
 * Άρα: πλακίδιο με ΕΠΩΝΥΜΟ φόντο κρατά σκούρα γράμματα πάντα (όπως η κοραλί
 * ζώνη), ενώ το ουδέτερο πλακίδιο αλλάζει μαζί με το θέμα.
 */
function pill(text: string, tone: 'date' | 'accent' | 'tag'): string {
  const base = 'display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:13px;'
    + 'padding:7px 14px;border-radius:999px;'
  if (tone === 'accent') {
    return `<span style="${base}background-color:#FFE7DF;color:#2D2D2D;`
      + `border:1px solid #2D2D2D;">${text}</span>`
  }
  if (tone === 'date') {
    return `<span style="${base}background-color:var(--cfc-tint,#FFF3EC);`
      + `color:var(--cfc-ink,#2D2D2D);border:1px solid var(--cfc-ink,#2D2D2D);">${text}</span>`
  }
  return `<span style="${base}background-color:transparent;`
    + `color:var(--cfc-ink,#2D2D2D);border:1px solid var(--cfc-ink,#2D2D2D);">${text}</span>`
}
