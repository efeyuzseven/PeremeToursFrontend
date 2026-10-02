import { expect, test, type Page } from '@playwright/test'

const date = '2099-10-03'
const prices = [
  { externalPriceId: 145, externalPassengerTypeId: 6, passengerType: 'Alkolsüz', passengerTypeEn: 'Without Alcohol', amount: 1150, currency: 'TRY', taxRate: 20 },
  { externalPriceId: 146, externalPassengerTypeId: 5, passengerType: 'Alkollü', passengerTypeEn: 'With Alcohol', amount: 1750, currency: 'TRY', taxRate: 20 },
]
const departures = [
  { externalId: 100, externalTripId: 0, externalPortId: 3, portName: '', date: '2020-01-01', time: '20:30:00' },
  { externalId: 8366, externalTripId: 0, externalPortId: 3, portName: '', date, time: '20:30:00' },
  { externalId: 8367, externalTripId: 0, externalPortId: 3, portName: '', date, time: '21:30:00' },
]

test.beforeEach(async ({ page }) => {
  // Keep these UI tests independent of third-party font network latency.
  await page.route('**/fonts.googleapis.com/**', (route) => route.abort())
  await page.route('**/fonts.gstatic.com/**', (route) => route.abort())
})

async function mockApi(page: Page, failAvailability = false) {
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/v1/tours') return route.fulfill({ json: [{ externalTourId: 2, categoryKey: 'turkish-night', categoryName: 'Türk Gecesi', name: 'Türk Gecesi', titleEn: 'Turkish Night', sortOrder: 0 }] })
    if (path.endsWith('/ports')) return route.fulfill({ json: [{ externalPortId: 3, name: 'Kabataş', displayOrder: 1 }] })
    if (path.endsWith('/availability')) return route.fulfill(failAvailability
      ? { status: 503, json: { title: 'Unavailable' } }
      : { json: { externalTourId: 2, tourName: 'Türk Gecesi', prices, departures, bookingNote: 'Transfer hizmeti bulunmamaktadır.', bookingNoteEn: 'No transfer service.' } })
    return route.fulfill({ status: 404, json: {} })
  })
}

async function openBooking(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.tour-card')).toHaveCount(1)
  await page.locator('.tour-card__footer button').first().click()
  await expect(page.getByRole('dialog').getByText('Alkolsüz', { exact: true })).toBeVisible()
}

async function fillContact(page: Page) {
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Ad soyad', { exact: true }).fill('Test Misafir')
  await dialog.getByLabel('E-posta', { exact: true }).fill('test@example.com')
  await dialog.getByLabel('Telefon', { exact: true }).fill('+90 555 123 45 67')
  await dialog.getByRole('checkbox').check()
}

test('mixed ticket types, valid date/time, contact details and a server-checked preview', async ({ page }, testInfo) => {
  await mockApi(page)
  await page.route('**/api/v1/tours/quote', async (route) => {
    const body = route.request().postDataJSON()
    expect(body).toEqual({ externalTourId: 2, externalDeparturePortId: 3, externalDepartureId: 8367, tourDate: date, tickets: [{ externalPriceId: 145, quantity: 2 }, { externalPriceId: 146, quantity: 1 }] })
    await route.fulfill({ json: { externalTourId: 2, tourName: 'Türk Gecesi', portName: 'Kabataş', tourDate: date, departureTime: '21:30:00', guestCount: 3, currency: 'TRY', amount: 4050, checkedAtUtc: new Date().toISOString(), tickets: [
      { externalPriceId: 145, ticketType: 'Alkolsüz', quantity: 2, unitAmount: 1150, amount: 2300 },
      { externalPriceId: 146, ticketType: 'Alkollü', quantity: 1, unitAmount: 1750, amount: 1750 },
    ] } })
  })
  await openBooking(page)
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Kalkış saati', exact: false }).click()
  const trigger = await dialog.locator('.reservation-select').last().boundingBox()
  const popup = await dialog.getByRole('listbox').boundingBox()
  expect(popup!.y).toBeGreaterThan(trigger!.y + trigger!.height)
  await dialog.getByRole('option', { name: '21:30' }).click()
  await dialog.getByRole('button', { name: 'Alkollü: Bilet artır' }).click()
  await expect(dialog.locator('.booking-total')).toContainText('4.050')
  await fillContact(page)
  const noOverflow = await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)
  expect(noOverflow).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('booking-details.png') })
  await dialog.getByRole('button', { name: 'Bilgileri kontrol et' }).click()
  await expect(dialog.getByText('Fiyat yeniden kontrol edildi')).toBeVisible()
  await expect(dialog.getByRole('heading', { level: 2 })).toBeInViewport({ ratio: 1 })
  await expect(dialog.getByText('Test Misafir')).toBeVisible()
  await expect(dialog.locator('.booking-total')).toContainText('4.050')
  await expect(dialog.getByText('21:30', { exact: true })).toBeVisible()
  await expect(dialog.getByText(/Bu adım rezervasyon oluşturmaz/)).toBeVisible()
  await dialog.getByRole('button', { name: 'Bilgileri düzenle' }).click()
  await expect(dialog.getByLabel('Ad soyad', { exact: true })).toHaveValue('Test Misafir')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('#root')).not.toHaveAttribute('inert')
})

