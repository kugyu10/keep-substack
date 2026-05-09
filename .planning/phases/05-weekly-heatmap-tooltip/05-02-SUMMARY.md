---
phase: 05-weekly-heatmap-tooltip
plan: 02
status: complete
completed_at: "2026-05-09"
---

# Plan 02 Summary — ヒートマップUIコンポーネント実装

## 実施内容

### Task 1: HeatmapTooltip.tsx 新設（Client Component）
- `'use client'` 指示子を先頭に配置
- hover/tapトグルパターン実装（onMouseEnter/onMouseLeave/onClick）
- click outside検知（useRef + useEffect + mousedown）
- サムネイルあり時は img 表示、なし時は省略（プレースホルダーなし）
- タイトルリンク: target="_blank" rel="noopener noreferrer" + UTM付与
- withUtm関数をファイル内クロージャとして定義

### Task 2: HeatmapRow.tsx・WeeklyHeatmapGrid.tsx・page.tsx 実装
- `HeatmapRow.tsx`: Server Component、メンバー名リンク + 7日間セルグリッド
- `WeeklyHeatmapGrid.tsx`: Server Component、日付ヘッダー + HeatmapRow×N
- `src/app/page.tsx`: ヒートマップ版に全面刷新（MiniCalendarカード一覧を除去）

## 検証結果

- `npx tsc --noEmit`: エラーなし
- `npm run build`: エラーなし（Turbopack build成功）
- `grep -c "use client" HeatmapTooltip.tsx`: 1
- `grep -c "use client" HeatmapRow.tsx`: 0（Server Component）
- `grep -c "WeeklyHeatmapGrid" page.tsx`: 2
- `grep -c "MiniCalendar" page.tsx`: 0

## 成果物

- `src/components/HeatmapTooltip.tsx` — 新規（Client Component）
- `src/components/HeatmapRow.tsx` — 新規（Server Component）
- `src/components/WeeklyHeatmapGrid.tsx` — 新規（Server Component）
- `src/app/page.tsx` — ヒートマップ版に刷新

## Checkpoint: Human Verify 待ち

devサーバー `npm run dev` で http://localhost:3000 を確認し、チェックリストを検証してください:
- 直近7日間の日付ヘッダー（M/DD形式）表示
- 全メンバー行の縦並び・左端メンバー名
- セルの投稿数に応じた緑濃淡
- 記事ありセルにホバー/タップでTooltip表示
- サムネイルなし記事はタイトルのみ
- Tooltipタイトルクリックで新タブ遷移
- メンバー名クリックで /member/{substackId} 遷移
