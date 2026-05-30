---
phase: 22-team-status
plan: "04"
subsystem: admin-ui
tags: [server-action, rsc, client-component, team-status]
dependency_graph:
  requires: ["22-02"]
  provides: ["/admin/teams ページ", "updateTeamStatusAction"]
  affects: ["src/app/admin/page.tsx"]
tech_stack:
  added: []
  patterns: ["Server Action with requireAdmin", "RSC + Client Component split", "revalidatePath"]
key_files:
  created:
    - src/app/admin/teams/actions.ts
    - src/app/admin/teams/page.tsx
    - src/app/admin/teams/TeamStatusList.tsx
  modified:
    - src/app/admin/page.tsx
decisions:
  - "D-01: /admin/teams を別ページとして新設（/admin内セクション追加ではなく）"
  - "D-02: テーブル形式でチーム名・statusドロップダウン・Saveボタンの行ごとリスト"
  - "D-03: /adminメインページに「チーム設定」リンクを追加"
metrics:
  duration: "約69秒"
  completed_date: "2026-05-26"
  tasks_completed: 2
  files_changed: 4
---

# Phase 22 Plan 04: /admin/teams ページ新設 Summary

**One-liner:** requireAdmin保護付きServer Action + RSC + Client Componentの3ファイル構成でチームstatus管理UIを実装

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Server Action と RSCページ新規作成 | cd6716c | actions.ts, page.tsx |
| 2 | TeamStatusList と /admin リンク追加 | c9800a0 | TeamStatusList.tsx, admin/page.tsx |

## What Was Built

### src/app/admin/teams/actions.ts
- `'use server'` ディレクティブ付きServer Action
- `requireAdmin()` でadminロール認証（失敗時は '権限がありません' を返す）
- `updateTeamStatusAction(teamId, status)` でteamsテーブルのstatusを更新
- `revalidatePath('/admin/teams')` でキャッシュ無効化

### src/app/admin/teams/page.tsx
- RSCページとして `select('id, name, status')` でteamsデータ取得
- `TeamStatusList` コンポーネントへデータを渡す
- "← 管理画面へ" リンク（`href="/admin"`）付き

### src/app/admin/teams/TeamStatusList.tsx
- `'use client'` Client Component
- public/private/hidden の3オプションselectドロップダウン
- hidden選択時に `window.confirm()` で確認ダイアログ表示
- "ステータスを保存" ボタン（保存中はdisabled）
- 空状態："チームがありません" メッセージ
- エラー表示（行ごと）

### src/app/admin/page.tsx
- "チーム設定" リンク（`href="/admin/teams"`）を追加

## Deviations from Plan

None - プランの仕様通りに実装完了。

## Known Stubs

None - データはSupabaseから取得し、空状態も適切に処理している。

## Threat Flags

脅威モデルの T-22-07（Elevation of Privilege）は `requireAdmin()` で対策済み。新規の脅威面なし。

## Self-Check: PASSED

- src/app/admin/teams/actions.ts: 存在確認済み
- src/app/admin/teams/page.tsx: 存在確認済み
- src/app/admin/teams/TeamStatusList.tsx: 存在確認済み
- src/app/admin/page.tsx に `href="/admin/teams"` が1件: 確認済み
- npx tsc --noEmit: エラーなし
- コミット cd6716c: 存在確認済み
- コミット c9800a0: 存在確認済み