test('live starting price follows the search date, with no demo discount', async ({ page }) => {
  await mockApi(page)
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.tour-card')).toHaveCount(1)
  await expect(page.locator('.tour-card .price')).toContainText('Bu tarihte sefer yok')
  await expect(page.locator('.tour-card del')).toHaveCount(0)
  // Change the homepage date to the API date without navigating through 73 calendar years.
  await page.clock.install({ time: new Date('2099-10-02T12:00:00+03:00') })
  await page.reload()
  await expect(page.locator('.tour-card .price')).toContainText('1.150')
})

test('missing API prices never fall back to made-up amounts', async ({ page }) => {
  await mockApi(page, true)
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.tour-card')).toHaveCount(1)
  await expect(page.locator('.tour-card .price')).toContainText('Fiyat alınamadı')
  await page.locator('.tour-card__footer button').click()
  await expect(page.getByRole('alert')).toContainText('Tur bilgileri şu anda alınamıyor')
  await expect(page.getByRole('button', { name: 'Bilgileri kontrol et' })).toHaveCount(0)
})

test('ticket quantities respect the 12-person limit and a minimum of one selection', async ({ page }) => {
  await mockApi(page)
  await openBooking(page)
  const dialog = page.getByRole('dialog')
  for (let i = 0; i < 10; i++) await dialog.getByRole('button', { name: 'Alkolsüz: Bilet artır' }).click()
  await expect(dialog.getByRole('button', { name: 'Alkollü: Bilet artır' })).toBeDisabled()
  for (let i = 0; i < 12; i++) await dialog.getByRole('button', { name: 'Alkolsüz: Bilet azalt' }).click()
  await expect(dialog.getByRole('button', { name: 'Bilgileri kontrol et' })).toBeDisabled()
})

test('English labels and upstream ticket translations are displayed', async ({ page }) => {
  await mockApi(page)
  await page.addInitScript(() => localStorage.setItem('pereme-language', 'en'))
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.tour-card')).toHaveCount(1)
  await page.locator('.tour-card__footer button').click()
  await expect(page.getByRole('dialog').getByText('Without Alcohol', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Full name', { exact: true })).toBeVisible()
  await expect(page.getByRole('dialog').getByText('No transfer service.')).toBeVisible()
})

test('changed prices are disclosed and the server total is used in the preview', async ({ page }) => {
  await mockApi(page)
  await page.route('**/api/v1/tours/quote', (route) => route.fulfill({ json: {
    externalTourId: 2, tourName: 'Türk Gecesi', portName: 'Kabataş', tourDate: date, departureTime: '20:30:00',
    guestCount: 2, amount: 2400, currency: 'TRY', checkedAtUtc: new Date().toISOString(),
    tickets: [{ externalPriceId: 145, ticketType: 'Alkolsüz', quantity: 2, unitAmount: 1200, amount: 2400 }],
  } }))
  await openBooking(page)
  await fillContact(page)
  await page.getByRole('button', { name: 'Bilgileri kontrol et' }).click()
  await expect(page.getByText('API fiyatı güncellendi.', { exact: false })).toBeVisible()
  await expect(page.getByRole('dialog').locator('.booking-total')).toContainText('2.400')
})

test('an invalidated departure produces an error rather than a booking confirmation', async ({ page }) => {
  await mockApi(page)
  await page.route('**/api/v1/tours/quote', (route) => route.fulfill({ status: 400, json: {
    detail: 'Seçilen tarih veya sefer artık kullanılamıyor. Lütfen yeniden seçin.',
  } }))
  await openBooking(page)
  await fillContact(page)
  await page.getByRole('button', { name: 'Bilgileri kontrol et' }).click()
  await expect(page.getByRole('alert')).toContainText('Seçilen tarih veya sefer artık kullanılamıyor')
  await expect(page.getByText('Fiyat yeniden kontrol edildi')).toHaveCount(0)
  await expect(page.getByLabel('Ad soyad', { exact: true })).toHaveValue('Test Misafir')
})
