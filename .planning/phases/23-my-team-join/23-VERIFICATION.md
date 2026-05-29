---
phase: 23-my-team-join
verified: 2026-05-30T09:00:00Z
status: human_needed
score: 4/4 must-haves verified
overrides_applied: 0
human_verification:
  - test: "/my で公開チームのチェックボックス一覧が表示されることを確認"
    expected: "ログイン後 /my を開くと status=public の全チームがチェックボックスで並び、自分が所属中のものは初期チェック済み。private 所属チームは disabled・チェック済み・「管理者が設定」ラベル付きで表示される"
    why_human: "RSC のレンダリング結果・初期チェック状態・disabled の見た目はブラウザ実描画でしか確認できない（grep では DOM 表示を保証できない）"
  - test: "チェックボックスを ON にして「保存する」を押すと参加できることを確認"
    expected: "未参加の公開チームにチェックを入れて保存 → 再読み込み後そのチームがチェック済みのまま（member_teams に行が追加されている）"
    why_human: "実 DB への書き込みと revalidate 後の再表示までの一連の動作はサーバ＋DB を起動した実操作でしか確認できない"
  - test: "チェックボックスを OFF にして「保存する」を押すと退出できることを確認"
    expected: "参加中の公開チームのチェックを外して保存 → 再読み込み後そのチームが未チェック（member_teams から行が削除されている）"
    why_human: "実 DB の delete 反映と再表示は実操作でしか確認できない。private 所属行が削除されずに残ることも実データで要確認（D-09）"
  - test: "private チームのチェックボックスが操作不能であることを確認"
    expected: "private 所属行は disabled でクリックしても切り替わらず、保存しても member_teams から削除されない（name 属性が無く送信対象外）"
    why_human: "disabled 属性の実挙動と「送信されない」ことの確認は実ブラウザ送信でしか確証できない"
---

# Phase 23: /myページ公開チーム参加・退出 Verification Report

**Phase Goal:** ログインユーザーが/myページからstatus=publicのチームをチェックボックスで自由に参加・退出できる
**Verified:** 2026-05-30T09:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

All four ROADMAP success criteria are realized in the codebase with substantive, wired implementations and a passing 6-test unit suite covering the security/reconcile behaviors. Status is `human_needed` (not `passed`) solely because the visual checkbox rendering and the live join/leave round-trip through Supabase require human UAT — these cannot be confirmed by grep/static checks. No gaps or blockers were found.

### Observable Truths

| # | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| 1 | /myページにstatus=publicのチーム一覧がチェックボックスで表示される | ✓ VERIFIED | `page.tsx:35-39` fetches `teams ... .eq('status','public').order('name')` → `publicTeams` prop; `MyProfileForm.tsx:59-73` maps each to `<input type="checkbox" name="teams" value={t.name}>`. (Visual render → human UAT #1) |
| 2 | チェックボックスON＋保存でmember_teamsに追加され参加できる | ✓ VERIFIED | `actions.ts:49` `getAll('teams')`; `:85` validates against public set; `:102-111` `member_teams.insert(...)`. Test `join` asserts `insert([{member_id, team_id:'a'}])` passes. (Live round-trip → human UAT #2) |
| 3 | チェックボックスOFF＋保存でmember_teamsから削除され退出できる | ✓ VERIFIED | `actions.ts:89-100` scoped `delete().eq('member_id', member.id).in('team_id', publicTeamIds)`. Tests `leave` + `preserve private` assert `.in('team_id', publicIds)` called and no insert. (Live round-trip → human UAT #3) |
| 4 | status=privateのチームは/myに参加不可として表示されるか非表示になる | ✓ VERIFIED | `page.tsx` public list filtered to `status='public'` (unjoined private never enters props, D-01); `MyProfileForm.tsx:74-89` renders joined-private as `disabled` + no `name` attr + 「管理者が設定」. (Visual → human UAT #4) |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `src/app/my/actions.ts` | Rewritten updateMyProfileAction reconciling public-team membership via `getAll('teams')` | ✓ VERIFIED | 115 lines; `getAll('teams')`×1, `.in('team_id'`×1, `.eq('status','public')`×1; no `teamNamesRaw`/`onConflict` upsert; `linkMemberAction` untouched |
| `src/app/my/page.tsx` | RSC fetching member teams w/ status + all public teams, passes currentTeams+publicTeams | ✓ VERIFIED | `teams (name, status)` JOIN scoped `.eq('user_id', user.id).maybeSingle()`; separate `.eq('status','public')` query; unauth `redirect('/')` |
| `src/app/my/MyProfileForm.tsx` | Checkbox list form, public enabled / private readonly, single integrated save | ✓ VERIFIED | All UI-SPEC strings present (`name="teams"`, `accent-orange-500`, `min-h-[44px]`, `管理者が設定`, both empty/all-joined messages, `role="alert"`, `aria-disabled`); no `font-medium`/`team_names` |
| `src/app/my/__tests__/updateMyProfileAction.test.ts` | Unit tests proving join/leave/ignore/preserve/auth/name | ✓ VERIFIED | 6 tests, all pass (161ms) |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| actions.ts | teams (status='public') | validation query | ✓ WIRED | `.eq('status', 'public')` present; `allowed` filters submitted names against this set |
| actions.ts | member_teams delete | scoped `.in('team_id', publicTeamIds)` | ✓ WIRED | Bare member-only delete absent; guarded when `publicTeamIds.length === 0` |
| page.tsx | teams (status='public') | public-teams query | ✓ WIRED | `.eq('status','public').order('name')` |
| page.tsx | MyProfileForm | currentTeams + publicTeams props | ✓ WIRED | imported (line 5) and rendered (line 54) with both props |
| page.tsx | members (this user) | scoped member query | ✓ WIRED | `.eq('user_id', user.id).maybeSingle()` |
| MyProfileForm | updateMyProfileAction | `name="teams"` + useActionState | ✓ WIRED | imported (line 4), bound via `useActionState` (line 14), checkbox `name="teams"` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| MyProfileForm | `member.publicTeams` | page.tsx `admin.from('teams').select('id,name').eq('status','public')` | Yes — real DB query | ✓ FLOWING |
| MyProfileForm | `member.currentTeams` | page.tsx `member_teams ( teams (name, status) )` scoped to user | Yes — real DB query | ✓ FLOWING |
| page.tsx | props at `<MyProfileForm>` call site | computed from above (not hardcoded `[]`/`{}`) | Yes | ✓ FLOWING |
| actions.ts | `allowed` / `publicTeamIds` | `admin.from('teams').eq('status','public')` | Yes — real DB query | ✓ FLOWING |

No hollow props or static-empty returns detected. Default `[]` fallbacks are only applied when DB returns null, then overwritten by real query results on the happy path.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Unit suite (join/leave/ignore/preserve/auth/name) | `npx vitest run src/app/my/__tests__/updateMyProfileAction.test.ts` | 6 passed (161ms) | ✓ PASS |
| Public-team validation query present | `grep ".eq('status','public')" actions.ts` | 1 match | ✓ PASS |
| Scoped delete present, broad delete absent | `grep ".in('team_id'" actions.ts` | 1 match; no bare member-only delete | ✓ PASS |
| Free-creation upsert removed | `grep "teamNamesRaw\|onConflict: 'name'"` | 0 matches | ✓ PASS |

Live HTTP/DB round-trip checks deferred to human UAT (no running server in this environment).

### Probe Execution

No conventional probes (`scripts/*/tests/probe-*.sh`) and none declared in PLAN/SUMMARY. This is a web/UI + server-action phase verified via vitest unit tests. N/A.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ----------- | ----------- | ------ | -------- |
| SELF-01 | 23-02, 23-03 | /myにstatus=publicチーム一覧をチェックボックス表示 | ✓ SATISFIED | page.tsx public-teams query + MyProfileForm checkbox list (Truth 1) |
| SELF-02 | 23-01 | チェックボックス操作でpublicチーム参加・退出 | ✓ SATISFIED | actions.ts reconcile insert/scoped-delete + 6 passing tests (Truths 2,3) |
| SELF-03 | 23-02, 23-03 | privateチームは参加不可表示または非表示 | ✓ SATISFIED | unjoined private hidden (D-01), joined private readonly 「管理者が設定」 (Truth 4) |

All three declared requirement IDs (SELF-01, SELF-02, SELF-03) are accounted for and map to verified truths. REQUIREMENTS.md Traceability lists all three as Phase 23 / Complete — no orphaned requirements for this phase.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| (none) | — | No TBD/FIXME/XXX/TODO/HACK/placeholder markers in any modified file | — | — |

No debt markers, no stub returns, no hollow empty-data renders. Default `[]` initializers are overwritten by real queries (not stubs).

### Advisory Findings (from 23-REVIEW.md — not blockers)

These are noted per the review and do not block goal achievement:

- **CR-01 (critical, by-design per plan):** Non-atomic delete-then-insert reconcile. On a delete-success/insert-fail window the member's public memberships can be transiently dropped. Plan 01 deliberately chose the delete-then-insert shape (mirrors `members.ts` analog); private/hidden rows are still protected by the scoped `.in()`. Recommend follow-up to make atomic (RPC or set-diff). Advisory.
- **WR-01 (warning):** Redundant/contradictory 「参加できる公開チームはありません」 block at `MyProfileForm.tsx:91-93` (only reachable when private-only, no public). Cosmetic.
- **WR-02 (warning):** `name` has no max-length cap — unbounded write to a publicly-rendered column. Robustness/abuse gap.
- **WR-03 (warning):** `hidden`-status memberships are silently neither shown nor counted (preserved on save, but invisible to the member).
- **WR-04 (warning):** Loose `any` casts in `currentTeams` mapping; guard checks `name` but not `status`.

None of these defeat the four success criteria. They are recommended for a future hardening pass.

### Gaps Summary

No gaps. All four success criteria are implemented, wired, and data-flow verified; all three requirement IDs are satisfied; the 6-test unit suite passes; tsc is clean (per task input) and no anti-patterns or debt markers exist in the modified files.

Status is `human_needed` because the phase produces user-facing UI and a DB-mutating round-trip: the visual checkbox rendering, the live join/leave persistence through Supabase, and the private-row disabled behavior must be confirmed by a human in a running environment. Automated static + unit verification is complete and clean; only experiential UAT remains.

---

_Verified: 2026-05-30T09:00:00Z_
_Verifier: Claude (gsd-verifier)_
