import { test, expect } from '@playwright/test'
import { STORAGE_STATE } from './global-setup'
import { DEV_COMPILE } from './ready'

/**
 * Ανοιχτή Βιβλιοθήκη — ΜΟΝΟ ανάγνωση. Τα tests τρέχουν πάνω στο
 * ΠΑΡΑΓΩΓΙΚΟ Strapi: καμία καταχώρηση, καμία υποβολή φόρμας.
 */

test.use({ storageState: STORAGE_STATE })

/**
 * ΓΙΑΤΙ ΟΛΑ ΜΕ DEV_COMPILE ΚΑΙ ΟΧΙ ΜΕ ΔΙΑΦΟΡΕΤΙΚΟΥΣ ΑΡΙΘΜΟΥΣ.
 *
 * Μετρημένο 24/10/2026 σε ΖΕΣΤΟ server, χωρίς φόρτο: η επικεφαλίδα της
 * ενότητας εμφανίζεται σε 4,7s / 6,2s / 9,7s σε τρεις διαδοχικές δοκιμές.
 * Μέσα στην πλήρη σουίτα, με workers να ανταγωνίζονται, το 15000 που ήταν
 * εδώ έπεφτε — όχι επειδή χάλασε κάτι, αλλά επειδή ήταν ψεύτικη κόκκινη
 * γραμμή. Ένα όνομα με αιτιολογία αντί για τρεις μαγικούς αριθμούς.
 */
test.describe('Ανοιχτή Βιβλιοθήκη', () => {
  test('η ενότητα ανοίγει από το ?section=library', async ({ page }) => {
    await page.goto('/profile?section=library')
    await expect(page.getByRole('heading', { name: /Ανοιχτή βιβλιοθήκη/ })).toBeVisible({ timeout: DEV_COMPILE })
  })

  test('φέρει το σήμα δοκιμαστικής λειτουργίας', async ({ page }) => {
    await page.goto('/profile?section=library')
    await expect(page.getByText('Δοκιμαστική λειτουργία')).toBeVisible({ timeout: DEV_COMPILE })
  })

  test('ο κατάλογος δείχνει τεκμήρια ή την κενή κατάσταση', async ({ page }) => {
    await page.goto('/profile?section=library')
    const table = page.locator('table')
    const empty = page.getByText('Η βιβλιοθήκη είναι ακόμη άδεια')
    await expect(table.or(empty).first()).toBeVisible({ timeout: DEV_COMPILE })
  })

  test('το φίλτρο πεδίων ανοίγει γυάλινο πάνελ', async ({ page }) => {
    await page.goto('/profile?section=library')
    await page.getByRole('button', { name: /Όλα τα πεδία εργασίας/ }).click()
    await expect(page.locator('.menu-glass:visible').first()).toBeVisible()
    await expect(page.getByText('Κατηγορίες')).toBeVisible()
    // Escape κλείνει το πάνω-πάνω επίπεδο
    await page.keyboard.press('Escape')
    await expect(page.getByText('Κατηγορίες')).toBeHidden()
  })

  test('το «Κάθε είδος» είναι το κοινό γυάλινο dropdown', async ({ page }) => {
    await page.goto('/profile?section=library')
    await page.getByRole('button', { name: 'Είδος αρχείου' }).click()
    const listbox = page.getByRole('listbox', { name: /Είδος αρχείου/ })
    await expect(listbox).toBeVisible()
    await expect(listbox.locator('[role="option"]').first()).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(listbox).toBeHidden()
  })

  test('η «Προσθήκη» δείχνει πρώτα τις οδηγίες — και το Escape τις κλείνει', async ({ page }) => {
    await page.goto('/profile?section=library')
    /**
     * ΠΡΩΤΑ να φορτώσει η ενότητα, ΜΕΤΑ το κλικ. Το κουμπί υπάρχει στο HTML
     * πριν προλάβει το React να του δέσει χειριστή: το κλικ έφευγε στο κενό
     * και δεν άνοιγε τίποτα. Μετρήθηκε με χειροκίνητο probe στις 24/10/2026 —
     * με αναμονή, ο διάλογος εμφανίζεται κανονικά.
     */
    await expect(page.getByRole('heading', { name: /Ανοιχτή βιβλιοθήκη/ }))
      .toBeVisible({ timeout: DEV_COMPILE })
    await page.getByRole('button', { name: /Προσθήκη/ }).first().click()
    // Νέα συνεδρία χωρίς το cookie «το είδα»: πρώτα το ενημερωτικό
    const intro = page.getByRole('heading', { name: /Πριν προσθέσεις τεκμήριο|Νέο τεκμήριο/ })
    await expect(intro).toBeVisible({ timeout: DEV_COMPILE })
    await page.keyboard.press('Escape')
    // ΔΕΝ πατάμε ποτέ «Καταχώρηση» — παραγωγική βάση
  })

  test('οι «Οδηγίες συμπλήρωσης» ανοίγουν από την κεφαλίδα', async ({ page }) => {
    await page.goto('/profile?section=library')
    await page.getByRole('button', { name: 'Οδηγίες συμπλήρωσης' }).click()
    await expect(page.getByText('Όρια της φόρμας')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByText('Όρια της φόρμας')).toBeHidden()
  })
})
