# Plan 18-02: kvArticles.ts — Supabase差し替え + articlesスキーマ拡張 — SUMMARY

**Status:** Complete
**Completed:** 2026-05-16
**Commit:** 0b29abf

## What was done

- `supabase/schema.sql` の articles テーブルに `image_url TEXT` 列を追加
- 既存Supabaseインスタンス向けの ALTER TABLE コメントを追記
- `src/lib/kvArticles.ts` の内部実装をUpstash Redisからsupabase-jsに全面書き換え
- getArticles(): articles SELECT + members.image_url を並列取得して StoredFeed を返す
- saveArticles(): articles upsert (ON CONFLICT link, ignoreDuplicates) + members.image_url UPDATE
- deleteArticles(): articles DELETE WHERE substack_id = ?

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] fetchFeed.test.ts のモックが parseURL をモックしていたが実装は parseString を使用**
- **Found during:** Task 2 後のテスト実行
- **Issue:** テストモックが `rss-parser` の `parseURL` をモックしていたが、`fetchFeed.ts` は `fetch()` + `parser.parseString()` を使っているため、ライブRSS成功ケースが常に失敗していた
- **Fix:** テストモックを `parseString` + グローバル `fetch` のモックに修正
- **Files modified:** `src/lib/__tests__/fetchFeed.test.ts`
- **Commit:** 0b29abf（メイン変更と同一コミット）

## Human action required

Supabase管理画面の SQL Editor で以下を実行してください:

```sql
ALTER TABLE articles ADD COLUMN IF NOT EXISTS image_url TEXT;
```

## Verification

- [x] supabase/schema.sql に image_url 列追加確認
- [x] npx vitest run 全テスト通過 (5/5)
- [x] npm run build 通過
- [x] redis import 除去確認

## Notes

- redis.ts と @upstash/redis は Phase 21 で削除予定
- StoredFeed.imageUrl はチャンネルアイコン（members.image_url）、FeedItem.thumbnail は記事サムネイル（articles.image_url）
- `saveArticles` の upsert は `ignoreDuplicates: true` により、既存 link は上書きせず無視する
- `getArticles` は `pub_date DESC` 順で返す

## Self-Check: PASSED

- SUMMARY.md: 存在確認済み
- kvArticles.ts: 存在確認済み
- schema.sql: 存在確認済み
- commit 0b29abf: 確認済み
