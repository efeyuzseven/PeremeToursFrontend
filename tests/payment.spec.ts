import { expect, test, type Page } from '@playwright/test'

const tourDate = '2099-10-03'
const order = 'PRM-MOCK-ORDER'
const frameUrl = '/api/v1/payments/tour/3d/11111111-1111-4111-8111-111111111111'
const quote = {
  externalTourId: 2, tourName: 'Türk Gecesi', portName: 'Kabataş', tourDate, departureTime: '20:30:00',
  guestCount: 3, amount: 4050, currency: 'TRY', tickets: [
    { externalPriceId: 145, ticketType: 'Alkolsüz', quantity: 2, unitAmount: 1150, amount: 2300 },
    { externalPriceId: 146, ticketType: 'Alkollü', quantity: 1, unitAmount: 1750, amount: 1750 },
  ],
}
const bankHtml = `<!doctype html><html><body><h1>Mock bank</h1><button onclick="parent.postMessage({ source: 'PeremeToursPayment', ticketCode: '${order}', status: 'success' }, '*')">Finish mock verification</button></body></html>`

async function mockCatalog(page: Page) {
  await page.route('**/fonts.googleapis.com/**', (route) => route.abort())
  await page.route('**/fonts.gstatic.com/**', (route) => route.abort())
  await page.route('**/api/v1/**', (route) => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/v1/payments/availability') return route.fulfill({ json: { enabled: true, provider: 'Ziraat' } })
    if (path === frameUrl) return route.fulfill({ contentType: 'text/html', body: bankHtml })
    if (path === '/api/v1/tours') return route.fulfill({ json: [{ externalTourId: 2, categoryKey: 'turkish-night', categoryName: 'Türk Gecesi', name: 'Türk Gecesi', titleEn: 'Turkish Night', sortOrder: 0 }] })
    if (path.endsWith('/ports')) return route.fulfill({ json: [{ externalPortId: 3, name: 'Kabataş', displayOrder: 1 }] })
    if (path.endsWith('/availability')) return route.fulfill({ json: {
      externalTourId: 2, tourName: 'Türk Gecesi', prices: quote.tickets.map((item) => ({ externalPriceId: item.externalPriceId, passengerType: item.ticketType, amount: item.unitAmount, currency: 'TRY' })),
      departures: [{ externalId: 8366, externalTripId: 0, externalPortId: 3, date: tourDate, time: '20:30:00' }],
    } })
    if (path === '/api/v1/tours/quote') return route.fulfill({ json: quote })
    return route.fulfill({ status: 404, json: {} })
  })
}

async function openReview(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.tour-card')).toHaveCount(1)
  await page.locator('.tour-card__footer button').click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('button', { name: 'Alkollü: Bilet artır' })).toBeVisible()
  await dialog.getByRole('button', { name: 'Alkollü: Bilet artır' }).click()
  await dialog.getByLabel('Ad soyad', { exact: true }).fill('Test Misafir')
  await dialog.getByLabel('E-posta', { exact: true }).fill('test@example.com')
  await dialog.getByLabel('Telefon', { exact: true }).fill('+905551234567')
  for (const passenger of await dialog.locator('.reservation-passenger').all()) {
    await passenger.getByLabel('Ad', { exact: true }).fill('Deneme')
    await passenger.getByLabel('Soyad', { exact: true }).fill('Yolcu')
    await passenger.getByRole('button', { name: /^Cinsiyet/ }).click()
    await passenger.getByRole('option', { name: 'Erkek', exact: true }).click()
    await passenger.getByLabel('T.C. Kimlik / Pasaport No', { exact: true }).fill('12345678901')
    await passenger.getByLabel('Doğum Tarihi', { exact: true }).fill('1990-01-01')
  }
  await expect(dialog.locator('.reservation-payment')).toHaveCount(0)
  await expect(dialog.getByLabel('Kart Numarası', { exact: true })).toHaveCount(0)
  await dialog.getByRole('checkbox').check()
  await dialog.getByRole('button', { name: 'Bilgileri Kontrol et ve Ödemeye geç' }).click()
  await expect(dialog.getByLabel('Kart Numarası', { exact: true })).toBeEnabled()
  await expect(dialog).not.toContainText('Ödeme henüz etkin değil')
}

