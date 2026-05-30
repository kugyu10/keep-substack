---
phase: 26-e2e-playwright
plan: 01
subsystem: testing
tags: [playwright, e2e, supabase-ssr, vitest, session-injection, storageState]

# Dependency graph
requires:
  - phase: 23-team-status (status column) + 25-publication-id (member_publications)
    provides: teams.status='public' contract + members.publication_id the seed relies on
provides:
  - Installed @playwright/test 1.60.0 + chromium browser
  - playwright.config.ts (testDir e2e, globalSetup, workers:1, dotenv .env.test, webServer build+start, logged-in + anonymous projects)
  - vitest.config.ts scoping vitest run to src/** (no e2e collision)
  - e2e harness: createTestAdmin(), mintAuthCookies() via @supabase/ssr round-trip, TEST fixtures, idempotent non-admin seed + storageState writer
  - .env.test.example template + e2e/.auth/ gitignore hardening
affects: [26-02-provision-test-project, 26-03-specs, E2E-01, E2E-02, E2E-03]

# Tech tracking
tech-stack:
  added: ["@playwright/test@1.60.0", "chromium browser binary"]
  patterns:
    - "Session-injection auth: mint production-identical cookies via @supabase/ssr setSession round-trip (no hand-rolled sb-<ref>-auth-token encoding)"
    - "Two-runner isolation: vitest scoped to src/**, Playwright to e2e/**"
    - "Idempotent global-setup seed (upsert by unique key) + env fail-fast guard"

key-files:
  created:
    - playwright.config.ts
    - vitest.config.ts
    - e2e/helpers/admin.ts
    - e2e/helpers/session.ts
    - e2e/fixtures/test-data.ts
    - e2e/global-setup.ts
    - .env.test.example
  modified:
    - package.json
    - package-lock.json
    - .gitignore

key-decisions:
  - "Pinned @playwright/test to exact 1.60.0 (per RESEARCH Standard Stack) — npm wrote ^1.60.0 by default, re-pinned to exact"
  - "Cookie fidelity via @supabase/ssr round-trip, never hand-rolled base64/chunk encoding (RESEARCH Anti-Pattern)"
  - "Seeded test user is intentionally NON-admin so it doubles as the E2E-03 negative case"
  - "vitest.config.ts created solely to scope include to src/** (Pitfall 2)"

patterns-established:
  - "mintAuthCookies(email): generateLink → verifyOtp → setSession capture → Playwright cookie shape with domain:'localhost'"
  - "global-setup env fail-fast: throw on unset Supabase vars before any DB call"

requirements-completed: [E2E-01, E2E-02, E2E-03]

# Metrics
duration: ~10min
completed: 2026-05-30
---

# Phase 26 Plan 01: Playwright E2E Harness Summary

**Complete Playwright E2E harness — 1.60.0 + chromium installed, dotenv-driven config with logged-in/anonymous projects, vitest scoped to src/**, and an e2e/ harness that mints production-identical Supabase auth cookies via @supabase/ssr round-trip — all with zero production-code changes.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-05-30T08:20:00Z
- **Completed:** 2026-05-30T08:25:00Z
- **Tasks:** 3
- **Files modified:** 10 (7 created, 3 modified)

## Accomplishments
- Installed `@playwright/test@1.60.0` (exact pin) + chromium; added `test:e2e` / `test:e2e:ui` scripts without touching `"test": "vitest run"`.
- Authored `playwright.config.ts` (dotenv `.env.test` before `defineConfig`, `testDir: ./e2e`, `globalSetup`, `workers:1`, webServer `npm run build && npm run start`, `logged-in` + `anonymous` projects) and `vitest.config.ts` (`include: src/**`, `exclude: e2e/**`).
- Built the e2e harness: `createTestAdmin()` service_role clone, `mintAuthCookies()` via `@supabase/ssr` `setSession` round-trip (asserts `hashed_token`, `domain:'localhost'`, no hand-rolled encoding), `TEST` fixtures, and an idempotent `global-setup` (env fail-fast guard, NON-admin user, public team, `user_id`-linked member, storageState writer).
- Hardened secrets: `e2e/.auth/` gitignored, `.env.test.example` committed with placeholders only.

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Playwright + chromium, npm scripts, harden secrets** - `f38d20b` (chore)
2. **Task 2: playwright.config.ts and vitest.config.ts** - `32f8d18` (feat)
3. **Task 3: e2e harness (admin/session helpers, fixtures, global-setup)** - `9df80af` (feat)

## Files Created/Modified
- `playwright.config.ts` - E2E runner config: dotenv .env.test, e2e testDir, globalSetup, workers:1, webServer build+start, logged-in + anonymous projects
- `vitest.config.ts` - Scopes vitest run to src/**, excludes e2e/** (Pitfall 2)
- `e2e/helpers/admin.ts` - `createTestAdmin()` service_role client (RLS bypass) cloned from src/lib/supabase/admin.ts
- `e2e/helpers/session.ts` - `mintAuthCookies()` via @supabase/ssr setSession round-trip
- `e2e/fixtures/test-data.ts` - `TEST` constants with collision-safe `e2e-` prefixes
- `e2e/global-setup.ts` - env fail-fast + idempotent non-admin seed + storageState writer
- `.env.test.example` - placeholder template (TEST project + 5432 db push note)
- `package.json` / `package-lock.json` - @playwright/test@1.60.0 dep + scripts
- `.gitignore` - added `e2e/.auth/`

## Decisions Made
- **Exact pin 1.60.0:** `npm install -D` wrote `^1.60.0`; re-pinned to exact `1.60.0` in package.json and synced package-lock to honor the RESEARCH "exact pin" intent.
- **Round-trip cookie minting:** Used the same `@supabase/ssr` library the app reads with, guaranteeing `sb-<ref>-auth-token` format parity rather than hand-rolling base64/chunk encoding.
- **Non-admin seed user:** Serves double duty for the E2E-03 negative `/admin` case (no separate fixture needed).

## Deviations from Plan

None of substance — plan executed as written. One minor mechanical adjustment:

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Re-pinned @playwright/test from ^1.60.0 to exact 1.60.0**
- **Found during:** Task 1 (install)
- **Issue:** `npm install -D @playwright/test@1.60.0` recorded the caret range `^1.60.0` in package.json; the plan/RESEARCH specify an exact pin.
- **Fix:** Edited package.json to `"@playwright/test": "1.60.0"` and ran `npm install --package-lock-only` to sync the lockfile.
- **Files modified:** package.json, package-lock.json
- **Verification:** `npx playwright --version` → `Version 1.60.0`.
- **Committed in:** f38d20b (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking/cosmetic-pin).
**Impact on plan:** No scope creep; aligns dependency with RESEARCH exact-pin intent.

## Issues Encountered
None. `.env.test.example` required `git add -f` (matched by the `.env*` gitignore rule) — expected and handled.

## Known Stubs
None that block the plan goal. `e2e/.auth/user.json` is generated at runtime by `global-setup` (not committed). The harness is intentionally non-executable end-to-end until Plan 02 provisions `.env.test` against a dedicated TEST Supabase project — this is the documented gate, not a stub.

## User Setup Required
Plan 02 (next) must provision a dedicated TEST Supabase cloud project, apply `supabase/migrations/` via `supabase db push --db-url` (direct port 5432), and create `.env.test` from `.env.test.example`. Until then `npm run test:e2e` cannot run global-setup.

## Next Phase Readiness
- Harness contracts ready: any downstream spec can import `createTestAdmin`, `TEST`, and rely on `e2e/.auth/user.json` being produced by global-setup.
- `npx vitest run` stays green (24 tests, src/ only) — no runner collision.
- e2e/ TypeScript compiles with no errors.
- Blocker for actual E2E execution: provisioned `.env.test` (Plan 02).

## Self-Check: PASSED

All 8 created files verified present on disk; all 3 task commits (f38d20b, 32f8d18, 9df80af) present in git log.

---
*Phase: 26-e2e-playwright*
*Completed: 2026-05-30*
