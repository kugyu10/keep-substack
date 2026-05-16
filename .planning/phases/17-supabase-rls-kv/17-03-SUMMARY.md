---
phase: "17"
plan: "03"
subsystem: migration-script
tags: [kv, redis, sql, migration, typescript, tsx]
dependency_graph:
  requires: [supabase/schema.sql, src/lib/kvMembers.ts, src/lib/kvArticles.ts]
  provides: [scripts/export-to-sql.ts]
  affects: [Supabase初期データ投入, Phase 18 データレイヤー差し替え]
tech_stack:
  added: []
  patterns: [tsx実行スクリプト, dotenv/config自動ロード, SQL生成（ON CONFLICT DO NOTHING）]
key_files:
  created:
    - scripts/export-to-sql.ts
  modified:
    - .gitignore
decisions:
  - "member_teamsのINSERT SQLはSELECT サブクエリ形式でteams.name→id解決（D-16準拠）"
  - "articlesはON CONFLICT (link) DO NOTHINGで重複排除（D-17準拠）"
  - "imageUrlはarticlesでなくmembersテーブルのimage_urlにUPDATEでマッピング（D-05準拠）"
  - "scripts/output/ は .gitignore で追跡除外（生成物はコミットしない）"
metrics:
  duration: "約5分"
  completed: "2026-05-16"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 1
---

# Phase 17 Plan 03: KVデータ移行スクリプト Summary

## One-liner

Upstash Redis KVのメンバー・チーム・記事データをSupabase SQL Editor実行用のINSERT SQLファイル4本に変換する `scripts/export-to-sql.ts` を作成。

## What Was Built

既存のKV関数（getMembers / getArticles）を再利用してRedisデータをPostgreSQL INSERT SQL形式に変換するスクリプトを実装。`tsx scripts/export-to-sql.ts` を実行すると `scripts/output/` 以下に4ファイルを出力する。

### 出力ファイルと実行順序

| 順序 | ファイル | 内容 |
|------|---------|------|
| 1 | members.sql | 全メンバーのINSERT（ON CONFLICT (substack_id) DO NOTHING） |
| 2 | teams.sql | 全ユニークチーム名のINSERT（ON CONFLICT (name) DO NOTHING） |
| 3 | member_teams.sql | メンバー×チームの中間テーブルINSERT（サブクエリ形式） |
| 4 | articles.sql | 全記事のINSERT + members.image_url UPDATE（ON CONFLICT (link) DO NOTHING） |

### 主要実装ポイント

- `dotenv/config` で `.env.local` の `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` を自動ロード
- `escapeSql()` でシングルクォートをエスケープ（SQLインジェクション対策）
- `member_teams` のINSERTは `SELECT m.id, t.id FROM members m, teams t WHERE ...` のサブクエリ形式でUUID解決（D-16）
- `articles` の `imageUrl` は `members` テーブルへのUPDATE文として生成（D-05）
- `pub_date` は `isoDate`（ISO 8601）を優先し、なければ `pubDate` 文字列をフォールバック使用

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | scripts/output/ を .gitignore に追加 | 25d35fb | .gitignore |
| 2 | scripts/export-to-sql.ts を作成 | d04f516 | scripts/export-to-sql.ts（新規117行） |

## Verification Results

- [x] scripts/export-to-sql.ts が存在すること
- [x] .gitignore に `scripts/output/` が含まれること
- [x] `npm run build` がエラーなく完了すること（TypeScript型チェック含む）
- [x] `tsc --noEmit` がエラーなし
- [ ] `tsx scripts/export-to-sql.ts` が exit code 0 で完了すること（KV接続が必要なため実環境でのみ検証可能）
- [ ] SQLファイル4本が生成されること（実行時のみ検証可能）

## Deviations from Plan

### Auto-fixed Issues

なし — プラン通りに実行された。

スクリプト本文に不要なコード（`totalArticles` 変数で `articlesLines.length` の累計が意味のない計算になっていた箇所）がプランの `reduce` 実装にあったが、これを単純に `articlesLines.length` 直接参照に整理した（KISS原則）。

## Known Stubs

なし。スクリプトはKV実データを参照して動作するため、スタブなし。

## Threat Flags

なし。スクリプトはKVからSQLファイルを生成するのみで、SupabaseへのDirect書き込みはない。生成SQLはSupabase管理画面経由で人間が確認してから実行する設計。

## Self-Check: PASSED

- scripts/export-to-sql.ts: FOUND
- .gitignore contains scripts/output/: FOUND
- commit 25d35fb: FOUND
- commit d04f516: FOUND
