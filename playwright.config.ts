// Playwright E2E config for the Keep Substack app.
//
// WARNING (Pitfall 6 / CR-03): attaching to a process already listening on :3000
// risks read/writing the WRONG (production) Supabase project if a prod-env dev
// server is running. Server reuse is now OPT-IN ONLY (PW_REUSE_SERVER=1); by
// default Playwright starts its own TEST-env build. global-setup.ts additionally
// asserts the resolved Supabase URL is the TEST project ref (fail-fast denylist
// of the prod ref) before any write.
//
// WARNING (Pitfall 1): NEXT_PUBLIC_* are inlined at BUILD time. The webServer
// command MUST run `npm run build` under the test env (loaded from .env.test
// below) so the client/edge bundle points at the TEST Supabase project. Never
// use `next dev` here.
import { defineConfig, devices } from '@playwright/test'
import { config as loadEnv } from 'dotenv'

// Load .env.test BEFORE defineConfig so process.env is populated when the config
// object (and webServer.env) is constructed.
loadEnv({ path: '.env.test' })

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false, // shared test user + member_teams → serialize (Pitfall 5)
  workers: 1, // single shared test user races on member_teams under parallelism
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'logged-in',
      testMatch: [
        'login.spec.ts',
        'my-teams.spec.ts',
        '27-handle.spec.ts',
        '28-commit-flow.spec.ts',
      ],
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/user.json' },
    },
    {
      name: 'anonymous',
      testMatch: ['admin-guard.spec.ts', '29-layout-nav.spec.ts'],
      use: { ...devices['Desktop Chrome'] }, // no storageState
    },
    {
      // 375px viewport project for mobile 1-week collapse (Phase 29 #1).
      // Desktop Chrome engine + narrow viewport so Tailwind `hidden sm:flex`
      // media queries apply; storageState なし（`/` はログイン不要）。
      name: 'mobile-375',
      testMatch: ['29-mobile.spec.ts'],
      use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 800 } },
    },
  ],
  webServer: {
    // Build + start in production mode so middleware (proxy.ts) behaves exactly
    // as deployed and NEXT_PUBLIC_* are inlined under the test env.
    command: 'npm run build && npm run start',
    url: 'http://localhost:3000',
    // Opt-in only: prevents accidental attach to a prod-env server (CR-03).
    reuseExistingServer: process.env.PW_REUSE_SERVER === '1' && !process.env.CI,
    timeout: 180_000, // first `next build` can be slow
    env: {
      // Forward the test secrets into the app process (build + runtime).
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ?? 'test',
    },
  },
})
