import { expect, test, type Page } from '@playwright/test'
import type { TourPageItem } from '../src/content/tour-pages'

const makePage = (key = 'sunset', externalTourId: number | null = null): TourPageItem => ({
  key, categoryKey: 'sunset', externalTourId, sourceName: 'Sunset source', isCustomized: false, updatedAtUtc: null,
  document: {
    heroLayout: 'cover', heroImageUrl: '/assets/tour-sunset.webp',
    tr: { eyebrow: 'İSTANBUL’U KEŞFET', title: externalTourId ? 'Sunset özel tur' : 'Sunset deneyimi', intro: 'Türkçe tur açıklaması.', bookingLabel: 'Rezervasyon yap', toursHeading: 'İlgili turlar', seoDescription: 'Türkçe Sunset SEO açıklaması.' },
    en: { eyebrow: 'DISCOVER ISTANBUL', title: externalTourId ? 'Sunset private tour' : 'Sunset experience', intro: 'English tour description.', bookingLabel: 'Book now', toursHeading: 'Related tours', seoDescription: 'English Sunset SEO description.' },
    sections: [
      { id: 'experience', type: 'text', background: 'white', isVisible: true, imageUrls: [], tr: { title: 'Deneyimi keşfet', body: 'Birinci bölüm.', items: [] }, en: { title: 'Discover the experience', body: 'First section.', items: [] } },
      { id: 'highlights', type: 'highlights', background: 'blue', isVisible: true, imageUrls: [], tr: { title: 'Öne çıkanlar', body: 'İkinci bölüm.', items: ['Boğaz manzarası'] }, en: { title: 'Highlights', body: 'Second section.', items: ['Bosphorus views'] } },
      { id: 'hidden', type: 'text', background: 'white', isVisible: false, imageUrls: [], tr: { title: 'Gizli taslak', body: 'Yayınlanmayan açıklama.', items: [] }, en: { title: 'Hidden draft', body: 'Not published.', items: [] } },
    ],
  },
})
const catalog = [
  { externalTourId: 41, categoryKey: 'sunset', name: 'Sunset canlı tur', titleEn: 'Live Sunset cruise', sortOrder: 1 },
  { externalTourId: 44, categoryKey: 'sunset', name: 'Sunset ikinci tur', titleEn: 'Second Sunset cruise', sortOrder: 2 },
  { externalTourId: 42, categoryKey: 'daytime', name: 'Daytime canlı tur', titleEn: 'Live Daytime cruise', sortOrder: 3 },
  { externalTourId: 43, categoryKey: 'turkish-night', name: 'Türk Gecesi canlı tur', titleEn: 'Live Turkish Night cruise', sortOrder: 0 },
]

test.beforeEach(async ({ page }) => {
  await page.route('**/fonts.googleapis.com/**', route => route.abort())
  await page.route('**/fonts.gstatic.com/**', route => route.abort())
})

async function mockApi(page: Page, options: { pageFails?: boolean; catalogFails?: boolean } = {}) {
  let pages = [makePage(), makePage('tour-41', 41)]
  const saved: TourPageItem['document'][] = []
  const uploads: string[] = []
  const payments: string[] = []
  await page.route('**/api/v1/**', async route => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    if (path.includes('/payments/tour/initialize')) payments.push(path)
    if (path === '/api/v1/tours') return route.fulfill(options.catalogFails ? { status: 503, json: {} } : { json: catalog })
    if (path === '/api/v1/admin/tour-pages') return route.fulfill({ json: pages })
    if (path.startsWith('/api/v1/admin/tour-pages/') && request.method() === 'PUT') {
      const document = request.postDataJSON() as TourPageItem['document']
      saved.push(document)
      pages = pages.map(item => item.key === path.split('/').at(-1) ? { ...item, document, isCustomized: true } : item)
      return route.fulfill({ json: pages.find(item => item.key === path.split('/').at(-1)) })
    }
    if (path.startsWith('/api/v1/admin/tour-pages/') && path.endsWith('/images')) {
      uploads.push(path)
      return route.fulfill({ json: { url: '/assets/tour-dinner.webp' } })
    }
    if (path.startsWith('/api/v1/tour-pages/')) {
      const item = pages.find(item => item.key === path.split('/').at(-1))
      if (options.pageFails) return route.fulfill({ status: 503, json: { title: 'Unavailable' } })
      return route.fulfill(item ? { json: item } : { status: 404, json: {} })
    }
    if (path.endsWith('/ports')) return route.fulfill({ json: [{ externalPortId: 3, name: 'Kabataş', displayOrder: 1 }] })
    if (path.endsWith('/availability')) return route.fulfill({ json: {
      externalTourId: 41, tourName: 'Sunset canlı tur',
      prices: [{ externalPriceId: 145, externalPassengerTypeId: 6, passengerType: 'İkramsız', passengerTypeEn: 'No refreshments', amount: 350, currency: 'TRY', taxRate: 20 }],
      departures: [{ externalId: 8366, externalPortId: 3, date: '2099-10-03', time: '18:30:00' }],
    } })
    if (path === '/api/v1/payments/availability') return route.fulfill({ json: { enabled: false } })
    return route.fulfill({ status: 404, json: {} })
  })
  return { saved, uploads, payments }
}

