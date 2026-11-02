import { expect, test } from '@playwright/test'

const summary = {
  rating: 4.7,
  totalCount: 1284,
  mapsUrl: 'https://maps.google.com/?cid=1',
  reviews: [
    { authorName: 'Ayşe Kaya', authorUrl: 'https://www.google.com/maps/contrib/1', authorPhotoUrl: null, rating: 5, text: 'Boğazda harika bir akşamdı, ekip çok ilgiliydi.', translated: false, relativeTime: '2 hafta önce' },
    { authorName: 'John Smith', authorUrl: null, authorPhotoUrl: null, rating: 4, text: 'Manzara çok güzeldi.', translated: true, relativeTime: '1 ay önce' },
  ],
}

test.beforeEach(async ({ page }) => {
  await page.route('**/fonts.googleapis.com/**', (route) => route.abort())
  await page.route('**/fonts.gstatic.com/**', (route) => route.abort())
  await page.route('**/api/v1/**', (route) => route.fulfill({ status: 404, json: {} }))
})

test('homepage shows the Google rating and reviews with links to Google', async ({ page }) => {
  const languages: string[] = []
  await page.route('**/api/v1/google-reviews**', (route) => {
    languages.push(new URL(route.request().url()).searchParams.get('language') ?? '')
    return route.fulfill({ json: summary })
  })
  await page.goto('/')

  const section = page.locator('#yorumlar')
  await section.scrollIntoViewIfNeeded()
  await expect(section.getByRole('heading', { name: 'Misafirlerimiz ne diyor?' })).toBeVisible()
  await expect(section.locator('.google-reviews__score')).toContainText('4,7')
  await expect(section.locator('.google-reviews__score')).toContainText('1.284 Google yorumu')
  await expect(section.locator('.google-reviews__score')).toHaveAttribute('href', summary.mapsUrl)
  await expect(section.locator('article')).toHaveCount(2)
  await expect(section.getByRole('link', { name: 'Ayşe Kaya' })).toHaveAttribute('href', 'https://www.google.com/maps/contrib/1')
  await expect(section.getByRole('img', { name: '5 üzerinden 4 yıldız' })).toBeVisible()
  await expect(section.locator('article').nth(1)).toContainText('Google tarafından çevrildi')
  await expect(section.getByRole('link', { name: 'Google’da tüm yorumlar' })).toHaveAttribute('target', '_blank')
  expect(languages).toContain('tr')
})

test('homepage hides the reviews section when reviews are unavailable', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('#neden-biz')).toBeAttached()
  await expect(page.locator('#yorumlar')).toHaveCount(0)
})
