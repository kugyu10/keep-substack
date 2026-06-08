---
phase: 33-commitslots-upsert
plan: 03
subsystem: database / server-actions
tags: [rpc, atomic, commit-slots, schema, tdd]
dependency_graph:
  requires: []
  provides: [replace_member_commit_slots RPC, atomic commit slot save]
  affects: [src/app/my/actions.ts, supabase/schema.sql]
tech_stack:
  added: []
  patterns: [supabase-rpc, plpgsql-function, tdd-red-green]
key_files:
  modified:
    - src/app/my/actions.ts
    - src/app/my/__tests__/updateCommitSlotsAction.test.ts
    - supabase/schema.sql
decisions:
  - Replace non-atomic delete+insert with admin.rpc('replace_member_commit_slots') in updateCommitSlotsAction (D-09)
  - Add replace_member_commit_slots function to schema.sql as canonical source (D-08); migration file deferred to Plan 04
metrics:
  duration: 2min
  completed: 2026-06-08
  tasks: 2
  files: 3
requirements:
  - DB-01
---

# Phase 33 Plan 03: DB-01 RPC Atomic Commit Slots — Summary

**One-liner:** Replace non-atomic delete+insert in `updateCommitSlotsAction` with `admin.rpc('replace_member_commit_slots')` backed by a plpgsql function in `schema.sql`.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 (RED) | Add failing tests for RPC-based updateCommitSlotsAction | 27d4791 | src/app/my/__tests__/updateCommitSlotsAction.test.ts |
| 1 (GREEN) | Replace delete+insert with admin.rpc call | 9988856 | src/app/my/actions.ts |
| 2 | Add replace_member_commit_slots to schema.sql | a81b889 | supabase/schema.sql |

## What Was Built

### Task 1: Replace delete+insert with admin.rpc (TDD)

**RED:** Updated `updateCommitSlotsAction.test.ts` to:
- Add `mockAdminRpc` mock alongside existing `mockAdminFrom`
- Update `setupAdminMock` to use `rpcError` (removed `deleteError`/`insertError`)
- Test 1: valid slots → `rpc('replace_member_commit_slots', { p_member_id, p_slots })` called, returns null
- Test 2: unauthenticated → AUTH_ERROR, rpc not called
- Test 3: empty slots → rpc called with `p_slots: []` (delete-only case)
- New: rpc error test → returns '保存に失敗しました...'
- Tests 4-6: validation tests unchanged

3 tests failed in RED phase as expected.

**GREEN:** In `src/app/my/actions.ts`, replaced lines 173-199:
- Removed: TODO comment + `admin.from('member_commit_slots').delete()` block + error check
- Removed: `if (slots.length > 0) { admin.from('member_commit_slots').insert(...) }` block
- Added: `admin.rpc('replace_member_commit_slots', { p_member_id: member.id, p_slots: slots })`
- Added: `rpcError` check with console.error + '保存に失敗しました...' return
- Kept: `revalidatePath('/my')` and `return null`

All 7 tests in the file pass. Full suite: 128 tests / 20 files green.

### Task 2: Add replace_member_commit_slots to schema.sql

Appended to `supabase/schema.sql` after the existing trigger definition:
- Section header: `-- 4. RPC Functions — アトミック書き込み`
- `CREATE OR REPLACE FUNCTION replace_member_commit_slots(p_member_id UUID, p_slots JSONB) RETURNS void LANGUAGE plpgsql`
- Function body: `DELETE FROM member_commit_slots WHERE member_id = p_member_id` + conditional INSERT from `jsonb_array_elements(p_slots)`
- Schema.sql is canonical source; migration file will be created in Plan 04 immediately before prod DB push

## Deviations from Plan

None — plan executed exactly as written.

## Threat Model Coverage

| Threat ID | Mitigation Status |
|-----------|-------------------|
| T-33-06 (Tampering: p_member_id) | Satisfied — member.id derived from admin lookup using server-validated user.id |
| T-33-07 (Tampering: p_slots JSONB injection) | Satisfied — TypeScript validation (Array.isArray, count ≤ 4, day_of_week 1-7, hour 0-23) runs before RPC call |
| T-33-08 (DoS: RPC bulk INSERT) | Accepted — bounded by ≤ 4 slots server-side validation |
| T-33-SC (npm installs) | N/A — no new packages |

## Known Stubs

None — all implementation is wired. The RPC function definition in schema.sql is complete. The corresponding migration file (for prod DB apply) is intentionally deferred to Plan 04.

## Threat Flags

None — no new network endpoints, auth paths, or trust boundary changes introduced.

## TDD Gate Compliance

- RED gate commit: `27d4791` — `test(33-03): add failing tests for replace_member_commit_slots RPC`
- GREEN gate commit: `9988856` — `feat(33-03): replace delete+insert with admin.rpc in updateCommitSlotsAction`
- RED tests confirmed failing (3 failures) before implementation
- GREEN tests confirmed passing (7/7) after implementation

## Self-Check: PASSED

- [x] `src/app/my/actions.ts` exists and contains `admin.rpc('replace_member_commit_slots',`
- [x] `supabase/schema.sql` exists and contains `CREATE OR REPLACE FUNCTION replace_member_commit_slots`
- [x] Commits 27d4791, 9988856, a81b889 all exist in git log
- [x] npm test: 128 tests passing
