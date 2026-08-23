/**
 * Taxonomy of member fields of practice (Πεδία Πρακτικής).
 * Used for profile editing and member search/filtering.
 *
 * Subcategories can be:
 * - A plain string: single selection (e.g. "Φωτογραφία")
 * - An object with `label` and `options`: user picks one or more options
 *   via checkboxes, stored as "Option1 / Option2" (counts as ONE entry)
 */

export interface SplittableSubcategory {
  label: string
  options: string[]
}

/** A subcategory with a display hint shown in the picker (e.g. examples) */
export interface HintedSubcategory {
  label: string
  hint: string
}

export type SubcategoryEntry = string | SplittableSubcategory | HintedSubcategory

export interface TaxonomyCategory {
  label: string
  subcategories: SubcategoryEntry[]
}

/** Type guard: is this subcategory splittable (has options)? */
export function isSplittable(sub: SubcategoryEntry): sub is SplittableSubcategory {
  return typeof sub === 'object' && 'options' in sub
}

/** Type guard: is this subcategory hinted (has display hint)? */
export function isHinted(sub: SubcategoryEntry): sub is HintedSubcategory {
  return typeof sub === 'object' && 'hint' in sub
}

/** Get the stored value label for a subcategory entry */
export function getSubLabel(sub: SubcategoryEntry): string {
  return typeof sub === 'string' ? sub : sub.label
}

/** Get the display label for a subcategory entry (includes hint if present) */
export function getSubDisplayLabel(sub: SubcategoryEntry): string {
  if (isHinted(sub)) return `${sub.label} ${sub.hint}`
  return getSubLabel(sub)
}

