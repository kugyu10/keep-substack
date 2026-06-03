---
phase: 29-commit-goal-view
plan: "02"
subsystem: ui-components
tags:
  - commit-grid
  - server-component
  - tailwind
  - responsive
  - tdd
dependency_graph:
  requires:
    - "Phase 29 Plan 01: CommitSlot type + commitUtils.ts (getWeekDates, matchArticleToSlot, sortMembersForCommitView)"
  provides:
    - "CommitGrid Server Component: 3-week flex-1 grid with CSS-only mobile collapse"
    - "CommitGoalRow Server Component: three-column layout (avatar+name / CommitGrid / w-8 placeholder)"
    - "CommitGoalView Server Component: member list sorted by sortMembersForCommitView"
    - "page.tsx: updated with 21-day filter + results21 variable"
  affects:
    - "src/app/page.tsx — now renders full CommitGoalView with 21-day filtered results"
    - "src/components/CommitGoalView.tsx — stub replaced with full implementation"
tech_stack:
  added: []
  patterns:
    - "Server Component three-column flex layout (HeatmapRow analog)"
    - "CSS-only responsive: hidden sm:flex for oldest 2 weeks (D-07/D-08)"
    - "Static Tailwind grid-cols class map (Pitfall 2 prevention)"
    - "JST articleDateMap built inline (isoToJSTDateKey loop)"
    - "21-day cutoff filter on isoDate string comparison (D-04)"
    - "TDD RED→GREEN: CommitGrid test written before component"
key_files:
  created:
    - src/components/CommitGrid.tsx
    - src/components/CommitGoalRow.tsx
    - src/components/__tests__/CommitGrid.test.tsx
  modified:
    - src/components/CommitGoalView.tsx
    - src/app/page.tsx
decisions:
  - "CommitGrid uses flex-1 week blocks (not 36-col grid) — each week block takes equal width automatically"
  - "articleDateMap built inline in CommitGrid (not via buildHeatmapArticleMap) — returns FeedItem[] not HeatmapArticle[]"
  - "CommitGoalRow wraps CommitGrid in flex-1 div — without wrapper, grid doesn't take up available space"
  - "page.tsx: results21 variable holds 21-day filtered results; slotsData cast to CommitSlot[] for type safety"
metrics:
  duration: "~4 min"
  completed: "2026-06-04"
  tasks: 3
  files: 5
---

# Phase 29 Plan 02: UI Component Implementation — CommitGrid + CommitGoalView + CommitGoalRow Summary

**One-liner:** CommitGrid Server Component (3-week flex grid, CSS-only mobile collapse, DAY_NAMES for unposted slots) + CommitGoalRow (three-column HeatmapRow-analog) + CommitGoalView (sorted member list) + page.tsx 21-day filter — VIEW-01 through VIEW-07 all satisfied.

## What Was Built

### Task 1: CommitGrid.tsx + CommitGrid.test.tsx (TDD, VIEW-04/05/06/07)

Created `src/components/CommitGrid.tsx`:
- Server Component (no `'use client'`)
- Props: `{ slots: CommitSlot[]; items: FeedItem[] }`
- Builds `articleDateMap: Map<string, FeedItem[]>` inline using `isoToJSTDateKey`
- Three week-blocks: `getWeekDates(-2)`, `getWeekDates(-1)`, `getWeekDates(0)` (oldest→current)
- Week 0 (oldest): `className="hidden sm:flex flex-1 gap-1"` — hidden on mobile
- Week 1 (middle): `className="hidden sm:flex flex-1 gap-1 border-l border-gray-200"` — hidden on mobile
- Week 2 (current): `className="flex flex-1 gap-1 border-l border-gray-200 sm:border-l-0"` — always visible
- Static `COLS_CLASS` map: `{ 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' }` — no dynamic class generation
- `DAY_NAMES` map (1=月 … 7=日) for unposted slots
- Posted cell: `<a>` wrapping `<img>` with `aspect-square rounded overflow-hidden` + `object-cover w-full h-full`
- Unposted cell: `<div>` with `aspect-square flex items-center justify-center rounded border border-dashed border-gray-300`

