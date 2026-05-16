# Phase 18: データレイヤー差し替え + 長期記事履歴 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-16
**Phase:** 18-データレイヤー差し替え + 長期記事履歴
**Areas discussed:** ファイル構成戦略, articles.image_url, saveArticlesのimageUrl処理

---

## ファイル構成戦略

| Option | Description | Selected |
|--------|-------------|----------|
| KVファイルを直接書き換え | kvMembers.ts/kvArticles.ts の内部実装だけをSupabaseに変更。Phase 21でredis importとKV固有コードを削除。import先変更ゼロ・KISS | ✓ |
| 新規 dbMembers.ts/dbArticles.ts 作成 | 新規DBファイルを作成して全importを差し替え。Phase 21で旧KVファイルを削除。2ファイル × 5箇所 = 10行のimport変更が発生 | |

**User's choice:** KVファイルを直接書き換え
**Notes:** シグネチャとファイル名を維持したまま内部実装のみ変更。MIGRATE-03要件を最小変更で満たす。

---

## articles.image_url

| Option | Description | Selected |
|--------|-------------|----------|
| 各記事のサムネイルを保存 | FeedItem.thumbnail を articles.image_url に保存。将来のHeatmapTooltip改善（各記事サムネイル表示）に活用可能。HISTORY-01要件の「imageUrl」に該当 | ✓ |
| 保存しない | articles.image_url列は使わず、title/link/pub_date/substack_idのみ保存。Supabase無料枠500MBを消費しない。YAGNI | |

**User's choice:** 各記事のサムネイルを保存
**Notes:** Phase 17スキーマのD-04にimage_url列が存在しており、ここに各記事のFeedItem.thumbnailを格納する。チャンネルアイコン（members.image_url）とは別物。

---

## saveArticlesのimageUrl処理

| Option | Description | Selected |
|--------|-------------|----------|
| saveArticles内で同時更新 | saveArticles(substackId, items, imageUrl?) が呼ばれたとき、imageUrlが渡された場合はmembers.image_urlもUPSERT。呼び出し元（cron・actions）の変更ゼロ。MIGRATE-03満たす | ✓ |
| 別関数に分離 | saveArticlesは記事のみ扱い、updateMemberImageUrl(substackId, imageUrl)を別途作成。cron/route.tsとadmin/actions.tsで個別呼び出しが必要 | |

**User's choice:** saveArticles内で同時更新
**Notes:** 既存の呼び出し元コードを変更せずに移行を完了できる。imageUrlがundefinedの場合はmembers更新をスキップする。

---

## Claude's Discretion

- `getMembers()` のSQL実装詳細（JOINパターン vs 別クエリでteamNames組み立て）— プランナーが決定
- `fetchAllFeedsCached` の個別クエリ vs 一括クエリ — 50人規模ではKISSを優先し個別クエリ維持（D-05）

## Deferred Ideas

- `getMembers()` の JOIN最適化 — Phase 21のコードベース整理時に検討
- HeatmapTooltipへの articles.image_url 統合 — v1.6以降
- Supabase Auth ロールによる管理画面制御 — Phase 19
- @upstash/redis パッケージの完全削除 — Phase 21
