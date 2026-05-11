---
created: 2026-05-11T03:30:00Z
title: 過去記事の消失問題 — Cron+KV累積保存
area: general
resolves_phase: 10
files:
  - src/lib/fetchFeed.ts
  - src/lib/types.ts
---

## Problem

SubstackのRSSフィードは最新30件のみ返す。メンバーによっては週12記事書く人もおり、
約2.5週間で30件を超えるため、それより古い記事がRSSから消え、メンバー別カレンダーの
先月・先々月ビューでデータの穴が生じる。

現時点で既に過去データが欠損している可能性がある。

## Solution

Vercel Cron（無料枠）で定期フェッチ → Upstash KVに累積保存：

- キー: `articles:{substackId}` → `FeedItem[]`（過去記事を蓄積）
- Cron実行のたびに `link` でdedupe → 新着のみ追記
- 既存の `@upstash/redis` をそのまま利用
- フェッチロジックは現在の `fetchAllFeedsCached` を流用

**注意:** 初回バックフィルは不可。過去データはRSSから取得できないため、
Cron設置日以降から徐々に蓄積が始まる。設置が遅れるほど欠損が増える。
