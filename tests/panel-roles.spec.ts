import { expect, test, type Page } from '@playwright/test'
import type { HomepageContentDocument, HomepageLanguageContent } from '../src/content/homepage'

const contactId = '11111111-1111-4111-8111-111111111111'
const ticketId = '22222222-2222-4222-8222-222222222222'
const sections = ['tickets', 'ticket-errors', 'tour-contents', 'tour-pages', 'site-content', 'faqs', 'feedback', 'users']
const content = ['tour-contents', 'tour-pages', 'site-content', 'faqs']
const support = ['tickets', 'ticket-errors', 'feedback']
const titles: Record<string, string> = { tickets: 'Tur Biletleri', 'ticket-errors': 'Bilet Hata Kayıtları', 'tour-contents': 'Tur İçerikleri', 'tour-pages': 'Tur Sayfaları', 'site-content': 'Site İçerikleri', faqs: 'Sıkça Sorulan Sorular', feedback: 'Geri Bildirimler', users: 'Kullanıcılar' }
function homepage(): HomepageContentDocument {
  const language = (): HomepageLanguageContent => ({
    hero: { lead: 'Fixture', accent: 'Accent', description: 'Description' },
    tours: { eyebrow: 'Tours', lead: 'Tours', accent: 'Accent', description: 'Description' },
    services: { eyebrow: 'Services', lead: 'Services', accent: 'Accent', description: 'Description', items: (['turkish-night', 'sunset', 'daytime', 'bosphorus'] as const).map(categoryKey => ({ categoryKey, title: categoryKey, description: 'Description', browseLabel: 'View', bookingLabel: 'Book' })) },
    why: { eyebrow: 'Why', lead: 'Why', accent: 'Accent', reviews: 'Reviews', benefits: Array.from({ length: 4 }, () => ({ title: 'Benefit', description: 'Description' })) },
    stories: { eyebrow: 'Stories', lead: 'Stories', accent: 'Accent', description: 'Description', quote: 'Quote', meta: 'Meta' },
    final: { pre: 'Final', title: 'Final', action: 'Book' },
  })
  return { tr: language(), en: language(), instagramUrls: [] }
}
async function setup(page: Page, role: string, interactions = false) {
  await page.addInitScript((role) => {
    localStorage.setItem('pereme-language', 'tr')
    sessionStorage.setItem('peremetours-session', JSON.stringify({ accessToken: 'fixture-token', expiresAtUtc: '2099-01-01T00:00:00Z', user: { id: 'fixture-user', firstName: 'Fixture', lastName: 'Person', email: 'fixture@example.test', role } }))
  }, role)
  const reads: string[] = []; const writes: { path: string; body: Record<string, unknown> }[] = []
  let document = homepage()
  const detail = { id: contactId, name: 'Fixture Customer', email: 'customer@example.test', topic: 'Fixture complaint', message: 'Fixture message', language: 'tr', createdAtUtc: '2026-10-16T08:00:00Z', replyRevision: 0, replies: [] as object[], notifications: [] }
  await page.route('**/api/v1/**', async route => {
    const req = route.request(); const path = new URL(req.url()).pathname
    if (req.method() !== 'GET') writes.push({ path, body: req.postDataJSON() })
    else reads.push(path)
    if (path === '/api/v1/admin/site-content/homepage') {
      if (req.method() === 'PUT') document = req.postDataJSON()
      return route.fulfill({ json: document })
    }
    if (path === '/api/v1/admin/feedback') return route.fulfill({ json: { items: interactions ? [{ ...detail, replyCount: detail.replies.length, latestReplyStatus: null }] : [], totalCount: interactions ? 1 : 0, totalRequests: interactions ? 1 : 0, unansweredRequests: 1, answeredRequests: 0, page: 1, pageSize: 20, emailSendingEnabled: true } })
    if (path === `/api/v1/admin/feedback/${contactId}`) return route.fulfill({ json: detail })
    if (path.endsWith('/replies')) {
      detail.replyRevision++; const body = req.postDataJSON()
      detail.replies.push({ id: body.replyId, revision: 1, body: body.body, status: 'Queued', createdAtUtc: '2026-10-16T09:00:00Z', sentAtUtc: null, failureCode: null })
      return route.fulfill({ status: 202, json: { replyId: body.replyId, requestId: contactId, revision: 1, status: 'Queued' } })
    }
    if (path === '/api/v1/admin/ticket-errors') return route.fulfill({ json: { items: [], totalCount: 0, page: 1, pageSize: 20, totalErrors: 0, emailSendingEnabled: true } })
    if (path === `/api/v1/admin/tickets/${ticketId}/cancel`) return route.fulfill({ json: { ticketId, status: 'Completed', amount: 350, bankOperation: 'Void', completedAtUtc: '2026-10-16T09:00:00Z', canRetry: false } })
    if (path === '/api/v1/admin/tickets') return route.fulfill({ json: interactions ? [{ id: ticketId, ticketCode: 'PRM-FIXTURE', tourName: 'Sunset', tourDate: '2099-10-16', departureTime: '18:30:00', customerName: 'Fixture Customer', customerEmail: 'customer@example.test', guestCount: 1, amount: 350, currency: 'TRY', status: 'Confirmed', channel: 'Web', paymentStatus: 'Paid', ticketingStatus: 'Issued', canCancel: true, createdAtUtc: '2026-10-16T08:00:00Z', updatedAtUtc: '2026-10-16T08:00:00Z' }] : [] })
    if (['/api/v1/admin/tour-contents', '/api/v1/admin/tour-pages', '/api/v1/admin/faqs', '/api/v1/admin/users', '/api/v1/tours'].includes(path)) return route.fulfill({ json: [] })
    return route.fulfill({ status: 404, json: {} })
  })
  return { reads, writes }
}
test.beforeEach(async ({ page }) => {
  await page.route('**/fonts.googleapis.com/**', route => route.abort())
  await page.route('**/fonts.gstatic.com/**', route => route.abort())
})

