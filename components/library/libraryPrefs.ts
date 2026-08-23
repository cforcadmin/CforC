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
