import { expect, test, type Locator, type Page } from '@playwright/test'

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

async function openBooking(page: Page, guests = 1) {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.tour-card')).toHaveCount(1)
  await expect(page.locator('.booking-field--guests strong')).toHaveText('1 kişi')
  await page.locator('.tour-card__footer button').first().click()
  await expect(page.getByRole('dialog').locator('.reservation-ticket-types').getByText('Alkolsüz', { exact: true })).toBeVisible()
  for (let i = 1; i < guests; i++) await page.getByRole('dialog').getByRole('button', { name: 'Alkolsüz: Bilet artır' }).click()
}

test('booking starts with one ticket and one passenger from every booking entry point', async ({ page }) => {
  await mockApi(page)
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.tour-card')).toHaveCount(1)
  await expect(page.locator('.booking-field--guests strong')).toHaveText('1 kişi')
  for (const action of [
    page.locator('.tour-card__footer button').first(),
    page.locator('.service-card').first().getByRole('button', { name: 'Rezervasyon yap', exact: true }),
    page.locator('.final-cta button'),
  ]) {
    await action.click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.locator('.reservation-ticket-type output').first()).toHaveText('1')
    await expect(dialog.locator('.reservation-ticket-type output').last()).toHaveText('0')
    await expect(dialog.locator('.reservation-passenger')).toHaveCount(1)
    await expect(dialog.locator('.booking-total')).toContainText('1.150')
    await expect(dialog.locator('.reservation-passenger-list--scrollable')).toHaveCount(0)
    await dialog.getByRole('button', { name: 'Alkolsüz: Bilet artır' }).click()
    await expect(dialog.locator('.reservation-passenger')).toHaveCount(2)
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
  }
})

test('an explicitly chosen guest count is preserved when booking opens', async ({ page, isMobile }) => {
  await mockApi(page)
  const originalViewport = page.viewportSize()!
  // The hero stepper is desktop-only; also check that resizing preserves its selection.
  if (isMobile) await page.setViewportSize({ width: 1024, height: originalViewport.height })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.tour-card')).toHaveCount(1)
  await expect(page.locator('.booking-field--guests strong')).toHaveText('1 kişi')
  for (let i = 1; i < 3; i++) await page.getByRole('button', { name: 'Misafir artır', exact: true }).click()
  await expect(page.locator('.booking-field--guests strong')).toHaveText('3 kişi')
  if (isMobile) await page.setViewportSize(originalViewport)
  await page.locator('.tour-card__footer button').first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.locator('.reservation-ticket-type output').first()).toHaveText('3')
  await expect(dialog.locator('.reservation-ticket-type output').last()).toHaveText('0')
  await expect(dialog.locator('.reservation-passenger')).toHaveCount(3)
  await expect(dialog.locator('.booking-total')).toContainText('3.450')
})

async function fillContact(page: Page) {
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Ad soyad', { exact: true }).fill('Test Misafir')
  await dialog.getByLabel('E-posta', { exact: true }).fill('test@example.com')
  await dialog.getByLabel('Telefon', { exact: true }).fill('+90 555 123 45 67')
  const passengers = dialog.locator('.reservation-passenger')
  for (let i = 0; i < await passengers.count(); i++) {
    const passenger = passengers.nth(i)
    await passenger.getByLabel('Ad', { exact: true }).fill('Deneme')
    await passenger.getByLabel('Soyad', { exact: true }).fill(`Yolcu ${i + 1}`)
    await passenger.getByRole('button', { name: /^Cinsiyet/ }).click()
    await passenger.getByRole('option', { name: 'Erkek', exact: true }).click()
    await passenger.getByLabel('T.C. Kimlik / Pasaport No', { exact: true }).fill('12345678901')
    await passenger.getByLabel('Doğum Tarihi', { exact: true }).fill('1990-01-01')
  }
  await dialog.getByRole('checkbox').check()
}

