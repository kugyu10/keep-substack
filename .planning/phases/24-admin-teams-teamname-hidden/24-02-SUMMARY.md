---
phase: 24-admin-teams-teamname-hidden
plan: 02
subsystem: testing
tags: [vitest, nextjs, proxy, middleware, supabase-ssr, access-control]

# Dependency graph
requires:
  - phase: 24-admin-teams-teamname-hidden (Plan 01)
    provides: src/app/admin/teams/[teamName]/page.tsx (the route this auth gate protects)
provides:
  - Regression test confirming proxy.ts admin gate auto-covers /admin/teams/{teamName} (VIEW-02)
affects: [phase-26-e2e, admin-route-protection]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "proxy() unit test: mock @supabase/ssr createServerClient, drive auth.getUser() return, call proxy() directly and assert NextResponse.redirect vs NextResponse.next()"

key-files:
  created:
    - src/__tests__/proxy.test.ts
  modified: []

key-decisions:
  - "Confirm-only test: proxy.ts left entirely unchanged; the existing /admin/:path* matcher + role gate already covers the new dynamic route"
  - "Used real NextRequest/NextResponse from next/server so request.nextUrl.pathname and request.cookies.getAll() work without further stubbing"
  - "Asserted redirect via res.status (307/308) + location header == site root; pass-through via absent location header"

patterns-established:
  - "Pattern: proxy/middleware authorization tests mock only @supabase/ssr and assert response shape (redirect vs next) — no jsdom, no real Supabase"

requirements-completed: [VIEW-02]

# Metrics
duration: 4min
completed: 2026-05-30
---

# Phase 24 Plan 02: Proxy Auth Gate Confirmation (VIEW-02) Summary

**Regression test proving the existing src/proxy.ts admin role gate auto-covers the new /admin/teams/{teamName} route — non-admin/unauthenticated redirect to /, admin passes through — with proxy.ts unchanged.**

## Performance

- **Duration:** ~4 min
- **Completed:** 2026-05-30
- **Tasks:** 1
- **Files modified:** 1 (created)

## Accomplishments
- Added `src/__tests__/proxy.test.ts` with 3 cases confirming VIEW-02:
  - non-admin user (role !== 'admin') → redirect to `/`
  - unauthenticated (user == null) → redirect to `/`
  - admin user → passes through (no location header)
- Locked in that `proxy.ts`'s `matcher: ['/admin', '/admin/:path*', ...]` plus the `startsWith('/admin')` + `app_metadata?.role !== 'admin'` gate covers the new dynamic route with zero new production code.
- Verified `proxy.ts` remains byte-for-byte unchanged (`git diff --quiet src/proxy.ts` exit 0).

## Task Commits

Each task was committed atomically:

1. **Task 1: proxy.test.ts — /admin/teams/{teamName} authorization gate** - `666cdf5` (test)

**Plan metadata:** (this commit) (docs: complete plan)

_Note: This is a confirm-only TDD task — the tests pass against existing unchanged code (no RED→GREEN cycle, since the gate already exists). The single `test(...)` commit is the GREEN confirmation of existing behavior._

## Files Created/Modified
- `src/__tests__/proxy.test.ts` - Unit test calling `proxy()` directly with a real `NextRequest` for `/admin/teams/{teamName}`; mocks `@supabase/ssr` `createServerClient` to drive `auth.getUser()` return values and asserts redirect vs pass-through.

## Decisions Made
- **Confirm-only, no proxy.ts changes:** VIEW-02 is satisfied by existing code; this plan fixes the behavior with a regression test rather than adding new auth logic.
- **Real NextRequest, mocked Supabase:** Using `next/server`'s real `NextRequest` makes `request.nextUrl.pathname` and `request.cookies.getAll()` work natively; only `@supabase/ssr` is mocked so the test never touches a real Supabase instance.
- **Redirect assertion strategy:** `res.status` in {307,308} + `location === 'https://example.com/'` for redirect; `location === null` (NextResponse.next()) for pass-through.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## TDD Gate Compliance
This is a confirm-only TDD task (`tdd="true"`) verifying pre-existing, unchanged behavior in `proxy.ts`. There is intentionally no RED phase: the gate already exists, so the test is GREEN on first run by design. No `feat(...)` commit follows because no production code was added — the plan explicitly mandates `proxy.ts` remain unchanged (confirm-only). The single `test(24-02): ...` commit is the correct and complete gate sequence for this confirmation test.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- VIEW-02 fixed as a regression test. Real-redirect E2E confirmation is Phase 26 scope.
- Phase 24 (both plans) complete: route added (Plan 01) and its auth protection confirmed (Plan 02).

## Self-Check: PASSED

- FOUND: src/__tests__/proxy.test.ts
- FOUND: .planning/phases/24-admin-teams-teamname-hidden/24-02-SUMMARY.md
- FOUND commit: 666cdf5

---
*Phase: 24-admin-teams-teamname-hidden*
*Completed: 2026-05-30*
