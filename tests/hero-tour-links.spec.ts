import { expect, test } from '@playwright/test'
import type { TourCategory, TourPageItem } from '../src/content/tour-pages'

const categories: { key: TourCategory; path: string; tr: string; en: string }[] = [
  { key: 'turkish-night', path: '/turlar/turk-gecesi', tr: 'Türk Gecesi', en: 'Turkish Night' },
  { key: 'sunset', path: '/turlar/sunset', tr: 'Sunset', en: 'Sunset' },
  { key: 'daytime', path: '/turlar/daytime', tr: 'DayTime', en: 'DayTime' },
  { key: 'bosphorus', path: '/turlar/bogaz-turu', tr: 'Boğaz Turu', en: 'Bosphorus' },
]

test.beforeEach(async ({ page }) => {
  await page.route('**/fonts.googleapis.com/**', (route) => route.abort())
  await page.route('**/fonts.gstatic.com/**', (route) => route.abort())
  await page.route('**/api/v1/**', (route) => route.fulfill({ status: 404, json: {} }))
  await page.route('**/api/v1/tours', (route) => route.fulfill({ json: [] }))
  for (const category of categories) {
    const content = (title: string) => ({ eyebrow: 'PEREME', title, intro: 'Fixture description',
      bookingLabel: 'Book', toursHeading: 'Tours', seoDescription: 'Fixture metadata' })
    const fixture: TourPageItem = {
      key: category.key, categoryKey: category.key, externalTourId: null, sourceName: category.tr,
      isCustomized: false, updatedAtUtc: null,
      document: { heroLayout: 'cover', heroImageUrl: '/assets/hero-bosphorus.webp',
        tr: content(`${category.tr} sayfası`), en: content(`${category.en} page`), sections: [] },
    }
    await page.route(`**/api/v1/tour-pages/${category.key}`, (route) => route.fulfill({ json: fixture }))
  }
})

for (const language of ['tr', 'en'] as const) {
  test(`hero links keep order and open the correct ${language} tour page`, async ({ page }) => {
    // This card is part of the existing wide-screen design; also exercise taps in the touch project.
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.addInitScript((value) => localStorage.setItem('pereme-language', value), language)
    let writes = 0
    page.on('request', (request) => { if (request.url().includes('/api/v1/') && request.method() !== 'GET') writes++ })
    for (const [index, category] of categories.entries()) {
      await page.goto('/')
      const links = page.locator('.experience-card__types').getByRole('link')
      await expect(links).toHaveCount(4)
      for (const [order, item] of categories.entries()) {
        await expect(links.nth(order)).toHaveAttribute('href', item.path)
        await expect(links.nth(order)).toHaveAccessibleName(item[language])
      }
      await links.nth(index).click()
      await expect(page).toHaveURL(new RegExp(`${category.path}$`))
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(`${category[language]} ${language === 'tr' ? 'sayfası' : 'page'}`)
      await expect(page.getByRole('dialog')).toHaveCount(0)
    }
    expect(writes).toBe(0)
  })
}

test('hero tour links are keyboard accessible with a visible focus outline', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/')
  const links = page.locator('.experience-card__types').getByRole('link')
  await links.first().focus()
  await page.keyboard.press('Tab')
  await expect(links.nth(1)).toBeFocused()
  await expect(links.nth(1)).toHaveCSS('outline-style', 'solid')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/turlar\/sunset$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sunset sayfası')
})
