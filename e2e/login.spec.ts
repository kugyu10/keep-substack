// E2E-01: an injected (test-account) session reaches /my without being
// redirected to /. This proves proxy.ts getUser() validated the minted
// storageState cookie (e2e/.auth/user.json) — the same @supabase/ssr cookie
// the deployed app reads. Runs under the `logged-in` project (storageState
// attached via playwright.config.ts). Real end-to-end: NO Supabase mocking.
import { test, expect } from '@playwright/test'

test('注入セッションで /my に到達できる (E2E-01)', async ({ page }) => {
  await page.goto('/my')

  // proxy.ts /my gate: !user → redirect '/'. Reaching /my proves the injected
  // cookie was server-side validated by getUser().
  await expect(page).toHaveURL(/\/my$/)
  await expect(
    page.getByRole('heading', { name: 'マイページ' })
  ).toBeVisible()
})
