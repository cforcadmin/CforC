import type { Page, Locator } from '@playwright/test'

/**
 * ΓΙΑΤΙ ΕΦΥΓΕ ΤΟ networkidle ΑΠΟ ΟΛΗ ΤΗ ΣΟΥΙΤΑ.
 *
 * 20/10/2026: τέσσερα tests «απέτυχαν» με timeout 30s. Η αιτία δεν ήταν η
 * σελίδα — σερβίρεται σε 0,06s — αλλά το widget του Google Translate, που
 * χτυπά περιοδικά το `translate.googleapis.com/element/log`. Όσο ζει η
 * σελίδα, το δίκτυο ΔΕΝ ησυχάζει ΠΟΤΕ, άρα το `waitForLoadState`
 * ('networkidle') δεν επιστρέφει ποτέ. Μετρημένο: αίτημα στο 11,1ο
 * δευτερόλεπτο και idle που δεν ήρθε σε 24s αναμονής.
 *
 * Το ύπουλο είναι ότι αποτύγχανε ΑΛΛΑ tests κάθε φορά, ανάλογα με το πότε
 * τύχαινε να χτυπήσει — δηλαδή μια σουίτα που λέει ψέματα με διαφορετικό
 * τρόπο κάθε εκτέλεση.
 *
 * Περιμένουμε ΤΟ ΣΤΟΙΧΕΙΟ που χρειάζεται το test, όχι το δίκτυο.
 */

/**
 * Περιμένει να φανεί το στοιχείο, ΧΩΡΙΣ να σκάει αν δεν υπάρχει.
 *
 * Υπάρχει για τα tests που γράφουν `if (await x.isVisible())`: το
 * `isVisible()` ΔΕΝ περιμένει — απαντά αμέσως. Σκέτη αφαίρεση της
 * αναμονής θα έκανε το `if` ψευδές και το test θα περνούσε χωρίς να
 * ελέγξει τίποτα, που είναι χειρότερο από το να αποτυγχάνει.
 */
export async function appeared(locator: Locator, timeout = 15_000): Promise<boolean> {
  try {
    await locator.waitFor({ state: 'visible', timeout })
    return true
  } catch {
    return false
  }
}

/** Η σελίδα απέδωσε: υπάρχει επικεφαλίδα. Αντικαθιστά το «περίμενε δίκτυο». */
export async function rendered(page: Page, timeout = 15_000): Promise<void> {
  await page.locator('h1, h2').first().waitFor({ state: 'visible', timeout })
}
