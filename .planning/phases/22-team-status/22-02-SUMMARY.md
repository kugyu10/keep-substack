---
phase: 22-team-status
plan: "02"
subsystem: database
tags: [supabase, typescript, member, teams]

# Dependency graph
requires:
  - phase: 22-01
    provides: teamsテーブルへのstatusカラム追加（DBスキーマ変更）
provides:
  - Member型のteams配列（name + status）
  - getMembers()がteams(name, status)をSELECTして返す
  - updateMember()/addMember()がteamsフィールドを参照
  - HIDDEN_TEAM定数の廃止
affects: [22-03, 22-04, ui, member-page, admin-page]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Member.teams[]は{name, status}オブジェクト配列として保持し、チーム名のみ必要な箇所は.map(t => t.name)で変換する"
    - "FormDataのteamNamesはactions.tsでteams配列に変換してからupdateMemberに渡す"

key-files:
  created: []
  modified:
    - src/lib/types.ts
    - src/lib/members.ts
    - src/app/admin/actions.ts
    - src/app/admin/AdminMemberList.tsx
    - src/app/member/[publicationId]/page.tsx
    - src/app/page.tsx
    - src/lib/__tests__/fetchFeed.test.ts

key-decisions:
  - "HIDDEN_TEAM定数を削除し、page.tsxでのHIDDEN_TEAM除外ロジックはstatusベースのフィルタリング（Wave 3）に委ねる"
  - "FormDataからのteamNamesはstatus: 'public'として変換する（Wave 3でUI側でstatus選択に変更予定）"

patterns-established:
  - "チーム名のみ必要な箇所: m.teams.map(t => t.name)"
  - "チームの存在確認: m.teams.map(t => t.name).includes(teamName)"

requirements-completed: [TEAM-04]

# Metrics
duration: 15min
completed: 2026-05-26
---

# Phase 22 Plan 02: Team Status — Member型変更とDB取得拡張 Summary

**Member型のteamNames: string[]をteams: {name, status}[]に破壊的変更し、getMembers()のSELECTをteams(name, status)JOINに拡張してHIDDEN_TEAM定数を廃止**

## Performance

- **Duration:** 約15分
- **Started:** 2026-05-26T00:00:00Z
- **Completed:** 2026-05-26T00:15:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Member型の `teamNames: string[]` を `teams: { name: string; status: string }[]` に変更
- `getMembers()` のSupabaseクエリを `teams (name, status)` JOINに拡張し、結果を `teams[]` にマッピング
- `addMember()` と `updateMember()` の `teamNames` 参照をすべて `teams` に変更
- `HIDDEN_TEAM` 定数とそのコメントを `types.ts` から削除
- TypeScriptコンパイルがエラーなく通過

## Task Commits

各タスクはアトミックにコミット済み:

1. **Task 1: Member型変更とHIDDEN_TEAM定数削除** - `6a8096a` (feat)
2. **Task 2: getMembers()/updateMember()のteams対応と波及修正** - `889be2c` (feat)

## Files Created/Modified

- `/Users/kugyu10/work/keep-substack/src/lib/types.ts` - Member型をteams配列に変更、HIDDEN_TEAM定数削除
- `/Users/kugyu10/work/keep-substack/src/lib/members.ts` - getMembers/addMember/updateMemberをteams対応に変更
- `/Users/kugyu10/work/keep-substack/src/app/admin/actions.ts` - teamNames→teams変換を追加
- `/Users/kugyu10/work/keep-substack/src/app/admin/AdminMemberList.tsx` - teamNames参照をteams.map(t=>t.name)に修正
- `/Users/kugyu10/work/keep-substack/src/app/member/[publicationId]/page.tsx` - teamNames参照をteams配列に修正
- `/Users/kugyu10/work/keep-substack/src/app/page.tsx` - HIDDEN_TEAM除外ロジックを削除、teamNames→teamsに変更
- `/Users/kugyu10/work/keep-substack/src/lib/__tests__/fetchFeed.test.ts` - Member型モックをteams配列に修正

## Decisions Made

- **HIDDEN_TEAM廃止後の除外ロジック:** `page.tsx` でHIDDEN_TEAMによるフィルタリングを行っていたが、定数削除に伴い一旦除外ロジックを削除。`status` フィールドを使った表示制御はWave 3（22-03）のUIフェーズで実装予定。
- **FormDataのstatus値:** `actions.ts` でFormDataから取得した `teamNames` を `teams` に変換する際、現時点では固定で `status: 'public'` を設定する。Wave 3でUIからstatus選択ができるようになった後に変更される。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Member型変更による波及コンパイルエラーの修正**
- **Found during:** Task 2（TypeScriptビルド確認）
- **Issue:** `teamNames` から `teams` への型変更により、`AdminMemberList.tsx`、`member/[publicationId]/page.tsx`、`page.tsx`、`fetchFeed.test.ts` でコンパイルエラーが発生
- **Fix:** 各ファイルの `teamNames` 参照を `teams.map(t => t.name)` または `teams` 配列アクセスに変更、`HIDDEN_TEAM` インポートを削除
- **Files modified:** src/app/admin/AdminMemberList.tsx, src/app/member/[publicationId]/page.tsx, src/app/page.tsx, src/lib/__tests__/fetchFeed.test.ts
- **Verification:** `npx tsc --noEmit` がエラーなく通過
- **Committed in:** `889be2c`（Task 2コミットに含む）

---

**Total deviations:** 1件自動修正（Rule 1 バグ修正）
**Impact on plan:** 型変更に伴う破壊的変更の波及修正であり、計画の意図通り。スコープ外の変更なし。

## Issues Encountered

なし。TypeScriptのコンパイルエラーは型変更の意図的な破壊的変更による波及で、各ファイルの修正はD-07（チーム名のみ必要な箇所は `.map(t => t.name)` で対応）の方針に沿って解決。

## User Setup Required

なし。外部サービスの設定変更は不要。

## Next Phase Readiness

- Wave 3（22-03）: UI変更の前提型が整った。`Member.teams[]` が `{name, status}` を持つ状態でUIが動作できる
- `status` を使ったチームタブの表示制御（hidden チームをタブから除外する等）はWave 3で実装予定
- `page.tsx` の `HIDDEN_TEAM` による除外ロジックが削除されたため、Wave 3で `status` ベースのフィルタリングを追加する必要がある

## Self-Check: PASSED

- src/lib/types.ts: 存在確認済み
- src/lib/members.ts: 存在確認済み
- src/app/admin/actions.ts: 存在確認済み
- 22-02-SUMMARY.md: 存在確認済み
- コミット 6a8096a: 確認済み
- コミット 889be2c: 確認済み
- npx tsc --noEmit: エラーなし（PASSED）

---
*Phase: 22-team-status*
*Completed: 2026-05-26*
