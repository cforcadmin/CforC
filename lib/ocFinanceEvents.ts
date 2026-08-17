/**
 * Μικρό σήμα ανάμεσα στις κάρτες των Οικονομικών: όταν μια ενέργεια γράψει
 * έσοδο ή έξοδο, η «Μηνιαία εικόνα» πρέπει να ξαναδιαβάσει — αλλιώς δείχνει
 * την εικόνα πριν την έγκριση και μοιάζει με χαμένα δεδομένα.
 * Σκόπιμα event αντί για shared state: οι κάρτες μένουν ανεξάρτητες.
 */

export const FINANCE_CHANGED = 'oc-finance-changed'

/** month: «yyyy-MM» — ποιος μήνας άλλαξε */
export function notifyFinanceChanged(month?: string) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(FINANCE_CHANGED, { detail: { month } }))
}
