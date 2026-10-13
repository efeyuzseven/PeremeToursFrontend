import { expect, test, type Page } from '@playwright/test'

const admin = { id: '11111111-1111-4111-8111-111111111111', email: 'admin@example.test', firstName: 'Fixture', lastName: 'Admin', role: 'Admin', isActive: true, canEditEmail: false, createdAtUtc: '2026-10-01T10:00:00Z' }
const guest = { ...admin, id: '22222222-2222-4222-8222-222222222222', email: 'guest@example.test', firstName: 'Fixture', lastName: 'Guest', role: 'User', canEditEmail: true }

test.beforeEach(async ({ page }) => {
  await page.route('**/fonts.googleapis.com/**', (route) => route.abort())
  await page.route('**/fonts.gstatic.com/**', (route) => route.abort())
  await page.route('**/api/v1/**', (route) => route.fulfill({ status: 404, json: {} }))
})

async function setup(page: Page, language = 'tr', role = 'Admin', editableSelf = false) {
  let users = [{ ...admin, canEditEmail: !editableSelf ? false : true }, { ...guest }]
  const patches: { id: string; body: Record<string, unknown> }[] = []
  await page.addInitScript(({ language, role }) => {
    localStorage.setItem('pereme-language', language)
    sessionStorage.setItem('peremetours-session', JSON.stringify({ accessToken: 'fixture-token', expiresAtUtc: '2099-01-01T00:00:00Z',
      user: { id: '11111111-1111-4111-8111-111111111111', email: 'admin@example.test', firstName: 'Fixture', lastName: 'Admin', role },
    }))
  }, { language, role })
  await page.route('**/api/v1/admin/users', (route) => route.fulfill({ json: users }))
  await page.route('**/api/v1/auth/me', (route) => route.fulfill({ json: users[0] }))
  await page.route('**/api/v1/admin/users/*', async (route) => {
    expect(route.request().method()).toBe('PATCH')
    expect(route.request().headers().authorization).toBe('Bearer fixture-token')
    const id = route.request().url().split('/').pop()!
    const body = route.request().postDataJSON() as Record<string, unknown>
    patches.push({ id, body })
    users = users.map((user) => user.id === id ? { ...user, ...body } : user)
    await route.fulfill({ status: 204 })
  })
  await page.goto('/admin/users')
  return { patches }
}
function row(page: Page, email = guest.email) { return page.getByRole('row').filter({ hasText: email }) }
async function open(page: Page, email = guest.email, english = false) {
  await row(page, email).getByRole('button', { name: english ? 'Edit' : 'Düzenle', exact: true }).click()
  return page.getByRole('dialog')
}

