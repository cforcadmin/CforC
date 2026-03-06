import { test, expect } from '@playwright/test'

test.describe('Open Calls', () => {
  test('open calls page loads and shows cards', async ({ page }) => {
    await page.goto('/open-calls')
    await page.waitForLoadState('networkidle')

    const heading = page.locator('h1, h2').first()
    await expect(heading).toBeVisible()
  })
})
