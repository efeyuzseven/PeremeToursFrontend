import { expect, test, type Page } from '@playwright/test'

const brand = 'Dentur | Pereme Tours'
const website = 'https://www.pereme.com.tr'

test.beforeEach(async ({ page }) => {
  await page.route('**/fonts.googleapis.com/**', (route) => route.abort())
  await page.route('**/fonts.gstatic.com/**', (route) => route.abort())
  // Metadata checks must not access live customer data or initiate any payment.
  await page.route('**/api/v1/**', (route) => route.fulfill({ status: 404, json: {} }))
})

async function expectMetadata(page: Page, title: string, path: string, indexable = true) {
  await expect(page).toHaveTitle(title)
  await expect(page.locator('head link[rel="canonical"]')).toHaveAttribute('href', `${website}${path}`)
  await expect(page.locator('head meta[property="og:site_name"]')).toHaveAttribute('content', brand)
  await expect(page.locator('head meta[property="og:title"]')).toHaveAttribute('content', title)
  await expect(page.locator('head meta[property="og:url"]')).toHaveAttribute('content', `${website}${path}`)
  await expect(page.locator('head meta[name="twitter:title"]')).toHaveAttribute('content', title)
  await expect(page.locator('head meta[name="robots"]')).toHaveAttribute('content', indexable ? 'index, follow' : 'noindex, nofollow')
  const description = await page.locator('head meta[name="description"]').getAttribute('content')
  await expect(page.locator('head meta[property="og:description"]')).toHaveAttribute('content', description!)
  await expect(page.locator('head meta[name="twitter:description"]')).toHaveAttribute('content', description!)
}

test('initial HTML has the exact brand title and official website metadata', async ({ request }) => {
  const response = await request.get('/')
  expect(response.ok()).toBe(true)
  const html = await response.text()
  expect(html).toContain(`<title>${brand}</title>`)
  expect(html).toContain(`rel="canonical" href="${website}/"`)
  expect(html).toContain(`property="og:site_name" content="${brand}"`)
  expect(html).toContain(`property="og:url" content="${website}/"`)
})

test('homepage brand stays the same in both languages and ignores tracking parameters', async ({ page }) => {
  await page.goto('/?utm_source=metadata-test#turlar')
  await expectMetadata(page, brand, '/')
  await expect(page.locator('head meta[property="og:locale"]')).toHaveAttribute('content', 'tr_TR')
  await page.evaluate(() => localStorage.setItem('pereme-language', 'en'))
  await page.reload()
  await expectMetadata(page, brand, '/')
  await expect(page.locator('head meta[property="og:locale"]')).toHaveAttribute('content', 'en_US')
  await expect(page.locator('head meta[name="description"]')).toHaveAttribute('content', /Discover.*Dentur \| Pereme Tours/)
})

test('public pages use branded titles and canonical URLs for route aliases', async ({ page }) => {
  for (const [route, canonical, title] of [
    ['/iletisim', '/iletisim', 'İletişim'],
    ['/contact', '/iletisim', 'İletişim'],
    ['/sikca-sorulan-sorular', '/sikca-sorulan-sorular', 'Sıkça Sorulan Sorular'],
    ['/faq', '/sikca-sorulan-sorular', 'Sıkça Sorulan Sorular'],
    ['/kvkk-aydinlatma-metni', '/kvkk-aydinlatma-metni', 'KVKK Aydınlatma Metni'],
    ['/kvkk', '/kvkk-aydinlatma-metni', 'KVKK Aydınlatma Metni'],
  ]) {
    await page.goto(`${route}?utm_source=metadata-test`)
    await expectMetadata(page, `${title} — ${brand}`, canonical)
  }
})

test('client-side navigation restores homepage metadata after a private page', async ({ page }) => {
  await page.goto('/login')
  await expectMetadata(page, `Giriş Yap — ${brand}`, '/login', false)
  await page.getByRole('link', { name: 'Siteye dön' }).click()
  await expectMetadata(page, brand, '/')
  await page.locator('footer').getByRole('link', { name: 'İletişim', exact: true }).click()
  await expectMetadata(page, `İletişim — ${brand}`, '/iletisim')
})

test('account metadata is branded and not indexable, with no personal data in URLs', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('peremetours-session', JSON.stringify({
    accessToken: 'mock-token', expiresAtUtc: '2099-01-01T00:00:00Z',
    user: { id: 'mock-user', firstName: 'Demo', lastName: 'Guest', email: 'demo@example.test', role: 'User' },
  })))
  await page.route('**/account/profile', (route) => route.fulfill({ json: { firstName: 'Demo', lastName: 'Guest', email: 'demo@example.test', createdAtUtc: '2026-10-07T12:00:00Z' } }))
  await page.route('**/account/reservations', (route) => route.fulfill({ json: [] }))
  await page.goto('/account?reference=private-test')
  await expectMetadata(page, `Hesabım — ${brand}`, '/hesabim', false)
  await expect(page.locator('head meta[property="og:title"]')).not.toHaveAttribute('content', /Demo|Guest|example/)
})

test('all admin pages use branded, non-indexable metadata in both languages', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('peremetours-session', JSON.stringify({
    accessToken: 'mock-admin-token', expiresAtUtc: '2099-01-01T00:00:00Z',
    user: { id: 'mock-admin', firstName: 'Demo', lastName: 'Admin', email: 'admin@example.test', role: 'Admin' },
  })))
  await page.goto('/')
  for (const [route, title, englishTitle] of [
    ['/admin/tickets', 'Tur Biletleri', 'Tour Tickets'],
    ['/admin/ticket-errors', 'Bilet Hata Kayıtları', 'Ticket Error Logs'],
    ['/admin/tour-contents', 'Tur İçerikleri', 'Tour Content'],
    ['/admin/site-content', 'Site İçerikleri', 'Site Content'],
    ['/admin/faqs', 'Sıkça Sorulan Sorular', 'Frequently Asked Questions'],
    ['/admin/users', 'Kullanıcılar', 'Users'],
  ]) {
    await page.evaluate(() => localStorage.setItem('pereme-language', 'tr'))
    await page.goto(route)
    await expectMetadata(page, `${title} — ${brand}`, route, false)
    await page.getByRole('button', { name: 'EN', exact: true }).click()
    await expectMetadata(page, `${englishTitle} — ${brand}`, route, false)
    await expect(page.locator('head meta[property="og:locale"]')).toHaveAttribute('content', 'en_US')
  }
})
