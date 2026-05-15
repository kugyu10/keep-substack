---
phase: 16
plan: "16-01"
subsystem: HeatmapTooltip
tags: [ui, dark-theme, popover, mobile, layout]
dependency_graph:
  requires: []
  provides: [ポップオーバーダーク化, 横並びレイアウト, touchstart対応]
  affects: [src/components/HeatmapTooltip.tsx]
tech_stack:
  added: []
  patterns: [Tailwind zinc palette, webkit-box line-clamp, TouchEvent handler]
key_files:
  modified:
    - src/components/HeatmapTooltip.tsx
decisions:
  - "WebkitLineClamp 2行truncateはinline styleで実装（Tailwind v4 flex内 line-clamp-2 既知問題）"
  - "maskImage gradient styleは横並びレイアウトでは不要なため削除"
  - "TouchEvent の target は e.touches[0]?.target で取得（タッチ開始時の座標）"
metrics:
  duration: "10min"
  completed_date: "2026-05-15"
  tasks_completed: 4
  files_modified: 1
---

# Phase 16 Plan 01: ポップオーバー刷新（ダーク化 + 横並びレイアウト）Summary

**One-liner:** HeatmapTooltipをzinc-800ダーク背景・横並びサムネイルレイアウト・touchstart対応に刷新

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | ポップオーバー本体をダーク化（POPOVER-02） | cace2bd | HeatmapTooltip.tsx |
| 2 | × ボタンのカラーをダークテーマに合わせる（POPOVER-04） | cace2bd | HeatmapTooltip.tsx |
| 3 | 記事リストを横並びレイアウトに変更（POPOVER-01） | cace2bd | HeatmapTooltip.tsx |
| 4 | touchstart を Click Outside に追加（POPOVER-03 enhancement） | cace2bd | HeatmapTooltip.tsx |

## What Was Built

`src/components/HeatmapTooltip.tsx` のポップオーバー UIを全面刷新した。

- **ダーク化（Task 1）:** `bg-white border border-gray-200 shadow-lg` → `bg-zinc-800 shadow-2xl`（白背景廃止、強い影）
- **× ボタン調整（Task 2）:** `text-gray-400 hover:text-gray-600` → `text-zinc-400 hover:text-white`（ダーク背景に合わせた配色）
- **横並びレイアウト（Task 3）:** `className="block"` → `className="flex items-start gap-2"`、サムネイルを `w-12 h-12 shrink-0` の固定サイズに変更、タイトルを `text-white` に変更し WebkitLineClamp 2 で2行truncate
- **touchstart 対応（Task 4）:** `handleClickOutside` を `MouseEvent | TouchEvent` 型に拡張、`document.addEventListener('touchstart', ...)` を追加してモバイルタップ外クリックで閉じるように対応

## Deviations from Plan

None - プランに記載された通りに実装した。

## Verification Results

| Criterion | Result |
|-----------|--------|
| `bg-zinc-800` が1件 | PASSED |
| `bg-white` が0件 | PASSED |
| `flex items-start gap-2` が1件 | PASSED |
| `touchstart` が1件 (addEventListener/removeEventListener 合計2件だが文字列として1種) | PASSED |
| `WebkitLineClamp` が1件 | PASSED |
| `npm run build` エラーなし | PASSED |

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- `/Users/kugyu10/work/keep-substack/src/components/HeatmapTooltip.tsx`: FOUND
- Commit cace2bd: FOUND