async function asAdmin(page: Page) {
  await page.addInitScript(() => { if (!sessionStorage.getItem('peremetours-session')) sessionStorage.setItem('peremetours-session', JSON.stringify({
    accessToken: 'mock-admin-token', expiresAtUtc: '2099-01-01T00:00:00Z',
    user: { id: 'mock-admin', firstName: 'Demo', lastName: 'Admin', email: 'admin@example.test', role: 'Admin' },
  })) })
}

async function setEnglish(page: Page) {
  if (await page.locator('.info-language').isVisible()) await page.locator('.info-language').getByRole('button', { name: 'EN', exact: true }).click()
  else {
    await page.locator('.info-menu-button').click()
    await page.locator('.info-mobile-menu').getByRole('button', { name: 'EN', exact: true }).click()
    await page.locator('.info-mobile-menu').getByRole('button', { name: 'Close menu' }).click()
  }
}

test('service link opens its own page, filters live tours and deep links to a tour detail', async ({ page }, testInfo) => {
  await mockApi(page)
  await page.goto('/')
  await page.locator('.service-card').nth(1).getByRole('link', { name: 'İlgili turları gör' }).click()
  await expect(page).toHaveURL(/\/turlar\/sunset$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sunset deneyimi')
  await expect(page.locator('.tour-page-tour-card')).toHaveCount(2)
  await expect(page.locator('.tour-page-tour-grid')).not.toContainText('Daytime canlı tur')
  await expect(page.getByText('Gizli taslak', { exact: true })).toHaveCount(0)
  await page.locator('.tour-page-tour-card').first().getByRole('link', { name: 'Turu incele', exact: true }).click()
  await expect(page).toHaveURL(/\/tur\/41$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sunset özel tur')
  await expect(page.locator('.tour-page-tour-card')).toHaveCount(1)
  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sunset özel tur')
  await page.screenshot({ path: testInfo.outputPath('tour-detail.png'), fullPage: true })
})

test('TR and EN titles, body and SEO change without changing the page URL', async ({ page }) => {
  await mockApi(page)
  await page.goto('/turlar/sunset')
  await expect(page).toHaveTitle('Sunset deneyimi — Dentur | Pereme Tours')
  await expect(page.locator('head meta[name="description"]')).toHaveAttribute('content', 'Türkçe Sunset SEO açıklaması.')
  await setEnglish(page)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sunset experience')
  await expect(page.getByRole('heading', { name: 'Highlights', exact: true })).toBeVisible()
  await expect(page).toHaveTitle('Sunset experience — Dentur | Pereme Tours')
  await expect(page.locator('head meta[name="description"]')).toHaveAttribute('content', 'English Sunset SEO description.')
  await expect(page.locator('head link[rel="canonical"]')).toHaveAttribute('href', 'https://www.pereme.com.tr/turlar/sunset')
  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sunset experience')
})

test('both detail and category pages open the existing live booking with one ticket and no card prices', async ({ page }) => {
  const { payments } = await mockApi(page)
  for (const path of ['/tur/41', '/turlar/sunset']) {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.locator('.tour-page-tour-grid')).not.toContainText('₺')
    const button = path.startsWith('/tur/') ? page.locator('.tour-page-hero').getByRole('button', { name: 'Rezervasyon yap' }) : page.locator('.tour-page-tour-card').first().getByRole('button', { name: 'Rezervasyon yap' })
    await button.click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.locator('.reservation-ticket-type output')).toHaveText('1')
    await expect(dialog.locator('.booking-total')).toContainText('350')
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
  }
  expect(payments).toEqual([])
})

