# Deferred Items — Phase 42-1

Pre-existing issues discovered during 42-01 execution. OUT OF SCOPE (not caused by this plan's changes). Logged, not fixed.

## Pre-existing tsc errors (unrelated test files)

`npx tsc --noEmit` reports errors in files NOT modified by 42-01:

- `src/app/(main)/my/__tests__/page.test.tsx` — Supabase client mock type mismatch + `Expected 1 arguments, but got 0` (lines 131, 151, 179, 204, 213)
- `src/lib/__tests__/saveArticles.test.ts` — tuple/`undefined` conversion errors (lines 36, 39, 54, 57)

The new files `src/lib/comments.ts` and `src/lib/__tests__/comments.test.ts` produce **zero** tsc errors. The plan's per-task verify gate is `vitest run src/lib/__tests__/comments.test.ts` (30/30 green), which passes.
