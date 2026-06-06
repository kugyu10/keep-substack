---
phase: 27-substack-handle-db
plan: 02
subsystem: app-code
tags: [typescript, next.js, supabase, member-profile, substack-handle, auth-callback, calendar-grid]

# Dependency graph
requires:
  - phase: 27-substack-handle-db
    plan: 01
    provides: substack_handle TEXT NULL column in DB schema
provides:
  - Member type with substackHandle?: string field
  - getMembers() fetches and maps substack_handle column
  - /my page @handle input field (PROF-01)
  - updateMyProfileAction saves substack_handle with @-normalization (PROF-01)
  - /my page DB-priority pre-fill via substackHandleDefault (PROF-03)
  - auth/callback ?handle= forwarding to /my?handle= (PROF-03)
  - Login page ?handle= pass-through via hidden input and callbackUrl (PROF-03)
  - CalendarGrid profile link: <a href="https://substack.com/@handle"> (PROF-02)
affects: [member-monthly-view, my-page, auth-callback, login-flow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "substackHandle @-normalization: trim + startsWith('@') guard in Server Action"
    - "DB-wins-over-searchParams pattern: member?.substack_handle ?? handle ?? undefined"
    - "CalendarGrid conditional <a> wrapper: avatarNameBlock extracted as const, wrapped if substackHandle truthy"
    - "TDD RED/GREEN pattern: write failing tests first, then implement"
    - "vitest.config.ts @/ alias: path.resolve(__dirname, './src') for component test imports"
    - "React element tree inspection for testing client components without @testing-library/react"

key-files:
  created:
    - src/lib/__tests__/members.test.ts
    - src/app/auth/__tests__/callback.test.ts
    - src/components/__tests__/CalendarGrid.test.tsx
  modified:
    - src/lib/types.ts
    - src/lib/members.ts
    - src/app/my/actions.ts
    - src/app/my/page.tsx
    - src/app/my/MyProfileForm.tsx
    - src/app/auth/callback/route.ts
    - src/app/login-51cf21389c56/page.tsx
    - src/app/login-51cf21389c56/LoginForm.tsx
    - src/app/login-51cf21389c56/actions.ts
    - src/components/CalendarGrid.tsx
    - src/app/member/[publicationId]/page.tsx
    - vitest.config.ts

key-decisions:
  - "substackHandle is optional on Member type (?: string) — matches nullable DB column"
  - "CalendarGrid tested via React element tree inspection (page.test.tsx pattern) — @testing-library/react not installed; vi.mock('react') stubs useState"
  - "vitest.config.ts needed @/ alias to allow CalendarGrid.test.tsx to import CalendarGrid (which itself uses @/ imports)"
  - "substackHandleDefault uses (member as any)?.substack_handle to avoid TS narrowing issues on Supabase's dynamically-typed response"

# Metrics
duration: 25min
completed: 2026-06-02
---

# Phase 27 Plan 02: App Code — substackHandle field, /my handle input, CalendarGrid profile link Summary

**Implemented full app-layer support for PROF-01/02/03: Member type extended with substackHandle, /my page @handle input with @-normalization save, auth callback ?handle= forwarding, login flow handle pass-through, and CalendarGrid conditional profile link**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-06-02
- **Completed:** 2026-06-02
- **Tasks:** 3
- **Files modified:** 12 (11 source + 1 config)
- **Files created:** 3 test files

## Accomplishments

- Extended `Member` type with `substackHandle?: string` and updated `getMembers()` SELECT + mapper
- Added `substack_handle` field to `updateMyProfileAction` with D-08 normalization (trim, @-prefix, empty→null)
- Updated `/my/page.tsx` to receive `searchParams: Promise<{ handle?: string }>` and compute `substackHandleDefault` (DB value wins over searchParams per D-06)
- Added `@handle` input field in `MyProfileForm.tsx` (label: "Substack ハンドル", hint: "例: @yourname — ...")
- Updated `auth/callback/route.ts` to extract `?handle=` and redirect to `/my?handle=...`
- Updated login flow: `page.tsx` → `LoginForm.tsx` (hidden input) → `actions.ts` (callbackUrl with pid+handle params)
- Updated `CalendarGrid.tsx` with `substackHandle?: string` prop and conditional `<a>` wrapper
- Updated `member/[publicationId]/page.tsx` to pass `substackHandle` to `CalendarGrid`
- Added `@/` path alias to `vitest.config.ts` to unblock component tests
- Created 3 test files covering mapper logic, normalization, pre-fill priority, callback redirect, and CalendarGrid link

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend Member type + getMembers()** - `7da86ac` (feat)
2. **Task 2: /my page @handle field, save action, page.tsx pre-fill** - `861199c` (feat)
3. **Task 3: Auth callback handle propagation + CalendarGrid profile link** - `0d63076` (feat)

## Files Created/Modified

- `src/lib/types.ts` — Member type extended with `substackHandle?: string`
- `src/lib/members.ts` — `getMembers()` SELECT includes `substack_handle`; mapper adds `substackHandle: m.substack_handle ?? undefined`
- `src/lib/__tests__/members.test.ts` — NEW: mapper logic + Member type tests (TDD)
- `src/app/my/actions.ts` — `updateMyProfileAction` extracts and normalizes `substack_handle`
- `src/app/my/page.tsx` — `searchParams` prop added; `substackHandleDefault` computed; SELECT extended
- `src/app/my/MyProfileForm.tsx` — `substackHandleDefault?: string` prop; @handle input block added between name and teams
- `src/app/my/__tests__/updateMyProfileAction.test.ts` — Extended: 4 normalization tests
- `src/app/my/__tests__/page.test.tsx` — Extended: 3 DB-priority/searchParams-fallback tests
- `src/app/auth/callback/route.ts` — Extracts `?handle=`, redirects to `/my?handle=encodeURIComponent(handle)`
- `src/app/auth/__tests__/callback.test.ts` — NEW: 3 handle-forwarding tests
- `src/app/login-51cf21389c56/page.tsx` — `handle` added to searchParams type; passed to LoginForm
- `src/app/login-51cf21389c56/LoginForm.tsx` — `handle?: string` prop; hidden input added
- `src/app/login-51cf21389c56/actions.ts` — callbackUrl built with optional pid+handle combinations
- `src/components/CalendarGrid.tsx` — `substackHandle?: string` prop; avatarNameBlock extracted; conditional `<a>` wrapper
- `src/app/member/[publicationId]/page.tsx` — `substackHandle={memberResult.member.substackHandle}` passed to CalendarGrid
- `src/components/__tests__/CalendarGrid.test.tsx` — NEW: 3 profile link tests (React element tree inspection)
- `vitest.config.ts` — Added `resolve.alias` for `@/` → `./src` to unblock component tests

## Decisions Made

- CalendarGrid tested via React element tree inspection (calling component function directly with `useState` mocked) rather than `@testing-library/react` — avoids adding a new package
- `vitest.config.ts` needed the `@/` alias because CalendarGrid itself imports `@/lib/calendarUtils` which vitest must resolve
- `substackHandleDefault` uses `(member as any)?.substack_handle` to work with Supabase's dynamically-typed response type

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] vitest.config.ts missing @/ path alias for component tests**
- **Found during:** Task 3 — CalendarGrid.test.tsx import of CalendarGrid failed because CalendarGrid imports `@/lib/calendarUtils` and vitest had no alias resolution
- **Issue:** `Error: Cannot find package '@/lib/calendarUtils'` in test runner
- **Fix:** Added `resolve.alias: { '@': path.resolve(__dirname, './src') }` to vitest.config.ts
- **Files modified:** vitest.config.ts
- **Commit:** 0d63076

