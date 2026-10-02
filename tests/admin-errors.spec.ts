import { expect, test, type Page } from '@playwright/test'

const entry = {
  id: 'error-1', ticketId: 'ticket-1', ticketCode: 'PRM-DEMO-ORDER', tourName: 'Sunset', tourDate: '2026-10-03', amount: 350, currency: 'TRY',
  stage: 'Payment', code: '99', providerCode: 'CORE-2201', message: 'Sanal POS API kullanıcısı doğrulanamadı. Banka panelinde kullanıcı tanımını kontrol edin.',
  isHistorical: false, createdAtUtc: '2026-10-02T18:34:57Z', paymentStatus: 'Failed', ticketingStatus: 'Pending', emailStatus: null,
}
async function session(page: Page, role = 'Admin') {
  await page.addInitScript((userRole) => {
    sessionStorage.setItem('peremetours-session', JSON.stringify({ accessToken: 'mock-admin-token', expiresAtUtc: '2099-01-01T00:00:00Z', user: { id: 'mock', firstName: 'Test', lastName: 'Admin', email: 'test@example.com', role: userRole } }))
  }, role)
}
test.beforeEach(async ({ page }) => {
  await page.route('**/fonts.googleapis.com/**', (route) => route.abort())
  await page.route('**/fonts.gstatic.com/**', (route) => route.abort())
  await page.route('**/api/v1/**', (route) => route.fulfill({ status: 404, json: {} }))
})
test('admin errors are searchable, filterable, localized and responsive', async ({ page, isMobile }, testInfo) => {
  await session(page)
  const requests: URL[] = []
  await page.route('**/admin/ticket-errors?*', (route) => {
    expect(route.request().headers().authorization).toBe('Bearer mock-admin-token')
    const url = new URL(route.request().url()); requests.push(url)
    const mail = url.searchParams.get('stage') === 'Email'
    return route.fulfill({ json: { items: [mail ? { ...entry, stage: 'Email', code: 'SMTP_TLS_FAILED', providerCode: null, message: 'SMTP sertifikası doğrulanamadı.', paymentStatus: 'Paid', ticketingStatus: 'Issued', emailStatus: 'Failed' } : entry], totalCount: 1, page: 1, pageSize: 20 } })
  })
  await page.goto('/admin/ticket-errors')
  await expect(page.getByRole('heading', { name: 'Bilet Hata Kayıtları' })).toBeVisible()
  await expect(page.getByText('CORE-2201', { exact: true })).toBeVisible()
  await expect(page.locator('.ticket-error-card time')).toContainText('21:34')
  await page.getByLabel('Rezervasyon, tur veya hata kodu ara').fill('PRM-DEMO')
  await page.getByRole('button', { name: 'Ara', exact: true }).click()
  await expect.poll(() => requests.at(-1)?.searchParams.get('search')).toBe('PRM-DEMO')
  await page.getByRole('button', { name: 'E-posta', exact: true }).click()
  await expect(page.getByText('SMTP_TLS_FAILED', { exact: true })).toBeVisible()
  await expect.poll(() => requests.at(-1)?.searchParams.get('stage')).toBe('Email')
  await page.getByRole('button', { name: 'EN', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Ticket Error Logs' })).toBeVisible()
  await expect(page.getByText(/Check its certificate/)).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false)
  await page.screenshot({ path: testInfo.outputPath('ticket-errors.png'), fullPage: true })
  if (isMobile) await page.getByRole('button', { name: 'Menüyü aç' }).click()
  await expect(page.getByRole('link', { name: 'Ticket Error Logs' })).toBeVisible()
})
test('admin errors handle server failures, refresh and empty filters', async ({ page }) => {
  await session(page)
  let fail = true
  await page.route('**/admin/ticket-errors?*', (route) => route.fulfill(fail
    ? { status: 503, json: { title: 'Unavailable' } }
    : { json: { items: [], totalCount: 0, page: 1, pageSize: 20 } }))
  await page.goto('/admin/ticket-errors')
  await expect(page.getByRole('alert')).toContainText('Hata kayıtları yüklenemedi')
  expect(await page.getByText('Bu filtrede hata kaydı bulunmuyor.').count()).toBe(0)
  fail = false
  await page.getByRole('alert').getByRole('button', { name: 'Yenile' }).click()
  await expect(page.getByText('Bu filtrede hata kaydı bulunmuyor.')).toBeVisible()
})
test('pagination requests the next page and resets after a new filter', async ({ page }) => {
  await session(page)
  await page.route('**/admin/ticket-errors?*', (route) => {
    const currentPage = Number(new URL(route.request().url()).searchParams.get('page'))
    return route.fulfill({ json: { items: [{ ...entry, ticketCode: `PRM-PAGE-${currentPage}` }], totalCount: 21, page: currentPage, pageSize: 20 } })
  })
  await page.goto('/admin/ticket-errors')
  await expect(page.getByText('PRM-PAGE-1', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Sonraki sayfa' }).click()
  await expect(page.getByText('PRM-PAGE-2', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sonraki sayfa' })).toBeDisabled()
  await page.getByRole('button', { name: 'Ödeme', exact: true }).click()
  await expect(page.getByText('PRM-PAGE-1', { exact: true })).toBeVisible()
})
test('visitors and regular users cannot open the admin error page', async ({ page }) => {
  let requests = 0
  page.on('request', (request) => { if (request.url().includes('/admin/ticket-errors?')) requests++ })
  await page.goto('/admin/ticket-errors')
  await expect(page).toHaveURL(/\/login/)
  await session(page, 'User'); await page.goto('/admin/ticket-errors')
  await expect(page).toHaveURL(/\/$/)
  expect(requests).toBe(0)
})
