---
phase: 35-google-analytics
plan: 02
subsystem: ui
tags: [google-analytics, next-third-parties, layout, analytics]

requires:
  - phase: 35-01 (not a direct dep, but same phase)
    provides: package @next/third-parties already installed at v16.2.7
provides:
  - GoogleAnalytics component conditionally rendered in root layout
  - GA4 page view tracking active when NEXT_PUBLIC_GA_MEASUREMENT_ID is set
affects: [35-google-analytics, vercel-deployment]

tech-stack:
  added: []
  patterns:
    - "Conditional render via env var && pattern — NEXT_PUBLIC_* absence disables feature without NODE_ENV check"

key-files:
  created: []
  modified:
    - src/app/layout.tsx

key-decisions:
  - "Used && short-circuit (not NODE_ENV check) to control GA activation — env var presence is the sole gate"
  - "GoogleAnalytics placed as last child inside <body>, after Footer — consistent with @next/third-parties recommended placement"
  - "No non-null assertion (!) used — TypeScript narrowed to string by && pattern per D-07"

patterns-established:
  - "NEXT_PUBLIC_* optional feature toggle: {env.VAR && <Component prop={env.VAR} />}"

requirements-completed: [ANLT-01, ANLT-02]

duration: 5min
completed: 2026-06-08
---

# Phase 35 Plan 02: Google Analytics Summary

**GoogleAnalytics component from @next/third-parties/google added to root layout with NEXT_PUBLIC_GA_MEASUREMENT_ID env var guard — GA4 page view tracking enabled in production, silent in dev**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-06-08T15:08:00Z
- **Completed:** 2026-06-08T15:13:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Added `import { GoogleAnalytics } from '@next/third-parties/google'` to root layout
- Added conditional render `{process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && <GoogleAnalytics gaId={...} />}` as last child of `<body>`
- All 150 vitest tests green, zero TypeScript errors in layout.tsx
- No NODE_ENV check — activation is controlled entirely by env var presence

## Task Commits

1. **Task 1: layout.tsx に GoogleAnalytics コンポーネントを追加する** - `3516c43` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/app/layout.tsx` - Added GoogleAnalytics import and conditional render inside `<body>`

## Decisions Made
- Followed D-07 pattern exactly: `&&` short-circuit for TypeScript narrowing and conditional activation
- No NODE_ENV guard per D-10 — env var presence/absence is the sole activation control
- Placed GoogleAnalytics after Footer (last child of `<body>`) per @next/third-parties recommended pattern

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing TypeScript errors found in `src/app/__tests__/page.test.tsx` (line 113: SupabaseClient cast) and `src/lib/__tests__/saveArticles.test.ts` (tuple type errors). These are unrelated to layout.tsx and were present before this plan's execution. No errors in `src/app/layout.tsx` specifically.

## User Setup Required

**External service configuration required.** To enable GA4 page view tracking in production:

1. Go to Google Analytics → Admin → Data Streams → Web stream → Measurement ID (format: G-XXXXXXXXXX)
2. Go to Vercel Dashboard → Project Settings → Environment Variables
3. Add `NEXT_PUBLIC_GA_MEASUREMENT_ID` = `G-XXXXXXXXXX` with **Production only** scope
4. Redeploy the project for the env var to take effect (build-time inlining)

Local development: do NOT set this variable in `.env.local` — GA should remain disabled locally (per D-08).

## Next Phase Readiness
- GA4 integration complete. Once user adds `NEXT_PUBLIC_GA_MEASUREMENT_ID` to Vercel and redeploys, all pages will report page views to Google Analytics.
- No code changes needed after Vercel env var setup.

## Self-Check

Files exist:
- `src/app/layout.tsx` — FOUND (modified in place)

Commits exist:
- `3516c43` — feat(35-02): add GoogleAnalytics to root layout for GA4 page view tracking

## Self-Check: PASSED

---
*Phase: 35-google-analytics*
*Completed: 2026-06-08*
