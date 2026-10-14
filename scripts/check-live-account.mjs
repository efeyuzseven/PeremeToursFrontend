import { mkdir } from 'node:fs/promises'
import { chromium, expect } from '@playwright/test'

// Load the real published UI, but mock EVERY API request. No real account is changed or deleted.
const origin = process.env.PEREME_ACCOUNT_SMOKE_ORIGIN ?? 'https://pereme.com.tr'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
await mkdir('test-results', { recursive: true })
const fixture = { firstName: 'Fixture', lastName: 'Guest', email: 'fixture@example.test', createdAtUtc: '2026-10-14T12:00:00Z', canEditEmail: true, canDeleteAccount: true }
try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    for (const action of ['password', 'delete', 'protected']) {
      const context = await browser.newContext({ viewport, timezoneId: 'Europe/Istanbul' })
      const page = await context.newPage()
      const errors = []; const mockWrites = []; let unexpectedWrites = 0
      await page.addInitScript((role) => {
        localStorage.setItem('pereme-language', 'tr')
        sessionStorage.setItem('peremetours-session', JSON.stringify({ accessToken: 'synthetic-smoke-token', expiresAtUtc: '2099-01-01T00:00:00Z', user: { id: 'synthetic-user', firstName: 'Fixture', lastName: 'Guest', email: 'fixture@example.test', role } }))
      }, action === 'delete' ? 'User' : 'Admin')
      await page.route('**/fonts.googleapis.com/**', (route) => route.abort())
      await page.route('**/fonts.gstatic.com/**', (route) => route.abort())
      await page.route('**/api/v1/**', (route) => {
        const request = route.request(); const path = new URL(request.url()).pathname
        if (request.method() === 'GET') {
          if (path === '/api/v1/account/profile') return route.fulfill({ json: action === 'protected'
            ? { ...fixture, canEditEmail: false, canDeleteAccount: false, deletionBlockedReason: 'ACCOUNT_DELETION_PROTECTED' } : fixture })
          if (path === '/api/v1/account/reservations') return route.fulfill({ json: [] })
          return route.fulfill({ status: 404, json: {} })
        }
        if (request.method() === 'OPTIONS') return route.fulfill({ status: 204 })
        const expected = (action === 'password' && ((path === '/api/v1/account/profile' && request.method() === 'PATCH')
          || (path === '/api/v1/account/password' && request.method() === 'POST')))
          || (action === 'delete' && path === '/api/v1/account' && request.method() === 'DELETE')
        if (!expected) { unexpectedWrites++; return route.abort() }
        expect(request.headers().authorization).toBe('Bearer synthetic-smoke-token')
        mockWrites.push(path)
        return route.fulfill({ json: { requiresLogin: path !== '/api/v1/account/profile' } })
      })
      page.on('pageerror', (error) => errors.push(error.message))
      await page.goto(`${origin}${action === 'password' ? '/' : '/hesabim'}`, { waitUntil: 'domcontentloaded' })
      const header = page.locator('.site-header, .info-header')
      if (action !== 'delete') await expect(header.getByRole('link', { name: 'Yönetim Paneli', exact: true })).toBeInViewport()
      else await expect(header.getByRole('link', { name: 'Yönetim Paneli' })).toHaveCount(0)
      await header.getByRole('button', { name: 'Hesabım', exact: true }).click()
      await expect(header.getByRole('menuitem', { name: 'Rezervasyonlarım' })).toBeVisible()
      await expect(header.getByRole('menuitem', { name: 'Çıkış yap' })).toBeVisible()
      await header.getByRole('menuitem', { name: 'Kişisel bilgilerim' }).click()
      await expect(page).toHaveURL(/\/hesabim#kisisel-bilgilerim$/)
      await expect(page.locator('.account-settings__form')).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
      if (action === 'password') {
        const profileForm = page.locator('.account-settings__form')
        await profileForm.getByLabel('Ad', { exact: true }).fill('Updated')
        await profileForm.getByRole('button', { name: 'Bilgilerimi güncelle' }).click()
        await expect(profileForm.getByRole('status')).toContainText('Kişisel bilgilerin güncellendi')
        await page.getByText('Şifremi değiştir', { exact: true }).click()
        const form = page.locator('.account-settings__disclosure').first().locator('form')
        await form.getByLabel('Mevcut şifre', { exact: true }).fill('FixturePassword1')
        await form.getByLabel('Yeni şifre', { exact: true }).fill('ChangedPassword2')
        await form.getByLabel('Yeni şifre tekrar', { exact: true }).fill('ChangedPassword2')
        await page.screenshot({ path: `test-results/live-account-password-${viewport.width}.png`, fullPage: true })
        await form.getByRole('button', { name: 'Şifremi güncelle' }).click()
        await expect(page).toHaveURL(/\/login$/)
        await expect(page.getByRole('status')).toContainText('Şifren güncellendi')
        expect(mockWrites).toEqual(['/api/v1/account/profile', '/api/v1/account/password'])
      } else if (action === 'delete') {
        await page.getByText('Hesabımı sil', { exact: true }).click()
        const form = page.locator('.account-settings__delete form')
        const submit = form.getByRole('button', { name: 'Hesabımı kalıcı olarak sil' })
        await expect(submit).toBeDisabled()
        await form.getByLabel('Mevcut şifre', { exact: true }).fill('FixturePassword1')
        await form.getByLabel('Onaylamak için SİL yaz').fill('SİL')
        await form.getByRole('checkbox').check()
        await submit.click()
        await expect(page).toHaveURL(/\/login$/)
        await expect(page.getByRole('status')).toContainText('Hesabın silindi')
        expect(mockWrites).toEqual(['/api/v1/account'])
      } else {
        await expect(page.getByLabel('E-posta adresi', { exact: true })).toHaveAttribute('readonly', '')
        await page.getByText('Hesabımı sil', { exact: true }).click()
        await expect(page.locator('.account-settings__delete')).toContainText('sistem tarafından korunuyor')
        await expect(page.getByRole('button', { name: 'Hesabımı kalıcı olarak sil' })).toHaveCount(0)
        expect(mockWrites).toEqual([])
      }
      expect(errors).toEqual([]); expect(unexpectedWrites).toBe(0)
      expect(await page.evaluate(() => JSON.stringify({ ...sessionStorage, ...localStorage }))).not.toContain('Password')
      console.log(JSON.stringify({ viewport: viewport.width, action, publishedUi: true, syntheticApiOnly: true, realMutations: 0, javascriptErrors: errors.length }))
      await context.close()
    }
  }
} finally { await browser.close() }
