// Playwright E2E config for the Keep Substack app.
//
// WARNING (Pitfall 6): `reuseExistingServer: !process.env.CI` will ATTACH to any
// process already listening on :3000. If you have `npm run dev` running, STOP IT
// before `npm run test:e2e` — otherwise tests attach to a dev server built with
// production env and may read/write the WRONG (production) Supabase project.
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
      testMatch: ['login.spec.ts', 'my-teams.spec.ts'],
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/user.json' },
    },
    {
      name: 'anonymous',
      testMatch: ['admin-guard.spec.ts'],
      use: { ...devices['Desktop Chrome'] }, // no storageState
    },
  ],
  webServer: {
    // Build + start in production mode so middleware (proxy.ts) behaves exactly
    // as deployed and NEXT_PUBLIC_* are inlined under the test env.
    command: 'npm run build && npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
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
