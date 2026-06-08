---
phase: 33-commitslots-upsert
plan: 05
subsystem: test
tags: [vitest, playwright, e2e, middleware, admin-guard]

# Dependency graph
requires:
  - "33-01: middleware.ts /my auth guard"
  - "33-03: updateCommitSlotsAction RPC implementation"
provides:
  - "updateCommitSlotsAction.test.ts — RPC mock suite (already green from 33-03)"
  - "e2e/admin-guard.spec.ts — /my redirect asserts /login (not /)"
  - "src/admin-guard.ts — proxy.ts renamed, pure test utility"
  - "src/middleware.ts — /admin protection consolidated from proxy.ts"
affects: [npm test, npm run test:e2e, next build]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "proxy.ts → admin-guard.ts rename: Next.js 16 treats src/proxy.ts as legacy middleware filename; renamed to avoid middleware/proxy conflict"
    - "middleware.ts expanded to handle /admin (admin role check) + /my (login check) in single file"

key-files:
  created:
    - "src/admin-guard.ts"
    - ".planning/phases/33-commitslots-upsert/33-05-SUMMARY.md"
  modified:
    - "e2e/admin-guard.spec.ts"
    - "src/middleware.ts"
    - "src/__tests__/proxy.test.ts"
  deleted:
    - "src/proxy.ts"

key-decisions:
  - "proxy.ts renamed to admin-guard.ts — Next.js 16 treats any src/proxy.ts as legacy middleware, conflicting with src/middleware.ts"
  - "middleware.ts consolidated to handle /admin AND /my — single middleware entry point, cleaner architecture"
  - "E2E /my assertion uses regex /login(\\?next=.*)?/ — resilient to query string encoding variations"

# Metrics
duration: ~7min
completed: 2026-06-08
---

# Phase 33 Plan 05: Test Suite Green — RPC mock + E2E /login redirect Summary

**updateCommitSlotsAction tests already green from Plan 03; E2E /my redirect assertion updated to /login; proxy.ts/middleware.ts filename conflict resolved**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-06-08T01:40:00Z
- **Completed:** 2026-06-08T01:47:25Z
- **Tasks:** 2 (+ 1 Rule 3 deviation)
- **Files modified:** 4 (1 renamed, 1 deleted, 2 modified)

## Accomplishments

### Task 1: updateCommitSlotsAction.test.ts (Pre-completed in Plan 03)
- `mockAdminRpc` + `'replace_member_commit_slots'` assertions in place (committed `27d4791` in Plan 03)
- No `deleteSpy` or `insertSpy` references remain
- 7 tests in the suite pass; npm test: 128/128 pass

### Task 2: e2e/admin-guard.spec.ts — /my redirect assertion updated
- Test name: `'未認証で /my → /login にリダイレクト (E2E-03)'`
- Assertion: `toHaveURL(/http:\/\/localhost:3000\/login(\?next=.*)?/)` (regex, encoding-resilient)
- `/admin` test (line 11) unchanged — still asserts redirect to `/`

### Rule 3 Deviation: proxy.ts/middleware.ts filename conflict
- `npm run build` failed: "Both middleware file `./src/src/middleware.ts` and proxy file `./src/src/proxy.ts` are detected"
- Next.js 16 treats `src/proxy.ts` as legacy middleware filename, conflicting with `src/middleware.ts`
- Fix: renamed `src/proxy.ts` → `src/admin-guard.ts` (pure test utility)
- Updated `src/middleware.ts` to also handle `/admin` protection (same `user.role !== 'admin'` logic)
- Updated `src/__tests__/proxy.test.ts` import: `'../proxy'` → `'../admin-guard'`
- `npm run build`: succeeds, `npm test`: 128/128 pass, E2E: 5 passed

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| Task 1 | updateCommitSlotsAction.test.ts RPC mock | 27d4791 (Plan 03) | src/app/my/__tests__/updateCommitSlotsAction.test.ts |
| Rule 3 | proxy.ts/middleware.ts conflict fix | c8dd01a | src/proxy.ts→admin-guard.ts, src/middleware.ts, src/__tests__/proxy.test.ts |
| Task 2 | E2E admin-guard /my redirect assertion | 79d900a | e2e/admin-guard.spec.ts |

## Files Created/Modified

- `src/admin-guard.ts` (renamed from proxy.ts) — /admin 認可ロジック test utility module; no Next.js middleware config export
- `src/middleware.ts` — /my + /admin の両方を処理する統合 middleware; matcher: ['/admin', '/admin/:path*', '/my', '/my/:path*']
- `src/__tests__/proxy.test.ts` — import path updated to admin-guard
- `e2e/admin-guard.spec.ts` — /my test assertion updated to /login regex

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking Issue] proxy.ts/middleware.ts filename conflict**
- **Found during:** Task 2 verification (npm run build before E2E)
- **Issue:** Next.js 16 treats `src/proxy.ts` as a legacy "proxy file" middleware registration, conflicting with the new `src/middleware.ts`. Build error: "Both middleware file and proxy file are detected. Please use ./src/src/proxy.ts only."
- **Fix:**
  1. Renamed `src/proxy.ts` → `src/admin-guard.ts` (removed Next.js trigger filename)
  2. Expanded `src/middleware.ts` matcher to include `/admin` and `/admin/:path*`
  3. Added `/admin` protection logic (user.role !== 'admin' → redirect to /) in middleware.ts
  4. Updated `src/__tests__/proxy.test.ts` import from `'../proxy'` to `'../admin-guard'`
- **Files modified:** src/proxy.ts (deleted), src/admin-guard.ts (created), src/middleware.ts, src/__tests__/proxy.test.ts
- **Commit:** c8dd01a

## Known Stubs

None.

## Threat Flags

None — all security-relevant surface (admin auth gate) was preserved during the proxy.ts → admin-guard.ts rename. The /admin protection logic is functionally identical in middleware.ts.

## Self-Check: PASSED

- [x] `e2e/admin-guard.spec.ts` contains `/login` regex in /my test (not `'http://localhost:3000/'`)
- [x] `e2e/admin-guard.spec.ts` still contains `http://localhost:3000/` for /admin test (unchanged)
- [x] `src/admin-guard.ts` exists (renamed from proxy.ts)
- [x] `src/proxy.ts` deleted
- [x] `src/middleware.ts` contains /admin matcher entries
- [x] Commits c8dd01a and 79d900a exist in git log
- [x] `npm test` exits 0 (128 tests, 20 files)
- [x] `npm run build` exits 0 (no middleware conflict)
- [x] E2E: 5 passed (admin-guard: 3, login: 1, my-teams: 1)