for (const role of ['Editor', 'Advisor', 'Service']) test(`${role} has exactly the allowed navigation and direct-route permissions`, async ({ page, isMobile }, testInfo) => {
  const api = await setup(page, role)
  const allowed = role === 'Service' ? support : content
  const home = role === 'Service' ? 'feedback' : 'site-content'
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message))
  await page.goto('/admin')
  await expect(page).toHaveURL(new RegExp(`/admin/${home}$`))
  if (isMobile) await page.getByRole('button', { name: 'Menüyü aç', exact: true }).click()
  const nav = page.locator('.admin-nav')
  for (const section of sections) await expect(nav.locator(`a[href="/admin/${section}"]`)).toHaveCount(allowed.includes(section) ? 1 : 0)
  await page.screenshot({ path: testInfo.outputPath(`${role}-navigation.png`) })
  for (const section of sections) {
    api.reads.length = 0
    await page.goto(`/admin/${section}`)
    await expect(page).toHaveURL(new RegExp(`/admin/${allowed.includes(section) ? section : home}$`))
    await expect(page.getByRole('heading', { name: titles[allowed.includes(section) ? section : home], exact: true })).toBeVisible()
    if (!allowed.includes(section)) expect(api.reads.some(path => path === `/api/v1/admin/${section}` || path.startsWith(`/api/v1/admin/${section}/`))).toBe(false)
  }
  expect(api.writes).toEqual([]); expect(errors).toEqual([])
})

for (const role of ['Editor', 'Advisor']) test(`${role} can save site content and has a role-specific public panel link`, async ({ page }) => {
  const api = await setup(page, role)
  await page.goto('/')
  await expect(page.locator('.site-header').getByRole('link', { name: 'Yönetim Paneli', exact: true })).toHaveAttribute('href', '/admin/site-content')
  await page.locator('.site-header').getByRole('link', { name: 'Yönetim Paneli', exact: true }).click()
  await page.locator('[data-content-section=hero]').getByLabel('Ana başlık', { exact: true }).fill('Updated by content role')
  await page.getByRole('button', { name: 'Tüm değişiklikleri kaydet' }).click()
  await expect(page.getByRole('status')).toContainText('kaydedildi')
  expect(api.writes).toHaveLength(1); expect(api.writes[0].path).toBe('/api/v1/admin/site-content/homepage')
})

test('Service can respond and explicitly cancel/refund, without manual-ticket or user-management controls', async ({ page }) => {
  const api = await setup(page, 'Service', true)
  await page.goto('/admin/feedback')
  await page.locator(`[data-feedback-id="${contactId}"]`).getByRole('button', { name: 'İncele ve yanıtla' }).click()
  const response = page.getByRole('dialog')
  await response.getByLabel('Yanıtınız', { exact: true }).fill('Fixture service response')
  await response.getByRole('button', { name: 'Yanıtı kaydet ve mail gönder' }).click()
  await expect(response.locator('.admin-alert[role=status]')).toContainText('Yanıt kaydedildi')
  await page.keyboard.press('Escape')
  await page.goto('/admin/tickets')
  await expect(page.getByRole('button', { name: 'Yeni bilet' })).toHaveCount(0)
  await expect(page.locator('select.status-select')).toBeDisabled()
  await page.getByRole('button', { name: 'Bileti iptal et', exact: true }).click()
  const cancel = page.getByRole('dialog'); const submit = cancel.getByRole('button', { name: 'İptali ve iadeyi onayla' })
  await expect(submit).toBeDisabled(); await cancel.getByLabel('İptal nedeni').fill('Fixture cancellation only')
  await cancel.getByRole('checkbox').check(); await submit.click()
  await expect.poll(() => api.writes.filter(item => item.path.endsWith('/cancel')).length).toBe(1)
  expect(api.writes.map(item => item.path)).toEqual([`/api/v1/admin/feedback/${contactId}/replies`, `/api/v1/admin/tickets/${ticketId}/cancel`])
})

test('login sends staff to their permitted panel home and cannot restore a forbidden deep link', async ({ page }) => {
  await setup(page, 'Advisor')
  await page.goto('/login'); await expect(page).toHaveURL(/\/admin\/site-content$/)
})