async function expectIndependentPassengerScroll(page: Page, list: Locator) {
  const dialog = page.getByRole('dialog')
  await expect(list).toHaveAttribute('role', 'region')
  await expect(list).toHaveAttribute('tabindex', '0')
  await expect(list).toHaveCSS('overflow-y', 'auto')
  expect(await list.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true)
  await list.scrollIntoViewIfNeeded()
  await list.evaluate((element) => { element.scrollTop = 0; (element as HTMLElement).focus({ preventScroll: true }) })
  const outerScroll = await dialog.evaluate((element) => element.scrollTop)
  await list.hover()
  await page.mouse.wheel(0, 200)
  await expect.poll(() => list.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
  await expect.poll(() => dialog.evaluate((element) => element.scrollTop)).toBeCloseTo(outerScroll, 0)
  await page.keyboard.press('End')
  await expect.poll(() => list.evaluate((element) => Math.abs(element.scrollHeight - element.clientHeight - element.scrollTop))).toBeLessThan(2)
  // At the end of the list, wheel gestures must not spill over into the drawer.
  await page.mouse.wheel(0, 300)
  await expect.poll(() => dialog.evaluate((element) => element.scrollTop)).toBeCloseTo(outerScroll, 0)
}

test('multiple passengers scroll independently in both the form and the payment summary', async ({ page }, testInfo) => {
  await mockApi(page)
  await page.route('**/api/v1/tours/quote', (route) => route.fulfill({ json: {
    externalTourId: 2, tourName: 'Türk Gecesi', portName: 'Kabataş', tourDate: date, departureTime: '20:30:00',
    guestCount: 2, amount: 2300, currency: 'TRY', checkedAtUtc: new Date().toISOString(),
    tickets: [{ externalPriceId: 145, ticketType: 'Alkolsüz', quantity: 2, unitAmount: 1150, amount: 2300 }],
  } }))
  await openBooking(page, 2)
  const dialog = page.getByRole('dialog')
  await expectIndependentPassengerScroll(page, dialog.locator('.reservation-passengers .reservation-passenger-list'))
  await fillContact(page)
  await dialog.getByRole('button', { name: 'Bilgileri Kontrol et ve Ödemeye geç' }).click()
  await expect(dialog.getByText('Fiyat yeniden kontrol edildi')).toBeVisible()
  await expectIndependentPassengerScroll(page, dialog.locator('.reservation-review__passengers .reservation-passenger-list'))
  await dialog.locator('.reservation-review__passengers').screenshot({ path: testInfo.outputPath('passengers-scroll.png') })
  expect(await dialog.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(false)
})

test('a single passenger has no nested scroll area in either booking step', async ({ page }) => {
  await mockApi(page)
  await page.route('**/api/v1/tours/quote', (route) => route.fulfill({ json: {
    externalTourId: 2, tourName: 'Türk Gecesi', portName: 'Kabataş', tourDate: date, departureTime: '20:30:00',
    guestCount: 1, amount: 1150, currency: 'TRY', checkedAtUtc: new Date().toISOString(),
    tickets: [{ externalPriceId: 145, ticketType: 'Alkolsüz', quantity: 1, unitAmount: 1150, amount: 1150 }],
  } }))
  await openBooking(page)
  const dialog = page.getByRole('dialog')
  await expect(dialog.locator('.reservation-passenger')).toHaveCount(1)
  await expect(dialog.locator('.reservation-passenger-list')).toHaveCSS('max-height', 'none')
  await expect(dialog.locator('.reservation-passenger-list--scrollable')).toHaveCount(0)
  await fillContact(page)
  await dialog.getByRole('button', { name: 'Bilgileri Kontrol et ve Ödemeye geç' }).click()
  await expect(dialog.getByText('Fiyat yeniden kontrol edildi')).toBeVisible()
  await expect(dialog.locator('.reservation-review__passenger')).toHaveCount(1)
  await expect(dialog.locator('.reservation-passenger-list')).toHaveCSS('max-height', 'none')
  await expect(dialog.locator('.reservation-passenger-list--scrollable')).toHaveCount(0)
})

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
  await openBooking(page, 2)
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Kalkış saati', exact: false }).click()
  const trigger = await dialog.locator('.reservation-fields .reservation-select').last().boundingBox()
  const popup = await dialog.getByRole('listbox').boundingBox()
  expect(popup!.y).toBeGreaterThan(trigger!.y + trigger!.height)
  await dialog.getByRole('option', { name: '21:30' }).click()
  await dialog.getByRole('button', { name: 'Alkollü: Bilet artır' }).click()
  await expect(dialog.locator('.booking-total')).toContainText('4.050')
  await fillContact(page)
  const noOverflow = await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)
  expect(noOverflow).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('booking-details.png') })
  await expect(dialog.locator('.reservation-payment')).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Bilgileri Kontrol et ve Ödemeye geç' }).click()
  await expect(dialog.getByText('Fiyat yeniden kontrol edildi')).toBeVisible()
  await expect(dialog.getByRole('heading', { level: 2 })).toBeInViewport({ ratio: 1 })
  await expect(dialog.getByText('Test Misafir')).toBeVisible()
  await expect(dialog.locator('.reservation-review__passenger')).toHaveCount(3)
  await expect(dialog.locator('.reservation-review__passengers')).not.toContainText('12345678901')
  await expect(dialog.locator('.booking-total')).toContainText('4.050')
  await expect(dialog.getByText('21:30', { exact: true })).toBeVisible()
  await expect(dialog.getByText(/Bu adım rezervasyon oluşturmaz/)).toBeVisible()
  await dialog.getByRole('button', { name: 'Bilgileri düzenle' }).click()
  await expect(dialog.getByLabel('Ad soyad', { exact: true })).toHaveValue('Test Misafir')
  await expect(dialog.locator('.reservation-payment')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('#root')).not.toHaveAttribute('inert')
})

