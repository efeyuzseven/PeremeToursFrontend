import { expect, test, type Page } from '@playwright/test'

const profile = { firstName: 'Fixture', lastName: 'Guest', email: 'guest@example.test', createdAtUtc: '2026-10-14T12:00:00Z', canEditEmail: true, canDeleteAccount: true }
async function setup(page: Page, role = 'User', language = 'tr') {
  await page.addInitScript(({ role, language }) => {
    sessionStorage.setItem('peremetours-session', JSON.stringify({ accessToken: 'fixture-token', expiresAtUtc: '2099-01-01T00:00:00Z', user: { id: 'fixture-user', firstName: 'Fixture', lastName: 'Guest', email: 'guest@example.test', role } }))
    localStorage.setItem('pereme-language', language)
  }, { role, language })
  await page.route('**/api/v1/account/profile', (route) => route.fulfill({ json: profile }))
  await page.route('**/api/v1/account/reservations', (route) => route.fulfill({ json: [] }))
}
test.beforeEach(async ({ page }) => {
  await page.route('**/fonts.googleapis.com/**', (route) => route.abort())
  await page.route('**/fonts.gstatic.com/**', (route) => route.abort())
  // All tests use synthetic API responses; never change real accounts, purchases or mail records.
  await page.route('**/api/v1/**', (route) => route.fulfill({ status: 404, json: {} }))
})

for (const path of ['/', '/hesabim']) test(`admin navigation is directly visible and account menu works on ${path}`, async ({ page }, testInfo) => {
  await setup(page, 'Admin')
  await page.goto(path)
  const header = page.locator('.site-header, .info-header')
  const admin = header.getByRole('link', { name: 'Yönetim Paneli', exact: true })
  await expect(admin).toBeInViewport(); await expect(admin).toHaveAttribute('href', '/admin/tickets')
  await header.getByRole('button', { name: 'Hesabım', exact: true }).click()
  await expect(header.getByRole('menuitem', { name: 'Kişisel bilgilerim' })).toBeVisible()
  await expect(header.getByRole('menuitem', { name: 'Rezervasyonlarım' })).toBeVisible()
  await expect(header.getByRole('menuitem', { name: 'Çıkış yap' })).toBeVisible()
  const background = await header.getByRole('menu').evaluate((element) => getComputedStyle(element).backgroundColor)
  expect(background).toBe('rgb(255, 255, 255)')
  await page.screenshot({ path: testInfo.outputPath('account-menu.png') })
  await header.getByRole('menuitem', { name: 'Rezervasyonlarım' }).click()
  await expect(page).toHaveURL(/\/hesabim#rezervasyonlarim$/)
  await expect(page.getByRole('heading', { name: 'Rezervasyonlarım' })).toBeInViewport()
  await expect(page.getByRole('menu')).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
})

test('regular users have no admin link and keyboard/outside click close the menu', async ({ page }) => {
  await setup(page); await page.goto('/hesabim')
  const header = page.locator('.info-header')
  await expect(header.getByRole('link', { name: 'Yönetim Paneli' })).toHaveCount(0)
  const trigger = header.getByRole('button', { name: 'Hesabım', exact: true })
  await trigger.focus(); await page.keyboard.press('ArrowDown')
  await expect(header.getByRole('menuitem', { name: 'Kişisel bilgilerim' })).toBeFocused()
  await page.keyboard.press('End'); await expect(header.getByRole('menuitem', { name: 'Çıkış yap' })).toBeFocused()
  await page.keyboard.press('Escape'); await expect(trigger).toBeFocused(); await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  await trigger.click(); await page.getByRole('heading', { name: 'Kişisel bilgilerim' }).click()
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  await trigger.click(); await header.getByRole('menuitem', { name: 'Çıkış yap' }).click()
  await expect(page).toHaveURL(/\/login$/)
  expect(await page.evaluate(() => sessionStorage.getItem('peremetours-session'))).toBeNull()
})

test('personal detail updates only submit own profile and update the greeting', async ({ page }) => {
  await setup(page)
  let calls = 0
  await page.route('**/api/v1/account/profile', async (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: profile })
    calls++; expect(route.request().headers().authorization).toBe('Bearer fixture-token')
    expect(route.request().postDataJSON()).toEqual({ firstName: 'Updated', lastName: 'Person', email: profile.email })
    return route.fulfill({ json: { requiresLogin: false } })
  })
  await page.goto('/hesabim#kisisel-bilgilerim')
  const form = page.locator('.account-settings__form')
  await form.getByLabel('Ad', { exact: true }).fill('Updated')
  await form.getByLabel('Soyad', { exact: true }).fill('Person')
  await form.getByRole('button', { name: 'Bilgilerimi güncelle' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Kişisel bilgilerin güncellendi.' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Merhaba, Updated.' })).toBeVisible()
  expect(calls).toBe(1)
  const saved = await page.evaluate(() => JSON.parse(sessionStorage.getItem('peremetours-session')!))
  expect(saved.user.firstName).toBe('Updated'); expect(JSON.stringify(saved)).not.toContain('Password')
})