Created `src/components/__tests__/CommitGrid.test.tsx` (TDD RED→GREEN):
- 9 tests covering VIEW-04/05/07
- VIEW-04: cell count per slot count (1 slot → 3 cells total, 4 slots → 12 cells total)
- VIEW-05: unposted slot shows `月` text for day_of_week=1; all 7 day names render
- VIEW-07: weeks 0/1 have `hidden sm:flex` in className; week 2 has `flex` without `hidden`
- Structural: renders without throwing; outer flex container present

### Task 2: CommitGoalView.tsx + CommitGoalRow.tsx (VIEW-02/03/06)

Created `src/components/CommitGoalRow.tsx`:
- Server Component (no `'use client'`)
- Three-column flex layout identical to HeatmapRow structure
- Column 1 (avatar+name): `w-16 sm:w-52 shrink-0` Link to `/member/{publicationId}`; avatar `w-10 h-10 rounded-full`; name `hidden sm:block`; chevron `›`
- Column 2 (grid): if `slots.length === 0` → `未コミット` grey text (VIEW-06); otherwise `CommitGrid` wrapped in `flex-1` div
- Column 3 (achievement): `w-8 shrink-0` empty div (D-09 Phase 30 placeholder)

Updated `src/components/CommitGoalView.tsx` (replaced stub from Plan 01):
- Server Component (no `'use client'`)
- Calls `sortMembersForCommitView(results, slots)` to get sorted member list
- Filters `memberSlots = slots.filter(s => s.member_id === member.id)` per member
- Renders one `CommitGoalRow` per member
- Returns `null` for empty results

### Task 3: page.tsx 21-day filter (VIEW-02)

Updated `src/app/page.tsx`:
- Added `import type { CommitSlot }` for type safety
- Added 21-day cutoff: `const cutoff = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString()`
- Produces `results21` by filtering `item.isoDate >= cutoff` on each member's items
- Passes `results21` (not raw `results`) to `CommitGoalView`
- `slotsData ?? []` cast as `CommitSlot[]` for type safety

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all VIEW requirements (VIEW-01 through VIEW-07) are fully implemented:
- VIEW-01: `/weekly-stamp` route with WeeklyHeatmapGrid (Plan 01)
- VIEW-02: `/` renders CommitGoalView with member data
- VIEW-03: CommitGoalRow three-column layout
- VIEW-04: CommitGrid 3-week flex blocks
- VIEW-05: Posted slots → thumbnail img, unposted → DAY_NAMES
- VIEW-06: CommitGoalRow shows `未コミット` when slots.length === 0
- VIEW-07: week-0/1 have `hidden sm:flex`, week-2 always visible

Achievement column (D-09): `w-8 shrink-0` placeholder present. Phase 30 will fill it with 👑/🔥 icons.

## Threat Surface Scan

No new network endpoints or auth paths introduced. CommitGrid renders `<a target="_blank" rel="noreferrer">` for posted cells — T-29-04 mitigation is in place (href comes from server-side RSS FeedItem.link, not user-controlled input).

## Self-Check: PASSED

- `src/components/CommitGrid.tsx` — FOUND, contains `hidden sm:flex`, `DAY_NAMES`, `aspect-square`, no dynamic `grid-cols-${`
- `src/components/CommitGoalRow.tsx` — FOUND, contains `未コミット`, `w-8 shrink-0`, `CommitGrid`
- `src/components/CommitGoalView.tsx` — FOUND, contains `sortMembersForCommitView`, `CommitGoalRow`, no `use client` directive
- `src/components/__tests__/CommitGrid.test.tsx` — FOUND, 9 tests
- `src/app/page.tsx` — FOUND, contains `CommitGoalView`, `createSupabaseAdminClient`, `member_commit_slots`, `results21`, `revalidate = 300`, no `WeeklyHeatmapGrid`
- Commits: aa58956 (Task 1), 7dedf3b (Task 2), 1577616 (Task 3) — all exist in git log
- Full vitest suite: 88/88 passing (15 test files)
- TypeScript errors: only pre-existing `saveArticles.test.ts` errors (unrelated to this plan)
