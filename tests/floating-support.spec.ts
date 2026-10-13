import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.route('**/fonts.googleapis.com/**', (route) => route.abort())
  await page.route('**/fonts.gstatic.com/**', (route) => route.abort())
  await page.route('**/api/v1/**', (route) => route.fulfill({ status: 404, json: {} }))
})

test('ship is compact, transparent and has two accessible touch targets', async ({ page }, testInfo) => {
  await page.goto('/')
  const ship = page.getByRole('group', { name: 'İletişim ve erişilebilirlik', exact: true })
  await expect(ship).toBeVisible()
  const size = (await ship.boundingBox())!
  expect(size.width).toBeLessThanOrEqual(140)
  expect(size.height).toBeLessThanOrEqual(80)
  await expect(ship).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  const buttons = ship.getByRole('button')
  await expect(buttons).toHaveCount(2)
  for (const button of await buttons.all()) {
    const rect = (await button.boundingBox())!
    expect(rect.width).toBeGreaterThanOrEqual(44)
    expect(rect.height).toBeGreaterThanOrEqual(44)
  }
  await ship.screenshot({ path: testInfo.outputPath('ship.png') })
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
})

test('contact opens the shared form, traps focus, closes with Escape and never stores the draft', async ({ page }, testInfo) => {
  let writes = 0
  page.on('request', (request) => { if (request.url().includes('/api/v1/') && request.method() !== 'GET') writes++ })
  await page.goto('/')
  const trigger = page.getByRole('button', { name: 'İletişim formunu aç', exact: true })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: 'Nasıl yardımcı olabiliriz?' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByLabel('Ad soyad', { exact: true })).toBeVisible()
  await expect(dialog.getByLabel('E-posta adresi', { exact: true })).toBeVisible()
  await expect(dialog.getByLabel('Konu', { exact: true })).toBeVisible()
  await expect(dialog.getByLabel('Mesajın', { exact: true })).toBeVisible()
  await expect(dialog).toContainText('e-posta uygulamanızı açar')
  await dialog.getByLabel('E-posta adresi', { exact: true }).fill('fixture.private@example.test')
  await dialog.getByLabel('Mesajın', { exact: true }).fill('Unsaved private fixture')
  const saved = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))
  expect(saved).not.toContain('fixture.private@example.test')
  expect(saved).not.toContain('Unsaved private fixture')
  expect(await page.locator('#root').evaluate((root) => (root as HTMLElement).inert)).toBe(true)
  await dialog.getByRole('link', { name: 'İletişim sayfasına git' }).focus()
  await page.keyboard.press('Tab')
  await expect(dialog.getByRole('button', { name: 'Kapat', exact: true })).toBeFocused()
  await dialog.screenshot({ path: testInfo.outputPath('contact-panel.png') })
  expect(await dialog.evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(false)
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(trigger).toBeFocused()
  expect(await page.locator('#root').evaluate((root) => (root as HTMLElement).inert)).toBe(false)
  expect(writes).toBe(0)
})

test('accessibility controls apply, persist and reset only presentation preferences', async ({ page }, testInfo) => {
  await page.goto('/iletisim')
  const originalFont = await page.locator('.contact-form input[name=email]').evaluate((node) => getComputedStyle(node).fontSize)
  await page.getByRole('button', { name: 'Erişilebilirlik menüsünü aç' }).click()
  const dialog = page.getByRole('dialog', { name: 'Erişilebilirlik ayarları' })
  await dialog.getByRole('button', { name: 'Büyük', exact: true }).click()
  await expect(page.locator('.contact-form input[name=email]').first()).toHaveCSS('font-size', '18px')
  for (const name of ['Yüksek kontrast', 'Metin aralığı', 'Okunaklı yazı tipi', 'Bağlantıları vurgula', 'Hareketleri durdur']) {
    await dialog.getByRole('switch', { name, exact: true }).click()
    await expect(dialog.getByRole('switch', { name, exact: true })).toHaveAttribute('aria-checked', 'true')
  }
  await dialog.screenshot({ path: testInfo.outputPath('accessibility-panel.png') })
  const preferences = await page.evaluate(() => JSON.parse(localStorage.getItem('pereme-accessibility-settings')!))
  expect(preferences).toEqual({ textSize: 1, contrast: true, spacing: true, readableFont: true, highlightLinks: true, pauseMotion: true })
  await dialog.getByRole('button', { name: 'Kapat', exact: true }).click()
  await expect(page.locator('.contact-form input[name=email]')).toHaveCSS('color', 'rgb(7, 27, 53)')
  await expect(page.locator('.info-header nav a').first()).toHaveCSS('text-decoration-line', 'underline')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-pereme-a11y-textsize', '1')
  await page.getByRole('button', { name: 'Erişilebilirlik menüsünü aç' }).click()
  await expect(dialog.getByRole('switch', { name: 'Yüksek kontrast' })).toHaveAttribute('aria-checked', 'true')
  await dialog.getByRole('button', { name: 'Ayarları sıfırla' }).click()
  await expect(page.locator('html')).not.toHaveAttribute('data-pereme-a11y-textsize')
  expect(await page.evaluate(() => localStorage.getItem('pereme-accessibility-settings'))).toBeNull()
  await dialog.getByRole('button', { name: 'Kapat', exact: true }).click()
  await expect(page.locator('.contact-form input[name=email]')).toHaveCSS('font-size', originalFont)
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
})

