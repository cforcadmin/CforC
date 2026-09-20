import { test, expect } from '@playwright/test'

/**
 * Αίτηση εγγραφής — η διαδρομή από τη Συμμετοχή στη σελίδα /apply.
 *
 * Η σελίδα Συμμετοχή άνοιγε παλιά φόρμα Google σε νέα καρτέλα. Ο κώδικας
 * εκείνος μένει στη θέση του, απενεργοποιημένος· το κουμπί πηγαίνει πλέον
 * στο /apply. Αυτό φυλάει ακριβώς αυτό: σωστός προορισμός, καμία νέα
 * καρτέλα, και το κουμπί κλειδωμένο μέχρι να γίνουν δεκτοί οι όροι.
 */

const CTA = 'button:has-text("ΘΕΛΩ ΝΑ ΕΓΓΡΑΦΩ")'

test.describe('Αίτηση εγγραφής', () => {
  test('το κουμπί στη Συμμετοχή είναι κλειδωμένο μέχρι να γίνουν δεκτοί οι όροι', async ({ page }) => {
    await page.goto('/participation')
    const cta = page.locator(CTA).first()
    await expect(cta).toBeVisible()
    await expect(cta).toBeDisabled()

    await page.locator('#participation-terms-checkbox').check()
    await expect(cta).toBeEnabled()
  })

  test('το κουμπί οδηγεί στο /apply και όχι σε φόρμα Google', async ({ page, context }) => {
    await page.goto('/participation')
    await page.locator('#participation-terms-checkbox').check()

    // Αν ξανασυνδεθεί κατά λάθος με τη φόρμα, θα ανοίξει νέα καρτέλα
    let popup = false
    context.on('page', () => { popup = true })

    await page.locator(CTA).first().click()
    await page.waitForURL('**/apply', { timeout: 15_000 })

    expect(page.url()).toContain('/apply')
    expect(page.url()).not.toContain('docs.google.com')
    expect(popup).toBe(false)
    expect(context.pages()).toHaveLength(1)
  })

  test('η σελίδα /apply φορτώνει τη φόρμα αίτησης', async ({ page }) => {
    await page.goto('/apply')
    await page.waitForLoadState('networkidle')

    // ΠΡΟΣΟΧΗ: το getByText δεν πιάνει ελληνικό κείμενο που τελειώνει σε
    // σίγμα («ΕΓΓΡΑΦΗ» βρίσκεται, «ΕΓΓΡΑΦΗΣ» όχι). Ο ρόλος είναι ασφαλής.
    await expect(page.getByRole('heading', { level: 1, name: 'ΑΙΤΗΣΗ ΕΓΓΡΑΦΗΣ' })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Καλωσήρθες/ })).toBeVisible()
  })
})