async function fillCard(page: Page, number = '4111111111111111') {
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Kart Üzerindeki İsim', { exact: true }).fill('TEST USER')
  await dialog.getByLabel('Kart Numarası', { exact: true }).fill(number)
  await dialog.getByRole('button', { name: /^Son Kullanma Ayı/ }).click()
  await dialog.getByRole('option', { name: '12', exact: true }).click()
  await dialog.getByRole('button', { name: /^Son Kullanma Yılı/ }).click()
  await dialog.getByRole('option', { name: String(new Date().getFullYear() + 1), exact: true }).click()
  await dialog.getByLabel('CVC', { exact: true }).fill('123')
  await dialog.getByRole('checkbox').check()
}

const paidStatus = (ticketingStatus = 'Issued') => ({ ticketCode: order, amount: 4050, currency: 'TRY', paymentStatus: 'Paid', ticketingStatus,
  tickets: ticketingStatus === 'Issued' ? [{ pnr: 'MOCK-PNR-1', ticketGuid: 'mock-ticket-1' }, { pnr: 'MOCK-PNR-2', ticketGuid: 'mock-ticket-2' }, { pnr: 'MOCK-PNR-3', ticketGuid: 'mock-ticket-3' }] : [] })

test('expiry lists stay open when scrollbar interaction blurs the focused option', async ({ page }) => {
  await mockCatalog(page)
  await openReview(page)
  const dialog = page.getByRole('dialog')
  for (const field of [
    { label: 'Son Kullanma Ayı', selection: '12' },
    { label: 'Son Kullanma Yılı', selection: String(new Date().getFullYear() + 20) },
  ]) {
    const trigger = dialog.getByRole('button', { name: new RegExp(`^${field.label}`) })
    await trigger.click()
    const list = dialog.getByRole('listbox')
    await expect(list.getByRole('option').first()).toBeFocused()
    // Native scrollbar/background clicks can move focus to the document with relatedTarget=null.
    await list.getByRole('option').first().evaluate((element) => (element as HTMLElement).blur())
    await expect(list).toBeVisible()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await list.scrollIntoViewIfNeeded()
    await list.hover()
    await page.mouse.wheel(0, 900)
    await expect.poll(() => list.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
    await list.getByRole('option', { name: field.selection, exact: true }).click()
    await expect(trigger).toContainText(field.selection)
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  }
  await expect(dialog.locator('iframe')).toHaveCount(0)
})

test('expiry list scrollbars support native dragging and keep selection available', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Native desktop scrollbar dragging; mobile scrolling is covered by the other expiry test.')
  await mockCatalog(page)
  await openReview(page)
  // Force a classic scrollbar so the test exercises the gutter rather than an overlay/option.
  await page.addStyleTag({ content: '.reservation-select__options { scrollbar-width: auto; scrollbar-gutter: stable; } .reservation-select__options::-webkit-scrollbar { width: 16px; }' })
  const dialog = page.getByRole('dialog')
  for (const label of ['Son Kullanma Ayı', 'Son Kullanma Yılı']) {
    const trigger = dialog.getByRole('button', { name: new RegExp(`^${label}`) })
    await trigger.click()
    const list = dialog.getByRole('listbox')
    await list.scrollIntoViewIfNeeded()
    const bar = await list.evaluate((element) => {
      const bounds = element.getBoundingClientRect()
      const gutter = (element as HTMLElement).offsetWidth - element.clientWidth - element.clientLeft * 2
      return { x: bounds.right - element.clientLeft - gutter / 2, top: bounds.top + 20, bottom: bounds.bottom - 15, gutter }
    })
    expect(bar.gutter).toBeGreaterThan(2)
    await page.mouse.move(bar.x, bar.top)
    await page.mouse.down()
    await page.mouse.move(bar.x, bar.bottom, { steps: 10 })
    await page.mouse.up()
    await expect(list).toBeVisible()
    await expect(list).toBeFocused()
    await expect.poll(() => list.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
    const option = list.getByRole('option').last()
    const selection = await option.textContent()
    await option.click()
    await expect(trigger).toContainText(selection!)
  }
})

test('expiry lists still close on outside clicks, Tab and Escape, and allow keyboard selection', async ({ page }) => {
  await mockCatalog(page)
  await openReview(page)
  const dialog = page.getByRole('dialog')
  const trigger = dialog.getByRole('button', { name: /^Son Kullanma Ayı/ })
  await trigger.click()
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  await expect(trigger).toContainText('12')
  await expect(dialog.getByRole('listbox')).toHaveCount(0)
  await trigger.click()
  await dialog.getByRole('listbox').focus()
  await page.keyboard.press('ArrowUp')
  await expect(dialog.getByRole('option', { name: '12', exact: true })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeVisible()
  await expect(trigger).toBeFocused()
  await expect(dialog.getByRole('listbox')).toHaveCount(0)
  await trigger.click()
  await page.keyboard.press('Tab')
  await expect(dialog.getByRole('listbox')).toHaveCount(0)
  await trigger.click()
  // Clicking non-focusable content must dismiss too, independently of the blur handler.
  await dialog.getByRole('heading', { name: 'Ödeme Bilgileri', exact: true }).click()
  await expect(dialog.getByRole('listbox')).toHaveCount(0)
})

test('payment fields appear only after the current booking details have been checked', async ({ page }) => {
  await mockCatalog(page)
  let releaseQuote!: () => void
  const quoteGate = new Promise<void>((resolve) => { releaseQuote = resolve })
  await page.route('**/api/v1/tours/quote', async (route) => {
    await quoteGate
    await route.fulfill({ json: quote })
  })
  const openingReview = openReview(page)
  const dialog = page.getByRole('dialog')
  try {
    await expect(dialog.getByRole('button', { name: 'Fiyat kontrol ediliyor…' })).toBeDisabled({ timeout: 45_000 })
    await expect(dialog.locator('.reservation-payment')).toHaveCount(0)
    await expect(dialog.getByLabel('Kart Numarası', { exact: true })).toHaveCount(0)
  } finally {
    releaseQuote()
    await openingReview
  }
  await expect(dialog.getByRole('heading', { name: 'Ödeme Bilgileri', exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Bilgileri düzenle' }).click()
  await expect(dialog.getByLabel('Ad soyad', { exact: true })).toHaveValue('Test Misafir')
  await expect(dialog.locator('.reservation-payment')).toHaveCount(0)
})

test('payment sends mixed tickets and passenger data once, sandboxed bank result is checked on the server', async ({ page }, testInfo) => {
  await mockCatalog(page)
  let initializations = 0
  let completed = false
  let attemptId = ''
  await page.route('**/payments/tour/initialize', async (route) => {
    initializations++
    const body = route.request().postDataJSON()
    expect(body.expectedAmount).toBe(4050)
    expect(body.tickets).toEqual([{ externalPriceId: 145, quantity: 2 }, { externalPriceId: 146, quantity: 1 }])
    expect(body.passengers.map((item: { externalPriceId: number }) => item.externalPriceId)).toEqual([145, 145, 146])
    expect(body.card.number).toBe('4111111111111111')
    expect(body.privacyNoticeAccepted).toBe(true)
    expect(body.externalTripId).toBeUndefined()
    attemptId = body.attemptId
    await route.fulfill({ json: { ticketId: 'mock', ticketCode: order, amount: 4050, currency: 'TRY', threeDSecureUrl: frameUrl } })
  })
  await page.route('**/payments/tour/status', (route) => {
    expect(route.request().headers()['x-payment-token']).toBe(attemptId)
    return route.fulfill({ json: completed ? paidStatus() : { ticketCode: order, paymentStatus: 'Pending', ticketingStatus: 'Pending', tickets: [] } })
  })
  await openReview(page); await fillCard(page)
  await page.locator('.reservation-payment-form').screenshot({ path: testInfo.outputPath('payment-active.png') })
  await page.locator('.reservation-payment-form').evaluate((element) => { (element as HTMLFormElement).requestSubmit(); (element as HTMLFormElement).requestSubmit() })
  await expect(page.getByTitle('3D Secure doğrulaması')).toBeVisible()
  await expect(page.getByTitle('3D Secure doğrulaması')).toHaveAttribute('sandbox', 'allow-forms allow-scripts allow-same-origin')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(1)
  await page.evaluate((code) => window.postMessage({ source: 'PeremeToursPayment', ticketCode: code, status: 'success' }, '*'), order)
  await expect(page.getByText('Biletlerin hazır!')).toHaveCount(0)
  const stored = await page.evaluate(() => JSON.stringify({ session: { ...sessionStorage }, local: { ...localStorage } }))
  expect(stored).not.toContain('411111'); expect(stored).not.toContain('12345678901')
  completed = true
  await page.frameLocator('iframe').getByRole('button', { name: 'Finish mock verification' }).click()
  await expect(page.getByText('Biletlerin hazır!')).toBeVisible()
  await expect(page.locator('.reservation-issued-tickets > div')).toHaveCount(3)
  expect(initializations).toBe(1)
  expect(await page.getByRole('dialog').evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(false)
  await page.getByRole('button', { name: 'Tamam, turlara dön' }).click()
  expect(await page.evaluate(() => sessionStorage.getItem('pereme-payment-attempt'))).toBeNull()
})

test('invalid card checksum never calls the payment endpoint', async ({ page }) => {
  await mockCatalog(page)
  let calls = 0
  page.on('request', (request) => { if (request.url().endsWith('/payments/tour/initialize')) calls++ })
  await openReview(page); await fillCard(page, '4111111111111112')
  await page.getByRole('button', { name: /^Güvenli ödeme yap/ }).click()
  await expect(page.getByRole('alert')).toContainText('Kart numarası')
  expect(calls).toBe(0)
})

test('bank decline shows failure and permits an explicit retry with cleared card fields', async ({ page }) => {
  await mockCatalog(page)
  await page.route('**/payments/tour/initialize', (route) => route.fulfill({ json: { ticketCode: order, threeDSecureUrl: frameUrl } }))
  await page.route('**/payments/tour/status', (route) => route.fulfill({ json: { ticketCode: order, paymentStatus: 'Failed', ticketingStatus: 'Pending', tickets: [] } }))
  await openReview(page); await fillCard(page)
  await page.getByRole('button', { name: /^Güvenli ödeme yap/ }).click()
  await page.frameLocator('iframe').getByRole('button').click()
  await expect(page.getByText('Ödeme tamamlanamadı', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Tekrar dene', exact: true }).click()
  await expect(page.getByLabel('Kart Numarası', { exact: true })).toHaveValue('')
  await expect(page.getByLabel('CVC', { exact: true })).toHaveValue('')
})

test('price change prevents payment and requires reviewing the selection again', async ({ page }) => {
  await mockCatalog(page)
  await page.route('**/payments/tour/initialize', (route) => route.fulfill({ status: 409, json: { detail: 'Fiyat değişti' } }))
  await openReview(page); await fillCard(page)
  await page.getByRole('button', { name: /^Güvenli ödeme yap/ }).click()
  await expect(page.getByRole('alert')).toContainText('güncel tutarı yeniden kontrol')
  await expect(page.getByRole('button', { name: 'Bilgileri düzenle' })).toBeEnabled()
  await expect(page.locator('iframe')).toHaveCount(0)
})

test('paid but unissued tickets are not shown as confirmed and cannot be charged again', async ({ page }) => {
  await mockCatalog(page)
  await page.route('**/payments/tour/initialize', (route) => route.fulfill({ json: { ticketCode: order, threeDSecureUrl: frameUrl } }))
  await page.route('**/payments/tour/status', (route) => route.fulfill({ json: paidStatus('ReviewRequired') }))
  await openReview(page); await fillCard(page)
  await page.getByRole('button', { name: /^Güvenli ödeme yap/ }).click()
  await page.frameLocator('iframe').getByRole('button').click()
  await expect(page.getByText('Ödemen alındı', { exact: true })).toBeVisible()
  await expect(page.getByText('Biletlerin hazır!')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^Güvenli ödeme yap/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Bilgileri düzenle' })).toBeDisabled()
})

test('network ambiguity keeps the attempt token and recovers status after a page refresh', async ({ page }) => {
  await mockCatalog(page)
  let calls = 0
  await page.route('**/payments/tour/initialize', (route) => { calls++; return route.abort() })
  await page.route('**/payments/tour/status', (route) => route.fulfill({ json: { ticketCode: order, paymentStatus: 'ReviewRequired', ticketingStatus: 'Pending', tickets: [] } }))
  await openReview(page); await fillCard(page)
  await page.getByRole('button', { name: /^Güvenli ödeme yap/ }).click()
  await expect(page.getByText('Ödeme sonucu kontrol ediliyor', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Güvenli ödeme yap/ })).toHaveCount(0)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.locator('.tour-card')).toHaveCount(1)
  await page.locator('.tour-card__footer button').click()
  await page.getByRole('button', { name: 'Ödeme sonucunu kontrol et' }).click()
  await expect(page.getByText(order, { exact: true })).toBeVisible()
  await expect(page.getByLabel('Kart Numarası', { exact: true })).toHaveCount(0)
  expect(calls).toBe(1)
})
