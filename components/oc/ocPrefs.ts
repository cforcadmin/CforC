// Shared constants for OC preferences.
// Preferences are stored SERVER-SIDE in httpOnly cookies (set via
// /api/oc/prefs) because client storage (localStorage) proved unreliable —
// content blockers/private modes wipe it. Cookie names below are read by
// server code (app/oc/page.tsx, /api/oc/me) only.

// 'members' | 'oc' — absent means "ask each time"
export const OC_LANDING_COOKIE = 'oc-landing'
// last seat a multi-seat member worked as — lets logins enter silently
export const OC_LAST_SEAT_COOKIE = 'oc-last-seat'
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
