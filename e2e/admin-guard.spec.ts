// E2E-03: the proxy.ts auth gate redirects unauthorized access to /.
//   - Anonymous → /admin and /my both redirect to / (anonymous project, no
//     storageState).
//   - A logged-in NON-admin user → /admin also redirects to / (the seeded
//     test user is intentionally non-admin per Open Question 1; reuse its
//     storageState via test.use on a nested describe).
// This exercises the REAL deployed gate (src/proxy.ts:34-45) — NO Supabase
// mocking, no production-code changes.
import { test, expect } from '@playwright/test'

test('未認証で /admin → / にリダイレクト (E2E-03)', async ({ page }) => {
  await page.goto('/admin')
  await expect(page).toHaveURL('http://localhost:3000/')
})

test('未認証で /my → /login にリダイレクト (E2E-03)', async ({ page }) => {
  await page.goto('/my')
  await expect(page).toHaveURL(/http:\/\/localhost:3000\/login(\?next=.*)?/)
})

// Non-admin logged-in case: middleware checks user.role === 'admin'
// (auth.users.role JWT claim — set via Supabase admin API or SQL:
//   UPDATE auth.users SET role = 'admin' WHERE id = '<uuid>')
// The seeded storageState user has no admin role, so /admin must still bounce
// to /. We attach the logged-in storageState only for this block — the rest of
// the file runs anonymous.
test.describe('非adminログイン済みユーザー', () => {
  test.use({ storageState: 'e2e/.auth/user.json' })

  test('非adminユーザーは /admin → / にリダイレクト (E2E-03)', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL('http://localhost:3000/')
  })
})
