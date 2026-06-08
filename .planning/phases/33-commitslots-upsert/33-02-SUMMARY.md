---
phase: 33-commitslots-upsert
plan: "02"
subsystem: auth
tags: [bugfix, login, next-param, open-redirect, tdd]
dependency_graph:
  requires: [33-01]
  provides: [BUG-02-login-side]
  affects: [src/app/login/page.tsx, src/app/login/LoginForm.tsx, src/app/login/actions.ts]
tech_stack:
  added: []
  patterns: [searchParams-prop, hidden-input, encodeURIComponent, formData-get]
key_files:
  created: []
  modified:
    - src/app/login/page.tsx
    - src/app/login/LoginForm.tsx
    - src/app/login/actions.ts
    - src/app/login/__tests__/sendMagicLinkAction.test.ts
decisions:
  - "Open Redirect guard applied at page.tsx boundary: startsWith('/') && !startsWith('//')"
  - "Single-encode flow: page.tsx passes plain string, actions.ts encodes with encodeURIComponent"
  - "next validation only in page.tsx (not re-validated in actions.ts per D-05)"
metrics:
  duration: ~5min
  completed: "2026-06-08"
  tasks: 2
  files_changed: 4
---

# Phase 33 Plan 02: BUG-02 Login Side (next param propagation) Summary

**One-liner:** Login page reads searchParams.next, passes through hidden input to sendMagicLinkAction which appends ?next=encodeURIComponent(next) to callbackUrl.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Update login page, LoginForm, and sendMagicLinkAction for next param propagation | 16a9e02 | page.tsx, LoginForm.tsx, actions.ts |
| 2 | Update sendMagicLinkAction.test.ts — add Test L-2b for ?next= callbackUrl | 3c32094 | sendMagicLinkAction.test.ts |

## What Was Built

### page.tsx
- Added `searchParams: Promise<{ next?: string }>` prop to `LoginPage` component signature
- Awaits `searchParams` and extracts `next`
- Applies Open Redirect guard: `next && next.startsWith('/') && !next.startsWith('//')` → `safeNext`
- Passes `next={safeNext}` to `<LoginForm />`

### LoginForm.tsx
- Added `{ next?: string }` prop to component signature
- Renders `<input type="hidden" name="next" value={next} />` inside form when `next` is defined

### actions.ts
- Reads `formData.get('next') as string | null`
- Builds `callbackUrl` conditionally: `next ? \`${origin}/auth/callback?next=${encodeURIComponent(next)}\` : \`${origin}/auth/callback\``
- Existing error handling (lines 27-38) left unchanged

### sendMagicLinkAction.test.ts
- Updated `makeFormData` helper to accept optional `next?: string` second argument
- Added Test L-2b: `next='/my'` → emailRedirectTo = `http://localhost/auth/callback?next=%2Fmy`
- Added Test L-2c: no next → emailRedirectTo = `http://localhost/auth/callback` (exact, no query string)
- All 6 tests (L-1, L-2, L-2b, L-2c, L-3, L-4) pass

## Verification

- `npm test` exits 0: 129 tests pass across 20 test files
- page.tsx contains `searchParams: Promise<{ next?: string }>`
- page.tsx contains `startsWith('/') && !next.startsWith('//')` (Open Redirect guard)
- LoginForm.tsx contains `{ next?: string }` prop type
- LoginForm.tsx contains `type="hidden" name="next"`
- actions.ts contains `formData.get('next')`
- actions.ts contains `encodeURIComponent(next)` in callbackUrl construction

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all functionality fully wired.

## Threat Flags

No new security surfaces introduced beyond what the plan's threat model covers:
- T-33-04 (Open Redirect via searchParams.next): mitigated in page.tsx per plan
- T-33-05 (actions.ts formData.get('next')): accepted per plan (client-side DOM manipulation only affects acting user)

## Self-Check: PASSED

Files confirmed:
- src/app/login/page.tsx: FOUND
- src/app/login/LoginForm.tsx: FOUND
- src/app/login/actions.ts: FOUND
- src/app/login/__tests__/sendMagicLinkAction.test.ts: FOUND

Commits confirmed:
- 16a9e02: FOUND
- 3c32094: FOUND
