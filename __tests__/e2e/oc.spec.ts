import { test, expect } from '@playwright/test'
import { STORAGE_STATE } from './global-setup'

/**
 * Operational Center — έλεγχος ΠΡΟΣΒΑΣΗΣ, όχι λειτουργιών.
 *
 * Ο λογαριασμός e2e είναι απλό μέλος χωρίς έδρα, και δεν πρόκειται να
 * βάλουμε διαπιστευτήρια μέλους του ΔΣ σε test. Αυτό που ΜΠΟΡΕΙ και
 * ΠΡΕΠΕΙ να ελέγχεται αυτόματα είναι το φράγμα: κανείς εκτός Ομάδας
 * Συντονισμού δεν βλέπει το OC — ούτε συνδεδεμένος, ούτε ανώνυμος.
 */

test.describe('OC — φράγμα πρόσβασης', () => {
  test('χωρίς σύνδεση, το /oc διώχνει', async ({ page }) => {
    await page.goto('/oc')
    await page.waitForLoadState('networkidle')
    expect(new URL(page.url()).pathname).not.toMatch(/^\/oc/)
  })

  test.describe('συνδεδεμένο απλό μέλος', () => {
    test.use({ storageState: STORAGE_STATE })

    test('το /oc διώχνει σιωπηλά στην αρχική', async ({ page }) => {
      await page.goto('/oc')
      await page.waitForLoadState('networkidle')
      expect(new URL(page.url()).pathname).not.toMatch(/^\/oc/)
    })

    test('τα API του OC αρνούνται', async ({ request }) => {
      for (const path of ['/api/oc/tasks', '/api/oc/indicators', '/api/oc/calendar']) {
        const res = await request.get(path)
        expect([401, 403]).toContain(res.status())
      }
    })

    test('το κουμπί ΟC δεν εμφανίζεται στο μενού', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      await expect(page.locator('a[href="/oc"]')).toHaveCount(0)
    })
  })

  test('τα API της βιβλιοθήκης για τον Βιβλιοθηκάριο αρνούνται σε μη-Βιβλιοθηκάριο', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: STORAGE_STATE })
    const res = await ctx.request.get('/api/library/review')
    expect([401, 403]).toContain(res.status())
    await ctx.close()
  })
})
