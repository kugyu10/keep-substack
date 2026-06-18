-- Keep Substack — Supabase初期スキーマ
-- 実行手順: Supabase管理画面 > SQL Editor に全文貼り付けて「Run」
-- 冪等性: 既にテーブルが存在する場合は IF NOT EXISTS でスキップ

-- ============================================================
-- 1. テーブル定義
-- ============================================================

CREATE TABLE IF NOT EXISTS members (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT        NOT NULL,
  publication_id TEXT        UNIQUE NOT NULL,
  image_url      TEXT,
  added_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id        UUID        REFERENCES auth.users(id) UNIQUE,
  substack_handle TEXT UNIQUE
);
-- 既存Supabaseインスタンスへの適用:
-- ALTER TABLE members ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) UNIQUE;

CREATE TABLE IF NOT EXISTS teams (
  id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name   TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'public' CHECK (status IN ('public', 'private', 'hidden'))
);

CREATE TABLE IF NOT EXISTS member_teams (
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  team_id   UUID REFERENCES teams(id)   ON DELETE CASCADE,
  PRIMARY KEY (member_id, team_id)
);

CREATE TABLE IF NOT EXISTS articles (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id TEXT        NOT NULL REFERENCES members(publication_id) ON DELETE CASCADE,
  title          TEXT,
  link           TEXT        UNIQUE NOT NULL,
  pub_date       TIMESTAMPTZ,
  image_url      TEXT
);

-- 既存Supabaseインスタンスへの適用:
-- ALTER TABLE articles ADD COLUMN IF NOT EXISTS image_url TEXT;

CREATE TABLE IF NOT EXISTS member_publications (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id      UUID    NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  publication_id TEXT    UNIQUE NOT NULL,
  is_primary     BOOLEAN NOT NULL DEFAULT false
);

-- 最大1件の primary を member ごとに保証（partial unique index）
CREATE UNIQUE INDEX IF NOT EXISTS uq_member_publications_one_primary
  ON member_publications (member_id)
  WHERE is_primary;

CREATE TABLE IF NOT EXISTS member_commit_slots (
  id           BIGINT  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  member_id    UUID    NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  day_of_week  INT     NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  hour         INT     NOT NULL CHECK (hour BETWEEN 0 AND 23),
  UNIQUE (member_id, day_of_week)
);

-- note_comments — Note コメントのキャッシュ（Phase 42-1 / JSONB 1行保存）
-- 本番反映は schema.sql が正規ソースだが、SQL Editor 経由のマイグレーション実行が必須。
-- dev=otydhiumsdsyxepnjqjp / prod=xolhjcngrwwwqtklmoyk の SQL Editor で以下 DDL を実行すること。
CREATE TABLE IF NOT EXISTS note_comments (
  note_id       TEXT        PRIMARY KEY,              -- parseNoteId が返す正規化 ID（数字文字列）
  comment_count INTEGER     NOT NULL,                 -- COMMENT-02: reader の children_count
  comments      JSONB       NOT NULL,                 -- COMMENT-03/04: フラット CommentItem[] 配列
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT now()    -- COMMENT-05: 鮮度判定（CACHE_TTL_MS=30分）
);

-- ============================================================
-- 2. Row Level Security
-- ============================================================

ALTER TABLE members      ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams        ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_commit_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_comments       ENABLE ROW LEVEL SECURITY;

-- anon / authenticated: SELECT 全件許可（公開データ）
CREATE POLICY "public select members"
  ON members FOR SELECT USING (true);

CREATE POLICY "public select teams"
  ON teams FOR SELECT USING (true);

CREATE POLICY "public select member_teams"
  ON member_teams FOR SELECT USING (true);

CREATE POLICY "public select articles"
  ON articles FOR SELECT USING (true);

CREATE POLICY "public select member_publications"
  ON member_publications FOR SELECT USING (true);

CREATE POLICY "public select member_commit_slots"
  ON member_commit_slots FOR SELECT USING (true);

-- note_comments: public select（公開 Note の公開コメント）。
-- 書き込み（upsert）は service_role が BYPASSRLS で行うため write policy 不要。
CREATE POLICY "public select note_comments"
  ON note_comments FOR SELECT USING (true);

CREATE POLICY "member write own commit slots"
  ON member_commit_slots
  FOR ALL
  USING (
    member_id = (SELECT id FROM members WHERE user_id = auth.uid())
  )
  WITH CHECK (
    member_id = (SELECT id FROM members WHERE user_id = auth.uid())
  );

-- service_role: INSERT / UPDATE / DELETE 許可（Cron・管理スクリプト用）
-- service_role はデフォルトでRLSをバイパスするため追加ポリシー不要
-- （Supabase の service_role は BYPASSRLS 権限を持つ）

-- ============================================================
-- 3. Triggers — members → member_publications 同期
-- ============================================================

-- members への INSERT/UPDATE を member_publications へ同期する。
-- INSERT → primary 行を作成 / UPDATE → publication_id 変更時に primary 行を追従更新。
-- DELETE は member_id FK の ON DELETE CASCADE が処理するため DELETE ブランチは無し。
CREATE OR REPLACE FUNCTION sync_member_publications()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO member_publications (member_id, publication_id, is_primary)
    VALUES (NEW.id, NEW.publication_id, true)
    ON CONFLICT (publication_id) DO NOTHING;
    RETURN NEW;

  ELSIF (TG_OP = 'UPDATE') THEN
    IF NEW.publication_id IS DISTINCT FROM OLD.publication_id THEN
      UPDATE member_publications
        SET publication_id = NEW.publication_id
        WHERE member_id = NEW.id AND is_primary;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_member_publications ON members;
CREATE TRIGGER trg_sync_member_publications
  AFTER INSERT OR UPDATE ON members
  FOR EACH ROW
  EXECUTE FUNCTION sync_member_publications();

-- ============================================================
-- 4. RPC Functions — アトミック書き込み
-- ============================================================

-- commitSlots の DELETE → INSERT をアトミックに行う。
-- p_slots が空配列の場合は DELETE のみ実行（全スロット解除）。
CREATE OR REPLACE FUNCTION replace_member_commit_slots(
  p_member_id UUID,
  p_slots     JSONB
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM member_commit_slots
  WHERE member_id = p_member_id;

  IF jsonb_array_length(p_slots) > 0 THEN
    INSERT INTO member_commit_slots (member_id, day_of_week, hour)
    SELECT
      p_member_id,
      (elem->>'day_of_week')::INT,
      (elem->>'hour')::INT
    FROM jsonb_array_elements(p_slots) AS elem;
  END IF;
END;
$$;
