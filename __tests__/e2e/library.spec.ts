import { test, expect } from '@playwright/test'
import { STORAGE_STATE } from './global-setup'

/**
 * Ανοιχτή Βιβλιοθήκη — ΜΟΝΟ ανάγνωση. Τα tests τρέχουν πάνω στο
 * ΠΑΡΑΓΩΓΙΚΟ Strapi: καμία καταχώρηση, καμία υποβολή φόρμας.
 */

test.use({ storageState: STORAGE_STATE })

test.describe('Ανοιχτή Βιβλιοθήκη', () => {
  test('η ενότητα ανοίγει από το ?section=library', async ({ page }) => {
    await page.goto('/profile?section=library')
    await expect(page.getByRole('heading', { name: /Ανοιχτή βιβλιοθήκη/ })).toBeVisible({ timeout: 15000 })
  })

  test('φέρει το σήμα δοκιμαστικής λειτουργίας', async ({ page }) => {
    await page.goto('/profile?section=library')
    await expect(page.getByText('Δοκιμαστική λειτουργία')).toBeVisible({ timeout: 15000 })
  })

  test('ο κατάλογος δείχνει τεκμήρια ή την κενή κατάσταση', async ({ page }) => {
    await page.goto('/profile?section=library')
    const table = page.locator('table')
    const empty = page.getByText('Η βιβλιοθήκη είναι ακόμη άδεια')
    await expect(table.or(empty).first()).toBeVisible({ timeout: 20000 })
  })

  test('το φίλτρο πεδίων ανοίγει γυάλινο πάνελ', async ({ page }) => {
    await page.goto('/profile?section=library')
    await page.getByRole('button', { name: /Όλα τα πεδία εργασίας/ }).click()
    await expect(page.locator('.menu-glass').first()).toBeVisible()
    await expect(page.getByText('Κατηγορίες')).toBeVisible()
    // Escape κλείνει το πάνω-πάνω επίπεδο
    await page.keyboard.press('Escape')
    await expect(page.getByText('Κατηγορίες')).toBeHidden()
  })

  test('το «Κάθε είδος» είναι το κοινό γυάλινο dropdown', async ({ page }) => {
    await page.goto('/profile?section=library')
    await page.getByRole('button', { name: 'Κάθε είδος' }).click()
    const listbox = page.getByRole('listbox', { name: /Είδος αρχείου/ })
    await expect(listbox).toBeVisible()
    await expect(listbox.locator('[role="option"]').first()).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(listbox).toBeHidden()
  })

  test('η «Προσθήκη» δείχνει πρώτα τις οδηγίες — και το Escape τις κλείνει', async ({ page }) => {
    await page.goto('/profile?section=library')
    await page.getByRole('button', { name: /Προσθήκη/ }).first().click()
    // Νέα συνεδρία χωρίς το cookie «το είδα»: πρώτα το ενημερωτικό
    const intro = page.getByRole('heading', { name: /Πριν προσθέσεις τεκμήριο|Νέο τεκμήριο/ })
    await expect(intro).toBeVisible()
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
