---
phase: 42-1
plan: 01
subsystem: api
tags: [substack, comments, supabase, cache, jsonb, vitest, type-guard, discriminated-union]

requires:
  - phase: 42
    provides: コメント可視化ドメイン RESEARCH + 確定型 + spike 002 フィクスチャ/エンドポイント
  - phase: notes
    provides: notes.ts の parseNoteFeed 型ガード + 判別ユニオン + no-store/timeout/1秒リトライ パターン
provides:
  - note_comments テーブル（JSONB 1行キャッシュ: note_id PK / comment_count / comments / fetched_at）+ RLS + public select policy
  - comments.ts 取得＋キャッシュ層（parseNoteId / parseComment / parseReplies / isFresh / getNoteComments）
  - CommentItem 型 + CommentsResult 判別ユニオン（ok / invalid_input / error）
  - CACHE_TTL_MS(30分) 鮮度判定 + hit/miss/stale/force 分岐 + service_role upsert
affects: [42-02, コメント描画 UI, Note 一覧連携]

tech-stack:
  added: []
  patterns:
    - "notes.ts と 1:1 の型ガード純関数 + 判別ユニオン取得層"
    - "JSONB 1行キャッシュ + fetched_at/CACHE_TTL_MS 鮮度判定（A3）"
    - "fetch 失敗時 stale フォールバックしない厳格 error（A2）"

key-files:
  created:
    - src/lib/comments.ts
    - src/lib/__tests__/comments.test.ts
    - src/lib/__tests__/fixtures/comment_reader.json
    - src/lib/__tests__/fixtures/comment_replies.json
  modified:
    - supabase/schema.sql

key-decisions:
  - "コメントキャッシュは JSONB 1行保存（note_comments）。件数は reader children_count を正とし、replies はページング非対応（A4）"
  - "fetch 失敗時は stale をフォールバック返却せず {status:'error'}（A2 / COMMENT-06）"
  - "reactionCount は CommentItem に含めない（COMMENT-07 は将来フェーズへ defer・RESEARCH 確定型準拠）"

patterns-established:
  - "取得層は notes.ts の no-store + AbortSignal.timeout(5000) + 1秒1回リトライを踏襲"
  - "外部 API レスポンスは型ガードで不正 item を除外、photo_url を string|null 正規化"

requirements-completed: [COMMENT-01, COMMENT-02, COMMENT-03, COMMENT-04, COMMENT-05, COMMENT-06]

duration: 4min
completed: 2026-06-18
---

# Phase 42-1 Plan 01: Note コメント取得＋キャッシュ層 Summary

**note_comments JSONB キャッシュ + comments.ts（parseNoteId/parseComment/parseReplies/isFresh/getNoteComments）で hit/miss/stale/force/invalid_input/error/0件を判別ユニオンで区別する取得層**

## Performance

- **Duration:** 約4分
- **Started:** 2026-06-18T05:59:35Z
- **Completed:** 2026-06-18T06:03:14Z
- **Tasks:** 3
- **Files modified:** 5（4 created / 1 modified）

## Accomplishments
- `note_comments` テーブル（note_id PK / comment_count / comments JSONB / fetched_at）を schema.sql に既存規約どおり追記、RLS 有効化 + public select policy 追加（書き込みは service_role BYPASSRLS）
- comments.ts に RESEARCH 確定型（CommentItem / CommentsResult）+ CACHE_TTL_MS(30分) と純関数 parseNoteId/parseComment/parseReplies/isFresh を実装（notes.ts 型ガードスタイル踏襲）
- getNoteComments を実装: parseNoteId→invalid_input、note_comments select、fresh&&!force→fromCache:true、miss/stale/force→2エンドポイント fetch（no-store/timeout 5s/1秒1回リトライ）→service_role upsert→fromCache:false。fetch 失敗時 stale フォールバックせず error
- comments.test.ts で COMMENT-01..06 を fixture/モックベースで網羅、全 30 ケース green

## Task Commits

