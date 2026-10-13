import { expect, test, type Page } from '@playwright/test'

const ticket = {
  id: '11111111-1111-4111-8111-111111111111', ticketCode: 'PRM-MOCK-CANCELLATION', tourName: 'Sunset', tourDate: '2099-10-13',
  departureTime: '18:30:00', departurePort: 'Kabataş', customerName: 'Fixture Guest', customerEmail: 'fixture@example.test',
  guestCount: 1, amount: 350, currency: 'TRY', status: 'Cancelled', channel: 'Web', paymentStatus: 'Refunded', ticketingStatus: 'Issued',
  emailStatus: 'Sent', cancellationStatus: 'Completed', cancellationEmailStatus: 'Queued', cancellationEmailSentAtUtc: null,
  createdAtUtc: '2026-10-13T07:00:00Z', updatedAtUtc: '2026-10-13T07:30:00Z',
  passengers: [{ number: 1, name: 'Fixture Guest', pnr: 'MOCK-PNR', ticketGuid: null }],
}
async function session(page: Page, role = 'Admin') {
  await page.addInitScript((userRole) => sessionStorage.setItem('peremetours-session', JSON.stringify({
    accessToken: 'mock-token', expiresAtUtc: '2099-01-01T00:00:00Z',
    user: { id: 'mock-user', email: 'fixture@example.test', firstName: 'Fixture', role: userRole },
  })), role)
}
test.beforeEach(async ({ page }) => {
  await page.route('**/fonts.googleapis.com/**', (route) => route.abort())
  await page.route('**/fonts.gstatic.com/**', (route) => route.abort())
  await page.route('**/api/v1/**', (route) => route.fulfill({ status: 404, json: {} }))
})

test('admin distinguishes purchase and cancellation mail and localizes delivery time', async ({ page }) => {
  await session(page)
  let sent = false
  await page.route('**/api/v1/admin/tickets', (route) => route.fulfill({ json: [{ ...ticket,
    cancellationEmailStatus: sent ? 'Sent' : 'Queued', cancellationEmailSentAtUtc: sent ? '2026-10-13T07:32:00Z' : null,
  }] }))
  await page.goto('/admin/tickets')
  await expect(page.getByText('Satın alma maili: Gönderildi', { exact: true })).toBeVisible()
  await expect(page.getByTestId('cancellation-email-status')).toContainText('İptal maili: Kuyrukta')
  sent = true
  await page.getByRole('button', { name: 'EN', exact: true }).click()
  await page.reload()
  await expect(page.getByTestId('cancellation-email-status')).toContainText('Cancellation email: Sent')
  await expect(page.getByTestId('cancellation-email-status')).toContainText('10:32')
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
})

test('historical cancelled bookings are not incorrectly labelled as cancellation email sent', async ({ page }) => {
  await session(page)
  await page.route('**/api/v1/admin/tickets', (route) => route.fulfill({ json: [{ ...ticket, cancellationEmailStatus: null }] }))
  await page.goto('/admin/tickets')
  await expect(page.getByText('Satın alma maili: Gönderildi', { exact: true })).toBeVisible()
  await expect(page.getByText('İptal maili: Kayıt yok', { exact: true })).toBeVisible()
  await expect(page.getByTestId('cancellation-email-status')).toHaveCount(0)
})

test('account shows separate cancellation email status and no cancelled ticket QR', async ({ page }) => {
  await session(page, 'User')
  await page.route('**/account/profile', (route) => route.fulfill({ json: { firstName: 'Fixture', email: 'fixture@example.test', createdAtUtc: '2026-10-13T07:00:00Z' } }))
  await page.route('**/account/reservations', (route) => route.fulfill({ json: [ticket] }))
  await page.goto('/hesabim')
  await expect(page.getByTestId('cancellation-email-status')).toContainText('İptal maili')
  await expect(page.getByTestId('cancellation-email-status')).toContainText('Kuyrukta')
  await expect(page.getByTestId('ticket-qr')).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
})

test('cancellation email failures never appear as bank failures in English', async ({ page }) => {
  await session(page)
  await page.route('**/admin/ticket-errors?*', (route) => route.fulfill({ json: { items: [{
    id: 'mock-error', ticketId: ticket.id, ticketCode: ticket.ticketCode, tourName: ticket.tourName, tourDate: ticket.tourDate,
    amount: ticket.amount, currency: 'TRY', stage: 'Email', code: 'CANCELLATION_EMAIL_SMTP_RESULT_UNKNOWN', providerCode: null,
    message: 'İptal maili gönderim sonucu belirsiz.', isHistorical: false, createdAtUtc: '2026-10-13T07:32:00Z',
    paymentStatus: 'Refunded', ticketingStatus: 'Issued', emailStatus: 'ReviewRequired',
  }], totalCount: 1, page: 1, pageSize: 20 } }))
  await page.goto('/admin/ticket-errors')
  await page.getByRole('button', { name: 'EN', exact: true }).click()
  await expect(page.locator('.ticket-error-detail')).toContainText('Cancellation email: The delivery result is uncertain')
  await expect(page.locator('.ticket-error-card footer')).toContainText('Cancellation email: Review required')
  await expect(page.locator('.ticket-error-detail')).not.toContainText('bank did not approve')
})
