---
phase: 35-google-analytics
plan: "01"
subsystem: top-page-team-tabs
tags: [team-visibility, filter-change, tdd]
dependency_graph:
  requires: []
  provides: [TEAM-01-private-tabs]
  affects: [src/app/page.tsx, src/app/__tests__/page.test.tsx]
tech_stack:
  added: []
  patterns: [status-filter-inversion]
key_files:
  created: []
  modified:
    - src/app/page.tsx
    - src/app/__tests__/page.test.tsx
decisions:
  - "D-01: Filter changed from t.status === 'public' to t.status !== 'hidden' (1-line change)"
  - "D-02: No visual distinction for private team tabs (no lock icon); same appearance as public"
  - "D-03: filteredMembers filter unchanged — private members shown in All view, hidden excluded"
metrics:
  duration: 59s
  completed: "2026-06-08"
  tasks_completed: 1
  files_modified: 2
---

# Phase 35 Plan 01: TEAM-01 Private Team Tab Visibility Summary

**One-liner:** Filter change from `t.status === 'public'` to `t.status !== 'hidden'` makes private teams appear as navigation tabs on the top page.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | TEAM-03 test updated to new spec | 461a56a | src/app/__tests__/page.test.tsx |
| 1 (GREEN) | TEAM-01 page.tsx filter implemented | 565fa5d | src/app/page.tsx |

## What Was Built

TEAM-01 requirement: private チームをトップページのチームタブに表示する。

Single-line change in `src/app/page.tsx` line 21:
- Before: `.flatMap((m) => m.teams.filter((t) => t.status === 'public').map((t) => t.name))`
- After:  `.flatMap((m) => m.teams.filter((t) => t.status !== 'hidden').map((t) => t.name))`

Corresponding TEAM-03 test in `src/app/__tests__/page.test.tsx` updated to assert:
- `expect(labels).toContain('PrivateTeam')` (was `not.toContain`)
- `expect(labels).toContain('SecretTeam')` (was `not.toContain`)
- `expect(labels).not.toContain('HiddenTeam')` (unchanged)

## Verification

- `npx vitest run src/app/__tests__/page.test.tsx` — 5/5 tests GREEN
- `npx vitest run` (full suite) — 150 tests across 22 files GREEN
- `src/app/page.tsx` line 21 contains `t.status !== 'hidden'`
- `filteredMembers` (lines 25-30) unchanged — `m.teams.every((t) => t.status !== 'hidden')` preserved

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Pre-existing TypeScript Issues (Out of Scope)

`npx tsc --noEmit` reports errors in:
- `src/lib/__tests__/saveArticles.test.ts` — tuple type errors (pre-existing, not caused by this task)
- `src/app/__tests__/page.test.tsx` line 113 — SupabaseClient cast in slotsError test (pre-existing)

These are logged as deferred items; they do not affect test execution or runtime behavior.

## TDD Gate Compliance

- RED gate commit: 461a56a (`test(35-01): add failing test for TEAM-01 private team tabs`)
- GREEN gate commit: 565fa5d (`feat(35-01): implement TEAM-01 — show private teams in tab filter`)
- REFACTOR gate: Not needed — implementation is a 1-line atomic change.

## Self-Check: PASSED

- [x] `src/app/page.tsx` exists and contains `t.status !== 'hidden'`
- [x] `src/app/__tests__/page.test.tsx` exists and contains `shows public AND private team names as tabs`
- [x] RED commit 461a56a exists
- [x] GREEN commit 565fa5d exists
- [x] Full suite: 150 tests, 22 files, all GREEN
