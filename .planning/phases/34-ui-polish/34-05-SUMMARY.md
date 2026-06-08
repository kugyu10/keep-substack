---
phase: 34-ui-polish
plan: 05
subsystem: layout
tags: [footer, header, component-wiring, server-component]
dependency_graph:
  requires: [34-01, 34-02, 34-03, 34-04]
  provides: [Footer-wired, HeaderNav-wired]
  affects: [src/app/layout.tsx, src/components/Header.tsx]
tech_stack:
  added: []
  patterns: [Server Component delegation to Client Component, async Server Component]
key_files:
  created: []
  modified:
    - src/app/layout.tsx
    - src/components/Header.tsx
decisions:
  - "Removed inline footer JSX from layout.tsx and replaced with <Footer /> Server Component"
  - "Replaced inline nav conditional in Header.tsx with <HeaderNav user={user} /> delegating to Client Component"
  - "Pre-existing TypeScript errors in test files are out of scope (confirmed pre-existing before any changes in this plan)"
metrics:
  duration: ~5min
  completed: 2026-06-08
  tasks: 2
  files: 2
requirements: [UI-01, UI-02, UI-03, UI-04, UI-05]
---

# Phase 34 Plan 05: Wire Footer and HeaderNav Summary

Wire Footer and HeaderNav components (created in Plan 04) into the live application by replacing the inline footer in layout.tsx and the inline nav conditional in Header.tsx.

## What Was Built

- `src/app/layout.tsx`: Added `import Footer from '@/components/Footer'` and replaced the inline `<footer>` JSX block with `<Footer />`.
- `src/components/Header.tsx`: Added `import HeaderNav from './HeaderNav'` and replaced the inline `{user ? ... マイページ ... : ... ログイン ...}` conditional with `<HeaderNav user={user} />`. Header remains a Server Component.

## Task Results

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Wire Footer and HeaderNav | fa23c10 | src/app/layout.tsx, src/components/Header.tsx |
| 2 | Verify end-to-end wiring | (no files changed) | — |

## Verification Results

- `grep -c "import Footer from '@/components/Footer'" src/app/layout.tsx` = 1
- `grep -c "<Footer" src/app/layout.tsx` = 1
- `grep -c "このSubstack継続可視化ツールに参加したい方は" src/app/layout.tsx` = 0
- `grep -c "import HeaderNav from './HeaderNav'" src/components/Header.tsx` = 1
- `grep -c "<HeaderNav" src/components/Header.tsx` = 1
- `npm test`: 150 tests passing (22 test files)
- `src/app/(auth)/layout.tsx` exists (Plan 02)
- `export function achievementRate` in `src/lib/commitUtils.ts` (Plan 03)

## Deviations from Plan

### Pre-existing Issues (Out of Scope)

`tsc --noEmit` exits with errors in `.next/types/validator.ts` (generated Next.js types for missing page.js files) and in `src/app/__tests__/page.test.tsx` and `src/lib/__tests__/saveArticles.test.ts` (test file type assertion errors). Verified that these errors existed identically before any changes in this plan. They are pre-existing issues not caused by Plan 05 changes and are out of scope per deviation rule scope boundary.

## Known Stubs

None — all components are fully wired with real data sources.

## Threat Flags

No new security-relevant surface introduced. User object is passed from Header (Server Component) to HeaderNav (Client Component) as a serializable prop — consistent with T-34-05-01 (accepted). Auth layout behavior unchanged — consistent with T-34-05-02 (accepted).

## Self-Check: PASSED

- src/app/layout.tsx: FOUND
- src/components/Header.tsx: FOUND
- Commit fa23c10: FOUND
