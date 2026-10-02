import { mkdir } from 'node:fs/promises'
import { chromium, expect } from '@playwright/test'

// Read-only live smoke check: the quote endpoint does not create bookings or charge cards.
const browser = await chromium.launch({ channel: 'msedge', headless: true })
await mkdir('test-results', { recursive: true })
try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport, timezoneId: 'Europe/Istanbul' })
    const page = await context.newPage()
    const errors = []
    let paymentStarts = 0
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('request', (request) => { if (new URL(request.url()).pathname === '/api/v1/payments/tour/initialize') paymentStarts++ })
    await page.goto('https://d2bmjk2h6qp4lz.cloudfront.net', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('.tour-card__footer button').first()).toBeEnabled({ timeout: 30_000 })
    await expect(page.locator('.tour-card .price')).toHaveCount(0)
    await expect(page.locator('.final-cta__image')).toHaveCSS('background-image', /ad2ca4f6-d888-4621-b0c1-b3db5903f0ac\.webp/)
    const cardActions = await page.locator('.tour-card__footer').allTextContents()
    await expect(page.locator('.booking-field--guests strong')).toHaveText('1 kişi')
    await page.locator('.tour-card__footer button').first().click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.locator('.reservation-ticket-type').first()).toBeVisible({ timeout: 20_000 })
    await expect(dialog.locator('.reservation-ticket-type output').first()).toHaveText('1')
    await expect(dialog.locator('.reservation-passenger')).toHaveCount(1)
    await expect(dialog.locator('.reservation-passenger-list--scrollable')).toHaveCount(0)
    const increaseButtons = dialog.getByRole('button', { name: /Bilet artır/ })
    // Exercise mixed/multiple tickets only after verifying the one-guest default.
    await increaseButtons.first().click()
    await increaseButtons.nth(await increaseButtons.count() > 1 ? 1 : 0).click()
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
    await expect(dialog.getByLabel('Kart Numarası', { exact: true })).toHaveCount(0)
    await expect(dialog.locator('.reservation-payment')).toHaveCount(0)
    const passengerFormScroll = await dialog.locator('.reservation-passenger-list').evaluate((element) => element.scrollHeight > element.clientHeight && getComputedStyle(element).overflowY === 'auto')
    expect(passengerFormScroll).toBe(true)
    await dialog.getByRole('checkbox').check()
    const quoteResponse = page.waitForResponse((response) => response.url().endsWith('/api/v1/tours/quote'))
    await dialog.getByRole('button', { name: 'Bilgileri Kontrol et ve Ödemeye geç' }).click()
    const response = await quoteResponse
    expect(response.status()).toBe(200)
    const quote = await response.json()
    await expect(dialog.getByText('Fiyat yeniden kontrol edildi')).toBeVisible({ timeout: 20_000 })
    await expect(dialog.locator('.reservation-review__passengers')).not.toContainText('12345678901')
    const passengerReviewScroll = await dialog.locator('.reservation-passenger-list').evaluate((element) => element.scrollHeight > element.clientHeight && getComputedStyle(element).overflowY === 'auto')
    expect(passengerReviewScroll).toBe(true)
    const expectedTotal = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: quote.currency, maximumFractionDigits: 2 }).format(quote.amount)
    await expect(dialog.locator('.booking-total strong')).toHaveText(expectedTotal)
    const paymentAvailability = await page.request.get('https://api-peremetours-test.d1-tech.com/api/v1/payments/availability')
    expect(paymentAvailability.status()).toBe(200)
    const paymentSettings = await paymentAvailability.json()
    // Inspect active fields only. NEVER submit payment/card data from this read-only live check.
    let expirySelections = false
    if (paymentSettings.enabled) {
      await expect(dialog.getByLabel('Kart Numarası', { exact: true })).toBeEnabled()
      await expect(dialog.getByRole('button', { name: /^Güvenli ödeme yap/ })).toBeVisible()
      await expect(dialog).not.toContainText('Ödeme henüz etkin değil')
      for (const label of ['Son Kullanma Ayı', 'Son Kullanma Yılı']) {
        const trigger = dialog.getByRole('button', { name: new RegExp(`^${label}`) })
        await trigger.click()
        const list = dialog.getByRole('listbox')
        // Simulate the focus transition caused by a native scrollbar press, then scroll and select.
        await list.getByRole('option').first().evaluate((element) => element.blur())
        await expect(list).toBeVisible()
        await list.scrollIntoViewIfNeeded()
        await list.hover()
        await page.mouse.wheel(0, 900)
        await expect.poll(() => list.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
        const option = list.getByRole('option').last()
        const selection = await option.textContent()
        await option.click()
        await expect(trigger).toContainText(selection)
        await expect(trigger).toHaveAttribute('aria-expanded', 'false')
      }
      expirySelections = true
    }
    const overflow = await dialog.evaluate((element) => element.scrollWidth > element.clientWidth)
    await page.screenshot({ path: `test-results/live-booking-${viewport.width}.png` })
    console.log(JSON.stringify({ viewport, cardActions, guestCount: quote.guestCount, amount: quote.amount, paymentEnabled: paymentSettings.enabled, passengerFormScroll, passengerReviewScroll, expirySelections, paymentStarts, overflow, errors }))
    expect(paymentStarts).toBe(0)
    expect(overflow).toBe(false)
    expect(errors).toEqual([])
    await context.close()
  }
} finally {
  await browser.close()
}