test('admin edits profile without altering roles or booking details', async ({ page }, testInfo) => {
  const { patches } = await setup(page)
  const dialog = await open(page)
  await expect(dialog.getByLabel('Ad', { exact: true })).toHaveValue('Fixture')
  await expect(dialog.getByLabel('Soyad', { exact: true })).toHaveValue('Guest')
  await expect(dialog.getByLabel('E-posta adresi')).toHaveValue(guest.email)
  await page.screenshot({ path: `test-results/user-editor-${testInfo.project.name}.png`, fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
  expect(await dialog.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(false)
  await dialog.getByLabel('Ad', { exact: true }).fill(' Updated ')
  await dialog.getByLabel('Soyad', { exact: true }).fill(' Name ')
  await dialog.getByLabel('E-posta adresi').fill('NEW.GUEST@EXAMPLE.TEST')
  await dialog.getByRole('button', { name: 'Değişiklikleri kaydet' }).click()
  await expect(dialog).toHaveCount(0)
  await expect(row(page, 'new.guest@example.test')).toContainText('Updated Name')
  await expect(row(page, 'new.guest@example.test').getByRole('combobox')).toHaveValue('User')
  await expect(row(page, 'new.guest@example.test').getByRole('button', { name: 'Aktif', exact: true })).toBeEnabled()
  expect(patches).toEqual([{ id: guest.id, body: { firstName: 'Updated', lastName: 'Name', email: 'new.guest@example.test' } }])
  await expect(page.getByRole('status')).toContainText('Kullanıcı bilgileri güncellendi')
})

test('duplicate email rejection keeps the draft and original row', async ({ page }) => {
  await setup(page)
  await page.route('**/api/v1/admin/users/*', (route) => route.fulfill({ status: 409, json: { title: 'USER_EMAIL_ALREADY_EXISTS' } }))
  const dialog = await open(page)
  await dialog.getByLabel('Ad', { exact: true }).fill('Unsaved')
  await dialog.getByLabel('E-posta adresi').fill(admin.email)
  await dialog.getByRole('button', { name: 'Değişiklikleri kaydet' }).click()
  await expect(dialog.getByRole('alert')).toContainText('başka bir hesap')
  await expect(dialog.getByLabel('Ad', { exact: true })).toHaveValue('Unsaved')
  await expect(row(page)).toContainText('Fixture Guest')
  await expect(dialog.getByRole('button', { name: 'Değişiklikleri kaydet' })).toBeEnabled()
})

test('first name is required and surname can be cleared', async ({ page }) => {
  const { patches } = await setup(page)
  const dialog = await open(page)
  await dialog.getByLabel('Ad', { exact: true }).fill('   ')
  await dialog.getByRole('button', { name: 'Değişiklikleri kaydet' }).click()
  await expect(dialog.getByRole('alert')).toContainText('Geçerli bir ad')
  expect(patches).toHaveLength(0)
  await dialog.getByLabel('Ad', { exact: true }).fill('Fixture')
  await dialog.getByLabel('Soyad', { exact: true }).fill('')
  await dialog.getByRole('button', { name: 'Değişiklikleri kaydet' }).click()
  await expect(dialog).toHaveCount(0)
  expect(patches[0].body.lastName).toBe('')
})

test('cancel and Escape do not save and focus returns to the edit button', async ({ page }) => {
  const { patches } = await setup(page)
  let dialog = await open(page)
  await dialog.getByLabel('Ad', { exact: true }).fill('Not saved')
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(row(page).getByRole('button', { name: 'Düzenle' })).toBeFocused()
  dialog = await open(page)
  await expect(dialog.getByLabel('Ad', { exact: true })).toHaveValue('Fixture')
  await dialog.getByRole('button', { name: 'Vazgeç' }).click()
  await expect(dialog).toHaveCount(0)
  expect(patches).toHaveLength(0)
})

test('default admin email is read only but names and session header refresh', async ({ page }) => {
  const { patches } = await setup(page)
  await expect(row(page, admin.email).getByRole('combobox')).toBeDisabled()
  const dialog = await open(page, admin.email)
  await expect(dialog.getByLabel('E-posta adresi')).toHaveAttribute('readonly', '')
  await expect(dialog).toContainText('dağıtım ayarlarına bağlıdır')
  await dialog.getByLabel('Ad', { exact: true }).fill('Updated Admin')
  await dialog.getByRole('button', { name: 'Değişiklikleri kaydet' }).click()
  await expect(dialog).toHaveCount(0)
  expect(patches[0].body).toEqual({ firstName: 'Updated Admin', lastName: 'Admin' })
  await expect.poll(() => page.evaluate(() => JSON.parse(sessionStorage.getItem('peremetours-session')!).user.firstName)).toBe('Updated Admin')
  await expect(row(page, admin.email).getByRole('combobox')).toBeDisabled()
})

test('changing own unprotected email signs out and explains how to return', async ({ page }) => {
  const { patches } = await setup(page, 'tr', 'Admin', true)
  const dialog = await open(page, admin.email)
  await expect(dialog).toContainText('oturumunuz kapatılır')
  await dialog.getByLabel('E-posta adresi').fill('new.admin@example.test')
  await dialog.getByRole('button', { name: 'Değişiklikleri kaydet' }).click()
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('status')).toContainText('Giriş e-postanız güncellendi')
  expect(await page.evaluate(() => sessionStorage.getItem('peremetours-session'))).toBeNull()
  expect(patches).toHaveLength(1)
})

test('English editor and server errors are translated', async ({ page }) => {
  await setup(page, 'en')
  await page.route('**/api/v1/admin/users/*', (route) => route.fulfill({ status: 409, json: { title: 'USER_EMAIL_ALREADY_EXISTS', detail: 'Turkish backend detail' } }))
  const dialog = await open(page, guest.email, true)
  await expect(dialog.getByRole('heading')).toHaveText('Edit user details')
  await dialog.getByLabel('First name').fill('Updated')
  await dialog.getByRole('button', { name: 'Save changes' }).click()
  await expect(dialog.getByRole('alert')).toHaveText('This email address is already used by another account.')
})

test('role and active controls keep working independently of profile editing', async ({ page }) => {
  const { patches } = await setup(page)
  await row(page).getByRole('combobox').selectOption('Admin')
  await expect(row(page).getByRole('combobox')).toHaveValue('Admin')
  await expect(row(page).getByRole('button', { name: 'Aktif', exact: true })).toBeEnabled()
  await row(page).getByRole('button', { name: 'Aktif', exact: true }).click()
  await expect(row(page).getByRole('button', { name: 'Kapalı', exact: true })).toBeVisible()
  expect(patches.map((patch) => patch.body)).toEqual([{ role: 'Admin' }, { isActive: false }])
})

test('a successful save with failed refresh is not reported as an unsaved profile', async ({ page }) => {
  const { patches } = await setup(page)
  const dialog = await open(page)
  await page.route('**/api/v1/admin/users', (route) => route.fulfill({ status: 503, json: {} }))
  await dialog.getByLabel('Ad', { exact: true }).fill('Updated')
  await dialog.getByRole('button', { name: 'Değişiklikleri kaydet' }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('status')).toContainText('güncellendi')
  await expect(page.getByRole('alert')).toContainText('Değişiklik kaydedildi ancak liste yenilenemedi')
  expect(patches).toHaveLength(1)
})

test('saving cannot be duplicated or dismissed while in flight', async ({ page }) => {
  await setup(page)
  let requests = 0
  let release!: () => void
  const gate = new Promise<void>((resolve) => { release = resolve })
  await page.route('**/api/v1/admin/users/*', async (route) => { requests++; await gate; await route.fulfill({ status: 204 }) })
  const dialog = await open(page)
  await dialog.getByLabel('Ad', { exact: true }).fill('Updated')
  await dialog.getByRole('button', { name: 'Değişiklikleri kaydet' }).click()
  await expect(dialog.getByRole('button', { name: 'Kaydediliyor…' })).toBeDisabled()
  await expect(dialog.getByRole('button', { name: 'Kapat' })).toBeDisabled()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeVisible()
  expect(requests).toBe(1)
  release()
  await expect(dialog).toHaveCount(0)
})

test('regular users cannot reach the user administration screen', async ({ page }) => {
  let reads = 0
  await page.route('**/api/v1/admin/users', (route) => { reads++; return route.fulfill({ json: [] }) })
  await setup(page, 'tr', 'User')
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('heading', { name: 'Kullanıcılar' })).toHaveCount(0)
  expect(reads).toBe(0)
})
