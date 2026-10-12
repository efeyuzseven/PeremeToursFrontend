import { expect, test } from '@playwright/test'

const token = 'A'.repeat(64)
test.beforeEach(async ({ page }) => {
  await page.route('**/fonts.googleapis.com/**', (route) => route.abort())
  await page.route('**/fonts.gstatic.com/**', (route) => route.abort())
  await page.route('**/api/v1/**', (route) => route.fulfill({ status: 404, json: {} }))
})

test('login removes admin hint and opens a private password reset request page', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByText('Yönetici hesabıyla', { exact: false })).toHaveCount(0)
  await expect(page.locator('.login-admin-note')).toHaveCount(0)
  await page.getByRole('link', { name: 'Şifremi unuttum' }).click()
  await expect(page).toHaveURL(/\/sifremi-unuttum$/)
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
  await expect(page.locator('input[name="password"]')).toHaveCount(0)
  await page.route('**/auth/forgot-password', (route) => {
    expect(route.request().postDataJSON()).toEqual({ email: 'fixture@example.test', language: 'tr' })
    return route.fulfill({ status: 202, json: { message: 'Generic accepted response' } })
  })
  await page.getByLabel('E-posta adresi').fill('fixture@example.test')
  await page.getByRole('button', { name: 'Sıfırlama bağlantısı gönder' }).click()
  await expect(page.getByRole('status')).toContainText('Bu adresle aktif bir hesap varsa')
  await expect(page.getByRole('status')).toContainText('30 dakika')
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
})

test('English request and success messages are localized', async ({ page }) => {
  await page.goto('/sifremi-unuttum')
  await page.getByRole('button', { name: 'EN', exact: true }).click()
  await page.route('**/auth/forgot-password', (route) => {
    expect(route.request().postDataJSON().language).toBe('en')
    return route.fulfill({ status: 202, json: {} })
  })
  await page.getByLabel('Email address').fill('fixture@example.test')
  await page.getByRole('button', { name: 'Send reset link' }).click()
  await expect(page.getByRole('status')).toContainText('If an active account')
  await expect(page.getByRole('status')).toContainText('30 minutes')
})

test('reset keeps token only in memory and verifies matching passwords before submission', async ({ page }) => {
  let resets = 0
  await page.route('**/auth/reset-password', (route) => {
    resets++
    expect(route.request().postDataJSON()).toEqual({ token, password: 'NewPassword123' })
    return route.fulfill({ status: 204 })
  })
  await page.goto(`/sifre-sifirla#token=${token}`)
  await expect(page).toHaveURL(/\/sifre-sifirla$/)
  await expect(page.getByRole('heading', { name: 'Yeni şifre belirle' })).toBeVisible()
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }).includes('A'.repeat(64)))).toBe(false)
  await page.getByLabel('Yeni şifre', { exact: true }).fill('NewPassword123')
  await page.getByLabel('Yeni şifre tekrar').fill('OtherPassword123')
  await page.getByRole('button', { name: 'Şifremi güncelle' }).click()
  await expect(page.getByRole('alert')).toContainText('Şifreler eşleşmiyor')
  expect(resets).toBe(0)
  await page.getByLabel('Yeni şifre tekrar').fill('NewPassword123')
  await page.getByRole('button', { name: 'Şifremi güncelle' }).click()
  await expect(page.getByRole('status')).toContainText('Şifren güncellendi')
  expect(resets).toBe(1)
  await expect(page.locator('input[name="password"]')).toHaveCount(0)
  await page.getByRole('link', { name: 'Giriş yap', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Hesabıma giriş yap' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
})

test('missing token does not show or submit password fields', async ({ page }) => {
  await page.goto('/sifre-sifirla')
  await expect(page.getByRole('alert')).toContainText('Bu bağlantı geçersiz')
  await expect(page.locator('input[name="password"]')).toHaveCount(0)
  await page.getByRole('link', { name: 'Yeni bağlantı iste' }).click()
  await expect(page).toHaveURL(/\/sifremi-unuttum$/)
})

test('expired link has a clear retry path and rate limits are localized', async ({ page }) => {
  await page.route('**/auth/reset-password', (route) => route.fulfill({ status: 400, json: { title: 'RESET_LINK_INVALID' } }))
  await page.goto(`/sifre-sifirla#token=${token}`)
  await page.getByLabel('Yeni şifre', { exact: true }).fill('NewPassword123')
  await page.getByLabel('Yeni şifre tekrar').fill('NewPassword123')
  await page.getByRole('button', { name: 'Şifremi güncelle' }).click()
  await expect(page.getByRole('alert')).toContainText('süresi dolmuş')
  await page.getByRole('link', { name: 'Yeni bağlantı iste' }).click()
  await page.route('**/auth/forgot-password', (route) => route.fulfill({ status: 429, json: {} }))
  await page.getByLabel('E-posta adresi').fill('fixture@example.test')
  await page.getByRole('button', { name: 'Sıfırlama bağlantısı gönder' }).click()
  await expect(page.getByRole('alert')).toContainText('Çok fazla deneme')
})

test('English reset accepts strong passwords and clears an old local session', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('pereme-language', 'en')
    sessionStorage.setItem('peremetours-session', JSON.stringify({ accessToken: 'mock-old-token', expiresAtUtc: '2099-01-01T00:00:00Z', user: { id: 'mock', email: 'fixture@example.test', firstName: 'Fixture', role: 'User' } }))
  })
  await page.route('**/auth/reset-password', (route) => route.fulfill({ status: 204 }))
  await page.goto(`/sifre-sifirla#token=${token}`)
  await page.getByLabel('New password', { exact: true }).fill('NewPassword123')
  await page.getByLabel('Confirm new password').fill('NewPassword123')
  await page.getByRole('button', { name: 'Update my password' }).click()
  await expect(page.getByRole('status')).toContainText('Your password has been updated')
  expect(await page.evaluate(() => sessionStorage.getItem('peremetours-session'))).toBeNull()
})
