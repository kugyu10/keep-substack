BEGIN;

-- Phase 42-1: add note_comments — Note コメントのキャッシュ（JSONB 1行保存）
-- schema.sql の定義と同一。dev には適用済み、本番は main マージ前に SQL Editor で実行すること。
CREATE TABLE IF NOT EXISTS note_comments (
  note_id       TEXT        PRIMARY KEY,              -- parseNoteId が返す正規化 ID（数字文字列）
  comment_count INTEGER     NOT NULL,                 -- COMMENT-02: reader の children_count
  comments      JSONB       NOT NULL,                 -- COMMENT-03/04: フラット CommentItem[] 配列
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT now()    -- COMMENT-05: 鮮度判定（CACHE_TTL_MS=30分）
);

ALTER TABLE note_comments ENABLE ROW LEVEL SECURITY;

-- public select（公開 Note の公開コメント）。
-- 書き込み（upsert）は service_role が BYPASSRLS で行うため write policy 不要。
DROP POLICY IF EXISTS "public select note_comments" ON note_comments;
CREATE POLICY "public select note_comments"
  ON note_comments FOR SELECT USING (true);

COMMIT;
