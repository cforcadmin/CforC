// Shared constants for OC preferences.
// Preferences are stored SERVER-SIDE in httpOnly cookies (set via
// /api/oc/prefs) because client storage (localStorage) proved unreliable —
// content blockers/private modes wipe it. Cookie names below are read by
// server code (app/oc/page.tsx, /api/oc/me) only.

// 'members' | 'oc' — absent means "ask each time"
export const OC_LANDING_COOKIE = 'oc-landing'
// last seat a multi-seat member worked as — lets logins enter silently
export const OC_LAST_SEAT_COOKIE = 'oc-last-seat'
// '1' όταν το hero μένει καρφιτσωμένο συμπαγές (μόνο η γυάλινη λωρίδα)
export const OC_HERO_COMPACT_COOKIE = 'oc-hero-compact'
// Μητρώο μελών table view: visible optional columns (csv) + row density
export const OC_TABLE_COLS_COOKIE = 'oc-table-cols'
export const OC_TABLE_DENSITY_COOKIE = 'oc-table-density'

// Optional columns of the Μητρώο μελών table (ΑΜ + Ονοματεπώνυμο are fixed)
export const OC_TABLE_COLUMNS: Array<{ key: string; label: string }> = [
  { key: 'city', label: 'Πόλη' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Τηλέφωνο' },
  { key: 'regYear', label: 'Έτος εγγραφής' },
  { key: 'year', label: 'Τρέχον έτος (πληρωμή)' },
  { key: 'status', label: 'Κατάσταση' },
  { key: 'payments', label: 'Πληρωμές 2021–σήμερα' },
]
export const OC_TABLE_DEFAULT_COLS = ['city', 'year', 'status']

export const OC_SEAT_LABELS: Record<string, string> = {
  coordinator: 'Συντονισμός',
  admin: 'Γραμματεία',
  comms: 'Επικοινωνία',
  it: 'IT',
  community: 'Κοινότητα',
  financer: 'Οικονομικά',
  outreach: 'Outreach',
}

// Short seat codes for the compact hero bubble
export const OC_SEAT_SHORT: Record<string, string> = {
  coordinator: 'C',
  admin: 'A',
  comms: 'Coms',
  it: 'IT',
  community: 'CM',
  financer: 'F',
  outreach: 'VC',
}

/**
 * Ποια έδρα έχει «γραφείο αποστολής email» σε ποια ενότητα του OC.
 *
 * Κάθε ρόλος στέλνει από το τραπέζι του: ο Συντονισμός και το Outreach από την
 * Επισκόπηση, η Κοινότητα από τα Μέλη, ο Ταμίας από τα Οικονομικά, η
 * Επικοινωνία από την Επικοινωνία, η Γραμματεία από τη Διαχείριση. Η θυρίδα
 * αποστολής ΔΕΝ βγαίνει από την ενότητα αλλά από την ΕΝΕΡΓΗ ΕΔΡΑ — γι' αυτό
 * η Επισκόπηση στέλνει από coordination@ ή outreach@ ανάλογα με το ποιος
 * είναι συνδεδεμένος, χωρίς να χρειάζεται δεύτερος πίνακας εδώ.
 *
 * Το IT τα βλέπει όλα: είναι το δίχτυ ασφαλείας του OC, όχι εξαίρεση.
 */
export const OC_EMAIL_DESKS: Record<string, string[]> = {
  overview: ['coordinator', 'outreach'],
  members: ['community'],
  finances: ['financer'],
  comms: ['comms'],
  admin: ['admin'],
}

/** Βλέπει η τρέχουσα έδρα το γραφείο αποστολής αυτής της ενότητας; */
export function canSendEmailFrom(section: string, seat: string | null | undefined): boolean {
  if (!seat) return false
  // hasOwnProperty, ΟΧΙ σκέτη ανάγνωση: ένα κλειδί σαν «toString» θα έδινε τη
  // συνάρτηση του prototype και το .includes θα έσκαγε.
  const desk = Object.prototype.hasOwnProperty.call(OC_EMAIL_DESKS, section)
    ? OC_EMAIL_DESKS[section] : null
  if (!desk) return false
  return seat === 'it' || desk.includes(seat)
}

/** Όλες οι έδρες που μπορούν να στείλουν email από το OC — μία πηγή αλήθειας
 *  για τη διαδρομή, το ανέβασμα εικόνων και την οθόνη. */
export const OC_EMAIL_SEATS: string[] = ['it', ...new Set(Object.values(OC_EMAIL_DESKS).flat())]

/**
 * Σε ποιο γραφείο ανήκει μια έδρα.
 *
 * Το IT δεν έχει δικό του γραφείο: κάθεται σε όποιο χρειάζεται, γι' αυτό
 * επιστρέφει null — και γι' αυτό ακριβώς η καμπάνια κρατά το γραφείο της
 * ΓΡΑΜΜΕΝΟ, αντί να το μαντεύουμε από τη θυρίδα του υπογράφοντα.
 */
export function deskOfSeat(seat: string | null | undefined): string | null {
  if (!seat) return null
  for (const [section, seats] of Object.entries(OC_EMAIL_DESKS)) {
    if (seats.includes(seat)) return section
  }
  return null
}

/** Υπάρχει γραφείο με αυτό το όνομα; (φράγμα για ό,τι έρχεται από το δίκτυο) */
export function isEmailDesk(desk: string | null | undefined): boolean {
  return !!desk && Object.prototype.hasOwnProperty.call(OC_EMAIL_DESKS, desk)
}

/** Πώς λέγεται το γραφείο στην οθόνη — ίδια ονόματα με τις ενότητες του OC */
export const OC_DESK_LABELS: Record<string, string> = {
  overview: 'Επισκόπηση',
  members: 'Μέλη',
  finances: 'Οικονομικά',
  comms: 'Επικοινωνία',
  admin: 'Διαχείριση',
}
