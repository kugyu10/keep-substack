# Phase 17: Supabaseスキーマ + RLS設定 + KVデータ移行 - Context

**Gathered:** 2026-05-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Supabase PostgreSQLのテーブル定義（members・articles・teams・member_teams）、RLSポリシー設定、Supabaseクライアントライブラリ基盤（3種類）の構築、および既存Upstash RedisのデータをPostgreSQLへ一括エクスポート・インポートする。

**このフェーズで作るもの:**
- PostgreSQL DDL（4テーブル + RLSポリシー）
- src/lib/supabase/server.ts / client.ts / admin.ts
- scripts/export-to-sql.ts（KV→SQL変換スクリプト）

**このフェーズで作らないもの:**
- データレイヤー差し替え（Phase 18）
- 認証UI（Phase 19）
- チェックボックスUI（Phase 20）
- Redisコード削除（Phase 21）

</domain>

<decisions>
## Implementation Decisions

### スキーマ設計

- **D-01:** membersテーブルのPKはUUID（gen_random_uuid()）。substackIdはTEXT UNIQUE NOT NULL（変更時ON UPDATE CASCADE）
- **D-02:** teamsテーブル = `(id UUID PK, name TEXT UNIQUE NOT NULL)` — チーム名マスターリスト（Phase 20のチェックボックスUIが参照）
- **D-03:** member_teamsテーブル = `(member_id UUID FK→members.id ON DELETE CASCADE, team_id UUID FK→teams.id ON DELETE CASCADE, PRIMARY KEY(member_id, team_id))` — 完全正規化の多対多
- **D-04:** articlesテーブル = `(id UUID PK, substack_id TEXT NOT NULL FK→members.substack_id ON DELETE CASCADE, title TEXT, link TEXT UNIQUE NOT NULL, pub_date TIMESTAMPTZ, image_url TEXT)` — link列のUNIQUE制約で重複排除
- **D-05:** imageUrl（メンバーのSubstackアイコン）はmembersテーブルの`image_url TEXT`列に格納。articles各行への冗長保存は不要

### RLSポリシー

- **D-06:** anon keyはSELECT全件可（membersとarticlesは公開データ）。INSERT/UPDATE/DELETEはservice_roleのみ。Phase 19でauthロール追加予定
- **D-07:** RLSは全テーブルで有効化（ENABLE ROW LEVEL SECURITY）してからポリシーを追加

### Supabaseクライアント

- **D-08:** src/lib/supabase/server.ts — createServerClient（@supabase/ssr、ISRページ/Server Componentsで使用）
- **D-09:** src/lib/supabase/client.ts — createBrowserClient（@supabase/ssr、Client Componentsで使用）
- **D-10:** src/lib/supabase/admin.ts — createClient（@supabase/supabase-js、service_role key使用、Cron/移行スクリプトで使用）
- **D-11:** 接続URLはTransaction Pooler URL（port 6543）必須（接続枯渇防止）
- **D-12:** サーバーサイドのユーザー確認は`getUser()`を使用。`getSession()`は禁止（セキュリティホール）
- **D-13:** 公開ISRページ（/、/member/*）ではSupabase Authクライアントを一切使わない

### 移行スクリプト

- **D-14:** `scripts/export-to-sql.ts` をtsxで実行してKVデータからSQLファイルを生成。生成されたSQLをSupabase管理画面のSQL Editorに貼り付けて実行
- **D-15:** KVのteamNamesを全メンバーから集約してteamsテーブルのINSERT SQLを自動生成（重複排除）
- **D-16:** member_teamsのINSERT SQLはteamsテーブルのname→idのサブクエリで生成
- **D-17:** articles移行はKVキー`articles:{substackId}`を全メンバー分フェッチしてINSERT SQL生成。link UNIQUE制約でON CONFLICT DO NOTHINGを使用

### Folded Todos

- **「のちのちSupabase移行」todo** (`todos/pending/2026-05-11-supabase-migration.md`): スキーマ候補（members, teams, member_teams, articles）を確認。`@supabase/ssr`でNext.js App Router対応。このフェーズで実施
- **「過去記事の消失問題」todo** (`todos/pending/2026-05-11-article-history-persistence.md`): articles.link UNIQUE制約で重複排除する設計を採用。KV→Supabase移行でこの問題を解決

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 要件定義
- `.planning/REQUIREMENTS.md` — MIGRATE-01（スキーマ + RLS）、MIGRATE-02（KV移行）の定義
- `.planning/ROADMAP.md` §Phase 17 — Success Criteria 7項目（テーブル作成・RLS確認・接続確認・環境変数・移行検証）

### アーキテクチャ決定
- `.planning/STATE.md` §Accumulated Context — v1.5アーキテクチャ決定事項（クライアント3種類、Transaction Pooler、getUser等）

### 既存コード（移行元）
- `src/lib/kvMembers.ts` — 移行元Member型・KVキー構造（`members`）
- `src/lib/kvArticles.ts` — 移行元StoredFeed型・KVキー構造（`articles:{substackId}`）
- `src/lib/types.ts` — Member, FeedItem型定義（スキーマ設計の参考）

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/types.ts`: Member型（name, substackId, teamNames, addedAt）とFeedItem型（title, link, pubDate, isoDate, thumbnail）がPostgreSQLカラムの設計基準
- `src/lib/kvMembers.ts`: getMembers()でKVから全メンバー取得→移行スクリプトのデータソース
- `src/lib/kvArticles.ts`: getArticles(substackId)でKVから記事取得→移行スクリプトのデータソース

### Established Patterns
- KVキー `members`（単一配列）→ membersテーブル全件SELECT相当
- KVキー `articles:{substackId}` の `StoredFeed.imageUrl` → members.image_url（正規化）
- `HIDDEN_TEAM = 'chameleon'` は現行通りteamNameの値として扱う（teamsテーブルにも登録）

### Integration Points
- 環境変数: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` を `.env.local` + Vercel環境変数に追加
- `scripts/export-to-sql.ts` は `UPSTASH_REDIS_REST_URL` と `UPSTASH_REDIS_REST_TOKEN` も必要（KVアクセス用）

</code_context>

<specifics>
## Specific Ideas

- articlesテーブルのimageUrl列は**不要**（membersに移行したため）。KVのStoredFeed.imageUrlは移行スクリプトでmembers.image_urlにマッピングする
- export-to-sql.tsの出力: members.sql / teams.sql / member_teams.sql / articles.sql の4ファイルまたは単一ファイル（順序依存性に注意: members→teams→member_teams→articles）
- Supabase無料枠（500MB）を考慮してarticlesテーブルには記事本文（content）を保存しない

</specifics>

<deferred>
## Deferred Ideas

- チェックボックスUIでのチーム管理 — Phase 20（teamsテーブル基盤はこのPhase 17で作成済み）
- Supabase Authロール（admin）によるRLS細分化 — Phase 19（Basic Auth廃止時に追加）
- articlesテーブルのサムネイルURL（thumbnail）保存 — Phase 18（HISTORY-01でFeedItemの全フィールドを検討）
- 「1人が複数チームに所属できる多対多」todo (`todos/pending/2026-05-11-multi-team-membership.md`) — Phase 17のmember_teams設計で解決済みだが、UIはPhase 20

</deferred>

---

*Phase: 17-Supabaseスキーマ + RLS設定 + KVデータ移行*
*Context gathered: 2026-05-16*
