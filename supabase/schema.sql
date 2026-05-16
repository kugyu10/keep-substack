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
  user_id        UUID        REFERENCES auth.users(id) UNIQUE
);
-- 既存Supabaseインスタンスへの適用:
-- ALTER TABLE members ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) UNIQUE;

CREATE TABLE IF NOT EXISTS teams (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL
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

-- ============================================================
-- 2. Row Level Security
-- ============================================================

ALTER TABLE members      ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams        ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles     ENABLE ROW LEVEL SECURITY;

-- anon / authenticated: SELECT 全件許可（公開データ）
CREATE POLICY "public select members"
  ON members FOR SELECT USING (true);

CREATE POLICY "public select teams"
  ON teams FOR SELECT USING (true);

CREATE POLICY "public select member_teams"
  ON member_teams FOR SELECT USING (true);

CREATE POLICY "public select articles"
  ON articles FOR SELECT USING (true);

-- service_role: INSERT / UPDATE / DELETE 許可（Cron・管理スクリプト用）
-- service_role はデフォルトでRLSをバイパスするため追加ポリシー不要
-- （Supabase の service_role は BYPASSRLS 権限を持つ）
