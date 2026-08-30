/**
 * Μικρές «σημαίες» του browser που πρέπει να ζητηθούν ΜΙΑ φορά (καλωσόρισση
 * του Cool, συγκατάθεση cookies).
 *
 * Γιατί δεν αρκεί το localStorage: το `<Navigation />` και τα banner ζουν
 * ΜΕΣΑ σε κάθε σελίδα, όχι στο layout — κάθε πλοήγηση τα ξαναστήνει και
 * ξανατρέχει ο έλεγχος. Όσο η τιμή γράφεται, κανένα πρόβλημα· όταν όμως ο
 * browser δεν κρατά site data (private mode, «καθαρισμός στο κλείσιμο»,
 * ITP), το ερώτημα ξαναεμφανίζεται σε ΚΑΘΕ κλικ του μενού.
 *
 * Γι' αυτό διαβάζουμε/γράφουμε σε δύο αποθήκες, και ο καλών κρατά επιπλέον
 * μια σημαία στο module του (μια φορά ανά περιήγηση) — ώστε ακόμη κι αν
 * καμία αποθήκη δεν δουλεύει, να μη γίνεται ενοχλητικό.
 */

/** Η τιμή από όποια αποθήκη τη θυμάται — αλλιώς null */
export function readFlag(key: string): string | null {
  try {
    const v = localStorage.getItem(key)
    if (v !== null) return v
  } catch { /* αποκλεισμένη αποθήκη */ }
  try {
    const v = sessionStorage.getItem(key)
    if (v !== null) return v
  } catch { /* αποκλεισμένη αποθήκη */ }
  return null
}

/** Γράφει και στις δύο αποθήκες· η αποτυχία της μίας δεν εμποδίζει την άλλη */
export function writeFlag(key: string, value: string): void {
  try { localStorage.setItem(key, value) } catch { /* αποκλεισμένη αποθήκη */ }
  try { sessionStorage.setItem(key, value) } catch { /* αποκλεισμένη αποθήκη */ }
}
