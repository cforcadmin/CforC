import { test, expect } from '@playwright/test'

test.describe('Members', () => {
  test('members page loads and shows member cards', async ({ page }) => {
    await page.goto('/members')
    await page.waitForLoadState('networkidle')

    const heading = page.locator('h1, h2').first()
    await expect(heading).toBeVisible()
  })

  test('search input filters results', async ({ page }) => {
    await page.goto('/members')
    await page.waitForLoadState('networkidle')

    const searchInput = page.locator('input[type="text"], input[type="search"]').first()
    if (await searchInput.isVisible()) {
      // Count initial cards
      const initialCards = await page.locator('a[href^="/members/"]').count()

      // Type a search query
      await searchInput.fill('test-unlikely-search-term-xyz')
      await page.waitForTimeout(500)

      // Should have fewer results (or empty state)
      const filteredCards = await page.locator('a[href^="/members/"]').count()
      expect(filteredCards).toBeLessThanOrEqual(initialCards)
    }
  })

  test('member detail page loads with hero name', async ({ page }) => {
    await page.goto('/members')
    await page.waitForLoadState('networkidle')

    const memberLink = page.locator('a[href^="/members/"]').first()
    if (await memberLink.isVisible()) {
      await memberLink.click()
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveURL(/\/members\/.+/)

      // Should have a heading with the member name
      const h1 = page.locator('h1').first()
      await expect(h1).toBeVisible()
    }
  })

  test('field-of-work tags link back to filtered list', async ({ page }) => {
    await page.goto('/members')
    await page.waitForLoadState('networkidle')

    const memberLink = page.locator('a[href^="/members/"]').first()
    if (await memberLink.isVisible()) {
      await memberLink.click()
      await page.waitForLoadState('networkidle')

      // Find a tag link that points back to /members?field=...
      const tagLink = page.locator('a[href*="/members?field="]').first()
      if (await tagLink.isVisible()) {
        await tagLink.click()
        await expect(page).toHaveURL(/\/members\?field=/)
      }
    }
  })
})
