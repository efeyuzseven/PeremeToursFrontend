import { expect, test, type Page } from '@playwright/test'

const prices = [
  { externalPriceId: 234, externalPassengerTypeId: 8, passengerType: 'İkramsız', passengerTypeEn: 'Without Refreshments', amount: 350, currency: 'TRY', taxRate: 20 },
  { externalPriceId: 235, externalPassengerTypeId: 7, passengerType: 'İkramlı', passengerTypeEn: 'Meal Included', amount: 750, currency: 'TRY', taxRate: 20 },
]
const departures: Record<string, object[]> = {
  3: [
    { externalId: 9863, externalTripId: 9863, externalPortId: 3, portName: 'Kabataş', date: '2099-11-16', time: '16:30:00' },
    { externalId: 9865, externalTripId: 9865, externalPortId: 3, portName: 'Kabataş', date: '2099-11-17', time: '16:30:00' },
  ],
  2: [
    { externalId: 9906, externalTripId: 9906, externalPortId: 2, portName: 'Beşiktaş', date: '2099-11-16', time: '16:40:00' },
    { externalId: 9908, externalTripId: 9908, externalPortId: 2, portName: 'Beşiktaş', date: '2099-11-17', time: '16:40:00' },
    { externalId: 9909, externalTripId: 9909, externalPortId: 2, portName: 'Beşiktaş', date: '2099-11-17', time: '18:10:00' },
  ],
}
const text = (title: string) => ({ eyebrow: 'SUNSET', title, intro: 'Gün batımı.', bookingLabel: 'Rezervasyon yap', toursHeading: 'İlgili turlar', seoDescription: 'Sunset', bookingNotes: null, details: null })

test.beforeEach(async ({ page }) => {
  await page.route('**/fonts.googleapis.com/**', (route) => route.abort())
  await page.route('**/fonts.gstatic.com/**', (route) => route.abort())
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname
    if (path === '/api/v1/tours') return route.fulfill({ json: [{ externalTourId: 3, categoryKey: 'sunset', categoryName: 'Sunset', name: 'Sunset - Gün Batımı Turu', sortOrder: 0 }] })
    if (path === '/api/v1/tour-pages/tour-3') return route.fulfill({ json: { key: 'tour-3', categoryKey: 'sunset', externalTourId: 3, sourceName: 'Sunset', isCustomized: true, updatedAtUtc: null,
      document: { heroLayout: 'cover', heroImageUrl: null, tr: text('Sunset'), en: text('Sunset'), sections: [] } } })
    if (path === '/api/v1/tours/3/ports') return route.fulfill({ json: [{ externalPortId: 3, name: 'Kabataş', displayOrder: 1 }, { externalPortId: 2, name: 'Beşiktaş', displayOrder: 2 }] })
    if (path === '/api/v1/tours/3/availability') {
      const port = url.searchParams.get('departurePortId') ?? ''
      return route.fulfill({ json: { externalTourId: 3, tourName: 'Sunset - Gün Batımı Turu', prices, departures: departures[port] ?? [] } })
    }
    return route.fulfill({ status: 404, json: {} })
  })
})

async function dialogFor(page: Page, query: string) {
  await page.goto(`/tur/3?${query}`, { waitUntil: 'domcontentloaded' })
  const dialog = page.getByRole('dialog')
  await expect(dialog.locator('.reservation-ticket-types').getByText('İkramlı', { exact: true })).toBeVisible()
  return dialog
}

test('a booking link opens the tour with its port, date, time and tickets selected', async ({ page }) => {
  const dialog = await dialogFor(page, 'iskele=2&tarih=2099-11-17&saat=16:40&bilet=235:2,234:1')
  await expect(dialog.getByRole('button', { name: /^Kalkış noktası/ })).toContainText('Beşiktaş')
  await expect(dialog.getByRole('button', { name: /^Tur tarihi/ })).toContainText('17 Kasım 2099')
  await expect(dialog.getByRole('button', { name: /^Kalkış saati/ })).toContainText('16:40')
  await expect(dialog.locator('.reservation-ticket-type output')).toHaveText(['1', '2'])
  await expect(dialog.locator('.reservation-passenger')).toHaveCount(3)
  await expect(dialog.locator('.booking-total')).toContainText('1.850')
  // The address keeps the link, so a refresh opens the same selection again.
  await expect(page).toHaveURL(/\/tur\/3\?iskele=2&/)
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
})

test('a departure id in the link wins over the time, and unknown values fall back to the defaults', async ({ page }) => {
  let dialog = await dialogFor(page, 'iskele=2&tarih=2099-11-17&sefer=9909&saat=16:40')
  await expect(dialog.getByRole('button', { name: /^Kalkış saati/ })).toContainText('18:10')
  await expect(dialog.locator('.reservation-ticket-type output')).toHaveText(['1', '0'])

  dialog = await dialogFor(page, 'iskele=999&tarih=2099-13-40&bilet=1:5')
  await expect(dialog.getByRole('button', { name: /^Kalkış noktası/ })).toContainText('Kabataş')
  await expect(dialog.getByRole('button', { name: /^Tur tarihi/ })).toContainText('16 Kasım 2099')
  await expect(dialog.locator('.reservation-ticket-type output')).toHaveText(['1', '0'])
})
