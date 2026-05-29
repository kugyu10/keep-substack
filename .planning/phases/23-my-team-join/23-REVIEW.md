---
phase: 23-my-team-join
reviewed: 2026-05-30T00:00:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - src/app/my/actions.ts
  - src/app/my/page.tsx
  - src/app/my/MyProfileForm.tsx
  - src/app/my/__tests__/updateMyProfileAction.test.ts
findings:
  critical: 1
  warning: 4
  info: 1
  total: 6
status: issues_found
---

# Phase 23: Code Review Report

**Reviewed:** 2026-05-30T00:00:00Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Reviewed the member self-service public-team membership feature. The core
authorization/scoping design is sound: the name update is scoped to the
authenticated `user_id` (no client-supplied `member_id`), the membership delete
is scoped to both `member.id` and `.in('team_id', publicTeamIds)`, and inserts
are restricted to the server-side canonical public set (`allowed`). I confirmed
against `supabase/schema.sql` that `teams.name` is `UNIQUE`, so the name-based
matching in `actions.ts` cannot cross status boundaries (a public name cannot
collide with a hidden/private team's name) — no privilege escalation through
name collision. The test suite covers join, leave, ignore-non-public,
private-preservation scoping, auth failure, and name validation.

The principal correctness defect is that the reconcile is a **non-atomic
delete-then-insert with no transaction**: a failed insert after a successful
delete permanently drops the member's public-team memberships while returning a
generic error. There are also several UI/logic-quality issues in the form.

## Critical Issues

### CR-01: Non-atomic delete-then-insert can silently drop all public-team memberships on partial failure

**File:** `src/app/my/actions.ts:89-111`
**Issue:** The reconcile deletes all of the member's public-team rows
(lines 89-100) and then inserts the new selection in a separate statement
(lines 102-111). These are two independent admin calls with no transaction. If
the `DELETE` succeeds but the `INSERT` fails (network blip, transient DB error,
constraint/timeout), the member is left with **zero** public-team memberships,
the function returns the generic `'保存に失敗しました...'`, and the data is not
rolled back. On retry the form re-submits the user's intended state, but in the
window between failure and a successful retry the membership data is lost and
inconsistent with what the user saw. This is a data-loss-on-error risk for a
write path that is supposed to be a reconcile.
**Fix:** Perform the reconcile atomically. Preferred: move the delete+insert
into a Postgres function (RPC) invoked via `admin.rpc('reconcile_member_teams', {...})`
so both run in one transaction. If an RPC is out of scope, at minimum compute
the diff and only delete the rows that must be removed and insert only the rows
that must be added (idempotent set-diff), so a failed insert does not also
destroy memberships the user intended to keep:
```ts
const desiredIds = new Set(allowed.map((t) => t.id))
// fetch current public-team rows for this member, then:
const toRemove = publicTeamIds.filter((id) => currentlyJoined.has(id) && !desiredIds.has(id))
const toAdd = allowed.filter((t) => !currentlyJoined.has(t.id))
// delete only toRemove, insert only toAdd
```

## Warnings

### WR-01: Duplicate/contradictory "no public teams" message renders inside the team box

**File:** `src/app/my/MyProfileForm.tsx:54-93`
**Issue:** Line 54 gates the entire team section on
`publicTeams.length === 0 && privateJoined.length === 0`. Inside the `else`
branch, lines 91-93 render `参加できる公開チームはありません` again when
`member.publicTeams.length === 0`. Given the outer guard, this inner branch can
only execute when `publicTeams.length === 0 && privateJoined.length > 0` — i.e.
the user has private-admin-set teams but no joinable public teams. In that case
the box already lists the private teams, and appending
"参加できる公開チームはありません" is contradictory/confusing UX, and the same
string is already produced by line 55 for the other case. This is dead-ish,
duplicated logic that indicates the conditionals were not fully reconciled.
**Fix:** Remove the redundant block at lines 91-93 (the outer guard at line 54
already handles the genuine empty case), or move the message so it only shows
when there are truly no public teams to join, distinct from the private list.

### WR-02: `name` accepts unbounded / unsanitized input with no length cap

**File:** `src/app/my/actions.ts:47,51,60-63`
**Issue:** `name` is only validated as non-empty after trim. There is no maximum
length and no normalization. A member can write an arbitrarily long string
(megabytes) directly into `members.name` via the admin (service-role) client,
which bypasses any RLS the column might otherwise rely on. While not an
injection vector (parameterized via the client), an unbounded user-controlled
write to a shared table that is rendered publicly (`public select members`
policy) is a robustness/abuse gap.
**Fix:** Enforce a reasonable bound, e.g.:
```ts
if (!name) return '名前を入力してください'
if (name.length > 100) return '名前は100文字以内で入力してください'
```
and/or add a `CHECK (char_length(name) <= N)` constraint in the schema.

### WR-03: `currentTeams` carries `hidden`-status memberships that the form silently swallows

**File:** `src/app/my/page.tsx:26-33`, `src/app/my/MyProfileForm.tsx:16-21,74`
**Issue:** `page.tsx` builds `currentTeams` from all of the member's joined teams
regardless of status. `MyProfileForm` only surfaces `status === 'public'`
(checkboxes) and `status === 'private'` (disabled rows, line 74). A membership
in a `hidden`-status team (which exists per
`supabase/migrations/20260517_add_team_status.sql`) is therefore neither shown
nor counted. The membership is correctly *preserved* on save (the scoped delete
only touches `publicTeamIds`), so this is not data loss — but the user has no
indication a hidden membership exists, and `joinedNames`/`allJoined` silently
ignore it. This is a correctness gap in the rendered state vs. actual state.
**Fix:** Either explicitly document that `hidden` teams are intentionally not
shown to the member, or render them like private teams (disabled). At minimum,
filter `currentTeams` deliberately at the page level rather than relying on the
form's incidental `private`-only handling.

### WR-04: Loose `any`/unsafe casts in the `currentTeams` mapping

**File:** `src/app/my/page.tsx:27-32`
**Issue:** `member.member_teams as any[]` and `(mt: any) => mt.teams` discard all
type safety on the Supabase nested-select shape. The runtime guard at lines
30-32 checks `'name' in (t as object)` but never checks for `status`, yet the
result is typed as `{ name: string; status: string }`. A row with `name` but a
missing/null `status` would pass the guard and be typed as having a `string`
status it does not have, feeding `t.status === 'private'` comparisons in the
form. Combined with `as any`, type errors here are invisible at compile time.
**Fix:** Type the select result and tighten the guard to also assert `status`:
```ts
(t): t is { name: string; status: string } =>
  t != null && typeof t === 'object' && 'name' in t && 'status' in t
```
and replace `as any[]` with a typed shape for the nested select.

## Info

### IN-01: Test asserts `allowed`-based insert but does not cover partial-failure rollback or duplicate submission

**File:** `src/app/my/__tests__/updateMyProfileAction.test.ts:100-155`
**Issue:** The suite covers the happy paths and scoping correctly, but there is
no test for: (a) delete-succeeds-then-insert-fails (the CR-01 scenario), or
(b) the same team name submitted multiple times via `getAll('teams')`. Adding
these would lock in the intended behavior and guard CR-01's fix.
**Fix:** Add a test where `insertSpy` returns `{ error: ... }` and assert the
returned error string, and a test submitting `['Alpha','Alpha']` asserting a
single insert row.

---

_Reviewed: 2026-05-30T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
