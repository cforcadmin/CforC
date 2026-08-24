import { test, expect } from '@playwright/test'
import { STORAGE_STATE, TEST_EMAIL, TEST_PASSWORD } from './global-setup'

/**
 * Ροή σύνδεσης. ΠΡΟΣΟΧΗ ΣΤΟΝ ΠΡΟΫΠΟΛΟΓΙΣΜΟ LOGIN: ο limiter δίνει 5
 * προσπάθειες / 15'. Το global-setup ξοδεύει 1. Τα δύο tests που κάνουν
 * πραγματικό login (επιτυχία, λάθος κωδικός) τρέχουν ΜΟΝΟ στο chromium —
 * στο mobile δοκιμάζουν το ίδιο backend, δεν προσθέτουν κάλυψη, και μαζί
 * θα ξεπερνούσαν το όριο. Σύνολο ανά εκτέλεση: 3 από 5.
 */

test.describe('Auth Flow', () => {
  test('login page renders with email and password fields', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input#login-email')).toBeVisible()
    await expect(page.locator('input#password')).toBeVisible()
  })

  test('successful login with test account', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'ένα πραγματικό login αρκεί — βλ. προϋπολογισμό limiter')
    await page.goto('/login')
    await page.locator('input#login-email').fill(TEST_EMAIL)
    await page.locator('input#password').fill(TEST_PASSWORD)
    await page.locator('button[type="submit"]').first().click()
    await page.waitForURL(/\/(profile|members)/, { timeout: 15000 })
  })

  test('wrong password shows error and stays on login', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'βλ. προϋπολογισμό limiter')
    await page.goto('/login')
    await page.locator('input#login-email').fill(TEST_EMAIL)
    await page.locator('input#password').fill('WrongPassword1!')
    await page.locator('button[type="submit"]').first().click()
    await page.waitForTimeout(2000)
    expect(page.url()).toContain('/login')
    await expect(page.locator('[role="alert"], [class*="error"], [class*="text-red"]').first()).toBeVisible({ timeout: 5000 })
  })

  test.describe('με αποθηκευμένη συνεδρία', () => {
    // Κανένα login εδώ — το cookie έρχεται από το global-setup
    test.use({ storageState: STORAGE_STATE })

    test('session persists across pages', async ({ page }) => {
      await page.goto('/')
      const loggedIn = page.locator('a[href="/profile"], button:has-text("Αποσύνδεση"), nav:has-text("Ο ΧΩΡΟΣ ΜΟΥ")').first()
      await expect(loggedIn).toBeVisible({ timeout: 10000 })
    })

    test('profile page is reachable', async ({ page }) => {
      await page.goto('/profile')
      await expect(page).toHaveURL(/\/profile/)
      await expect(page.locator('h1, h2').first()).toBeVisible()
    })

    test('logout works', async ({ page }) => {
      // Το logout καθαρίζει το cookie ΜΟΝΟ σε αυτό το context — το αρχείο
      // storageState δεν αγγίζεται, τα υπόλοιπα tests δεν επηρεάζονται.
      await page.goto('/')
      const logoutButton = page.locator('button:has-text("Αποσύνδεση")').first()
      if (await logoutButton.isVisible({ timeout: 5000 })) {
        await logoutButton.click()
        await page.waitForTimeout(1000)
        await page.goto('/')
        await expect(page.locator('a[href="/profile"]')).toHaveCount(0)
      }
    })
  })
})
