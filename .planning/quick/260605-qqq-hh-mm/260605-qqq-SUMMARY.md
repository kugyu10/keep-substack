---
phase: quick
plan: "260605-qqq"
status: complete
---

# Quick Task 260605-qqq: 未投稿日は曜日・日付だけでなく時刻HH:mmも表示

## One-liner

CommitGrid の未達成セルに `slot.hour` から生成した `HH:00` 時刻ラベルを追加表示。

## What changed

- `src/components/CommitGrid.tsx` — 未達成セルの return ブロックに `timeLabel`（`String(slot.hour).padStart(2,'0') + ':00'`）を追加。`text-gray-300` で他ラベルより薄く表示。

## Commit

d2f55a2