test('unknown tours return a useful not-found screen without an enabled booking', async ({ page }) => {
  await mockApi(page)
  for (const path of ['/tur/999', '/tur/0', '/turlar/unknown']) {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tur bulunamadı')
    await expect(page.getByRole('button', { name: 'Rezervasyon yap', exact: true })).toHaveCount(0)
    await expect(page.locator('head meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
  }
})

test('catalog failures keep the detail page visible but disable booking and offer retry', async ({ page }) => {
  await mockApi(page, { catalogFails: true })
  await page.goto('/tur/41')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sunset özel tur')
  await expect(page.locator('.tour-page-hero').getByRole('button', { name: 'Rezervasyon yap' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Tekrar dene' })).toBeVisible()
})

test('admin editor keeps both language drafts, reorders sections and saves both languages', async ({ page }) => {
  await asAdmin(page)
  const { saved } = await mockApi(page)
  await page.goto('/admin/tour-pages')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tur Sayfaları')
  await page.getByLabel('Başlık', { exact: true }).first().fill('Türkçe yeni başlık')
  await page.locator('.tour-page-editor-tabs').getByRole('button', { name: 'EN', exact: true }).click()
  await page.getByLabel('Başlık', { exact: true }).first().fill('New English title')
  await page.locator('.tour-page-editor-tabs').getByRole('button', { name: 'TR', exact: true }).click()
  await expect(page.getByLabel('Başlık', { exact: true }).first()).toHaveValue('Türkçe yeni başlık')
  await page.locator('[data-editor-section="highlights"]').getByRole('button', { name: 'Yukarı taşı' }).click()
  await page.getByRole('button', { name: 'Sayfayı kaydet' }).click()
  await expect(page.getByRole('status')).toHaveText('Sayfa kaydedildi ve yayına yansıdı.')
  expect(saved).toHaveLength(1)
  expect(saved[0].tr.title).toBe('Türkçe yeni başlık')
  expect(saved[0].en.title).toBe('New English title')
  expect(saved[0].sections[0].id).toBe('highlights')
  await page.goto('/turlar/sunset')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Türkçe yeni başlık')
  await setEnglish(page)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('New English title')
})

test('admin layout, galleries, visibility and draft previews work without creating a payment', async ({ page }, testInfo) => {
  await asAdmin(page)
  const { saved, uploads, payments } = await mockApi(page)
  await page.goto('/admin/tour-pages')
  await page.getByLabel('Kapak düzeni').selectOption('split')
  await page.locator('[data-editor-section="experience"]').getByLabel('Bölümü göster').uncheck()
  await page.getByRole('button', { name: 'Bölüm ekle: Galeri', exact: true }).click()
  const gallery = page.locator('.tour-page-editor-section').last()
  await gallery.getByLabel('Başlık', { exact: true }).fill('Yeni galeri')
  await gallery.locator('input[type="file"]').setInputFiles({ name: 'photo.webp', mimeType: 'image/webp', buffer: Buffer.from('RIFF0000WEBP') })
  await expect(gallery.locator('figure')).toHaveCount(1)
  await page.getByRole('button', { name: 'Canlı önizleme' }).click()
  await expect(page.locator('.tour-page-hero--split')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Deneyimi keşfet', exact: true })).toHaveCount(0)
  await expect(page.locator('.tour-page-gallery img')).toHaveCount(1)
  await expect(page.locator('.tour-page-hero button')).toBeDisabled()
  await expect(page.locator('head meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
  expect(saved).toEqual([])
  expect(uploads).toEqual(['/api/v1/admin/tour-pages/sunset/images'])
  expect(payments).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('page-editor-preview.png'), fullPage: true })
  await page.getByRole('button', { name: 'Sayfayı kaydet' }).click()
  await expect(page.getByRole('status')).toBeVisible()
  expect(saved[0].heroLayout).toBe('split')
  expect(saved[0].sections.find(section => section.id === 'experience')?.isVisible).toBe(false)
})

test('admin can choose an individual tour and non-admins cannot access the editor', async ({ page }) => {
  await asAdmin(page)
  await mockApi(page)
  await page.goto('/admin/tour-pages')
  await page.getByLabel('Düzenlenecek sayfa').selectOption('tour-41')
  await expect(page.getByLabel('Başlık', { exact: true }).first()).toHaveValue('Sunset özel tur')
  await expect(page.getByRole('link', { name: 'Yayındaki sayfa' })).toHaveAttribute('href', '/tur/41')
  await page.evaluate(() => { const session = JSON.parse(sessionStorage.getItem('peremetours-session')!); session.user.role = 'User'; sessionStorage.setItem('peremetours-session', JSON.stringify(session)) })
  await page.reload()
  await expect(page).not.toHaveURL(/\/admin\/tour-pages$/)
})
