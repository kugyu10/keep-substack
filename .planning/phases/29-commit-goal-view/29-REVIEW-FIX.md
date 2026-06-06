---
phase: 29-commit-goal-view
fixed_at: 2026-06-04T09:02:00Z
review_path: .planning/phases/29-commit-goal-view/29-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 29: Code Review Fix Report

**Fixed at:** 2026-06-04T09:02:00Z
**Source review:** .planning/phases/29-commit-goal-view/29-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6 (CR-01, CR-02, WR-01, WR-02, WR-03, WR-04)
- Fixed: 6
- Skipped: 0

## Fixed Issues

### CR-01: Supabase `slotsData` error silently swallowed — all slots lost on DB failure

**Files modified:** `src/app/page.tsx`
**Commit:** 18ccadc
**Applied fix:** Destructured `error: slotsError` from the Supabase query result and added an explicit `if (slotsError) { throw slotsError }` guard after the select call. Errors now propagate loudly through Next.js error monitoring instead of silently falling back to an empty array.

---

### CR-02: `article.link` is `undefined`-able but used as `href` without guard — broken anchor rendered

**Files modified:** `src/components/CommitGrid.tsx`
**Commit:** e381a82
**Applied fix:** Changed the render condition from `if (article && article.thumbnail)` to `if (article && article.thumbnail && article.link)` for the anchor branch. Added a second fallback branch for `article && article.thumbnail` (without link) that renders the image in a `<div>` instead of an `<a>`, so thumbnail-only articles still display without producing a broken `href={undefined}` anchor.

---

### WR-01: `COLS_CLASS` only covers 1–4 slots; 5–7 slots fall back to `grid-cols-1` producing a broken layout

**Files modified:** `src/components/CommitGrid.tsx`
**Commit:** 8b58cee
**Applied fix:** Extended the `COLS_CLASS` static map to include all 7 day-of-week values (`grid-cols-5`, `grid-cols-6`, `grid-cols-7`) as complete literal strings, satisfying the existing Pitfall 2 comment against dynamic class names. Updated the comment to clarify that the map covers the full ISO 1–7 range.

---

### WR-02: `Member.id` is optional — slot matching silently yields no results when `id` is absent

**Files modified:** `src/lib/types.ts`, `src/lib/__tests__/members.test.ts`, `src/lib/__tests__/commitUtils.test.ts`, `src/lib/__tests__/fetchFeed.test.ts`, `src/app/__tests__/page.test.tsx`, `src/app/weekly-stamp/__tests__/page.test.tsx`, `src/app/admin/teams/__tests__/teamPage.test.tsx`
**Commit:** f719c44
**Applied fix:** Option A — made `Member.id` a required field (removed `?`) and moved it to the top of the type definition. Updated all seven test fixtures that constructed `Member` objects without `id` to include placeholder UUIDs. The `CommitGoalView.tsx` filter `slots.filter((s) => s.member_id === member.id)` is now guaranteed to work correctly since `id` can no longer be `undefined`.
**Note:** This fix changes a TypeScript type contract. Logic correctness (slot matching) depends on `getMembers()` always providing `id` from the DB — requires human verification that the DB query always returns a non-null `id`.
**Status:** fixed: requires human verification

---

### WR-03: Team `status` field is not persisted in `addMember` and `updateMember` — new teams created with no status

**Files modified:** `src/lib/members.ts`
**Commit:** d17c7ea
**Applied fix:** Changed both `addMember` and `updateMember` team-upsert loops from `member.teams.map(t => t.name)` (iterating name-only strings) to iterating full team objects. The upsert payload now includes `{ name: teamObj.name, status: teamObj.status }` so the team `status` is written to the DB on create. On conflict (`onConflict: 'name'`), this will also update the status of an existing team — which is the correct behavior for upsert semantics.

---

### WR-04: Behavioral divergence between main page and `/weekly-stamp` on team-selected view for hidden members — untested in `/weekly-stamp`

**Files modified:** `src/app/weekly-stamp/__tests__/page.test.tsx`
**Commit:** 8bf6ed4
**Applied fix:** Added a new test `'team-selected view: excludes hidden-status members even when they belong to the selected team'` that explicitly documents and verifies the intentional divergence. The test constructs a roster with Alice (Alpha/public), Bob (Beta/public), and Carol (Alpha/hidden), renders with `team=Alpha`, and asserts that only Alice appears in results — Carol is excluded. A prominent comment in the test notes the divergence from the main page's TEAM-04(b) behavior.

---

## Skipped Issues

None — all findings were fixed.

---

_Fixed: 2026-06-04T09:02:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
