import { test, expect } from '@playwright/test'

// Οι δοκιμές ελέγχουν ΤΟ ΔΙΚΟ ΜΑΣ συμβόλαιο αλλαγής γλώσσας — cookie,
// badge (με fallback στο cookie όταν το GT δεν έχει μεταφράσει), και το
// λεξικό του ΧΑΡΤΗ. ΔΕΝ ελέγχουν την ίδια τη μετάφραση της Google:
// εξωτερική υπηρεσία, αναξιόπιστη σε CI.
test.describe('Αλλαγή γλώσσας', () => {
  // Ερμητικότητα: μπλοκάρουμε τελείως τα hosts της Google — το δικό μας
  // συμβόλαιο (cookie, badge-fallback, λεξικό) δουλεύει χωρίς αυτά, και
  // το εξωτερικό script έκανε το τεστ flaky υπό παράλληλο φορτίο.
  test.beforeEach(async ({ page }) => {
    await page.route(/translate\.google|translate-pa\.googleapis|translate\.googleapis/, r => r.abort())
  })

  test('η επιλογή Español γράφει το googtrans cookie και το badge δείχνει ES', async ({ page, viewport }) => {
    test.skip(!!viewport && viewport.width < 768, 'Το globe ζει στο desktop header')

    await page.goto('/')
    const globe = page.locator('button[aria-label^="Αλλαγή γλώσσας"]').first()
    await expect(globe).toBeVisible()
    await globe.click()

    const es = page.locator('div[role="listbox"] button', { hasText: 'Español' }).first()
    await expect(es).toBeVisible()
    await es.click() // κάνει full reload
    await page.waitForLoadState('load')

    await expect.poll(async () => {
      const cookies = await page.context().cookies()
      return cookies.find(c => c.name === 'googtrans')?.value
    }, { timeout: 10000 }).toBe('/el/es')

    // Το badge διαβάζει <html lang> με fallback στο cookie — δείχνει ES
    // ακόμη κι αν το script της Google δεν φόρτωσε καθόλου
    await expect(
      page.locator('button[aria-label^="Αλλαγή γλώσσας"] span.notranslate').first()
    ).toHaveText('ES', { timeout: 10000 })
  })

  test('με ενεργή μετάφραση ο ΧΑΡΤΗΣ γίνεται MAPA από το λεξικό μας', async ({ page, viewport }) => {
    test.skip(!!viewport && viewport.width < 768, 'Ο σύνδεσμος χάρτη ζει στο desktop header')

    await page.context().addCookies([{ name: 'googtrans', value: '/el/es', domain: 'localhost', path: '/' }])
    await page.goto('/')

    await expect(page.locator('a[href="/map"]').first()).toContainText('MAPA', { timeout: 10000 })
  })

  test('το «Back to Greek» καθαρίζει το cookie και το badge γυρνά σε EL', async ({ page, viewport }) => {
    test.skip(!!viewport && viewport.width < 768, 'Το globe ζει στο desktop header')

    await page.context().addCookies([{ name: 'googtrans', value: '/el/es', domain: 'localhost', path: '/' }])
    await page.goto('/')

    const globe = page.locator('button[aria-label^="Αλλαγή γλώσσας"]').first()
    await globe.click()
    const back = page.locator('div[role="listbox"] button', { hasText: 'Back to Greek' }).first()
    await expect(back).toBeVisible()
    await back.click() // κάνει full reload
    await page.waitForLoadState('load')

    await expect.poll(async () => {
      const cookies = await page.context().cookies()
      return cookies.find(c => c.name === 'googtrans')?.value ?? 'ΚΑΘΑΡΟ'
    }, { timeout: 10000 }).toBe('ΚΑΘΑΡΟ')

    await expect(
      page.locator('button[aria-label^="Αλλαγή γλώσσας"] span.notranslate').first()
    ).toHaveText('EL', { timeout: 10000 })
  })
})
