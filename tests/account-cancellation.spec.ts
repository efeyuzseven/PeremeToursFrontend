import { expect, test, type Page } from '@playwright/test'

const guid = '22222222-2222-4222-8222-222222222222'
const booking = {
  id: '11111111-1111-4111-8111-111111111111',
  ticketCode: 'PRM-MOCK-ACCOUNT',
  tourName: 'Sunset',
  tourDate: '2099-10-08',
  departureTime: '18:30:00',
  departurePort: 'Kabataş',
  guestCount: 1,
  amount: 350,
  currency: 'TRY',
  status: 'Confirmed',
  paymentStatus: 'Paid',
  ticketingStatus: 'Issued',
  emailStatus: 'Sent',
  passengers: [
    { number: 1, name: 'Demo Guest', pnr: 'MOCKPNR', ticketGuid: guid },
  ],
}
async function session(page: Page, role = 'User') {
  await page.addInitScript(
    (userRole) =>
      sessionStorage.setItem(
        'peremetours-session',
        JSON.stringify({
          accessToken: 'mock-token',
          expiresAtUtc: '2099-01-01T00:00:00Z',
          user: {
            id: 'test-user',
            firstName: 'Demo',
            lastName: 'Guest',
            email: 'demo@example.test',
            role: userRole,
          },
        }),
      ),
    role,
  )
}
test.beforeEach(async ({ page }) => {
  await page.route('**/fonts.googleapis.com/**', (route) => route.abort())
  await page.route('**/fonts.gstatic.com/**', (route) => route.abort())
  await page.route('**/api/v1/**', (route) =>
    route.fulfill({ status: 404, json: {} }),
  )
})
test('account shows personal details, owned bookings and QR without overflow', async ({
  page,
  isMobile,
}, testInfo) => {
  await session(page)
  await page.route('**/account/profile', (route) => {
    expect(route.request().headers().authorization).toBe('Bearer mock-token')
    return route.fulfill({
      json: {
        firstName: 'Demo',
        lastName: 'Guest',
        email: 'demo@example.test',
        createdAtUtc: '2026-10-07T12:00:00Z',
      },
    })
  })
  await page.route('**/account/reservations', (route) =>
    route.fulfill({ json: [booking] }),
  )
  await page.goto('/hesabim')
  await expect(
    page.getByRole('heading', { name: 'Kişisel bilgilerim' }),
  ).toBeVisible()
  await expect(
    page.getByText('demo@example.test', { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Rezervasyonlarım' }),
  ).toBeVisible()
  await expect(page.getByTestId('ticket-qr')).toHaveCount(1)
  await expect(page.getByTestId('ticket-qr').locator('svg')).toHaveAttribute(
    'role',
    'img',
  )
  await expect(
    page.getByText(booking.ticketCode, { exact: true }),
  ).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false)
  await page.screenshot({
    path: testInfo.outputPath('account.png'),
    fullPage: true,
  })
  if (isMobile)
    await page.getByRole('button', { name: 'Menüyü aç', exact: true }).click()
  await page.getByRole('button', { name: 'EN', exact: true }).first().click()
  await expect(page.getByRole('heading', { name: 'My bookings' })).toBeVisible()
})
test('anonymous account visits require login without loading account data', async ({
  page,
}) => {
  let requests = 0
  page.on('request', (request) => {
    if (request.url().includes('/api/v1/account/')) requests++
  })
  await page.goto('/hesabim')
  await expect(page).toHaveURL(/\/login$/)
  expect(requests).toBe(0)
})
test('cancelled and uncertain bookings never show a usable QR', async ({
  page,
}) => {
  await session(page)
  await page.route('**/account/profile', (route) =>
    route.fulfill({
      json: {
        firstName: 'Demo',
        email: 'demo@example.test',
        createdAtUtc: '2026-10-07T12:00:00Z',
      },
    }),
  )
  await page.route('**/account/reservations', (route) =>
    route.fulfill({
      json: [
        {
          ...booking,
          cancellationStatus: 'ReviewRequired',
          passengers: [{ ...booking.passengers[0], ticketGuid: null }],
        },
      ],
    }),
  )
  await page.goto('/hesabim')
  await expect(
    page.getByText('İptal / iade kontrol ediliyor', { exact: true }),
  ).toBeVisible()
  await expect(page.getByTestId('ticket-qr')).toHaveCount(0)
})
for (const state of ['Completed', 'ReviewRequired'] as const) {
  test(`admin cancellation ${state} needs explicit confirmation and sends one request`, async ({
    page,
  }, testInfo) => {
    await session(page, 'Admin')
    let calls = 0
    await page.route('**/api/v1/admin/tickets', (route) =>
      route.fulfill({
        json: [
          {
            ...booking,
            customerName: 'Demo Guest',
            customerEmail: 'demo@example.test',
            canCancel: calls === 0,
            channel: 'Web',
            createdAtUtc: '2026-10-07T12:00:00Z',
            updatedAtUtc: '2026-10-07T12:00:00Z',
            cancellationStatus: calls ? state : null,
          },
        ],
      }),
    )
    await page.route(
      `**/api/v1/admin/tickets/${booking.id}/cancel`,
      async (route) => {
        calls++
        expect(route.request().postDataJSON()).toEqual({
          ticketCode: booking.ticketCode,
          expectedAmount: 350,
          reason: 'Mock cancellation',
        })
        await route.fulfill({
          json: {
            status: state,
            providerCancelled: true,
            failureCode:
              state === 'ReviewRequired' ? 'BANK_REVERSAL_UNKNOWN' : null,
          },
        })
      },
    )
    await page.goto('/admin/tickets')
    await page
      .getByRole('button', { name: 'Bileti iptal et', exact: true })
      .click()
    const dialog = page.getByRole('dialog')
    const confirm = dialog.getByRole('button', {
      name: 'İptali ve iadeyi onayla',
      exact: true,
    })
    await expect(confirm).toBeDisabled()
    await dialog
      .getByLabel('İptal nedeni', { exact: true })
      .fill('Mock cancellation')
    await dialog.getByRole('checkbox').check()
    await expect(confirm).toBeEnabled()
    expect(
      await dialog.evaluate(
        (element) => element.scrollWidth > element.clientWidth,
      ),
    ).toBe(false)
    await confirm.evaluate((element) => {
      ;(element as HTMLButtonElement).click()
      ;(element as HTMLButtonElement).click()
    })
    await expect(
      dialog.getByRole('heading', {
        name:
          state === 'Completed'
            ? 'İptal / iade onaylandı'
            : 'İptal / iade kontrol gerekli',
        exact: true,
      }),
    ).toBeVisible()
    expect(calls).toBe(1)
    await expect(
      dialog.getByRole('button', {
        name: 'İptal ve iadeyi yeniden dene',
        exact: true,
      }),
    ).toHaveCount(0)
    await expect(
      dialog.getByRole('button', {
        name: 'İptali ve iadeyi onayla',
        exact: true,
      }),
    ).toHaveCount(0)
    if (state === 'ReviewRequired')
      await expect(
        dialog.getByText(/Banka iptal\/iade sonucu doğrulanamadı/),
      ).toBeVisible()
    await page.screenshot({
      path: testInfo.outputPath(`cancel-${state}.png`),
      fullPage: true,
    })
  })
}

test('safe precheck failure can retry only after a fresh explicit confirmation', async ({
  page,
}) => {
  await session(page, 'Admin')
  let calls = 0
  await page.route('**/api/v1/admin/tickets', (route) =>
    route.fulfill({
      json: [
        {
          ...booking,
          customerName: 'Demo Guest',
          customerEmail: 'demo@example.test',
          channel: 'Web',
          canCancel: false,
          canRetryCancellation: calls < 2,
          cancellationStatus: calls < 2 ? 'ReviewRequired' : 'Completed',
          cancellationFailureCode:
            calls < 2 ? 'PROVIDER_CANCELLATION_CHECK_FAILED' : null,
          createdAtUtc: '2026-10-07T12:00:00Z',
          updatedAtUtc: '2026-10-07T12:00:00Z',
        },
      ],
    }),
  )
  await page.route(
    `**/api/v1/admin/tickets/${booking.id}/cancel`,
    async (route) => {
      calls++
      expect(route.request().postDataJSON()).toEqual({
        ticketCode: booking.ticketCode,
        expectedAmount: 350,
        reason: 'Mock cancellation',
      })
      await route.fulfill({
        json:
          calls === 1
            ? {
                status: 'ReviewRequired',
                providerCancelled: false,
                failureCode: 'PROVIDER_CANCELLATION_UNAVAILABLE',
                canRetry: true,
              }
            : { status: 'Completed', providerCancelled: true, canRetry: false },
      })
    },
  )
  await page.goto('/admin/tickets')
  await expect(page.getByText(/Banka iadesi başlatılmadı/)).toBeVisible()
  expect(calls).toBe(0)
  await page
    .getByRole('button', { name: 'İptal ve iadeyi yeniden dene', exact: true })
    .click()
  const dialog = page.getByRole('dialog')
  const confirm = dialog.getByRole('button', {
    name: 'İptali ve iadeyi onayla',
    exact: true,
  })
  await expect(confirm).toBeDisabled()
  await dialog
    .getByLabel('İptal nedeni', { exact: true })
    .fill('Mock cancellation')
  await dialog.getByRole('checkbox').check()
  await confirm.click()
  await expect(
    dialog.getByRole('heading', {
      name: 'İptal / iade başlatılamadı',
      exact: true,
    }),
  ).toBeVisible()
  await expect(
    dialog.getByText(/Banka iadesi henüz başlatılmadı/),
  ).toBeVisible()
  expect(calls).toBe(1)
  await dialog
    .getByRole('button', { name: 'İptal ve iadeyi yeniden dene', exact: true })
    .click()
  await expect(dialog.getByRole('checkbox')).not.toBeChecked()
  await expect(confirm).toBeDisabled()
  expect(calls).toBe(1)
  await dialog.getByRole('checkbox').check()
  await confirm.evaluate((element) => {
    ;(element as HTMLButtonElement).click()
    ;(element as HTMLButtonElement).click()
  })
  await expect(
    dialog.getByRole('heading', {
      name: 'İptal / iade onaylandı',
      exact: true,
    }),
  ).toBeVisible()
  expect(calls).toBe(2)
  await expect(
    dialog.getByRole('button', {
      name: 'İptal ve iadeyi yeniden dene',
      exact: true,
    }),
  ).toHaveCount(0)
})

test('bank confirmed refund succeeds without a provider warning or a false provider-success claim', async ({
  page,
}) => {
  await session(page, 'Admin')
  let calls = 0
  await page.route('**/api/v1/admin/tickets', (route) =>
    route.fulfill({
      json: [
        {
          ...booking,
          customerName: 'Demo Guest',
          customerEmail: 'demo@example.test',
          channel: 'Web',
          canCancel: calls === 0,
          cancellationStatus: calls ? 'Completed' : null,
          paymentStatus: calls ? 'Refunded' : 'Paid',
          status: calls ? 'Cancelled' : 'Confirmed',
          cancellationFailureCode: calls
            ? 'PROVIDER_CANCELLATION_UNKNOWN'
            : null,
          createdAtUtc: '2026-10-07T12:00:00Z',
          updatedAtUtc: '2026-10-07T12:00:00Z',
        },
      ],
    }),
  )
  await page.route(`**/api/v1/admin/tickets/${booking.id}/cancel`, (route) => {
    calls++
    return route.fulfill({
      json: {
        status: 'Completed',
        providerCancelled: false,
        canRetry: false,
        failureCode: 'PROVIDER_CANCELLATION_UNKNOWN',
      },
    })
  })
  await page.goto('/admin/tickets')
  await page
    .getByRole('button', { name: 'Bileti iptal et', exact: true })
    .click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('İptal nedeni', { exact: true }).fill('Mock refund')
  await dialog.getByRole('checkbox').check()
  await dialog
    .getByRole('button', { name: 'İptali ve iadeyi onayla', exact: true })
    .click()
  await expect(
    dialog.getByRole('heading', {
      name: 'İptal / iade onaylandı',
      exact: true,
    }),
  ).toBeVisible()
  await expect(
    dialog.getByText(/Banka iptal\/iade işlemini onayladı/),
  ).toBeVisible()
  await expect(dialog).not.toContainText(
    'EasyTicket iptali ve banka iptal/iade sonucu doğrulandı',
  )
  await expect(page.locator('body')).not.toContainText(
    'PROVIDER_CANCELLATION_UNKNOWN',
  )
  await expect(page.locator('body')).not.toContainText(
    'EasyTicket iptal edildi',
  )
  await expect(
    dialog.getByRole('button', {
      name: 'İptal ve iadeyi yeniden dene',
      exact: true,
    }),
  ).toHaveCount(0)
  expect(calls).toBe(1)
})
