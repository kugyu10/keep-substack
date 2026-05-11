---
phase: 11-multi-team-membership
plan: "01"
subsystem: ui
tags: [typescript, nextjs, server-actions, kv, react]

# Dependency graph
requires:
  - phase: 09-team-filter
    provides: "teamName フィールドとチームフィルター基盤（teamId→teamName フォールバックパターン）"
provides:
  - "Member.teamNames: string[] による複数チーム所属"
  - "KV 旧データ（teamName: string）の後方互換フォールバック"
  - "チームタブ多対多フィルタリング（flatMap + includes）"
  - "管理画面カンマ区切り入力 + Server Actions string[] 変換"
  - "メンバー詳細ページの複数チーム戻りリンク（encodeURIComponent）"
affects:
  - future phases that read/write Member type
  - admin UI for member management
  - team filter UI on home page

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "読み込み時フォールバック変換パターン（Phase 9 踏襲）: getMembers() でKV旧フォーマットを新型に変換"
    - "FormData string[] 変換パターン: split(',').map(s => s.trim()).filter(Boolean)"
    - "多対多タブフィルター: flatMap + Set 重複除去 + includes 絞り込み"

key-files:
  created: []
  modified:
    - src/lib/types.ts
    - src/lib/kvMembers.ts
    - src/app/page.tsx
    - src/app/admin/AdminAddForm.tsx
    - src/app/admin/AdminMemberList.tsx
    - src/app/admin/actions.ts
    - src/app/member/[substackId]/page.tsx

key-decisions:
  - "D-01: Member.teamName: string → teamNames: string[] に型変更"
  - "D-01: KV後方互換フォールバック: m.teamNames ?? (m.teamName ? [m.teamName] : [])"
  - "D-02/D-03: teams生成は flatMap + Set、フィルタリングは includes"
  - "D-04: 管理画面はカンマ区切りテキスト入力、Server Actions で string[] 変換"
  - "D-05: 複数チームの戻りリンクは flex gap-3 横並び + encodeURIComponent"
  - "DBマイグレーション不要: getMembers() のフォールバックで読み込み時に自動変換"

patterns-established:
  - "読み込み時フォールバック変換: KV旧フォーマットはgetMembers()内のmapで新型に変換（書き込み側は変更不要）"
  - "FormData → string[] 変換: split(',').map((s) => s.trim()).filter(Boolean)"

requirements-completed:
  - TEAM-01
  - TEAM-02
  - TEAM-03

# Metrics
duration: 15min
completed: 2026-05-11
---

# Phase 11 Plan 01: Multi-Team Membership Summary

**Member.teamName: string を teamNames: string[] に変更し、KV後方互換フォールバック・管理UIカンマ区切り入力・flatMap多対多フィルター・複数チーム戻りリンクを全レイヤーに反映**

## Performance

- **Duration:** 約15分
- **Started:** 2026-05-11T00:00:00Z
- **Completed:** 2026-05-11
- **Tasks:** 6
- **Files modified:** 7

## Accomplishments

- Member 型を `teamNames: string[]` に変更し、1人が複数チームに所属できる型基盤を確立
- KV の旧データ（`teamName: string` 形式）を `getMembers()` のフォールバックで読み込み時に自動変換（DBマイグレーション不要）
- チームタブが `flatMap + includes` で多対多に対応し、複数チーム所属メンバーが各チームタブで表示される
- 管理画面のカンマ区切り入力が `split(',').map().filter()` で `string[]` に変換されて保存される
- メンバー詳細ページの戻りリンクが複数チームに対応し、`encodeURIComponent` で日本語チーム名も正しくURLエンコード

## Task Commits

各タスクをアトミックにコミット:

1. **Task 1: types.ts 型変更** - `f376d24` (feat)
2. **Task 2: kvMembers.ts フォールバック更新** - `bd5d169` (feat)
3. **Task 3: page.tsx チームフィルター多対多対応** - `0a5492d` (feat)
4. **Task 4: AdminAddForm + actions.ts teamNames対応** - `4eb3a29` (feat)
5. **Task 5: AdminMemberList teamNames表示・編集UI** - `460f6e9` (feat)
6. **Task 6: member詳細ページ 複数チーム戻りリンク** - `bdbff8f` (feat)

## Files Created/Modified

- `src/lib/types.ts` — `teamName: string` → `teamNames: string[]` に型変更
- `src/lib/kvMembers.ts` — `getMembers()` の後方互換フォールバック: `teamNames: m.teamNames ?? (m.teamName ? [m.teamName] : [])`
- `src/app/page.tsx` — `flatMap((m) => m.teamNames)` によるチーム生成、`m.teamNames.includes(team)` によるフィルタリング
- `src/app/admin/AdminAddForm.tsx` — `name="teamNames"`、`placeholder="チーム名（カンマ区切り・任意）"`
- `src/app/admin/AdminMemberList.tsx` — ヘッダー「チーム」、編集/表示モードで `teamNames.join(', ')`
- `src/app/admin/actions.ts` — `formData.get('teamNames')` + `split(',').map(s => s.trim()).filter(Boolean)` 変換
- `src/app/member/[substackId]/page.tsx` — `teamNames.length > 0` 分岐、`encodeURIComponent` による複数リンク

## Decisions Made

- KV データの後方互換は書き込み側ではなく読み込み側（`getMembers()` の `map()`）で処理する。Phase 9 の `teamId→teamName` パターンと同一アプローチ。
- DBマイグレーションスクリプト不要。次回 `updateMember()` 呼び出し時に `teamNames` が KV に書き込まれ、旧フィールドは自然に使われなくなる。
- 複数チーム戻りリンクのセパレーターは `|` ではなく Tailwind の `flex gap-3` 横並び（既存タブUIと一貫）。

## Deviations from Plan

なし — プランに記載の通り正確に実行した。

## Issues Encountered

なし。ビルドエラー 0 件、TypeScript 型エラー 0 件。

## User Setup Required

なし — 外部サービス設定不要。

## Next Phase Readiness

- 複数チーム所属の型基盤が完成し、全レイヤー（KV・フィルター・管理UI・詳細ページ）に反映済み
- `npm run build` 成功を確認済み
- 手動検証（チェックポイント）: `npm run dev` で http://localhost:3000/admin を開き、カンマ区切り入力でメンバーを追加し、各チームタブとメンバー詳細ページの複数リンクを確認すること

---
*Phase: 11-multi-team-membership*
*Completed: 2026-05-11*
