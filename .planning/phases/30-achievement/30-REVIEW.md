---
phase: 30-achievement
reviewed: 2026-06-05T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - src/lib/commitUtils.ts
  - src/lib/__tests__/commitUtils.test.ts
  - src/components/CommitGoalRow.tsx
  - src/components/CommitGoalView.tsx
  - src/components/__tests__/CommitGoalRow.test.tsx
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
status: issues_found
---

# Phase 30: Code Review Report

**Reviewed:** 2026-06-05T00:00:00Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Five files were reviewed: the core utility module `commitUtils.ts`, its unit tests, the `CommitGoalRow` presentational component, the `CommitGoalView` container, and the `CommitGoalRow` test file.

The logic in `commitUtils.ts` is mostly correct. The streak calculation loop (`offset = 0` to `offset >= -2`) is intentionally capped at three weeks, which is consistent with the spec, and edge cases (empty slots, out-of-range `day_of_week`) are guarded. The key defects found are a layout-breaking column width inconsistency between the header row and data rows, a mobile accessibility gap that leaves a Link element with no accessible text, and a missing test covering the streak sort tie-break path. There are no security or data-loss issues.

## Warnings

### WR-01: Achievement column width inconsistent between header spacer and data rows

**File:** `src/components/CommitGoalRow.tsx:52-61` / `src/components/CommitGoalView.tsx:35`

**Issue:** The header spacer for column 3 (achievement icon column) in `CommitGoalView` is `w-10` (40 px). However, in `CommitGoalRow` the same column is rendered as `w-8` (32 px) for `streak === 0` (line 52) and `streak === 1` (line 54), and only widens to `w-10` (line 58) for `streak >= 2`. Because the three columns in each row form a flex row alongside the header flex row, mismatched widths for the third column cause the grid to visually misalign for any member whose streak is 0 or 1. All rows should use the same width.

**Fix:** Use `w-10` consistently for all three streak branches in `CommitGoalRow` column 3:

```tsx
// streak === 0  (line 52)
<div className="w-10 shrink-0" aria-hidden="true" />

// streak === 1  (line 54)
<div className="w-10 shrink-0 flex items-center justify-center">
  <span role="img" aria-label="今週達成" className="text-sm leading-none">👑</span>
</div>

// streak >= 2 is already w-10 — no change needed
```

---

### WR-02: Link element has no accessible text on mobile viewports

**File:** `src/components/CommitGoalRow.tsx:18-37`

**Issue:** The `<Link>` wrapping the member avatar and name contains three children:
- `<img alt="">` — empty alt marks it as decorative; screen readers skip it.
- A name `<div>` with class `hidden sm:block` — Tailwind `hidden` compiles to `display: none`, which removes the element from the accessibility tree on viewports narrower than 640 px.
- A chevron `<span aria-hidden="true">` — explicitly hidden from screen readers.

On mobile (<640 px) the Link therefore has zero accessible text. A screen-reader user on mobile encounters an unlabelled interactive element, which is a WCAG 2.1 SC 4.1.2 (Name, Role, Value) failure.

**Fix:** Add a visually-hidden but screen-reader-visible label. The simplest approach is a `sr-only` span:

```tsx
<Link
  href={`/member/${member.publicationId}`}
  className="w-16 sm:w-52 shrink-0 pr-2 flex items-center gap-1 overflow-hidden"
>
  <span className="sr-only">{member.name}</span>
  {imageUrl ? (
    <img src={imageUrl} alt="" ... />
  ) : (
    <span className="w-10 h-10 rounded-full shrink-0 bg-gray-200 inline-block" aria-hidden="true" />
  )}
  <div className="flex-1 min-w-0 text-xs font-semibold leading-snug truncate hidden sm:block" aria-hidden="true">
    {member.name}
  </div>
  <span className="shrink-0 text-gray-400 text-sm" aria-hidden="true">›</span>
</Link>
```

---

### WR-03: `sortMembersForCommitView` sort comparator missing streak tie-break test

**File:** `src/lib/__tests__/commitUtils.test.ts:171-222`

**Issue:** The `sortMembersForCommitView` tests cover: (a) higher achievement rate sorts first, (b) addedAt ascending as final tie-break, (c) empty input, (d) no mutation. There is no test for criterion ②: when two members share the same achievement rate, the one with the higher streak should sort first. This leaves the streak branch in the comparator (lines 158–161 of `commitUtils.ts`) completely untested. A regression that inverts or removes that branch would not be caught.

**Fix:** Add a test such as:

