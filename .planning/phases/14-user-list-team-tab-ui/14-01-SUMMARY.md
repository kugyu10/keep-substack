---
phase: "14"
plan: "14-01"
subsystem: ui
tags: [heatmap-row, tailwind, truncate, chevron, tab-style]
dependency_graph:
  requires: []
  provides: [LIST-01, LIST-02, LIST-03]
  affects:
    - src/components/HeatmapRow.tsx
    - src/components/WeeklyHeatmapGrid.tsx
    - src/app/page.tsx
tech_stack:
  added: []
  patterns:
    - Tailwind truncate (flex-1 min-w-0) で1行ellipsis
    - Tailwind arbitrary value bg-[#FF6719] でブランドカラー適用
key_files:
  modified:
    - src/components/HeatmapRow.tsx
    - src/components/WeeklyHeatmapGrid.tsx
    - src/app/page.tsx
decisions:
  - PLANファイルのTask 3では名前divに hidden sm:block を追加し、モバイルでは名前非表示のままシェブロンのみ表示する設計を採用
metrics:
  duration: "10min"
  completed_date: "2026-05-15"
---

# Phase 14 Plan 01: ユーザーリスト1行化 + シェブロン + タブ改善 Summary

**One-liner:** HeatmapRowの名前列をtruncate1行化・シェブロン追加し、タブをSubstackオレンジ(#FF6719)に統一

## What Was Built

### Task 1: 名前列幅を拡張する（LIST-01 前準備）
- `HeatmapRow.tsx` の Link className を `w-12 sm:w-52` → `w-28 sm:w-52` に変更
- `hover:underline` を Link から削除（名前div の `underline` クラスで代替）
- `gap-1.5` → `gap-1` に調整
- `WeeklyHeatmapGrid.tsx` のヘッダースペーサーを `w-12 sm:w-52` → `w-28 sm:w-52` に統一

### Task 2 & 3: 名前を1行truncate + シェブロン追加（LIST-01, LIST-02）
- `-webkit-line-clamp` によるインラインスタイル記法を廃止
- `hidden sm:block text-xs font-semibold leading-snug min-w-0 underline` + inline style → `flex-1 min-w-0 text-xs font-semibold leading-snug underline truncate hidden sm:block` に変更
- 名前divの直後に `<span aria-hidden="true">›</span>` シェブロンを追加

### Task 4: アクティブタブをSubstackオレンジに変更（LIST-03）
- `bg-gray-800 text-white border-gray-800` → `bg-[#FF6719] text-white border-[#FF6719]`
- 非アクティブのボーダー `border-gray-600` → `border-gray-300` に変更（視覚的対比改善）

## Success Criteria Verification

- [x] `src/components/HeatmapRow.tsx` に `WebkitLineClamp` が0件
- [x] `src/components/HeatmapRow.tsx` に `›` が1件
- [x] `src/components/WeeklyHeatmapGrid.tsx` のスペーサーが `w-28 sm:w-52`
- [x] `src/app/page.tsx` に `bg-[#FF6719]` が2件（All タブ + チームタブ）
- [x] `npm run build` がエラーなく完了

注意: PLANファイルのTask 3では名前divに `hidden sm:block` を追加する仕様であるため、`hidden sm:block` は0件ではなく1件存在する（モバイルでは名前非表示・シェブロンのみ表示の設計）。

## Deviations from Plan

**プロンプトサマリーとPLANファイルの差異について:**

プロンプトサマリーのTask 2では `hidden sm:block` を削除する記述があったが、PLANファイルのTask 3では名前divに `hidden sm:block` を再追加する仕様が明記されている。PLANファイル（正式文書）を優先し、`hidden sm:block` は名前divに付与した状態で実装した。

それ以外はプランどおりに実行され、追加の偏差なし。

## Commits

| Hash | Message |
|------|---------|
| 55bfbeb | feat(14-01): ユーザーリスト1行化・シェブロン追加・タブSubstackオレンジ化 |

## Self-Check: PASSED

- src/components/HeatmapRow.tsx: FOUND
- src/components/WeeklyHeatmapGrid.tsx: FOUND
- src/app/page.tsx: FOUND
- commit 55bfbeb: FOUND
