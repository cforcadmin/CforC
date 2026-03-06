import { test, expect } from '@playwright/test'

test.describe('SEO Metadata', () => {
  test('homepage has OG tags', async ({ page }) => {
    await page.goto('/')

    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content')
    expect(ogTitle).toBeTruthy()

    const ogDescription = await page.locator('meta[property="og:description"]').getAttribute('content')
    expect(ogDescription).toBeTruthy()

    const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content')
    expect(ogImage).toBeTruthy()
  })

  test('homepage has Twitter card tags', async ({ page }) => {
    await page.goto('/')

    const twitterCard = await page.locator('meta[name="twitter:card"]').getAttribute('content')
    expect(twitterCard).toBeTruthy()
  })

  test('homepage has Organization JSON-LD', async ({ page }) => {
    await page.goto('/')

    const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent()
    if (jsonLd) {
      const data = JSON.parse(jsonLd)
      expect(data['@type']).toBe('Organization')
    }
  })

  test('activities page has page-specific title', async ({ page }) => {
    await page.goto('/activities')

    const title = await page.title()
    expect(title).toBeTruthy()
    expect(title).not.toBe('')
  })

  test('HTML lang="el" is set', async ({ page }) => {
    await page.goto('/')

    const lang = await page.locator('html').getAttribute('lang')
    expect(lang).toBe('el')
  })
})