```ts
it('breaks rate ties by streak weeks descending', () => {
  // Both members have 0% rate this week (no articles), but memberA has a streak
  // built from a prior week. Since this week is incomplete, streak = 0 for both.
  // To truly exercise streak tiebreak we need both to have equal rate but
  // different streaks. Achieve this by giving both members their slot fulfilled
  // this week but one also fulfilling last week.
  const thisWeekDates = getWeekDates(0)
  const lastWeekDates = getWeekDates(-1)
  const mondayThisIso = thisWeekDates[0] + 'T00:30:00.000Z'
  const mondayLastIso = lastWeekDates[0] + 'T00:30:00.000Z'

  const highStreak = member('HighStreak')
  const lowStreak  = member('LowStreak')

  const highResult = result(highStreak, [feedItem(mondayThisIso), feedItem(mondayLastIso)])
  const lowResult  = result(lowStreak,  [feedItem(mondayThisIso)])

  const slots: CommitSlot[] = [
    { member_id: highStreak.id, day_of_week: 1, hour: 10 },
    { member_id: lowStreak.id,  day_of_week: 1, hour: 10 },
  ]

  const sorted = sortMembersForCommitView([lowResult, highResult], slots)
  expect(sorted[0].member.name).toBe('HighStreak')
  expect(sorted[1].member.name).toBe('LowStreak')
})
```

---

## Info

### IN-01: `consecutiveWeekStreak` hardcodes look-back to three weeks with no documentation

**File:** `src/lib/commitUtils.ts:108`

**Issue:** The loop `for (let offset = 0; offset >= -2; offset--)` caps the streak at a maximum of 3. This is presumably intentional per spec, but the JSDoc comment at line 93 says "Returns the number of **consecutive weeks**…" without mentioning the cap. A future maintainer may not understand why the maximum is 3, and might accidentally change the bound, breaking the UI spec.

**Fix:** Add a comment to the loop bound:

```ts
// Look back at most 3 weeks (current + 2 prior). Spec caps streak display at 3.
for (let offset = 0; offset >= -2; offset--) {
```

---

### IN-02: `sortMembersForCommitView` rebuilds `articleDateMap` inside sort comparator

**File:** `src/lib/commitUtils.ts:154-160`

**Issue:** The sort comparator calls `buildArticleDateMap(a.items)` and `buildArticleDateMap(b.items)` directly for `achievementRate`, and then calls `consecutiveWeekStreak(aSlots, a.items)` (which in turn calls `buildArticleDateMap` again internally). For N members, a sort makes O(N log N) comparisons; each comparison rebuilds up to three maps per member. For the current typical N (small team lists) this is not a correctness issue. However, the inconsistency between `consecutiveWeekStreak` (pre-builds its map outside the loop, see line 106 comment "Pitfall 1 prevention") and the sort comparator (does not) is a maintenance hazard that documents one pitfall but introduces the same pattern in a caller. Pre-computing maps before the sort would align with the established pattern.

**Fix:** Pre-compute per-member maps outside the sort:

```ts
export function sortMembersForCommitView(
  results: MemberFeedResult[],
  slots: CommitSlot[]
): MemberFeedResult[] {
  const thisWeekDates = getWeekDates(0)

  // Pre-compute to avoid rebuilding inside comparator (mirrors consecutiveWeekStreak pattern)
  const mapCache = new Map(results.map((r) => [r.member.id, buildArticleDateMap(r.items)]))

  return [...results].sort((a, b) => {
    const aSlots = slots.filter((s) => s.member_id === a.member.id)
    const bSlots = slots.filter((s) => s.member_id === b.member.id)
    const aMap = mapCache.get(a.member.id)!
    const bMap = mapCache.get(b.member.id)!

    const aRate = achievementRate(aSlots, thisWeekDates, aMap)
    const bRate = achievementRate(bSlots, thisWeekDates, bMap)
    if (bRate !== aRate) return bRate - aRate

    const aStreak = consecutiveWeekStreak(aSlots, a.items)
    const bStreak = consecutiveWeekStreak(bSlots, b.items)
    if (bStreak !== aStreak) return bStreak - aStreak

    return a.member.addedAt.localeCompare(b.member.addedAt)
  })
}
```

Note: `consecutiveWeekStreak` still builds its own map internally; to fully eliminate redundancy it would need a variant accepting a pre-built map, but that is a larger refactor.

---

### IN-03: Dead helper functions in `CommitGoalRow.test.tsx` suppressed with `void`

**File:** `src/components/__tests__/CommitGoalRow.test.tsx:161-163`

**Issue:** `findByType`, `findAllByTag`, and `findAllByClassName` are defined (lines 23–75) but never called in any test. They are suppressed with `void` at the end of the file to silence the linter. This is scaffolding code that was not cleaned up after the test approach was settled. Dead code in test files adds noise and misleads future authors about how the component is expected to be tested.

**Fix:** Remove the three helper functions (`findByType`, `findAllByTag`, `findAllByClassName`) and their `void` suppressions at lines 161–163. The `isElement`, `flattenChildren`, and `collectText` helpers are used and should be kept.

---

_Reviewed: 2026-06-05T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
