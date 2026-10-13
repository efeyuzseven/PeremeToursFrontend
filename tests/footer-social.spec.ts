import { expect, test } from '@playwright/test'

const instagramProfile = 'https://www.instagram.com/peremetours/'

test.beforeEach(async ({ page }) => {
  await page.route('**/fonts.googleapis.com/**', (route) => route.abort())
  await page.route('**/fonts.gstatic.com/**', (route) => route.abort())
  await page.route('**/api/v1/**', (route) => route.fulfill({ status: 404, json: {} }))
  // Check the actual click destination without accessing Instagram or live customer data.
  await page.context().route(`${instagramProfile}**`, (route) => route.fulfill({
    contentType: 'text/html', body: '<title>Instagram profile fixture</title>',
  }))
})

for (const language of ['tr', 'en']) {
  for (const path of ['/', '/iletisim']) {
    test(`${language} ${path} has no agency placeholder and opens the Pereme Instagram profile`, async ({ page }) => {
      await page.addInitScript((value) => localStorage.setItem('pereme-language', value), language)
      await page.goto(path)
      await expect(page.locator('body')).not.toContainText('TÜRSAB bilgisi eklenecek')
      await expect(page.locator('body')).not.toContainText('TÜRSAB details to be added')
      const link = path === '/' ? page.locator('footer').getByRole('link', { name: 'Instagram', exact: true })
        : page.locator('.contact-cards').getByRole('link', { name: /Instagram/ })
      await expect(link).toHaveAttribute('href', instagramProfile)
      await expect(link).toHaveAttribute('target', '_blank')
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer')
      if (path === '/') await expect(page.locator('.footer__bottom > *')).toHaveCount(2)
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
      const popupPromise = page.waitForEvent('popup')
      await link.click()
      const popup = await popupPromise
      await expect(popup).toHaveURL(instagramProfile)
      await popup.close()
    })
  }
}
