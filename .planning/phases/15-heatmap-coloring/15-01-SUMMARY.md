---
phase: 15
plan: "15-01"
subsystem: heatmap-ui
tags: [heatmap, coloring, orange, tailwind, ui]
dependency_graph:
  requires: []
  provides: [heatmap-orange-coloring, heatmap-dashed-circle, heatmap-count-badge]
  affects: [src/lib/heatmapUtils.ts, src/components/HeatmapRow.tsx]
tech_stack:
  added: []
  patterns: [tailwind-arbitrary-value, react-children-pattern]
key_files:
  modified:
    - src/lib/heatmapUtils.ts
    - src/components/HeatmapRow.tsx
decisions:
  - getIntensityClass の count===0 ケースを削除（HeatmapRow.tsx 側でガード済みのため不要）
  - bg-[#FF6719] を count===3 に割り当て（Substack公式オレンジ）
metrics:
  duration: "5分"
  completed: "2026-05-15"
---

# Phase 15 Plan 01: ヒートマップ Substackオレンジ + 点線丸 + 投稿数表示 Summary

**One-liner:** `getIntensityClass` をSubstackオレンジ系（#FF6719系）5段階に変更し、投稿なしセルに点線丸・複数投稿セルに件数バッジを追加

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | getIntensityClass をSubstackオレンジ系に変更 | 8f89edc | src/lib/heatmapUtils.ts |
| 2 | 投稿なし日付セルに点線丸を追加 | 8f89edc | src/components/HeatmapRow.tsx |
| 3 | 複数投稿セルに投稿数を表示 | 8f89edc | src/components/HeatmapRow.tsx |

## Verification Results

- [x] `src/lib/heatmapUtils.ts` に `bg-green-` が0件
- [x] `src/lib/heatmapUtils.ts` に `bg-orange-` / `bg-[#FF6719]` が存在する
- [x] `src/components/HeatmapRow.tsx` に `border-dashed` が1件
- [x] `src/components/HeatmapRow.tsx` に `count >= 2` が1件
- [x] `npm run build` がエラーなく完了

## Decisions Made

1. `count === 0` のケースを `getIntensityClass` から削除 — 呼び出し元 `HeatmapRow.tsx` で count > 0 の場合のみ呼ばれる設計のため（YAGNI）
2. `HeatmapTooltip.tsx` は変更なし — 既に `children?: ReactNode` と `{children}` が実装済みのため（KISS）

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- src/lib/heatmapUtils.ts: FOUND
- src/components/HeatmapRow.tsx: FOUND
- commit 8f89edc: FOUND