export const TAXONOMY: TaxonomyCategory[] = [
  {
    label: 'Εκπαίδευση & Μάθηση',
    subcategories: [
      'Μη Τυπική Εκπαίδευση',
      'Τυπική Εκπαίδευση',
      'Διά Βίου Μάθηση',
      'Επαγγελματικός Προσανατολισμός',
    ],
  },
  {
    label: 'Πολιτιστική Διαχείριση & Επικοινωνία',
    subcategories: [
      'Διαχείριση Πολιτισμικών Πόρων',
      'Παραγωγή & Οργάνωση',
      'Επιμέλεια Εκθέσεων',
      'Χρηματοδοτήσεις / Εύρεση Πόρων',
      'Πολιτιστική Επικοινωνία',
      'Ανάπτυξη Έργων',
      'Πνευματική Ιδιοκτησία',
    ],
  },
  {
    label: 'Τέχνες & Πολιτισμός',
    subcategories: [
      'Εικαστικά / Visual Arts',
      'Μουσική / Ήχος',
      { label: 'Θέατρο / Χορός / Performing Arts', options: ['Θέατρο', 'Χορός', 'Performing Arts'] },
      { label: 'Κινηματογράφος / Ντοκιμαντέρ', options: ['Κινηματογράφος', 'Ντοκιμαντέρ'] },
      { label: 'Λογοτεχνία / Βιβλίο / Εκδόσεις / Ποίηση / Συγγραφή', options: ['Λογοτεχνία', 'Βιβλίο', 'Εκδόσεις', 'Ποίηση', 'Συγγραφή'] },
      { label: 'Ψηφιακές Τέχνες / Game Dev / Media / AI art', options: ['Ψηφιακές Τέχνες', 'Game Dev', 'Media', 'AI art'] },
      { label: 'Μουσεία / Μουσειολογία / Βιβλιοθήκες / Αρχεία', options: ['Μουσεία', 'Μουσειολογία', 'Βιβλιοθήκες', 'Αρχεία'] },
      'Φωτογραφία',
      'Ψηφιακές Πλατφόρμες',
      'Ψηφιακός Πολιτισμός',
      'Νέες τεχνολογίες',
      // Σκόπιμα ΟΧΙ splittable: αν σπάσει σε επιμέρους επιλογές, η «Αρχαιολογία»
      // γίνεται επιλογή σε δύο κατηγορίες και το φίλτρο δεν τις ξεχωρίζει.
      'Υλική Πολιτιστική Κληρονομιά / Αρχαιολογία',
      'Άυλη Πολιτιστική Κληρονομιά',
      'Χειροτεχνία',
      'Design / Εφαρμοσμένες Τέχνες',
    ],
  },
  {
    label: 'Υγεία',
    subcategories: [
      'Ψυχική Υγεία',
      { label: 'Θεραπευτικές Πρακτικές', hint: '(π.χ. Χοροθεραπεία ή Φωτοθεραπεία ή Ψυχοθεραπεία)' },
      'Αυτοβελτίωση',
    ],
  },
  {
    label: 'Ανθρωπιστικές & Κοινωνικές Επιστήμες',
    subcategories: [
      'Έρευνα',
      // splittable ώστε τα 7 μέλη που έχουν ήδη σκέτο «Πολιτιστική Πολιτική»
      // να παραμείνουν έγκυρα μετά τη διεύρυνση της ετικέτας.
      { label: 'Πολιτιστική Πολιτική / Συνηγορία', options: ['Πολιτιστική Πολιτική', 'Συνηγορία'] },
      'Ανάπτυξη Πολιτικών',
    ],
  },
  {
    label: 'Συμπερίληψη / Προσβασιμότητα',
    subcategories: [
      'Προσβασιμότητα Πολιτιστικών Χώρων',
      'Προσβάσιμο Περιεχόμενο & Μέσα',
      'Συμπεριληπτικός Σχεδιασμός / Universal Design',
      'Εργαλεία & Πλατφόρμες για ΑΜΕΑ',
      'Εκπαιδευτικά Εργαλεία για Συμπερίληψη',
    ],
  },
  {
    label: 'Περιβάλλον & Βιωσιμότητα',
    subcategories: [
      'Κλιματική Αλλαγή',
      'Βιώσιμη Ανάπτυξη',
      'Κυκλική Οικονομία',
    ],
  },
  {
    label: 'Ενεργός Πολιτειότητα (Civic Engagement)',
    subcategories: [
      'Κοινοτική Τέχνη / Community Arts',
      'Συμμετοχικές Πρακτικές',
      { label: 'Συνηγορία / Commons / Artivism / Activism', options: ['Συνηγορία', 'Commons', 'Artivism', 'Activism'] },
      { label: 'Νεολαία / Διαγενεακά', options: ['Νεολαία', 'Διαγενεακά'] },
      'Τοπική Αυτοδιοίκηση',
      'Εθελοντισμός',
    ],
  },
  {
    label: 'Αρχιτεκτονική & Χωρικές Πρακτικές',
    subcategories: [
      'Αρχιτεκτονική',
      'Placemaking',
      'Χαρτογράφηση',
      'Πολιτιστική Κληρονομιά',
      'Αρχαιολογία',
      'Αστικό Περιβάλλον',
      'Αγροτικός Χώρος / Ύπαιθρος',
    ],
  },
  {
    label: 'Επιχειρηματικότητα / Καινοτομία',
    subcategories: [
      'Κοινωνική Επιχειρηματικότητα',
      'Πολιτιστική Επιχειρηματικότητα',
    ],
  },
]

/**
 * Η ΙΔΙΑ ταξινομία, όπως τη βλέπει η Ψηφιακή Βιβλιοθήκη: με «Άλλο» σε κάθε
 * κατηγορία.
 *
 * ΓΙΑΤΙ ΜΟΝΟ ΕΔΩ: ένα τεκμήριο της βιβλιοθήκης αποθηκεύει Θεματική ΚΑΙ
 * Υποθεματική σε χωριστά πεδία, οπότε το «Άλλο» είναι σαφές — η θεματική
 * δίπλα του λέει ποιο «Άλλο» εννοεί. Ένα μέλος αποθηκεύει μια επίπεδη λίστα
 * ετικετών χωρισμένη με κόμμα, χωρίς κατηγορία: εκεί το «Άλλο» της Υγείας
 * και το «Άλλο» των Τεχνών γίνονται η ίδια, ανερμήνευτη τιμή και το φίλτρο
 * τα ανακατεύει. Τα μέλη έχουν ήδη ελεύθερη καταχώρηση για ό,τι δεν
 * καλύπτεται, οπότε δεν χάνουν τίποτα.
 */
export const LIBRARY_EXTRA_SUBCATEGORY = 'Άλλο'

