import { expect, test, type Page } from '@playwright/test'

const admin = { id: '11111111-1111-4111-8111-111111111111', email: 'admin@example.test', firstName: 'Fixture', lastName: 'Admin', role: 'Admin', isActive: true, canEditEmail: false, createdAtUtc: '2026-10-16T08:00:00Z' }
async function setup(page: Page, options: { language?: 'tr' | 'en'; duplicate?: boolean; unknown?: boolean; gate?: Promise<void> } = {}) {
  const posts: Record<string, unknown>[] = []
  let users: object[] = [admin]
  await page.addInitScript(({ admin, language }) => {
    localStorage.setItem('pereme-language', language)
    sessionStorage.setItem('peremetours-session', JSON.stringify({ user: admin, accessToken: 'fixture-admin-token', expiresAtUtc: '2099-01-01T00:00:00Z' }))
  }, { admin, language: options.language ?? 'tr' })
  await page.route('**/api/v1/**', async route => {
    const req = route.request(); const path = new URL(req.url()).pathname
    if (path === '/api/v1/admin/users') {
      expect(req.headers().authorization).toBe('Bearer fixture-admin-token')
      if (req.method() === 'GET') return route.fulfill({ json: users })
      expect(req.method()).toBe('POST')
      const body = req.postDataJSON(); posts.push(body); await options.gate
      if (options.duplicate) return route.fulfill({ status: 409, json: { title: 'USER_EMAIL_ALREADY_EXISTS' } })
      const created = { ...body, id: '22222222-2222-4222-8222-222222222222', isActive: true, canEditEmail: true, createdAtUtc: '2026-10-16T09:00:00Z' }
      delete created.password
      users = [created, ...users]
      if (options.unknown) return route.abort()
      return route.fulfill({ status: 201, json: created })
    }
    return route.fulfill({ status: 404, json: {} })
  })
  await page.goto('/admin/users')
  await page.getByRole('button', { name: options.language === 'en' ? 'Create a new user' : 'Yeni kullanıcı oluştur', exact: true }).click()
  return { posts, dialog: page.getByRole('dialog') }
}
test.beforeEach(async ({ page }) => {
  await page.route('**/fonts.googleapis.com/**', route => route.abort())
  await page.route('**/fonts.gstatic.com/**', route => route.abort())
})
async function fill(page: Page, role = 'User', english = false) {
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel(english ? 'First name' : 'Ad', { exact: true }).fill(' Created ')
  await dialog.getByLabel(english ? 'Last name' : 'Soyad', { exact: true }).fill(' Person ')
  await dialog.getByLabel(english ? 'Email address' : 'E-posta adresi', { exact: true }).fill('NEW@EXAMPLE.TEST')
  await dialog.getByLabel(english ? 'Role' : 'Rol', { exact: true }).selectOption(role)
  await dialog.getByLabel(english ? 'Initial password' : 'Başlangıç şifresi', { exact: true }).fill('FixturePassword1')
  await dialog.getByLabel(english ? 'Confirm password' : 'Şifre tekrar', { exact: true }).fill('FixturePassword1')
}

for (const role of ['User', 'Admin', 'Editor', 'Advisor', 'Service']) test(`Admin can create ${role} without replacing their own session`, async ({ page }, testInfo) => {
  const { posts, dialog } = await setup(page)
  await expect(dialog.getByLabel('Rol', { exact: true })).toHaveValue('User')
  expect(await page.locator('#root').evaluate(root => root.inert)).toBe(true)
  await fill(page, role)
  expect(await dialog.evaluate(element => element.scrollWidth > element.clientWidth)).toBe(false)
  if (role === 'Service') await dialog.screenshot({ path: testInfo.outputPath('create-service-user.png') })
  await dialog.getByRole('button', { name: 'Kullanıcı oluştur', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  const row = page.getByRole('row').filter({ hasText: 'new@example.test' })
  await expect(row).toContainText('Created Person'); await expect(row.getByRole('combobox')).toHaveValue(role)
  await expect(page.getByRole('status')).toContainText('Kullanıcı oluşturuldu')
  expect(posts).toEqual([{ firstName: 'Created', lastName: 'Person', email: 'new@example.test', password: 'FixturePassword1', role }])
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('peremetours-session')!).user.id)).toBe(admin.id)
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain('FixturePassword1')
  expect(await page.locator('#root').evaluate(root => root.inert)).toBe(false)
  await expect(page.getByRole('button', { name: 'Yeni kullanıcı oluştur', exact: true })).toBeFocused()
})

