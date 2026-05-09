---
phase: 06-admin-team-filter
plan: 02
subsystem: admin-ui, team-filter
tags: [next.js, server-actions, react, tailwind-css, upstash-redis]

# Dependency graph
requires:
  - phase: 06-admin-team-filter
    plan: 01
    provides: addMember/deleteMember関数 + middleware.tsによるBasic認証

provides:
  - /admin ページ: メンバー一覧・追加・削除UI（Basic認証保護済み）
  - addMemberAction / deleteMemberAction: Server Actions（useActionState連携）
  - チームタブUI: トップページで/?team=xxxによるフィルタリング

affects:
  - src/app/page.tsx: searchParamsフィルタリング追加でチーム別表示が可能に

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server Actions + useActionState によるフォームエラーハンドリング（'use server' + 'use client' 分離）"
    - "Next.js 15 searchParams: Promise<{team?: string}> でServer Componentフィルタリング"
    - "[...new Set(members.map(m => m.teamId).filter(Boolean))] でユニークチーム動的生成"

key-files:
  created:
    - src/app/admin/actions.ts
    - src/app/admin/AdminAddForm.tsx
    - src/app/admin/AdminMemberList.tsx
    - src/app/admin/page.tsx
  modified:
    - src/app/page.tsx

key-decisions:
  - "addMemberActionは (prevState, formData) => Promise<string | null> シグネチャでuseActionState連携（D-15準拠）"
  - "teams.length > 0 の場合のみタブUI表示（チームなし環境でのシンプル表示を維持）"
  - "searchParams: Promise<{team?: string}> — Next.js 15以降のPromise型として受け取り（D-13）"

# Metrics
duration: 2min
completed: 2026-05-10
---

# Phase 6 Plan 02: 管理UI + チームフィルター実装 Summary

**Server Actions + useActionStateによる/admin管理画面とチームタブUIフィルタリングを実装**

## Performance

- **Duration:** 約2分
- **Started:** 2026-05-10T07:41:58Z
- **Completed:** 2026-05-10T07:44:01Z
- **Tasks:** 5
- **Files modified:** 5

## Accomplishments

- `src/app/admin/actions.ts` を新規作成（addMemberAction / deleteMemberAction）
- `src/app/admin/AdminAddForm.tsx` を新規作成（useActionState連携フォーム）
- `src/app/admin/AdminMemberList.tsx` を新規作成（window.confirm付き削除UI）
- `src/app/admin/page.tsx` を新規作成（Server Component管理画面）
- `src/app/page.tsx` を更新（searchParamsフィルタリング + チームタブUI）

## Task Commits

1. **Task 1: Server Actions** - `1e193ef` (feat)
2. **Task 2: AdminAddForm** - `2cc5fcb` (feat)
3. **Task 3: AdminMemberList** - `2483786` (feat)
4. **Task 4: 管理画面 page.tsx** - `5faf366` (feat)
5. **Task 5: チームタブUI + searchParamsフィルタリング** - `046e0ee` (feat)

## Files Created/Modified

- `src/app/admin/actions.ts` — 'use server'。addMemberAction（バリデーション・エラーハンドリング付き）とdeleteMemberAction。revalidatePath('/admin')で即時再レンダリング
- `src/app/admin/AdminAddForm.tsx` — 'use client'。useActionStateでaddMemberActionのエラーを管理。name/substackId/teamIdフィールド
- `src/app/admin/AdminMemberList.tsx` — 'use client'。Member[]をテーブル表示。削除ボタンでwindow.confirm後にdeleteMemberAction呼び出し
- `src/app/admin/page.tsx` — Server Component。getMembers()でKV取得してAdminAddForm/AdminMemberListに渡す
- `src/app/page.tsx` — searchParams: Promise<{team?: string}>受け取り。チームタブUI（All + 動的チーム）+ teamIdフィルタリング

## Decisions Made

- addMemberActionのuseActionState連携シグネチャは (prevState, formData) => Promise<string | null> — Reactのフォームアクション規約に準拠
- teams.length > 0 の場合のみタブUI表示 — 全メンバーがteamId未設定の場合はシンプルな従来ビューを維持

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Known Stubs

None — 全データはKVから実際に取得している。フィルタリングも実際のsearchParamsに基づく。

## Threat Flags

T-06-04, T-06-05, T-06-06 の脅威モデルはすべて計画通りミティゲーション済み:
- フォーム入力はKVへの文字列保存のみ（SQLインジェクション非該当）
- ReactによるHTML自動エスケープ（XSS対策済み）
- encodeURIComponent(t) でURLエンコード（XSS対策済み）
- dangerouslySetInnerHTML は使用していない

## Self-Check

- [x] `src/app/admin/actions.ts` — 存在する (`1e193ef`)
- [x] `src/app/admin/AdminAddForm.tsx` — 存在する (`2cc5fcb`)
- [x] `src/app/admin/AdminMemberList.tsx` — 存在する (`2483786`)
- [x] `src/app/admin/page.tsx` — 存在する (`5faf366`)
- [x] `src/app/page.tsx` — searchParams + チームタブUI含む (`046e0ee`)
- [x] `npx tsc --noEmit` — エラーなし
- [x] `grep -c "useActionState" AdminAddForm.tsx` — 2 (インポート + 使用)
- [x] `grep -c "window.confirm" AdminMemberList.tsx` — 1
- [x] `grep -c "searchParams" page.tsx` — 3

## Self-Check: PASSED

---
*Phase: 06-admin-team-filter*
*Completed: 2026-05-10*
