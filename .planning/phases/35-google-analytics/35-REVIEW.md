---
phase: 35-google-analytics
reviewed: 2026-06-08T00:00:00Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - src/app/page.tsx
  - src/app/__tests__/page.test.tsx
  - src/app/layout.tsx
findings:
  critical: 0
  warning: 2
  info: 1
  total: 3
status: issues_found
---

# Phase 35: Code Review Report

**Reviewed:** 2026-06-08
**Depth:** standard
**Files Reviewed:** 3
**Status:** issues_found

## Summary

This phase introduces two changes: (1) `src/app/layout.tsx` adds Google Analytics via `@next/third-parties/google`, conditionally rendered when `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set; and (2) `src/app/page.tsx` + `page.test.tsx` change team-tab visibility from `status === 'public'` to `status !== 'hidden'`, making private-status teams visible in tabs (TEAM-01).

The GA implementation in `layout.tsx` is structurally correct — the `&&` short-circuit narrows `string | undefined` to `string` before it reaches the `gaId: string` prop, TypeScript type checks pass, and the env-var guard prevents GA script injection in local development where the variable is absent. The TEAM-01 logic change in `page.tsx` and its corresponding test updates are correct.

Two warnings are raised: a missing env-var entry in `.env.example` (ops/onboarding risk), and a stale mock in the test file for a component not imported by the page under test. One info item covers a pre-existing unsafe type cast in the test.

---

## Warnings

### WR-01: `NEXT_PUBLIC_GA_MEASUREMENT_ID` absent from `.env.example`

**File:** `.env.example` (related to `src/app/layout.tsx:29-31`)
**Issue:** `layout.tsx` now requires `NEXT_PUBLIC_GA_MEASUREMENT_ID` for GA to function in production, but this variable is not documented in `.env.example`. Any developer or CI environment that uses `.env.example` as a setup reference will not know the variable exists, silently omitting GA without any indication. The `.env.example` already documents `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `RESEND_API_KEY` — this variable should follow the same pattern.
**Fix:** Add the following entry to `.env.example`:

```
# Google Analytics 4 — GA4 Measurement ID (G-XXXXXXXXXX形式)
# 本番環境（Vercel Production）にのみ設定する。設定なしの場合 GA スクリプトは読み込まれない
NEXT_PUBLIC_GA_MEASUREMENT_ID=
```

---

### WR-02: Stale `PrBanner` mock in `page.test.tsx` — component not imported by `page.tsx`

**File:** `src/app/__tests__/page.test.tsx:22-27`
**Issue:** The test file mocks `@/components/PrBanner`, but `src/app/page.tsx` does not import `PrBanner`. The mock therefore has no effect on the module under test. This creates two risks: (a) if `PrBanner` is added to `page.tsx` later, the test silently suppresses it without any explicit decision; (b) the mock accumulates as dead test code that increases maintenance burden without providing coverage.

```ts
// lines 22–27 — PrBanner is NOT imported by page.tsx; this mock is dead
vi.mock('@/components/PrBanner', () => ({
  default: () => null,
}))
```

**Fix:** Remove the `vi.mock('@/components/PrBanner', ...)` block entirely. If `PrBanner` is ever re-added to `page.tsx`, a new mock can be introduced at that time with an explicit comment.

---

## Info

### IN-01: Unsafe type cast for Supabase mock in test (pre-existing)

**File:** `src/app/__tests__/page.test.tsx:113-117`
**Issue:** The mock Supabase client is cast to `ReturnType<typeof createSupabaseAdminClient>` despite being a minimal stub object. TypeScript reports `TS2352` for this (confirmed via `npx tsc --noEmit`). While this is a pre-existing issue not introduced in this phase, it lives in the file being modified and the cast hides real type-safety problems. If the Supabase client interface changes, the test will continue to compile but may no longer accurately reflect the real call pattern.

```ts
// line 113-117
vi.mocked(createSupabaseAdminClient).mockReturnValueOnce({
  from: vi.fn(() => ({
    select: vi.fn(() => ({ data: null, error: { message: 'DB error', code: '500' } })),
  })),
} as ReturnType<typeof createSupabaseAdminClient>)  // TS2352 forced cast
```

**Fix:** Use `as unknown as ReturnType<typeof createSupabaseAdminClient>` to make the intent explicit, or extract a typed partial-mock helper so future changes to the Supabase interface surface as test compilation failures rather than silent mismatches.

---

_Reviewed: 2026-06-08_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