test('tour cards show only the booking action and fetch prices after it is clicked', async ({ page }) => {
  await mockApi(page)
  const availabilityRequests: string[] = []
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.endsWith('/availability')) availabilityRequests.push(request.url())
  })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.tour-card')).toHaveCount(1)
  await expect(page.locator('.tour-card__footer')).toHaveText('Rezervasyon Yap')
  await expect(page.locator('.tour-card .price')).toHaveCount(0)
  await expect(page.locator('.tour-card')).not.toContainText('₺')
  await expect(page.locator('.tour-card del')).toHaveCount(0)
  expect(availabilityRequests).toHaveLength(0)
  await page.locator('.tour-card__footer button').click()
  await expect(page.getByRole('dialog').locator('.reservation-ticket-types')).toContainText('1.150')
  expect(availabilityRequests.length).toBeGreaterThan(0)
})

test('missing API prices never fall back to made-up amounts', async ({ page }) => {
  await mockApi(page, true)
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.tour-card')).toHaveCount(1)
  await expect(page.locator('.tour-card .price')).toHaveCount(0)
  await expect(page.locator('.tour-card__footer')).toHaveText('Rezervasyon Yap')
  await page.locator('.tour-card__footer button').click()
  await expect(page.getByRole('alert')).toContainText('Tur bilgileri şu anda alınamıyor')
  await expect(page.getByRole('button', { name: 'Bilgileri Kontrol et ve Ödemeye geç' })).toHaveCount(0)
})

test('ticket quantities respect the 12-person limit and a minimum of one selection', async ({ page }) => {
  await mockApi(page)
  await openBooking(page)
  const dialog = page.getByRole('dialog')
  for (let i = 0; i < 11; i++) await dialog.getByRole('button', { name: 'Alkolsüz: Bilet artır' }).click()
  await expect(dialog.getByRole('button', { name: 'Alkollü: Bilet artır' })).toBeDisabled()
  for (let i = 0; i < 12; i++) await dialog.getByRole('button', { name: 'Alkolsüz: Bilet azalt' }).click()
  await expect(dialog.getByRole('button', { name: 'Bilgileri Kontrol et ve Ödemeye geç' })).toBeDisabled()
})

