# Deferred Items — Phase 41

## Pre-existing tsc errors (out of scope for 41-01)

`npx tsc --noEmit` reports pre-existing type errors unrelated to this plan's changes.
Confirmed pre-existing: stashing 41-01 changes still produced these errors (baseline 13 errors,
unchanged in count by 41-01 source). Not fixed per executor scope boundary (only auto-fix issues
directly caused by current task's changes).

Affected file:
- `src/lib/__tests__/saveArticles.test.ts` — TS2493 / TS2352 tuple-length and conversion errors
  (lines ~54, ~57). Test-only file; does not affect `npm test` (vitest) pass.

Recommendation: address in a dedicated test-hardening task or hotfix; not blocking 41-01.

## Pre-existing test failures (out of scope for 41-01)

`npm test` reports 5 failing tests in `src/app/(main)/my/__tests__/page.test.tsx`.
Confirmed pre-existing: checking out base commit `4597b91` (before 41-01 work) reproduces the
exact same 5 fail / 3 pass result. Unrelated to this plan's files (notes.ts, admin/notes page,
env). Not fixed per executor scope boundary.

41-01-owned tests are fully green: `src/lib/__tests__/notes.test.ts` 13/13 pass.
