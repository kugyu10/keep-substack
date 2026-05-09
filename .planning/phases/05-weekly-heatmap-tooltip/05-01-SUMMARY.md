---
phase: 05-weekly-heatmap-tooltip
plan: 01
status: complete
completed_at: "2026-05-09"
---

# Plan 01 Summary — データ層基盤整備

## 実施内容

### Task 1: FeedItem型更新 + rss-parser customFields設定
- `src/lib/types.ts`: FeedItem に `contentEncoded?: string` を追加
- `src/lib/fetchFeed.ts`: Parser に `customFields: { item: [['content:encoded', 'contentEncoded']] }` を設定

### Task 2: heatmapUtils.ts 新設（5関数）
- `extractThumbnail`: content:encodedのHTMLから最初のimg srcを抽出
- `getIntensityClass`: 投稿数0〜5以上に対して6段階Tailwindクラスを返す
- `getRecentDays`: 今日から6日前までの7要素 YYYY-MM-DD 配列を返す
- `buildHeatmapArticleMap`: FeedItem[]からthumbnail付きHeatmapArticle[]のMapを構築
- `sortByWeeklyCount`: 7日間投稿量降順・同数はaddedAt昇順でソート

## 検証結果

- `npx tsc --noEmit`: エラーなし
- `grep -c "contentEncoded" types.ts`: 1
- `grep -c "content:encoded" fetchFeed.ts`: 1
- `grep -v '^//' heatmapUtils.ts | grep -c "export function"`: 5

## 成果物

- `src/lib/types.ts` — FeedItem.contentEncoded追加
- `src/lib/fetchFeed.ts` — customFields設定追加
- `src/lib/heatmapUtils.ts` — 新規作成（5関数 + HeatmapArticle型）
