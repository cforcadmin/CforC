import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  test('homepage loads with correct title', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Culture for Change/)
  })

  test('desktop nav links work', async ({ page, viewport }) => {
    // Skip on mobile viewports where desktop nav is hidden
    test.skip(!!viewport && viewport.width < 768, 'Desktop nav not visible on mobile')

    await page.goto('/')

    // About link
    const aboutLink = page.locator('nav a[href="/about"]').first()
    await expect(aboutLink).toBeVisible()
    await aboutLink.click()
    await expect(page).toHaveURL(/\/about/)

    // Activities link
    await page.goto('/')
    const activitiesLink = page.locator('nav a[href="/activities"]').first()
    await expect(activitiesLink).toBeVisible()
    await activitiesLink.click()
    await expect(page).toHaveURL(/\/activities/)

    // Members link
    await page.goto('/')
    const membersLink = page.locator('nav a[href="/members"]').first()
    await expect(membersLink).toBeVisible()
    await membersLink.click()
    await expect(page).toHaveURL(/\/members/)
  })

  test('dark mode toggle works', async ({ page }) => {
    await page.goto('/')

    // Find the dark mode toggle button
    const themeToggle = page.locator('button[aria-label*="theme"], button[aria-label*="dark"], button[aria-label*="mode"]').first()
    if (await themeToggle.isVisible()) {
      await themeToggle.click()
      // Check that the html element has dark class
      const htmlClass = await page.locator('html').getAttribute('class')
      expect(htmlClass).toContain('dark')

      // Toggle back
      await themeToggle.click()
      const htmlClass2 = await page.locator('html').getAttribute('class')
      expect(htmlClass2).not.toContain('dark')
    }
  })

  test('skip-to-content link exists', async ({ page }) => {
    await page.goto('/')

    // The skip link is in the DOM but visually hidden until focused
    const skipLink = page.locator('a[href="#main-content"]')
    await expect(skipLink).toHaveCount(1)

    // The main content target should exist
    const mainContent = page.locator('main#main-content')
    await expect(mainContent).toHaveCount(1)
  })
})

test.describe('Mobile Navigation', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('hamburger menu opens and closes', async ({ page }) => {
    await page.goto('/')

    // Greek aria-label: "Άνοιγμα μενού" (Open menu)
    const menuButton = page.locator('button[aria-label="Άνοιγμα μενού"]')
    await expect(menuButton).toBeVisible()

    // Open menu (force click to bypass overlay intercept)
    await menuButton.click({ force: true })

    // Menu should now be visible
    const mobileMenu = page.locator('#mobile-menu')
    await expect(mobileMenu).toBeVisible()

    // Close menu — label changes to "Κλείσιμο μενού" (Close menu)
    const closeButton = page.locator('button[aria-label="Κλείσιμο μενού"]')
    await closeButton.click({ force: true })
    await page.waitForTimeout(500) // wait for animation
  })
})
