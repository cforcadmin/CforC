import { test, expect } from '@playwright/test'

test.describe('Activities', () => {
  test('activities page loads and shows activity cards', async ({ page }) => {
    await page.goto('/activities')
    await expect(page).toHaveURL(/\/activities/)

    // Wait for content to load
    await page.waitForLoadState('networkidle')

    // Should have at least one activity card or heading
    const heading = page.locator('h1, h2').first()
    await expect(heading).toBeVisible()
  })

  test('activity detail page loads via card click', async ({ page }) => {
    await page.goto('/activities')
    await page.waitForLoadState('networkidle')

    // Find first activity link/card
    const activityLink = page.locator('a[href^="/activities/"]').first()
    if (await activityLink.isVisible()) {
      await activityLink.click()
      await expect(page).toHaveURL(/\/activities\/.+/)

      // Detail page should have content
      const content = page.locator('main, article').first()
      await expect(content).toBeVisible()
    }
  })

  test('back navigation works', async ({ page }) => {
    await page.goto('/activities')
    await page.waitForLoadState('networkidle')

    const activityLink = page.locator('a[href^="/activities/"]').first()
    if (await activityLink.isVisible()) {
      await activityLink.click()
      await expect(page).toHaveURL(/\/activities\/.+/)

      await page.goBack()
      await expect(page).toHaveURL(/\/activities\/?$/)
    }
  })
})
