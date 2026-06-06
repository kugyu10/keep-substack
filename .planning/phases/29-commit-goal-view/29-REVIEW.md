---
phase: 29-commit-goal-view
reviewed: 2026-06-04T00:00:00Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - src/app/__tests__/page.test.tsx
  - src/app/page.tsx
  - src/app/weekly-stamp/__tests__/page.test.tsx
  - src/app/weekly-stamp/page.tsx
  - src/components/CommitGoalRow.tsx
  - src/components/CommitGoalView.tsx
  - src/components/CommitGrid.tsx
  - src/components/__tests__/CommitGrid.test.tsx
  - src/lib/__tests__/commitUtils.test.ts
  - src/lib/commitUtils.ts
  - src/lib/members.ts
  - src/lib/types.ts
findings:
  critical: 2
  warning: 4
  info: 2
  total: 8
status: issues_found
---

# Phase 29: Code Review Report

**Reviewed:** 2026-06-04T00:00:00Z
**Depth:** standard
**Files Reviewed:** 12
**Status:** issues_found

## Summary

Phase 29 introduces `CommitGoalView`, `CommitGoalRow`, `CommitGrid`, and `commitUtils` as the new top-level view. The logic is generally sound, the JST-aware date arithmetic is correct, and the sorting/filtering contracts match their tests. However, two critical issues require attention before ship: a silent Supabase error swallow that causes every member to appear as "未コミット" on DB failure, and an `article.link`-undefined path that renders a broken anchor element. Four warnings cover layout breakage beyond 4 commit slots, a type-safety gap in `Member.id`, a behavioral divergence between the two pages on team-selected filtering, and un-persisted team status in write operations.

---

## Critical Issues

### CR-01: Supabase `slotsData` error silently swallowed — all slots lost on DB failure

**File:** `src/app/page.tsx:34-36`

**Issue:** The destructuring `const { data: slotsData } = await admin.from('member_commit_slots').select(...)` discards the `error` field. When the Supabase query fails (network issue, permissions, schema mismatch) `slotsData` is `null`, the `?? []` fallback produces an empty array, and every rendered `CommitGoalRow` shows "未コミット" with no indication anything is wrong. The page renders successfully with a status 200, making the failure invisible to operators and users alike.

**Fix:**
```typescript
const { data: slotsData, error: slotsError } = await admin
  .from('member_commit_slots')
  .select('member_id, day_of_week, hour')
if (slotsError) {
  // Fail loudly so the error surfaces in Next.js error monitoring / logs.
  // Alternatively: console.error + render a degraded UI, but never silently discard.
  throw slotsError
}
```

---

### CR-02: `article.link` is `undefined`-able but used as `href` without guard — broken anchor rendered

**File:** `src/components/CommitGrid.tsx:55-68`

**Issue:** `FeedItem.link` is typed `link?: string` (optional). The render branch at line 55 gates on `article.thumbnail` but not `article.link`. When an article has a thumbnail but no link (a valid RSS edge case), the rendered anchor is `<a href={undefined}>`. React serializes this as `<a>` with no `href`, making the cell appear clickable but navigate nowhere. This is not a crash, but it produces a broken UI element silently.

```typescript
// Current (line 55)
if (article && article.thumbnail) {
  return (
    <a href={article.link}  // ← can be undefined
```

**Fix:**
```typescript
if (article && article.thumbnail && article.link) {
  return (
    <a
      key={idx}
      href={article.link}
      target="_blank"
      rel="noreferrer"
      className="aspect-square rounded overflow-hidden block"
    >
```
If a thumbnail-only article should still render (as a non-linking image), replace the `<a>` with a `<div>` in the `else` branch for that case.

---

## Warnings

### WR-01: `COLS_CLASS` only covers 1–4 slots; 5–7 slots fall back to `grid-cols-1` producing a broken layout

**File:** `src/components/CommitGrid.tsx:23-28, 45`

**Issue:** The static map covers columns 1–4. `CommitSlot.day_of_week` is defined as `1–7`, meaning a member can legitimately commit on up to 7 days per week. For 5, 6, or 7 slots, `COLS_CLASS[n]` is `undefined`, the fallback `'grid-cols-1'` is applied, and all cells stack in a single column instead of the correct multi-column grid. The layout is wrong but there is no error or warning.

```typescript
// Current
const COLS_CLASS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
}
```

**Fix:**
```typescript
const COLS_CLASS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
  7: 'grid-cols-7',
}
```
All Tailwind grid-cols classes must appear as complete literal strings to survive PurgeCSS. The existing comment at line 22 ("NEVER use dynamic `grid-cols-${n}`") already acknowledges this requirement — the map simply needs to be extended.

---

### WR-02: `Member.id` is optional — slot matching silently yields no results when `id` is absent

**File:** `src/components/CommitGoalView.tsx:19`, `src/lib/types.ts:16`

