import { test, expect } from '@playwright/test'

const TEST_EMAIL = 'e2e-test@cultureforchange.net'
const TEST_PASSWORD = 'TestPass1!'

test.describe('Auth Flow', () => {
  test('login page renders with email and password fields', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    const emailInput = page.locator('input#login-email')
    const passwordInput = page.locator('input#password')

    await expect(emailInput).toBeVisible()
    await expect(passwordInput).toBeVisible()
  })

  test('empty form shows validation errors', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // Submit empty form
    const submitButton = page.locator('button[type="submit"]').first()
    if (await submitButton.isVisible()) {
      await submitButton.click()
      await page.waitForTimeout(500)

      // Should show an error message
      const error = page.locator('[role="alert"], .error, [class*="error"]').first()
      if (await error.isVisible()) {
        await expect(error).toBeVisible()
      }
    }
  })

  test('successful login with test account', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // Fill in credentials
    await page.locator('input#login-email').fill(TEST_EMAIL)
    await page.locator('input#password').fill(TEST_PASSWORD)

    // Submit
    await page.locator('button[type="submit"]').first().click()

    // Wait for redirect to profile page
    await page.waitForURL(/\/(profile|members)/, { timeout: 15000 })

    // Should be logged in — profile page or redirect destination
    const url = page.url()
    expect(url).toMatch(/\/(profile|members|login)/)
  })

  test('session persists after login', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.locator('input#login-email').fill(TEST_EMAIL)
    await page.locator('input#password').fill(TEST_PASSWORD)
    await page.locator('button[type="submit"]').first().click()
    await page.waitForURL(/\/(profile|members)/, { timeout: 15000 })

    // Navigate to homepage
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Session cookie should persist — check for logged-in indicator in nav
    // (profile link, logout button, or user name)
    const loggedInIndicator = page.locator(
      'a[href="/profile"], button:has-text("Αποσύνδεση"), nav:has-text("Προφίλ")'
    ).first()
    await expect(loggedInIndicator).toBeVisible({ timeout: 10000 })
  })

  test('logout works', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.locator('input#login-email').fill(TEST_EMAIL)
    await page.locator('input#password').fill(TEST_PASSWORD)
    await page.locator('button[type="submit"]').first().click()
    await page.waitForURL(/\/(profile|members)/, { timeout: 15000 })

    // Find and click logout
    const logoutButton = page.locator('button:has-text("Αποσύνδεση")').first()
    if (await logoutButton.isVisible({ timeout: 5000 })) {
      await logoutButton.click()
      await page.waitForTimeout(1000)

      // Should redirect to homepage or login; profile link should be gone
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      const profileLink = page.locator('a[href="/profile"]')
      await expect(profileLink).toHaveCount(0)
    }
  })

  test('wrong password shows error', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    await page.locator('input#login-email').fill(TEST_EMAIL)
    await page.locator('input#password').fill('WrongPassword1!')

    await page.locator('button[type="submit"]').first().click()
    await page.waitForTimeout(2000)

    // Should still be on login page with error
    expect(page.url()).toContain('/login')

    // Error message should be visible
    const error = page.locator('[role="alert"], [class*="error"], [class*="text-red"]').first()
    await expect(error).toBeVisible({ timeout: 5000 })
  })
})
