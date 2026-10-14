import { expect, test, type Page } from '@playwright/test'

const id = '11111111-1111-4111-8111-111111111111'
const otherId = '22222222-2222-4222-8222-222222222222'
type Delivery = 'Queued' | 'Processing' | 'Sent' | 'Failed' | 'ReviewRequired'
const fixtureDetail = () => ({ id, name: 'Fixture Customer', email: 'contact@example.test', topic: 'Tur hakkında bir soru', message: '<script>Fixture text only</script>\nİkinci satır', language: 'tr', createdAtUtc: '2026-10-14T08:00:00Z', replyRevision: 0,
  replies: [] as { id: string; revision: number; body: string; status: Delivery; createdAtUtc: string; sentAtUtc: string | null; failureCode: string | null }[],
  notifications: [{ recipientEmail: 'eyilmaz@denturavrasya.com', status: 'Sent', sentAtUtc: '2026-10-14T08:00:20Z', failureCode: null }, { recipientEmail: 'uakseloglu@denturavrasya.com', status: 'Sent', sentAtUtc: '2026-10-14T08:00:20Z', failureCode: null }] })
test.beforeEach(async ({ page }) => {
  await page.route('**/fonts.googleapis.com/**', route => route.abort())
  await page.route('**/fonts.gstatic.com/**', route => route.abort())
})
async function setup(page: Page, options: { language?: string; role?: string; status?: Delivery; networkFailsOnce?: boolean; conflict?: boolean; disabled?: boolean; gate?: Promise<void> } = {}) {
  let detail = fixtureDetail()
  const requests: Record<string, unknown>[] = []
  const queries: URLSearchParams[] = []
  const detailReads: string[] = []
  if (options.status) detail = { ...detail, replyRevision: 1, replies: [{ id: otherId, revision: 1, body: 'Previous reply', status: options.status, createdAtUtc: '2026-10-14T08:01:00Z', sentAtUtc: options.status === 'Sent' ? '2026-10-14T08:01:10Z' : null, failureCode: options.status === 'ReviewRequired' ? 'SMTP_RESULT_UNKNOWN' : null }] }
  await page.addInitScript(({ language, role }) => { localStorage.setItem('pereme-language', language); sessionStorage.setItem('peremetours-session', JSON.stringify({ accessToken: 'fixture-admin-token', expiresAtUtc: '2099-01-01T00:00:00Z', user: { id: 'fixture-admin', firstName: 'Fixture', lastName: 'Admin', email: 'admin@example.test', role } })) }, { language: options.language ?? 'tr', role: options.role ?? 'Admin' })
  await page.route('**/api/v1/**', async route => {
    const request = route.request(); const url = new URL(request.url())
    if (!url.pathname.startsWith('/api/v1/admin/feedback')) return route.fulfill({ status: 404, json: {} })
    expect(request.headers().authorization).toBe('Bearer fixture-admin-token')
    if (request.method() === 'POST') {
      expect(url.pathname).toBe(`/api/v1/admin/feedback/${id}/replies`)
      requests.push(request.postDataJSON()); await options.gate
      if (options.networkFailsOnce && requests.length === 1) return route.abort()
      if (options.conflict) return route.fulfill({ status: 409, json: { title: 'FEEDBACK_REPLY_CONFLICT' } })
      detail.replyRevision++
      const body = requests.at(-1)!
      detail.replies.push({ id: body.replyId as string, revision: detail.replyRevision, body: body.body as string, status: 'Queued', createdAtUtc: '2026-10-14T09:00:00Z', sentAtUtc: null, failureCode: null })
      return route.fulfill({ status: 202, json: { replyId: body.replyId, requestId: id, revision: detail.replyRevision, status: 'Queued' } })
    }
    if (url.pathname === `/api/v1/admin/feedback/${id}`) { detailReads.push(url.pathname); return route.fulfill({ json: detail }) }
    if (url.pathname === '/api/v1/admin/feedback') {
      queries.push(url.searchParams)
      const items = [{ id, name: detail.name, email: detail.email, topic: detail.topic, language: 'tr', createdAtUtc: detail.createdAtUtc, replyCount: detail.replies.length, latestReplyStatus: detail.replies.at(-1)?.status ?? null }]
      return route.fulfill({ json: { items: url.searchParams.get('search') === 'empty' ? [] : items, totalCount: url.searchParams.get('search') === 'empty' ? 0 : 21,
        page: Number(url.searchParams.get('page')), pageSize: 20, totalRequests: 21, unansweredRequests: 20, answeredRequests: 1, emailSendingEnabled: !options.disabled } })
    }
    return route.fulfill({ status: 404, json: {} })
  })
  await page.goto('/admin/feedback')
  return { requests, queries, detailReads, setStatus: (status: Delivery) => { const reply = detail.replies.at(-1)!; reply.status = status; reply.sentAtUtc = status === 'Sent' ? '2026-10-14T09:00:10Z' : null } }
}
async function open(page: Page, english = false) {
  await page.locator(`[data-feedback-id="${id}"]`).getByRole('button', { name: english ? 'View and respond' : 'İncele ve yanıtla' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByLabel(english ? 'Your response' : 'Yanıtınız', { exact: true })).toBeVisible()
  return dialog
}
test('admin sees saved contact messages, can search/filter/paginate, and views the original text safely', async ({ page }, testInfo) => {
  const api = await setup(page)
  await expect(page.getByRole('heading', { name: 'Geri Bildirimler' })).toBeVisible()
  await expect(page.locator('.feedback-list')).toContainText('contact@example.test')
  await page.getByLabel('Yanıt durumu').selectOption('Unanswered')
  await expect.poll(() => api.queries.at(-1)?.get('filter')).toBe('Unanswered')
  await page.getByRole('button', { name: 'Sonraki sayfa' }).click()
  await expect.poll(() => api.queries.at(-1)?.get('page')).toBe('2')
  await page.getByLabel('Ad, e-posta veya konu ara…').fill('Fixture')
  await page.getByRole('button', { name: 'Ara', exact: true }).click()
  await expect.poll(() => api.queries.at(-1)?.get('search')).toBe('Fixture')
  expect(api.queries.at(-1)?.get('page')).toBe('1')
  const dialog = await open(page)
  await expect(dialog.locator('.feedback-message')).toContainText('<script>Fixture text only</script>')
  await expect(dialog.locator('.feedback-message script')).toHaveCount(0)
  await dialog.screenshot({ path: testInfo.outputPath('feedback-detail.png') })
  expect(await dialog.evaluate(node => node.scrollWidth > node.clientWidth)).toBe(false)
  expect(api.requests).toHaveLength(0)
  await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0)
  await expect(page.locator(`[data-feedback-id="${id}"] button`)).toBeFocused()
})
test('a response creates one queued email then refreshes real delivery status without claiming inbox receipt', async ({ page }) => {
  const api = await setup(page); const dialog = await open(page)
  await dialog.getByLabel('Yanıtınız', { exact: true }).fill('  Sorunuzu yanıtlıyoruz.  ')
  await dialog.getByRole('button', { name: 'Yanıtı kaydet ve mail gönder' }).click()
  await expect(dialog.locator('.admin-alert[role=status]')).toContainText('Yanıt kaydedildi')
  await expect(dialog.locator('.feedback-history')).toContainText('Mail kuyrukta')
  await expect(dialog.getByLabel('Yanıtınız', { exact: true })).toHaveValue('')
  expect(api.requests).toHaveLength(1)
  expect(api.requests[0]).toMatchObject({ body: 'Sorunuzu yanıtlıyoruz.', expectedRevision: 0 })
  expect(api.requests[0]).not.toHaveProperty('email'); expect(api.requests[0]).not.toHaveProperty('recipientEmail')
  api.setStatus('Sent')
  await expect(dialog.locator('.feedback-history')).toContainText('Mail gönderildi')
  expect(api.requests).toHaveLength(1)
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain('Sorunuzu yanıtlıyoruz.')
})
test('network ambiguity retains the draft and reuses the same operation id', async ({ page }) => {
  const api = await setup(page, { networkFailsOnce: true }); const dialog = await open(page)
  await dialog.getByLabel('Yanıtınız', { exact: true }).fill('Private fixture response')
  await dialog.getByRole('button', { name: 'Yanıtı kaydet ve mail gönder' }).click()
  await expect(dialog.getByRole('alert')).toContainText('kaydedilmiş olabilir')
  await expect(dialog.getByLabel('Yanıtınız', { exact: true })).toHaveValue('Private fixture response')
  await dialog.getByRole('button', { name: 'Yanıtı kaydet ve mail gönder' }).click()
  await expect(dialog.locator('.admin-alert[role=status]')).toContainText('Yanıt kaydedildi')
  expect(api.requests).toHaveLength(2); expect(api.requests[0].replyId).toBe(api.requests[1].replyId)
})
test('in-flight response cannot be duplicated or dismissed', async ({ page }) => {
  let release: (() => void) | undefined
  const gate = new Promise<void>(resolve => { release = resolve })
  const api = await setup(page, { gate }); const dialog = await open(page)
  await dialog.getByLabel('Yanıtınız', { exact: true }).fill('Fixture response')
  await dialog.getByRole('button', { name: 'Yanıtı kaydet ve mail gönder' }).click()
  await expect(dialog.getByRole('button', { name: 'Kaydediliyor…' })).toBeDisabled()
  await page.keyboard.press('Escape'); await expect(dialog).toBeVisible()
  await dialog.locator('form').evaluate(node => node.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
  release!(); await expect(dialog.locator('.admin-alert[role=status]')).toContainText('Yanıt kaydedildi')
  expect(api.requests).toHaveLength(1)
})
test('stale draft conflict refreshes details without discarding the answer', async ({ page }) => {
  const api = await setup(page, { conflict: true }); const dialog = await open(page)
  await dialog.getByLabel('Yanıtınız', { exact: true }).fill('Retained response')
  await dialog.getByRole('button', { name: 'Yanıtı kaydet ve mail gönder' }).click()
  await expect(dialog.getByRole('alert')).toContainText('başka bir işlemde')
  await expect(dialog.getByLabel('Yanıtınız', { exact: true })).toHaveValue('Retained response')
  await expect.poll(() => api.detailReads.length).toBeGreaterThan(1)
})
test('English uncertain delivery blocks a new email and shows history', async ({ page }) => {
  const api = await setup(page, { language: 'en', status: 'ReviewRequired' }); const dialog = await open(page, true)
  await expect(dialog).toContainText('SMTP logs must be checked')
  await dialog.getByLabel('Your response', { exact: true }).fill('New response')
  await expect(dialog.getByRole('button', { name: 'Save response and send email' })).toBeDisabled()
  expect(api.requests).toHaveLength(0)
})
test('disabled email delivery does not allow replying and empty searches have a useful state', async ({ page }) => {
  const api = await setup(page, { disabled: true }); const dialog = await open(page)
  await expect(dialog.getByLabel('Yanıtınız', { exact: true })).toBeDisabled()
  await page.keyboard.press('Escape')
  await page.getByLabel('Ad, e-posta veya konu ara…').fill('empty')
  await page.getByRole('button', { name: 'Ara', exact: true }).click()
  await expect(page.locator('.admin-empty')).toContainText('mesaj bulunamadı')
  expect(api.requests).toHaveLength(0)
})
test('regular users cannot access customer feedback', async ({ page }) => {
  const api = await setup(page, { role: 'User' })
  await expect(page).not.toHaveURL('/admin/feedback')
  expect(api.queries).toHaveLength(0); expect(api.detailReads).toHaveLength(0); expect(api.requests).toHaveLength(0)
})
