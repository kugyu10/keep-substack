---
phase: 26-e2e-playwright
plan: 03
subsystem: testing
tags: [playwright, e2e, supabase-ssr, session-injection, proxy-gate, member_teams]

# Dependency graph
requires:
  - phase: 26-01 (harness)
    provides: createTestAdmin(), TEST fixtures, e2e/.auth/user.json storageState, logged-in + anonymous projects
  - phase: 26-02 (TEST project)
    provides: provisioned TEST Supabase project + .env.test (schema applied via schema.sql)
provides:
  - e2e/login.spec.ts (E2E-01 injected session reaches /my)
  - e2e/my-teams.spec.ts (E2E-02 public-team join → member_teams INSERT + scoped afterEach cleanup)
  - e2e/admin-guard.spec.ts (E2E-03 anon + non-admin redirect to /)
  - Full 3-spec Playwright suite green (5 tests) + vitest unchanged (24 tests, no collision)
affects: [E2E-01, E2E-02, E2E-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Real end-to-end assertions against the deployed proxy.ts gate (no Supabase mocking) — distinct from src/__tests__/proxy.test.ts which mocks getUser()"
    - "DB-delta verification via expect.poll + createTestAdmin (service_role) — absorbs server-action latency, no waitForTimeout"
    - "Per-block storageState via nested test.use({ storageState }) inside the anonymous project for the non-admin /admin case"
    - "Scoped afterEach cleanup (delete by member_id, no truncate) keeps reruns deterministic (D-09)"

key-files:
  created:
    - e2e/login.spec.ts
    - e2e/my-teams.spec.ts
    - e2e/admin-guard.spec.ts
  modified: []

key-decisions:
  - "Non-admin /admin case implemented as a nested test.describe + test.use({storageState}) inside admin-guard.spec.ts (anonymous project) rather than a separate logged-in project entry — reuses the seeded non-admin user (Open Question 1 recommendation), no new fixture"
  - "afterEach resolves member id by publication_id then deletes ALL member_teams rows for that member (the only seeded member is the test member) — scoped, never a truncate (D-09)"
  - "Stale next-server on :3000 was stopped before running the suite to prevent reuseExistingServer attaching to a production-env build (Pitfall 6)"

patterns-established:
  - "E2E DB assertion: expect.poll(() => admin count) → toBe(n)"
  - "Anonymous-project spec can carry a logged-in sub-block via nested test.use storageState"

requirements-completed: [E2E-01, E2E-02, E2E-03]

# Metrics
duration: ~8min
completed: 2026-05-30
---

# Phase 26 Plan 03: E2E Specs Summary

**Three Playwright specs authored and proven green against the provisioned TEST Supabase project — injected session reaches /my (E2E-01), public-team join writes member_teams with scoped afterEach cleanup (E2E-02), and anon + non-admin access to /admin/(anon /my) redirects to / (E2E-03) — full 3-spec suite passes (5 tests) with vitest unchanged (24 tests, no runner collision) and zero production-code changes.**

## Performance

- **Duration:** ~8 min
- **Completed:** 2026-05-30T12:58:41Z
- **Tasks:** 2
- **Files modified:** 3 (3 created, 0 modified)

## Accomplishments
- `e2e/login.spec.ts` (E2E-01): `goto('/my')` → asserts `toHaveURL(/\/my$/)` (not redirected) + 「マイページ」 heading visible, proving proxy.ts `getUser()` validated the injected storageState cookie.
- `e2e/admin-guard.spec.ts` (E2E-03): anonymous `/admin` and `/my` both assert `toHaveURL('http://localhost:3000/')`; a nested `test.describe` with `test.use({ storageState })` adds the non-admin logged-in `/admin` → `/` case (seeded user is intentionally non-admin).
- `e2e/my-teams.spec.ts` (E2E-02): checkbox(`TEST.teamName`).check() → 保存する → `expect.poll` on `member_teams` count for the test member resolves to `1`; `test.afterEach` deletes only that member's `member_teams` rows (scoped by `member_id`, no truncate).
- Verified the FULL suite: `npx playwright test` → **5 passed** (3 specs across logged-in + anonymous projects, workers:1). `npx vitest run` → **24 passed** (src/** only, no e2e collision regression).
- Confirmed zero `src/` modifications (`git diff --name-only HEAD -- src/` empty).

## Task Commits

Each task was committed atomically:

1. **Task 1: E2E-01 login + E2E-03 admin-guard specs** — `184f2b9` (test)
2. **Task 2: E2E-02 my-teams join spec + full suite + vitest gate** — `b55cf79` (test)

## Files Created/Modified
- `e2e/login.spec.ts` — E2E-01: injected session reaches /my (heading 「マイページ」)
- `e2e/admin-guard.spec.ts` — E2E-03: anon /admin + /my redirect; non-admin /admin redirect via nested storageState
- `e2e/my-teams.spec.ts` — E2E-02: public-team join → member_teams INSERT (expect.poll) + scoped afterEach cleanup

## Suite-Run Status

**GREEN — not blocked.** The plan required actually running the app + Playwright against the TEST project; this was done successfully.

- `npx playwright test` (full suite, all 3 specs): **5 passed (24.0s)** — webServer ran `npm run build && npm run start` under `.env.test`.
- `npx vitest run`: **24 passed** — confirms vitest scopes to `src/**` and does not collect e2e specs (Pitfall 2 avoided).
- Benign WebServer log noise: the app attempts to fetch `https://e2e-test-publication.substack.com/feed` (the fake test publication) and logs `HTTP 404` via fetchWithRetry. This is expected — the seeded publication_id is not a real Substack feed — and does NOT affect any test assertion (all assertions target proxy.ts redirects, the /my heading, and the member_teams row count).

## Decisions Made
- **Non-admin /admin via nested storageState:** Rather than adding a third Playwright project, the non-admin logged-in `/admin`→`/` case lives in `admin-guard.spec.ts` (anonymous project) inside a `test.describe` that calls `test.use({ storageState: 'e2e/.auth/user.json' })`. Reuses the intentionally-non-admin seeded user (Open Question 1 recommendation). The rest of the file stays anonymous.
- **afterEach cleanup scope:** Resolves the member id by `publication_id` (the only seeded member) and deletes all of that member's `member_teams` rows — scoped, deterministic for reruns, never a truncate (D-09).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Stopped a stale next-server on :3000 before running the suite**
- **Found during:** Task 1 (pre-run port check)
- **Issue:** A leftover `next-server (v16.2.6)` process (PID 35214) was listening on :3000. `playwright.config.ts` sets `reuseExistingServer: !process.env.CI`, so the suite would have ATTACHED to that stale server — built under the wrong (production) env — instead of building under `.env.test` (Pitfall 6). This would have made the tests hit the production Supabase project.
- **Fix:** Killed PID 35214 and confirmed :3000 free before invoking Playwright (which then ran its own `npm run build && npm run start` under `.env.test`).
- **Files modified:** None (environmental only)
- **Verification:** `lsof -ti:3000` empty before the run; WebServer logs show a fresh build + `injected env from .env.test`.

---

**Total deviations:** 1 auto-fixed (environmental, blocking). No code/scope changes.

## Threat Model Compliance
- **T-26-04 (EoP — weakening proxy.ts to pass E2E-03):** Not triggered. Zero `src/` changes; E2E-03 exercises the REAL gate and the non-admin user is genuinely blocked.
- **T-26-03 (Tampering — leftover member_teams):** Mitigated. `afterEach` scoped delete by `member_id` (no truncate); suite ran against `.env.test` TEST project only.
- **T-26-06 (parallel write flakiness):** Accepted/mitigated by `workers:1` + `fullyParallel:false` (config); single shared deterministic test user.

## Known Stubs
None. All three specs make real end-to-end assertions against the running app + TEST Supabase project.

## Issues Encountered
Only the benign substack feed 404 WebServer log noise described under Suite-Run Status. No test failures.

## Self-Check: PASSED

All 3 created files verified present on disk; both task commits (184f2b9, b55cf79) present in git log. Full Playwright suite green (5 passed) and vitest green (24 passed) confirmed by direct run. No src/ modifications.

---
*Phase: 26-e2e-playwright*
*Completed: 2026-05-30*