**2. [Rule 1 - Bug] CalendarGrid test: @testing-library/react not available**
- **Found during:** Task 3 — original test implementation used `import { render } from '@testing-library/react'` but the package is not installed
- **Issue:** `Error: Cannot find package '@testing-library/react'`
- **Fix:** Rewrote CalendarGrid test to use React element tree inspection pattern (same as page.test.tsx) with `vi.mock('react', useState stub)` — no additional packages needed
- **Files modified:** src/components/__tests__/CalendarGrid.test.tsx
- **Commit:** 0d63076

## Known Stubs

None — all data flows are wired end-to-end. substackHandle flows from DB → getMembers() → member page → CalendarGrid → link href.

## Threat Surface Scan

No new threat surface beyond what was documented in the plan's threat model (T-27-03 through T-27-06):
- T-27-04: `encodeURIComponent(handle)` applied in callback redirect — implemented as specified
- T-27-05: CalendarGrid href hardcodes `'https://substack.com/'` as domain prefix — implemented as specified
- T-27-06: trim + startsWith('@') normalization in Server Action — implemented as specified

## Pre-existing Issues (Out of Scope)

- `src/app/__tests__/page.test.tsx`: 1 pre-existing failing test ("team-selected view: shows members of selected team REGARDLESS of status") — was failing before this plan's changes; out of scope per scope boundary rule. Logged to deferred-items.
- `src/lib/__tests__/saveArticles.test.ts`: 6 pre-existing TypeScript errors (tuple type issues) — pre-existing before this plan; out of scope.

## Self-Check

Checking created files exist:
- src/lib/__tests__/members.test.ts: FOUND
- src/app/auth/__tests__/callback.test.ts: FOUND
- src/components/__tests__/CalendarGrid.test.tsx: FOUND
- src/components/CalendarGrid.tsx substackHandle prop: FOUND
- src/app/my/MyProfileForm.tsx substack_handle input: FOUND

Checking commits exist:
- 7da86ac (Task 1): FOUND
- 861199c (Task 2): FOUND
- 0d63076 (Task 3): FOUND

## Self-Check: PASSED

---
*Phase: 27-substack-handle-db*
*Completed: 2026-06-02*
