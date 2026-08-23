/**
 * Φτιάχνει το πρότυπο καταγραφής της Ψηφιακής Βιβλιοθήκης.
 *
 * Οι λίστες ΔΕΝ γράφονται με το χέρι — παράγονται από το lib/memberTaxonomy.ts,
 * που είναι η μοναδική πηγή αλήθειας για τις θεματικές σε όλο το site (προφίλ
 * μελών, φίλτρα, φόρμα εγγραφής). Έτσι η βιβλιοθήκη και τα μέλη δεν μπορούν
 * να αποκλίνουν: αν αλλάξει η ταξινομία, ξανατρέχει αυτό και βγαίνει νέο αρχείο.
 */
import { LIBRARY_TAXONOMY, getSubLabel } from '../lib/memberTaxonomy'
import { writeFileSync } from 'fs'

const DOC_TYPES = [
  'Journal Article (Άρθρο Επιστημονικού Περιοδικού)',
  'Book (Βιβλίο / Μονογραφία)',
  'Conference Paper, Proceedings & Poster (Άρθρο, Πρακτικά & Αναρτημένη Ανακοίνωση Συνεδρίου)',
  'Thesis & Dissertation (Ακαδημαϊκή Διατριβή / Διπλωματική Εργασία)',
  'Academic Article & Paper (Ακαδημαϊκό Δοκίμιο / Μελέτη)',
  'Report & Analysis (Έκθεση / Τεχνική Αναφορά / Ανάλυση)',
  'Best Practices & Guidelines (Βέλτιστες Πρακτικές & Κατευθυντήριες Γραμμές)',
  'Charter & Manifesto (Χάρτης / Διακήρυξη / Μανιφέστο)',
  'Open Call, Application & Proposal (Πρόταση & Αίτηση Χρηματοδότησης)',
  'Statute & National Laws (Εθνική Νομοθεσία & Νόμοι)',
  'EU Directives & EU Laws (Ευρωπαϊκές Οδηγίες & Ευρωπαϊκό Δίκαιο)',
  'Treaty & International Law (Διεθνείς Συνθήκες & Διεθνές Δίκαιο)',
  'Legal Case (Δικαστική Απόφαση / Νομολογία)',
  'Toolkit & Handbook (Εργαλειοθήκη & Εγχειρίδιο)',
  'Guide & Manual (Οδηγός Εφαρμογής & Τεχνικό Εγχειρίδιο)',
  'Workbook (Τετράδιο Εργασίας / Πρακτικός Οδηγός)',
  'News Article (Άρθρο Ειδήσεων)',
  'e-Publication & Website Content (Ψηφιακή Έκδοση & Περιεχόμενο Ιστοσελίδας)',
  'Interview (Συνέντευξη)',
  'Presentation (Παρουσίαση / Διαφάνειες)',
  'Audio & Podcast (Ηχητικό Αρχείο & Πόντκαστ)',
  'Video, Film & Broadcast (Βίντεο, Ταινία & Ραδιοτηλεοπτική Εκπομπή)',
  'Dataset & Statistics (Σύνολα Δεδομένων & Στατιστικά Στοιχεία)',
  'Figure & Chart (Διάγραμμα, Γράφημα & Οπτικοποίηση)',
]

const payload = {
  themes: LIBRARY_TAXONOMY.map(c => c.label),
  pairs: LIBRARY_TAXONOMY.flatMap(c => c.subcategories.map(s => [c.label, getSubLabel(s)])),
  docTypes: DOC_TYPES,
}

// Δικλείδα: κανένας λατινικός χαρακτήρας μέσα σε κατά τα άλλα ελληνική ετικέτα
const mixed = [...payload.themes, ...payload.pairs.map(p => p[1])].filter(l =>
  /[Ͱ-Ͽ]/.test(l) && /[A-Za-z]/.test(l) && !/[/&()]/.test(l))
if (mixed.length) { console.error('ΜΕΙΚΤΟΙ ΧΑΡΑΚΤΗΡΕΣ:', mixed); process.exit(1) }

writeFileSync(process.argv[2] || 'taxonomy.json', JSON.stringify(payload, null, 2))
console.log(`θεματικές ${payload.themes.length} · υποθεματικές ${payload.pairs.length} · είδη ${payload.docTypes.length}`)