test('English labels and upstream ticket translations are displayed', async ({ page }) => {
  await mockApi(page)
  await page.addInitScript(() => localStorage.setItem('pereme-language', 'en'))
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.tour-card')).toHaveCount(1)
  await page.locator('.tour-card__footer button').click()
  await expect(page.getByRole('dialog').locator('.reservation-ticket-types').getByText('Without Alcohol', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Full name', { exact: true })).toBeVisible()
  await expect(page.getByRole('dialog').getByText('No transfer service.')).toBeVisible()
  await expect(page.getByRole('dialog').getByLabel('First name', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('dialog').getByLabel('Date of birth', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('dialog').getByLabel('Card number', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Review details and proceed to payment', exact: true })).toBeVisible()
})

test('changed prices are disclosed and the server total is used in the preview', async ({ page }) => {
  await mockApi(page)
  await page.route('**/api/v1/tours/quote', (route) => route.fulfill({ json: {
    externalTourId: 2, tourName: 'Türk Gecesi', portName: 'Kabataş', tourDate: date, departureTime: '20:30:00',
    guestCount: 2, amount: 2400, currency: 'TRY', checkedAtUtc: new Date().toISOString(),
    tickets: [{ externalPriceId: 145, ticketType: 'Alkolsüz', quantity: 2, unitAmount: 1200, amount: 2400 }],
  } }))
  await openBooking(page, 2)
  await fillContact(page)
  await page.getByRole('button', { name: 'Bilgileri Kontrol et ve Ödemeye geç' }).click()
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
  await page.getByRole('button', { name: 'Bilgileri Kontrol et ve Ödemeye geç' }).click()
  await expect(page.getByRole('alert')).toContainText('Seçilen tarih veya sefer artık kullanılamıyor')
  await expect(page.getByText('Fiyat yeniden kontrol edildi')).toHaveCount(0)
  await expect(page.getByLabel('Ad soyad', { exact: true })).toHaveValue('Test Misafir')
  await expect(page.getByRole('dialog').locator('.reservation-payment')).toHaveCount(0)
})

test('passenger details follow ticket counts without reusing removed personal details', async ({ page }) => {
  await mockApi(page)
  await openBooking(page, 2)
  const dialog = page.getByRole('dialog')
  const passengers = dialog.locator('.reservation-passenger')
  await expect(passengers).toHaveCount(2)
  await passengers.nth(0).getByLabel('Ad', { exact: true }).fill('Deneme')
  await passengers.nth(1).getByLabel('Ad', { exact: true }).fill('Silinecek')
  await dialog.getByRole('button', { name: 'Alkolsüz: Bilet azalt' }).click()
  await expect(passengers).toHaveCount(1)
  await dialog.getByRole('button', { name: 'Alkolsüz: Bilet artır' }).click()
  await expect(passengers).toHaveCount(2)
  await expect(passengers.nth(0).getByLabel('Ad', { exact: true })).toHaveValue('Deneme')
  await expect(passengers.nth(1).getByLabel('Ad', { exact: true })).toHaveValue('')
  await dialog.getByRole('button', { name: 'Alkollü: Bilet artır' }).click()
  await expect(passengers).toHaveCount(3)
  await expect(passengers.nth(2).locator('legend')).toContainText('Alkollü')
})

test('foreign passengers use passports, future birth dates are invalid, and payment fields stay hidden', async ({ page }, testInfo) => {
  await mockApi(page)
  await openBooking(page)
  const dialog = page.getByRole('dialog')
  const passenger = dialog.locator('.reservation-passenger').first()
  await passenger.getByLabel('T.C. Kimlik / Pasaport No', { exact: true }).fill('12345678901')
  await passenger.getByRole('button', { name: /^Uyruk/ }).click()
  await passenger.getByRole('option', { name: 'Yabancı', exact: true }).click()
  await expect(passenger.getByLabel('T.C. Kimlik / Pasaport No', { exact: true })).toHaveValue('')
  await passenger.getByLabel('T.C. Kimlik / Pasaport No', { exact: true }).fill('TEST12345')
  await passenger.getByLabel('Doğum Tarihi', { exact: true }).fill('2999-01-01')
  expect(await passenger.getByLabel('Doğum Tarihi', { exact: true }).evaluate((element) => (element as HTMLInputElement).validity.rangeOverflow)).toBe(true)
  for (const label of ['Kart Üzerindeki İsim', 'Kart Numarası', 'CVC']) {
    await expect(dialog.getByLabel(label, { exact: true })).toHaveCount(0)
  }
  await expect(dialog.getByRole('button', { name: /^Son Kullanma Ayı/ })).toHaveCount(0)
  await expect(dialog.getByRole('button', { name: /^Son Kullanma Yılı/ })).toHaveCount(0)
  await passenger.screenshot({ path: testInfo.outputPath('passenger-fields.png') })
  await expect(dialog.locator('.reservation-payment')).toHaveCount(0)
})

test('missing passenger gender blocks the quote request', async ({ page }) => {
  await mockApi(page)
  await openBooking(page, 2)
  await fillContact(page)
  // Removing and re-adding the second ticket resets that passenger, including gender.
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Alkolsüz: Bilet azalt' }).click()
  await dialog.getByRole('button', { name: 'Alkolsüz: Bilet artır' }).click()
  const passenger = dialog.locator('.reservation-passenger').last()
  await passenger.getByLabel('Ad', { exact: true }).fill('Deneme')
  await passenger.getByLabel('Soyad', { exact: true }).fill('Eksik')
  await passenger.getByLabel('T.C. Kimlik / Pasaport No', { exact: true }).fill('12345678901')
  await passenger.getByLabel('Doğum Tarihi', { exact: true }).fill('1990-01-01')
  let quoteRequests = 0
  page.on('request', (request) => { if (request.url().endsWith('/tours/quote')) quoteRequests++ })
  await dialog.getByRole('button', { name: 'Bilgileri Kontrol et ve Ödemeye geç' }).click()
  await expect(dialog.getByRole('alert')).toContainText('Tüm yolcuların bilgilerini kontrol et')
  await expect(dialog.locator('.reservation-payment')).toHaveCount(0)
  expect(quoteRequests).toBe(0)
})