export const LIBRARY_TAXONOMY: TaxonomyCategory[] = TAXONOMY.map(cat => ({
  ...cat,
  subcategories: [...cat.subcategories, LIBRARY_EXTRA_SUBCATEGORY],
}))

/**
 * Check if a value is a known taxonomy value (not custom).
 * Handles exact matches for categories and plain subcategories,
 * plus partial "/" combinations from splittable subcategories.
 */
export function isKnownTaxonomyValue(value: string): boolean {
  for (const cat of TAXONOMY) {
    if (cat.label === value) return true
    for (const sub of cat.subcategories) {
      if (typeof sub === 'string') {
        if (sub === value) return true
      } else {
        // Splittable or hinted: the label matches
        if (sub.label === value) return true
        // Splittable: the value may be a "/" combination of its options
        if (isSplittable(sub)) {
          const valueParts = value.split(' / ').map(s => s.trim())
          if (valueParts.length > 0 && valueParts.every(part => sub.options.includes(part))) {
            return true
          }
        }
      }
    }
  }
  return false
}

/** Get all valid labels (categories + plain subcategories + splittable full labels) */
export function getAllTaxonomyLabels(): string[] {
  const labels: string[] = []
  for (const cat of TAXONOMY) {
    labels.push(cat.label)
    for (const sub of cat.subcategories) {
      labels.push(getSubLabel(sub))
    }
  }
  return labels
}

/** Check if a label is a category (top-level) */
export function isCategory(label: string): boolean {
  return TAXONOMY.some(cat => cat.label === label)
}

/** Get subcategories for a category label */
export function getSubcategories(categoryLabel: string): SubcategoryEntry[] {
  const cat = TAXONOMY.find(c => c.label === categoryLabel)
  return cat ? cat.subcategories : []
}

/** Find which category a subcategory belongs to */
export function getCategoryForSubcategory(subcategoryLabel: string): string | null {
  for (const cat of TAXONOMY) {
    for (const sub of cat.subcategories) {
      if (getSubLabel(sub) === subcategoryLabel) {
        return cat.label
      }
    }
  }
  return null
}

/**
 * Check if a member's FieldsOfWork tags match a filter selection.
 * - Category filter: matches if member has the category or any of its subcategories/options
 * - Subcategory filter: matches if member has that exact subcategory
 * - Splittable partial (e.g. "Θέατρο / Χορός"): matches if member has any overlapping option
 */
export function doesFieldMatchFilter(memberFieldsOfWork: string, filterValue: string): boolean {
  if (!memberFieldsOfWork || !filterValue) return false

  const memberTags = memberFieldsOfWork.split(',').map(t => t.trim()).filter(Boolean)

  // Build the set of terms that constitute a match for this filter value
  const matchingTerms = new Set<string>()

  // Check if filter is a category (top-level)
  const category = TAXONOMY.find(c => c.label === filterValue)
  if (category) {
    matchingTerms.add(category.label)
    for (const sub of category.subcategories) {
      if (typeof sub === 'string') {
        matchingTerms.add(sub)
      } else {
        matchingTerms.add(sub.label)
        if (isSplittable(sub)) {
          for (const opt of sub.options) {
            matchingTerms.add(opt)
          }
        }
      }
    }
  } else {
    // Subcategory or splittable partial
    matchingTerms.add(filterValue)
    // If it contains " / ", also match individual parts
    if (filterValue.includes(' / ')) {
      for (const part of filterValue.split(' / ').map(s => s.trim())) {
        matchingTerms.add(part)
      }
    }
    // If this is a splittable subcategory's full label, also match its options
    for (const cat of TAXONOMY) {
      for (const sub of cat.subcategories) {
        if (isSplittable(sub) && sub.label === filterValue) {
          for (const opt of sub.options) {
            matchingTerms.add(opt)
          }
        }
      }
    }
  }

  // Check if any member tag matches any matching term
  for (const tag of memberTags) {
    if (matchingTerms.has(tag)) return true
    // For tags with " / ", check individual parts
    if (tag.includes(' / ')) {
      if (tag.split(' / ').some(part => matchingTerms.has(part.trim()))) return true
    }
  }

  return false
}
