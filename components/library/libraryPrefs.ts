// Προτιμήσεις της Ανοιχτής Βιβλιοθήκης.
// Όπως και στο OC, αποθηκεύονται σε httpOnly cookie από τον server: το
// localStorage αποδείχθηκε αναξιόπιστο — content blockers και ιδιωτική
// περιήγηση το σβήνουν.

export const LIB_COLS_COOKIE = 'lib-cols'
export const LIB_DENSITY_COOKIE = 'lib-density'
/** Το ενημερωτικό παράθυρο της καταχώρησης το έχει ήδη δει */
export const LIB_INTRO_COOKIE = 'lib-intro-seen'

/** Ο Τίτλος είναι πάντα ορατός — χωρίς αυτόν η γραμμή δεν λέει τίποτα */
export const LIB_COLUMNS: Array<{ key: string; label: string }> = [
  { key: 'theme', label: 'Θεματική' },
  { key: 'subthemes', label: 'Υποθεματική' },
  { key: 'docType', label: 'Είδος αρχείου' },
  { key: 'file', label: 'Σύνδεσμος αρχείου' },
  { key: 'language', label: 'Γλώσσα' },
  { key: 'year', label: 'Έτος' },
  { key: 'source', label: 'Σύνδεσμος πηγής' },
  { key: 'submittedBy', label: 'Καταχώρηση από' },
]

export const LIB_DEFAULT_COLS = ['theme', 'subthemes', 'docType', 'file', 'language']

/** Τα 25 είδη αρχείων της τυπολογίας, στη σειρά που τα όρισε η ομάδα */
export const LIBRARY_DOC_TYPES: string[] = [
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
  'Plan & Strategy (Σχέδιο και Στρατηγική)',
]

export const LIBRARY_LANGUAGES = ['Ελληνικά', 'Αγγλικά', 'Δίγλωσσο', 'Άλλη'] as const
