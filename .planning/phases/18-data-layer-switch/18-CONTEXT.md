# Phase 18: データレイヤー差し替え + 長期記事履歴 - Context

**Gathered:** 2026-05-16
**Status:** Ready for planning

<domain>
## Phase Boundary

アプリ全体の読み書きをKV（Upstash Redis）からSupabase PostgreSQLに切り替え、Cronが長期記事をarticlesテーブルに累積保存できる状態にする。

**このフェーズで作るもの:**
- `kvMembers.ts` の内部実装をSupabaseに書き換え（シグネチャ・ファイル名変更なし）
- `kvArticles.ts` の内部実装をSupabaseに書き換え（シグネチャ・ファイル名変更なし）
- `fetchFeed.ts` の `getArticles()` 参照をSupabaseクエリに変更
- `src/middleware.ts` → `src/proxy.ts` リネーム（Next.js 16対応）

**このフェーズで作らないもの:**
- 認証UI（Phase 19）
- チェックボックスUI（Phase 20）
- @upstash/redis削除・KVファイル廃止（Phase 21）

</domain>

<decisions>
## Implementation Decisions

### ファイル構成戦略

- **D-01:** `kvMembers.ts` と `kvArticles.ts` の**内部実装のみ**をSupabaseに書き換える。ファイル名・関数シグネチャは変更しない。
  - `src/app/admin/actions.ts`、`src/app/api/cron/route.ts`、`src/lib/fetchFeed.ts`、`src/app/page.tsx`、`src/app/member/[substackId]/page.tsx` の import は変更ゼロ
  - Phase 21 で redis import・KV固有コードを削除する（ファイル削除ではなくコード整理）
- **D-02:** `supabaseAdmin`（`src/lib/supabase/admin.ts`）を使用して書き込む。公開ISRページで使う `getMembers()` も admin クライアントで読み取る（RLSはanon keyでSELECT許可されているが、一貫性のためadminを使う）

### articles テーブルのフィールド

- **D-03:** `FeedItem.thumbnail` を `articles.image_url` に保存する。HISTORY-01要件の「imageUrl」はこれに該当。
  - 将来のHeatmapTooltip改善（各記事サムネイル表示）に活用可能
  - INSERT時に `ON CONFLICT (link) DO NOTHING` で重複排除（Phase 17スキーマのUNIQUE制約を活用）

### saveArticles の imageUrl 処理

- **D-04:** `saveArticles(substackId, items, imageUrl?)` のシグネチャは変更しない。
  - 記事を `articles` テーブルに upsert する
  - `imageUrl`（チャンネルアイコン）が渡された場合は `members.image_url` を UPDATE する（同一関数内）
  - 呼び出し元（cron/route.ts、admin/actions.ts）の変更はゼロ

### fetchAllFeedsCached の Supabase 読み取り

- **D-05:** 現行の `Promise.allSettled` + 個別クエリパターンを維持する（KISS）。
  - `getArticles(substackId)` がKVではなくSupabaseから読み取るように内部を変更するだけ
  - 50人規模ではN+1クエリでも許容範囲
  - ISRハイブリッド（LiveRSS + Supabase過去記事マージ）は継続

### middleware.ts リネーム

- **D-06:** `src/middleware.ts` を `src/proxy.ts` にリネームする（Next.js 16対応）。このフェーズのスコープ内で実施。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 要件定義
- `.planning/REQUIREMENTS.md` — MIGRATE-03（シグネチャ維持・Supabase差し替え）、HISTORY-01〜03の定義
- `.planning/ROADMAP.md` §Phase 18 — Success Criteria 3項目

### アーキテクチャ決定（Phase 17から継承）
- `.planning/phases/17-supabase-rls-kv/17-CONTEXT.md` — Supabaseクライアント3種類、articlesテーブルスキーマ（D-01〜D-17）
- `.planning/STATE.md` §Accumulated Context — Transaction Pooler URL必須、getUser()必須等

### 既存コード（書き換え対象）
- `src/lib/kvMembers.ts` — 現行実装（getMembers/addMember/deleteMember/updateMember）
- `src/lib/kvArticles.ts` — 現行実装（getArticles/saveArticles/deleteArticles）
- `src/lib/fetchFeed.ts` — fetchAllFeedsCached（KV + LiveRSSハイブリッド）
- `src/app/api/cron/route.ts` — Cronエンドポイント（getMembers + saveArticles を使用）
- `src/app/admin/actions.ts` — 管理画面アクション（addMember/deleteMember/updateMember/saveArticles を使用）

### Supabase基盤（Phase 17で構築済み）
- `src/lib/supabase/admin.ts` — service_role クライアント（Cron・移行スクリプト用）
- `src/lib/supabase/server.ts` — anon クライアント（ISRページ用）

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/types.ts`: `Member`型・`FeedItem`型がSupabaseテーブルカラムのマッピング基準
  - `FeedItem.thumbnail` → `articles.image_url`
  - `FeedItem.isoDate` → `articles.pub_date`（TIMESTAMPTZ）
  - `Member.substackId` → `members.substack_id`
- `src/lib/supabase/admin.ts`: Phase 17で構築済み。全書き込み操作で使用する

### Established Patterns
- `fetchAllFeedsCached` シグネチャ維持の原則（Phase 10→12.1で3回実装変更したがゼロ影響）
- `Promise.allSettled` 並列化パターン（cron/route.ts・fetchFeed.ts で使用中）
- `ON CONFLICT (link) DO NOTHING` でarticles重複排除（Phase 17スキーマのUNIQUE制約）

### Integration Points
- `kvMembers.ts`/`kvArticles.ts` を書き換えるだけで5ファイルの呼び出し元が自動的にSupabaseを参照する
- `articles.substack_id` は `members.substack_id` へのFK（ON DELETE CASCADE）
- `members.image_url` は `saveArticles()` の `imageUrl` 引数から UPDATE する

</code_context>

<specifics>
## Specific Ideas

- `saveArticles` の articles upsert は `ON CONFLICT (link) DO NOTHING`（INSERT INTO ... ON CONFLICT DO NOTHING）で実装する
- `saveArticles` 内の `members.image_url` 更新は `imageUrl` が undefined の場合はスキップ
- `getArticles(substackId)` は `SELECT * FROM articles WHERE substack_id = $1 ORDER BY pub_date DESC` で実装
- `getMembers()` は `SELECT * FROM members` + teams/member_teams の JOIN または別クエリでteamNamesを組み立てる（Phase 17スキーマの多対多テーブル構成を考慮）

</specifics>

<deferred>
## Deferred Ideas

- `getMembers()` の JOIN最適化（member_teams経由でteamNamesを効率的に取得）— Phase 21のコードベース整理時に検討
- articles.image_url の HeatmapTooltip への統合 — v1.6以降（サムネイル保存基盤はこのフェーズで完成）
- Supabase Auth ロール（admin）による管理画面制御 — Phase 19
- @upstash/redis パッケージと KV ファイルの完全削除 — Phase 21

</deferred>

---

*Phase: 18-データレイヤー差し替え + 長期記事履歴*
*Context gathered: 2026-05-16*