**Issue:** `CommitGoalView` filters slots with `slots.filter((s) => s.member_id === member.id)`. `Member.id` is typed `id?: string`. When `id` is `undefined` (which TypeScript permits anywhere a `Member` is constructed), every `s.member_id === undefined` comparison is `false`, the filter returns `[]`, and `CommitGoalRow` renders "未コミット" for the member regardless of actual slot data. No error is raised, and TypeScript does not flag this at the call site because the field is optional.

In production `getMembers()` always sets `id`, so this does not currently cause visible harm. However, the type contract allows code paths (test fixtures, future refactors) to construct `Member` without `id`, and the resulting silent mismatch is hard to diagnose.

**Fix:** Make `id` required in `Member`, or add a guard in `CommitGoalView`:
```typescript
// Option A: Tighten the type (preferred)
// src/lib/types.ts
export type Member = {
  id: string   // required — remove the optional marker
  name: string
  publicationId: string
  // ...
}

// Option B: Guard in CommitGoalView (if Option A cannot be done yet)
const memberSlots = member.id
  ? slots.filter((s) => s.member_id === member.id)
  : []
```
If Option A is chosen, update test fixtures that omit `id` to include a placeholder UUID.

---

### WR-03: Team `status` field is not persisted in `addMember` and `updateMember` — new teams created with no status

**File:** `src/lib/members.ts:57-60, 114-117`

**Issue:** Both `addMember` and `updateMember` upsert teams using only `{ name: teamName }`:
```typescript
.upsert({ name: teamName }, { onConflict: 'name' })
```
The `Member.teams` type carries `{ name: string; status: string }`, but `status` is never written. For a brand-new team that does not yet exist in the DB, the row is created with the column's DB default for `status`. If that default is `'public'`, a team the caller intended as `'private'` is silently made public. The `teams.map(t => t.name)` discards the `status` field without comment.

**Fix:**
```typescript
// addMember and updateMember — include status in the upsert payload
for (const team of member.teams) {   // iterate full team object, not just name
  const { data: teamRow, error: teamError } = await supabase
    .from('teams')
    .upsert({ name: team.name, status: team.status }, { onConflict: 'name' })
    .select('id')
    .single()
  if (teamError) throw teamError
  // ...
}
```
Note: if `onConflict: 'name'` with an explicit `status` field performs an update on conflict, confirm that is the desired behavior (overwrite existing team status vs. insert-only).

---

### WR-04: Behavioral divergence between main page and `/weekly-stamp` on team-selected view for hidden members — untested in `/weekly-stamp`

**File:** `src/app/page.tsx:26-29`, `src/app/weekly-stamp/page.tsx:24-26`

**Issue:** The two pages apply different filtering logic when a team is selected via the `team` query parameter:

- `src/app/page.tsx` (line 28): `m.teams.some((t) => t.name === team)` — includes hidden-status members of the selected team.
- `src/app/weekly-stamp/page.tsx` (line 25): `m.teams.some((t) => t.name === team && t.status !== 'hidden')` — excludes hidden-status members even when they belong to the selected team.

This inconsistency means the same team tab shows different member sets depending on which page is viewed. The main page's behavior is intentional and covered by test TEAM-04(b). The `/weekly-stamp` behavior is not covered by any test — `src/app/weekly-stamp/__tests__/page.test.tsx` only validates `href` values and label collection; there is no test that verifies hidden members are excluded (or included) in the team-selected view for that page.

**Fix:** Either:
1. Align the behavior (decide one policy and apply it to both pages), or
2. Add a test to `/weekly-stamp/__tests__/page.test.tsx` that explicitly documents and verifies the intended divergence, preventing silent drift.

---

## Info

### IN-01: `any` typing in `getMembers` bypasses type safety across the entire data mapping path

**File:** `src/lib/members.ts:20, 24, 25`

**Issue:** `data.map((m: any) => ...)` and `(m.member_teams as any[]).map((mt: any) => ...)` suppress TypeScript's type checking for the entire Supabase response mapping. Combined with the untyped `createClient()` call in `admin.ts` (no `Database` generic), compile-time errors for misspelled column names, missing fields, or wrong types are not caught. This is the root cause that also silences the `newMember.id` null-access at line 67.

**Fix:** Pass the generated `Database` type to `createClient<Database>(...)` in `admin.ts`. Supabase CLI (`supabase gen types typescript`) produces this type from the schema. This eliminates the need for `any` casts in `members.ts` and enables type-safe column access throughout.

---

### IN-02: `CommitGoalRow` Column 3 is a silent visual placeholder with no semantic content

**File:** `src/components/CommitGoalRow.tsx:49-51`

**Issue:** The placeholder div for the achievement column is `aria-hidden="true"` and renders as a blank 8px space. The comment documents it as Phase 30 work, which is appropriate. However, the `w-8` placeholder consumes horizontal space that is never labeled, which may confuse screen-reader users who audit the DOM and find unexplained whitespace. This is low severity and expected given the phased delivery.

**Fix:** No action required before Phase 30. When Phase 30 fills this column, ensure the rendered element has an appropriate `aria-label` or is correctly hidden until populated.

---

_Reviewed: 2026-06-04T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