test('changing the actual site language also translates both ship panels', async ({ page }) => {
  await page.goto('/iletisim')
  if (await page.locator('.info-language').isVisible()) await page.locator('.info-language').getByRole('button', { name: 'EN', exact: true }).click()
  else {
    await page.getByRole('button', { name: 'Menüyü aç', exact: true }).click()
    await page.locator('.info-mobile-menu').getByRole('button', { name: 'EN', exact: true }).click()
    await page.getByRole('button', { name: 'Close menu', exact: true }).click()
  }
  await expect(page.getByRole('group', { name: 'Contact and accessibility', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Open contact form', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveAccessibleName('How can we help?')
  await expect(page.getByRole('dialog').getByLabel('Email address')).toBeVisible()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Open accessibility menu', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveAccessibleName('Accessibility settings')
  await expect(page.getByRole('switch', { name: 'Pause animations' })).toBeVisible()
})

test('ship stays out of the way of reservation dialogs and returns when they close', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.pereme-support-ship')).toBeVisible()
  await page.evaluate(() => {
    const modal = document.createElement('div')
    modal.id = 'fixture-booking-overlay'; modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true')
    modal.textContent = 'Fixture booking dialog'; document.body.append(modal)
  })
  await expect(page.locator('.pereme-support-ship')).toHaveCount(0)
  await page.evaluate(() => document.getElementById('fixture-booking-overlay')!.remove())
  await expect(page.locator('.pereme-support-ship')).toBeVisible()
})

test('admin screens do not show the public ship or apply saved appearance overrides', async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem('peremetours-session', JSON.stringify({ accessToken: 'fixture-token', expiresAtUtc: '2099-01-01T00:00:00Z',
      user: { id: 'fixture-admin', firstName: 'Fixture', email: 'fixture@example.test', role: 'Admin' } }))
    localStorage.setItem('pereme-accessibility-settings', JSON.stringify({ contrast: true, textSize: 2 }))
  })
  await page.goto('/admin/users')
  await expect(page.getByRole('heading', { name: 'Kullanıcılar' })).toBeVisible()
  await expect(page.locator('.pereme-support-ship')).toHaveCount(0)
  await expect(page.locator('html')).not.toHaveAttribute('data-pereme-a11y-contrast')
})

test('malformed preferences and unavailable preference storage do not break the controls', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('pereme-accessibility-settings', '{ invalid json')
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function(key, value) {
      if (key === 'pereme-accessibility-settings') throw new DOMException('Fixture blocked storage', 'SecurityError')
      original.call(this, key, value)
    }
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Erişilebilirlik menüsünü aç' }).click()
  await page.getByRole('switch', { name: 'Hareketleri durdur' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-pereme-a11y-pausemotion', 'true')
  await expect(page.locator('.hero__image')).toHaveCSS('animation-name', 'none')
})

test('pause motion and OS reduced motion also stop scripted smooth scrolling', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    HTMLElement.prototype.scrollIntoView = function(options) {
      document.documentElement.setAttribute('data-fixture-scroll-behavior', typeof options === 'object' ? options.behavior ?? '' : '')
    }
  })
  await page.getByRole('button', { name: 'Erişilebilirlik menüsünü aç' }).click()
  await page.getByRole('switch', { name: 'Hareketleri durdur' }).click()
  await page.keyboard.press('Escape')
  await page.locator('.search-button').click()
  await expect(page.locator('html')).toHaveAttribute('data-fixture-scroll-behavior', 'auto')
  await page.getByRole('button', { name: 'Erişilebilirlik menüsünü aç' }).click()
  await page.getByRole('button', { name: 'Ayarları sıfırla' }).click()
  await page.keyboard.press('Escape')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.locator('.search-button').click()
  await expect(page.locator('html')).toHaveAttribute('data-fixture-scroll-behavior', 'auto')
})