1. **Task 1: note_comments テーブルを schema.sql に追記** - `01751f8` (feat)
2. **Task 2: comments.ts 純関数 + 鮮度判定** - `add25a9` (feat)
3. **Task 3: getNoteComments — fetch&retry + cache hit/stale/force + upsert** - `3ca03c1` (feat)

_TDD タスク（Task 2/3）: 純関数 + キャッシュ層は実装と同コミットで RED→GREEN を満たし、各 `<verify>` vitest コマンドで green を確認。_

## Files Created/Modified
- `supabase/schema.sql` - note_comments テーブル + RLS + public select policy 追記（本番反映は SQL Editor 経由マイグレーション必須の旨をコメント明記）
- `src/lib/comments.ts` - 取得＋キャッシュ層（型 / 純関数 / getNoteComments）
- `src/lib/__tests__/comments.test.ts` - COMMENT-01..06 ユニットテスト（30 ケース）
- `src/lib/__tests__/fixtures/comment_reader.json` - spike 002 reader レスポンス（children_count=4）
- `src/lib/__tests__/fixtures/comment_replies.json` - spike 002 replies レスポンス（commentBranches 4件）

## Decisions Made
- JSONB 1行キャッシュ（A3）。件数は reader `children_count` を正、replies はページング非対応（A4）
- fetch 失敗時は stale を返さず厳格に error（A2 / COMMENT-06）。0件は error と区別して ok を返す
- reactionCount は CommentItem に含めない（COMMENT-07 defer・RESEARCH 確定型準拠）

## Deviations from Plan

None - plan executed exactly as written.

## Verify / Test Results
- `npx vitest run src/lib/__tests__/comments.test.ts -t "parseNoteId"` → green（Task 2）
- `npx vitest run src/lib/__tests__/comments.test.ts -t "parseComment"` → green（Task 2）
- `npx vitest run src/lib/__tests__/comments.test.ts -t "parseReplies"` → green（Task 2）
- `npx vitest run src/lib/__tests__/comments.test.ts -t "isFresh"` → green（Task 2）
- `npx vitest run src/lib/__tests__/comments.test.ts -t "getNoteComments"` → 8/8 green（Task 3）
- **最終ゲート:** `npx vitest run src/lib/__tests__/comments.test.ts` → **30/30 全 green**
- schema.sql grep verify（CREATE TABLE / public select / ENABLE RLS）→ OK
- `npx tsc --noEmit`: 新規ファイル（comments.ts / comments.test.ts）はエラー 0。既存の無関係テスト（my/page.test.tsx, saveArticles.test.ts）の既存エラーはスコープ外（deferred-items.md 参照）

## Issues Encountered
None - 計画どおりの実装で全テスト green。

## User Setup Required
**本番 Supabase への DDL push が手動フォローアップとして必要（user_setup: supabase）。**
- schema.sql に追記した `note_comments` の `CREATE TABLE` / `ENABLE ROW LEVEL SECURITY` / `public select note_comments` policy を、本番（prod=xolhjcngrwwwqtklmoyk）および dev（otydhiumsdsyxepnjqjp）の Supabase Dashboard -> SQL Editor で実行する。
- schema.sql が正規ソースだが反映は SQL Editor 経由マイグレーションが必須。実行は開発者の手動作業（本プランでは実行していない）。

## Known Stubs
None - getNoteComments は実データ（Substack API）と Supabase に接続済み。スタブ/プレースホルダなし。

## Next Phase Readiness
- comments.ts が安定 API として export 済み（getNoteComments + 型）。コメント描画 UI（次プラン）からそのまま利用可能
- ブロッカー: 本番/dev の note_comments DDL を SQL Editor で実行するまで、本番でのキャッシュ select/upsert は失敗する（上記 User Setup 参照）

## Self-Check: PASSED

- 全 created/modified ファイル存在を確認（comments.ts / comments.test.ts / fixtures x2 / schema.sql / SUMMARY.md）
- 全タスクコミット存在を確認（01751f8 / add25a9 / 3ca03c1）

---
*Phase: 42-1*
*Completed: 2026-06-18*