test('email changes require current password and sign out after success', async ({ page }) => {
  await setup(page)
  let calls = 0
  await page.route('**/api/v1/account/profile', (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: profile })
    calls++; expect(route.request().postDataJSON()).toMatchObject({ email: 'new@example.test', currentPassword: 'FixturePassword1' })
    return route.fulfill({ json: { requiresLogin: true } })
  })
  await page.goto('/hesabim')
  const form = page.locator('.account-settings__form')
  await form.getByLabel('E-posta adresi', { exact: true }).fill('new@example.test')
  await expect(form.getByLabel('Mevcut şifre', { exact: true })).toBeVisible()
  await form.getByRole('button', { name: 'Bilgilerimi güncelle' }).click(); expect(calls).toBe(0)
  await form.getByLabel('Mevcut şifre', { exact: true }).fill('FixturePassword1')
  await form.getByRole('button', { name: 'Bilgilerimi güncelle' }).click()
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('status')).toContainText('Giriş e-postanız güncellendi')
  expect(await page.evaluate(() => sessionStorage.getItem('peremetours-session'))).toBeNull()
})

test('password change validates repetition, clears passwords and closes sessions', async ({ page }) => {
  await setup(page)
  let calls = 0
  await page.route('**/api/v1/account/password', (route) => {
    calls++; expect(route.request().postDataJSON()).toEqual({ currentPassword: 'FixturePassword1', newPassword: 'ChangedPassword2' })
    return route.fulfill(calls === 1 ? { status: 400, json: { title: 'CURRENT_PASSWORD_INCORRECT' } } : { json: { requiresLogin: true } })
  })
  await page.goto('/hesabim'); await page.getByText('Şifremi değiştir', { exact: true }).click()
  const form = page.locator('.account-settings__disclosure').first().locator('form')
  await form.getByLabel('Mevcut şifre', { exact: true }).fill('FixturePassword1')
  await form.getByLabel('Yeni şifre', { exact: true }).fill('ChangedPassword2')
  await form.getByLabel('Yeni şifre tekrar', { exact: true }).fill('DifferentPassword3')
  await form.getByRole('button', { name: 'Şifremi güncelle' }).click()
  await expect(form.getByRole('alert')).toHaveText('Yeni şifreler eşleşmiyor.'); expect(calls).toBe(0)
  await form.getByLabel('Yeni şifre tekrar', { exact: true }).fill('ChangedPassword2')
  await form.getByRole('button', { name: 'Şifremi güncelle' }).click()
  await expect(form.getByRole('alert')).toHaveText('Mevcut şifren doğru değil.')
  for (const label of ['Mevcut şifre', 'Yeni şifre', 'Yeni şifre tekrar']) await expect(form.getByLabel(label, { exact: true })).toHaveValue('')
  for (const [label, value] of [['Mevcut şifre', 'FixturePassword1'], ['Yeni şifre', 'ChangedPassword2'], ['Yeni şifre tekrar', 'ChangedPassword2']]) await form.getByLabel(label, { exact: true }).fill(value)
  await form.getByRole('button', { name: 'Şifremi güncelle' }).click()
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('status')).toContainText('Şifren güncellendi')
  const storage = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))
  expect(storage).not.toContain('ChangedPassword2'); expect(storage).not.toContain('FixturePassword1')
})

