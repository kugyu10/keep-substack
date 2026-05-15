---
phase: 13
plan: "13-01"
subsystem: ui
tags: [mobile, layout, hero-banner, spacing]
dependency_graph:
  requires: []
  provides: [mobile-first-layout, hero-banner-removed]
  affects: [src/app/page.tsx]
tech_stack:
  added: []
  patterns: [tailwind-responsive, mobile-first]
key_files:
  created: []
  modified:
    - src/app/page.tsx
decisions:
  - topLogo import を page.tsx から完全に削除し layout.tsx の OGP 参照は維持
  - pb-64 → pb-16 でスクロール量を大幅削減
metrics:
  duration: "5min"
  completed: "2026-05-15"
---

# Phase 13 Plan 01: ヒーローバナー削除 + モバイル余白調整 Summary

**One-liner:** `src/app/page.tsx` からヒーローバナー画像を削除し、コンテナ余白・マージンをモバイル向け（px-3 py-4 pb-16）に縮小してファーストビューにヒートマップを表示する。

## What Was Done

スマートフォン（375px幅）でアクセスした際に、スクロールなしでヒートマップグリッドがファーストビューに表示されるよう、`src/app/page.tsx` を5点変更した。

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | topLogo import を削除 | f91ef4a |
| 2 | ヒーローバナー img タグを削除 | d3434e2 |
| 3 | コンテナ余白をモバイル向けに縮小（px-3 py-4 pb-16） | 3ca913e |
| 4 | h1 下マージンを縮小（mb-4 → mb-2） | ce8b1c2 |
| 5 | チームタブ下マージンを縮小（mb-6 → mb-4） | 20bec0c |
| - | インデント修正（偏差自動修正） | 8484f5c |

## Verification Results

- `topLogo` 参照件数: 0件 (PASS)
- `<img` タグ件数: 0件 (PASS)
- コンテナクラス `px-3 py-4 pb-16`: 確認済み (PASS)
- `src/app/layout.tsx` 変更なし: 確認済み (PASS)
- `npm run build` 成功: PASS

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] インデント崩れを修正**
- **Found during:** Task 5 完了後のファイル確認
- **Issue:** `{teams.length > 0 && (` ブロックの字下げが失われていた（img タグ削除時に空行処理で発生）
- **Fix:** 6スペースのインデントを追加
- **Files modified:** src/app/page.tsx
- **Commit:** 8484f5c

## Known Stubs

なし

## Threat Flags

なし
