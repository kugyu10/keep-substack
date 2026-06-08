---
phase: 34-ui-polish
plan: "02"
subsystem: auth-layout
tags: [route-group, layout, login, signin, logo, invitation-note]
dependency_graph:
  requires: []
  provides: [auth-layout, login-logo, signin-logo, invitation-note]
  affects: [src/app/(auth)/]
tech_stack:
  added: []
  patterns: [next-route-groups, server-component-layout]
key_files:
  created:
    - src/app/(auth)/layout.tsx
  modified:
    - src/app/(auth)/login/page.tsx
    - src/app/(auth)/signin-51cf21389c56/page.tsx
  moved:
    - src/app/login/ → src/app/(auth)/login/
    - src/app/signin-51cf21389c56/ → src/app/(auth)/signin-51cf21389c56/
decisions:
  - "(auth)/layout.tsx contains only a div wrapper — no html/body to avoid double-nesting with RootLayout"
  - "Logo is a p tag (non-clickable) with Georgia serif font-black text-2xl per D-06"
  - "Invitation note only on /login page, not on /signin-51cf21389c56 per D-09"
metrics:
  duration: "89s"
  completed_date: "2026-06-08"
  tasks_completed: 2
  files_changed: 11
---

# Phase 34 Plan 02: Auth Route Group and Logo/Invitation Note Summary

**One-liner:** Created `(auth)` Route Group with auth-only layout (no Header/Footer), added Georgia serif font-black "Keep Substack" logo above h1 on both auth pages, and added invitation-only note on /login page only.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Move login and signin directories into (auth) Route Group | e49dc2f | 8 files renamed (login/, signin-51cf21389c56/ + all sub-files) |
| 2 | Create (auth)/layout.tsx and update login/signin pages with logo and note | f92c466 | src/app/(auth)/layout.tsx (created), login/page.tsx, signin-51cf21389c56/page.tsx |

## Verification

All verification criteria passed:

- `ls src/app/(auth)/login/page.tsx` — exists
- `ls src/app/(auth)/signin-51cf21389c56/page.tsx` — exists
- `grep -c "min-h-screen flex flex-col items-center justify-center bg-background" src/app/(auth)/layout.tsx` — returns 1
- `grep -v "^//" src/app/(auth)/layout.tsx | grep -c "html"` — returns 0 (no html/body tags)
- `grep -c "招待" src/app/(auth)/login/page.tsx` — returns 1
- `grep -c "招待" src/app/(auth)/signin-51cf21389c56/page.tsx` — returns 0
- `npm test` — 128 tests pass (20 test files)

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None — all functionality is fully implemented and wired.

## Threat Surface Scan

No new network endpoints, auth paths, or schema changes introduced. The Route Group change is layout-only; authentication logic in login/page.tsx and middleware.ts is unchanged. T-34-02-02 (html/body double-nest) mitigated: layout.tsx contains no html or body tags (verified via grep).

## Self-Check: PASSED

- src/app/(auth)/layout.tsx — FOUND
- src/app/(auth)/login/page.tsx — FOUND
- src/app/(auth)/signin-51cf21389c56/page.tsx — FOUND
- Commit e49dc2f — FOUND
- Commit f92c466 — FOUND