test('account deletion needs typed confirmation and checkbox and sends no ticket cancellation', async ({ page }) => {
  await setup(page)
  let calls = 0
  await page.route('**/api/v1/account', async (route) => {
    calls++; expect(route.request().method()).toBe('DELETE')
    expect(route.request().postDataJSON()).toEqual({ currentPassword: 'FixturePassword1', confirmed: true })
    await new Promise((resolve) => setTimeout(resolve, 200))
    return route.fulfill({ json: { requiresLogin: true } })
  })
  const writes: string[] = []; page.on('request', (request) => { if (['POST', 'PATCH', 'DELETE'].includes(request.method())) writes.push(new URL(request.url()).pathname) })
  await page.goto('/hesabim'); await page.getByText('Hesabımı sil', { exact: true }).click()
  const form = page.locator('.account-settings__delete form'); const button = form.getByRole('button', { name: 'Hesabımı kalıcı olarak sil' })
  await expect(form).toContainText('Biletlerin iptal edilmez, iade başlatılmaz')
  await expect(button).toBeDisabled()
  await form.getByLabel('Mevcut şifre', { exact: true }).fill('FixturePassword1')
  await form.getByLabel('Onaylamak için SİL yaz').fill('SİL'); await expect(button).toBeDisabled()
  await form.getByRole('checkbox').check(); await expect(button).toBeEnabled(); await button.click()
  await expect(page).toHaveURL(/\/login$/); await expect(page.getByRole('status')).toContainText('Hesabın silindi')
  expect(calls).toBe(1); expect(writes).toEqual(['/api/v1/account'])
})

test('protected administrator keeps profile/password editing without email or delete access', async ({ page }) => {
  await setup(page, 'Admin')
  await page.route('**/api/v1/account/profile', (route) => route.fulfill({ json: { ...profile, canEditEmail: false, canDeleteAccount: false, deletionBlockedReason: 'ACCOUNT_DELETION_PROTECTED' } }))
  await page.goto('/hesabim')
  await expect(page.getByLabel('E-posta adresi', { exact: true })).toHaveAttribute('readonly', '')
  await page.getByText('Hesabımı sil', { exact: true }).click()
  await expect(page.locator('.account-settings__delete')).toContainText('sistem tarafından korunuyor')
  await expect(page.getByRole('button', { name: 'Hesabımı kalıcı olarak sil' })).toHaveCount(0)
  await page.getByText('Şifremi değiştir', { exact: true }).click()
  await expect(page.getByRole('button', { name: 'Şifremi güncelle' })).toBeVisible()
})

test('English account menu and mobile settings remain usable at 320px', async ({ page }, testInfo) => {
  await setup(page, 'Admin', 'en'); await page.setViewportSize({ width: 320, height: 844 }); await page.goto('/hesabim')
  const header = page.locator('.info-header')
  await expect(header.getByRole('link', { name: 'Admin panel', exact: true })).toBeInViewport()
  await header.getByRole('button', { name: 'My account', exact: true }).click()
  await expect(header.getByRole('menuitem', { name: 'Personal details' })).toBeVisible()
  await expect(header.getByRole('menuitem', { name: 'My bookings' })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('english-320.png') })
  expect(await page.evaluate(() => {
    const logo = document.querySelector('.info-logo')!.getBoundingClientRect()
    const actions = document.querySelector('.info-header__actions')!.getBoundingClientRect()
    return logo.right <= actions.left && actions.right <= innerWidth
  })).toBe(true)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Update my details' })).toBeVisible()
  await page.getByText('Delete my account', { exact: true }).click()
  await expect(page.getByLabel('Type DELETE to confirm')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
})
