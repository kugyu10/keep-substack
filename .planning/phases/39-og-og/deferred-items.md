# Phase 39 — Deferred / Out-of-Scope Items

Discovered during execution of 39-PLAN.md. NOT fixed (pre-existing, unrelated to OG work).

## Pre-existing tsc --noEmit errors (baseline, present before Phase 39 changes)

Verified via `git stash` of Phase 39 changes — identical 13 errors with and without OG changes.

1. **Stale `.next/dev/types/validator.ts` route validation errors** (7 errors)
   - References non-route-group paths (`src/app/daily/page.js`, `src/app/member/[publicationId]/page.js`, etc.)
   - Pages actually live under `src/app/(main)/`. Artifact is stale from a prior dev/build run.
   - Resolved naturally by a fresh `npm run build` (Next.js regenerates validator.ts).

2. **`src/app/(main)/__tests__/page.test.tsx:127`** — TS2352 Supabase client mock cast mismatch.

3. **`src/lib/__tests__/saveArticles.test.ts:36,39,54,57`** — TS2493/TS2352 tuple/undefined cast issues in test mocks.

These are test-file/tooling typing issues outside the OG scope. Not addressed per execute-plan scope boundary.
