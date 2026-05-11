---
phase: 09-admin-member-edit
plan: 01
subsystem: ui
tags: [next.js, react, kv, server-action, inline-edit]

# Dependency graph
requires:
  - phase: 04-kv-migration
    provides: kvMembers.ts の getMembers/addMember/deleteMember 関数
  - phase: 05-admin-auth
    provides: 管理画面 Basic 認証保護
provides:
  - 管理画面メンバーインライン編集UI（editingId state + updateMemberAction）
  - teamId→teamName フィールドリネーム（全コンポーネント）
  - KV後方互換読み込み（既存 teamId キーデータを teamName にフォールバック）
  - updateMember KV関数 + updateMemberAction Server Action
affects: [管理画面, ホーム画面チームフィルター, メンバー個別ページ]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "form-in-table回避: <form>タグ不使用、button onClick + closest('tr') + querySelectorAll('input[name]') で FormData 手動構築"
    - "非制御コンポーネント: defaultValue のみ使用（value+onChange 不要）"
    - "後方互換KVフォールバック: getMembers で teamName ?? teamId ?? '' マッピング"

key-files:
  created: []
  modified:
    - src/lib/types.ts
    - src/lib/kvMembers.ts
    - src/app/admin/actions.ts
    - src/app/admin/AdminMemberList.tsx
    - src/app/admin/AdminAddForm.tsx
    - src/app/member/[substackId]/page.tsx
    - src/app/page.tsx

key-decisions:
  - "teamId→teamName リネームは全7ファイルで一括実施し、型エラー0件を確認してから次タスクへ"
  - "KV後方互換: getMembers() で any[] として取得し teamName ?? teamId ?? '' フォールバックで透過的にマッピング"
  - "form-in-table問題回避: <form> タグを <tr> 内に置かず、button onClick で FormData を手動構築"
  - "substackId は編集禁止: 編集モード中もテキスト表示のみ"
  - "非制御コンポーネント採用: defaultValue 使用で React state 管理を最小化（KISS原則）"

patterns-established:
  - "table行インライン編集: editingId state + 行条件分岐 + FormData手動構築パターン"
  - "Server Action バリデーション: string | null 戻り値でエラーメッセージを行内表示"

requirements-completed: [ADMIN-01]

# Metrics
duration: 15min
completed: 2026-05-11
---

# Phase 9 Plan 01: 管理画面メンバー編集機能 Summary

**インライン編集UI付き管理画面（editingId state + closest('tr') FormData構築）+ teamId→teamName全体リネーム + KV後方互換フォールバック**

## Performance

- **Duration:** 15 min
- **Started:** 2026-05-11T00:00:00Z
- **Completed:** 2026-05-11T00:15:00Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- `teamId` フィールドを全7ファイルで `teamName` にリネームし、TypeScriptエラー0件を維持
- `getMembers()` に後方互換フォールバック（`teamName ?? teamId ?? ''`）を追加し、既存KVデータを自動マッピング
- `updateMember` KV関数と `updateMemberAction` Server Action を追加（nameバリデーション + addedAt日付バリデーション付き）
- `AdminMemberList` にインライン編集UI実装（`editingId` state、form-in-table回避、substackId読み取り専用）

## Task Commits

Each task was committed atomically:

1. **Task 1: teamId→teamNameリネーム + getMembers後方互換** - `b26878b` (feat)
2. **Task 2: updateMember + updateMemberAction追加** - `23ad3af` (feat)
3. **Task 3: AdminMemberListインライン編集UI実装** - `d5812dd` (feat)

## Files Created/Modified

- `src/lib/types.ts` - Member型の teamId→teamName リネーム
- `src/lib/kvMembers.ts` - getMembers後方互換 + updateMember関数追加
- `src/app/admin/actions.ts` - addMemberAction teamName対応 + updateMemberAction追加
- `src/app/admin/AdminMemberList.tsx` - インライン編集UI全面改修
- `src/app/admin/AdminAddForm.tsx` - input name="teamName" に変更
- `src/app/member/[substackId]/page.tsx` - teamName参照変更
- `src/app/page.tsx` - teamName参照変更

## Decisions Made

- **form-in-table回避**: HTML仕様上 `<form>` を `<tr>` 内に置くと構造が壊れるため、`button onClick` + `e.currentTarget.closest('tr')` + `querySelectorAll('input[name]')` で FormData を手動構築するパターンを採用
- **非制御コンポーネント**: `defaultValue` のみ使用し `value + onChange` を省略（KISS原則、編集行1つのみのユースケースに十分）
- **後方互換マッピング**: `getMembers()` を `any[]` で取得し `teamName ?? teamId ?? ''` でフォールバック。既存KVデータへの後方互換を透過的に処理

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] AdminMemberList.tsx の teamId 参照をTask 1で修正**
- **Found during:** Task 1 (teamId→teamNameリネーム) のTypeScriptエラー確認
- **Issue:** プランでは `AdminMemberList.tsx` を Task 3で全面改修予定だったが、`tsc --noEmit` で `m.teamId` の型エラーが検出された
- **Fix:** Task 1内で `AdminMemberList.tsx` の `m.teamId` → `m.teamName`、列ヘッダー `teamId` → `teamName` に変更
- **Files modified:** `src/app/admin/AdminMemberList.tsx`
- **Verification:** `tsc --noEmit` エラー0件
- **Committed in:** `b26878b` (Task 1コミット)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Task 1のTypeScriptエラー解消に必要な修正。Task 3での全面改修に影響なし。スコープ逸脱なし。

## Issues Encountered

- `git add` で `[substackId]` パスの glob 展開エラー。クォートで解決。

## Known Stubs

なし。

## Threat Surface Scan

新規ネットワークエンドポイントなし。`updateMemberAction` はServer Action（管理画面Basic認証保護済み）。計画の脅威モデル（T-09-01〜T-09-05）に含まれないサーフェスなし。

## Next Phase Readiness

- ADMIN-01（メンバー編集機能）完了
- 管理画面でメンバーの name / teamName / addedAt をインライン編集可能
- 次フェーズがあれば substackId のバリデーション強化や管理画面認証改善を検討可能

---
*Phase: 09-admin-member-edit*
*Completed: 2026-05-11*