test('creation validates matching and strong passwords and keeps the selected role', async ({ page }) => {
  const { posts, dialog } = await setup(page)
  await fill(page, 'Advisor')
  await dialog.getByLabel('Şifre tekrar', { exact: true }).fill('DifferentPassword2')
  await dialog.getByRole('button', { name: 'Kullanıcı oluştur', exact: true }).click()
  await expect(dialog.getByRole('alert')).toHaveText('Şifreler eşleşmiyor.')
  await dialog.getByLabel('Başlangıç şifresi', { exact: true }).fill('weakpassword')
  await dialog.getByLabel('Şifre tekrar', { exact: true }).fill('weakpassword')
  await dialog.getByRole('button', { name: 'Kullanıcı oluştur', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('büyük harf')
  await expect(dialog.getByLabel('Rol', { exact: true })).toHaveValue('Advisor'); expect(posts).toEqual([])
})

test('duplicate email keeps public draft but clears both passwords including visible passwords', async ({ page }) => {
  const { posts, dialog } = await setup(page, { duplicate: true })
  await fill(page, 'Editor'); await dialog.getByRole('button', { name: 'Şifreleri göster' }).click()
  await expect(dialog.getByLabel('Başlangıç şifresi', { exact: true })).toHaveAttribute('type', 'text')
  await dialog.getByRole('button', { name: 'Kullanıcı oluştur', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('Mevcut hesap ve şifresi değiştirilmedi')
  await expect(dialog.getByLabel('Rol', { exact: true })).toHaveValue('Editor')
  await expect(dialog.getByLabel('E-posta adresi', { exact: true })).toHaveValue('NEW@EXAMPLE.TEST')
  await expect(dialog.getByLabel('Başlangıç şifresi', { exact: true })).toHaveValue('')
  await expect(dialog.getByLabel('Şifre tekrar', { exact: true })).toHaveValue('')
  await expect(dialog.getByLabel('Başlangıç şifresi', { exact: true })).toHaveAttribute('type', 'password')
  expect(posts).toHaveLength(1)
})

test('unknown result checks the list instead of replaying account creation', async ({ page }) => {
  const { posts, dialog } = await setup(page, { unknown: true })
  await fill(page, 'Service'); await dialog.getByRole('button', { name: 'Kullanıcı oluştur', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('Hesap oluşturulmuş olabilir')
  await expect(dialog.getByRole('button', { name: 'Kullanıcı oluştur', exact: true })).toHaveCount(0)
  await expect(dialog.getByLabel('Başlangıç şifresi', { exact: true })).toHaveValue('')
  await dialog.getByRole('button', { name: 'Listeyi kontrol et' }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('row').filter({ hasText: 'new@example.test' })).toBeVisible()
  await expect(page.getByPlaceholder('İsim veya e-posta ara...')).toHaveValue('new@example.test')
  expect(posts).toHaveLength(1)
})

test('busy creation cannot double submit or close and keyboard focus is trapped', async ({ page }) => {
  let release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  const { posts, dialog } = await setup(page, { gate })
  await fill(page)
  await dialog.getByRole('button', { name: 'Kullanıcı oluştur', exact: true }).focus()
  await page.keyboard.press('Tab'); await expect(dialog.getByRole('button', { name: 'Kapat', exact: true })).toBeFocused()
  await dialog.getByRole('button', { name: 'Kullanıcı oluştur', exact: true }).click()
  await expect.poll(() => posts.length).toBe(1)
  await page.keyboard.press('Escape'); await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Oluşturuluyor…' })).toBeDisabled()
  release(); await expect(dialog).toHaveCount(0); expect(posts).toHaveLength(1)
})

test('English dialog can be cancelled without sending or saving a password', async ({ page }) => {
  const { posts, dialog } = await setup(page, { language: 'en' })
  await fill(page, 'Admin', true)
  await expect(dialog.getByLabel('Role', { exact: true })).toHaveValue('Admin')
  await expect(dialog).toContainText('Full panel access')
  await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0); expect(posts).toEqual([])
  await page.getByRole('button', { name: 'Create a new user', exact: true }).click()
  await expect(page.getByRole('dialog').getByLabel('Initial password', { exact: true })).toHaveValue('')
  await expect(page.getByRole('dialog').getByLabel('Role', { exact: true })).toHaveValue('User')
})
