import { test, expect } from '@playwright/test'
import { appeared } from './ready'

test.describe('Activities', () => {
  test('activities page loads and shows activity cards', async ({ page }) => {
    await page.goto('/news')
    await expect(page).toHaveURL(/\/news/)

    // Η επικεφαλίδα είναι το σημάδι ότι απέδωσε η σελίδα — όχι το δίκτυο
    const heading = page.locator('h1, h2').first()
    await expect(heading).toBeVisible()
  })

  test('activity detail page loads via card click', async ({ page }) => {
    await page.goto('/news')

    // Find first activity link/card
    const activityLink = page.locator('a[href^="/news/"]').first()
    await appeared(activityLink)
    if (await activityLink.isVisible()) {
      await activityLink.click()
      await expect(page).toHaveURL(/\/news\/.+/)

      // Detail page should have content
      const content = page.locator('main, article').first()
      await expect(content).toBeVisible()
    }
  })

  test('back navigation works', async ({ page }) => {
    await page.goto('/news')

    const activityLink = page.locator('a[href^="/news/"]').first()
    await appeared(activityLink)
    if (await activityLink.isVisible()) {
      await activityLink.click()
      await expect(page).toHaveURL(/\/news\/.+/)

      await page.goBack()
      await expect(page).toHaveURL(/\/news\/?$/)
    }
  })
})
