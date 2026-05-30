# Phase 25: 複数publication_idスキーマ拡張 - Context

**Gathered:** 2026-05-30
**Status:** Ready for planning

<domain>
## Phase Boundary

`member_publications` テーブルを追加し、1メンバーが複数の `publication_id` を持てるDB構造を整える。既存 `members.publication_id` を全件 `member_publications` に移行し、`members` 側の書き込みを `member_publications` に自動同期するDBトリガーを設置する。

**このフェーズで変更するもの（DBスキーマ層のみ）:**
- `supabase/migrations/` — `member_publications` テーブル作成DDL + 既存データ移行INSERT + 同期トリガー + RLSを含む新ファイル
- `supabase/schema.sql` — `member_publications` テーブル定義・インデックス・RLS・トリガーを初期セットアップ用に追記

**このフェーズで変更しないもの（Success Criteria #3 の制約）:**
- アプリのUI（1件前提のまま）
- データ取得ロジック（`src/lib/members.ts` の `getMembers()`、`src/lib/articles.ts`、`src/lib/fetchFeed.ts` 等はすべて `members.publication_id` を読み続ける）
- 書き込みロジックのコード（`addMember`/`updateMember`/`deleteMember` は変更せず、同期はDBトリガーが担う）
- `articles.publication_id` の FK 参照先（`members(publication_id)` のまま温存）

**このフェーズで作らないもの（将来Phase）:**
- `member_publications` を真実源とするデータ取得ロジックへの切り替え
- `articles` FK の `member_publications` への貼り替え
- 複数publication_idを表示・編集する複数フィードUI
- `members.publication_id` カラムの廃止

</domain>

<decisions>
## Implementation Decisions

### 既存カラムとの並存方針

- **D-01:** `members.publication_id` を**現役の真実源として温存**する。`member_publications` は移行済みの「並走テーブル」として追加し、将来Phaseで真実源を譲り受ける器とする。
- **D-02:** `articles.publication_id` の FK（`REFERENCES members(publication_id)`）は**貼り替えない**。今貼り替えると取得ロジック変更が必要になり Success Criteria #3 に違反するため、貼り替えは将来Phaseへ送る。
- **D-03:** 長期ゴールは「1メンバーが複数 publication_id を持てる」状態。本Phaseはその段階移行の第一歩（スキーマ追加＋データ移行）であり、アプリ切り替えは含めない。

### テーブル制約の設計

- **D-04:** `member_publications` の列構成: `member_id UUID REFERENCES members(id) ON DELETE CASCADE`、`publication_id TEXT UNIQUE NOT NULL`、`is_primary BOOLEAN NOT NULL DEFAULT false`。主キーは合成キー or 代理キーいずれでも可（planner裁量、ただし `publication_id` のグローバルUNIQUEは必須）。
- **D-05:** `is_primary` の一意性を**部分ユニークインデックスで強制**する: `CREATE UNIQUE INDEX ... ON member_publications(member_id) WHERE is_primary` 。1メンバーに `is_primary = true` は最大1件、を DBレベルで保証する。
- **D-06:** `member_id` FK は `member_teams` テーブルと同じく `ON DELETE CASCADE`（メンバー削除時に publication 行も削除）。
- **D-07:** 移行時は既存 `members` 各行を `is_primary = true` で `member_publications` に INSERT する（明示的に代表をセット）。

### 書き込み同期の範囲

- **D-08:** 移行後の `members` への INSERT/UPDATE/DELETE を **DBトリガーで `member_publications` に自動同期**する。アプリコード（`src/lib/members.ts` 等）は一切変更しない → Success Criteria #3 を厳密に満たす。
  - INSERT: 新規 `members` 行に対応する `member_publications` 行を `is_primary = true` で自動作成。
  - UPDATE: `members.publication_id` が変わった場合、対応する primary 行の `publication_id` を追従更新。
  - DELETE: `member_id` FK の `ON DELETE CASCADE` で自動削除されるため、削除トリガーは不要（plannerが冗長性を確認）。
- **D-09:** 移行は「既存分の初期INSERT + 同期トリガー作成」の2点で完結する。以降の整合維持はトリガーに委ねる。

### Claude's Discretion（未選択エリア — 裁量で確定）

- **マイグレーション構成:** Phase 22 パターンを踏襲。`supabase/migrations/` に新ファイル1本（命名は `YYYYMMDD_add_member_publications.sql` 形式、Phase 22 の `20260517_add_team_status.sql` に倣う）を作成し、`supabase/schema.sql` にも同等の定義を追記して初期セットアップ用ドキュメントを最新化する。
- **RLS:** 他テーブル（members/teams/member_teams/articles）と同様に `member_publications` も `ENABLE ROW LEVEL SECURITY` + `public select` ポリシーを追加し、一貫性を保つ。
- トリガー関数の具体実装（PL/pgSQL の書き方、UPDATE時の追従条件）は planner/researcher 裁量。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 要件定義・ロードマップ
- `.planning/REQUIREMENTS.md` §SCHEMA — SCHEMA-01（`member_publications` 追加）・SCHEMA-02（既存データ移行スクリプト/DDL）
- `.planning/ROADMAP.md` §Phase 25 — Goal・Success Criteria（特に #3「UI・データ取得ロジック変更なし」）・Depends on Phase 22

### 現行スキーマ・マイグレーションパターン
- `supabase/schema.sql` — 現行テーブル定義（`members`/`teams`/`member_teams`/`articles`）・RLS有効化（L48-51）・public selectポリシー（L54-63）。`member_publications` 定義はここに追記する。
- `supabase/migrations/20260517_add_team_status.sql` — Phase 22のマイグレーション実例（踏襲すべきファイル命名・構成パターン）
- `supabase/migrations/20260516_rename_substack_id_to_publication_id.sql` — `publication_id` 命名の経緯

### 影響範囲確認（変更しないが整合確認が必要）
- `src/lib/members.ts` — `getMembers()`/`addMember()`/`updateMember()`/`deleteMember()`。本Phaseでは**変更しない**が、トリガーがこれらの書き込みを正しく同期できることを確認する基準。
- `src/lib/articles.ts` — `articles.publication_id` を `members(publication_id)` 経由で参照。FK温存の根拠。
- `.planning/phases/22-team-status/22-CONTEXT.md` — マイグレーション運用の前例（D-09〜D-11）

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `supabase/migrations/20260517_add_team_status.sql`: マイグレーションファイルの命名・構成テンプレート（`ALTER`/`UPDATE` + schema.sql二重管理）として再利用。
- `supabase/schema.sql` の `member_teams` 定義（L26-30）: `member_id UUID REFERENCES members(id) ON DELETE CASCADE` のFKパターンを `member_publications` でも踏襲。
- `supabase/schema.sql` の RLSブロック（L45-63）: `ENABLE ROW LEVEL SECURITY` + `public select` ポリシーのパターンを `member_publications` にも適用。

### Established Patterns
- マイグレーションは「`supabase/migrations/` に新ファイル」＋「`supabase/schema.sql` に同等定義を追記」の二重管理（Phase 22 D-09〜D-11で確立）。
- 全テーブルでRLS有効化 + `public select` ポリシーが必須（認証なし公開ページのため）。
- `members.publication_id` は `TEXT UNIQUE NOT NULL`、`articles.publication_id` がこれをFK参照（schema.sql L12, L34）。

### Integration Points
- `member_publications.member_id` → `members.id`（FK, ON DELETE CASCADE）
- 同期トリガーは `members` テーブルの行イベントにアタッチ（INSERT/UPDATE/DELETE）
- 既存アプリコードとの接続点はなし（トリガーがアプリを介さずDB内で完結 → アプリ無改修）

</code_context>

<specifics>
## Specific Ideas

- ユーザー明言: 「将来的に1memberは複数publication_idを持てるようにしたい」。本Phaseはその布石であり、`member_publications` の制約はこの将来像（複数所持・代表1件）を前提に設計する。
- アプリを一切触らずDB内で整合を保つアプローチ（トリガー）を明示的に選好。コード変更による副作用を避けたい意向。

</specifics>

<deferred>
## Deferred Ideas

- **データ取得ロジックの `member_publications` ベースへの切り替え** — 将来Phase（取得・表示の複数フィード対応とセット）
- **`articles` FK の `member_publications` への貼り替え** — 将来Phase（取得ロジック切り替えと同時）
- **複数publication_id表示/編集UI** — REQUIREMENTS.md §DEFERRED「member_publicationsを使った複数フィード表示UI — SCHEMA-01/02完了後に検討」に既出。将来Phase。
- **`members.publication_id` カラムの最終廃止** — `member_publications` が真実源に昇格した後の将来Phase。

</deferred>

---

*Phase: 25-publication-id*
*Context gathered: 2026-05-30*
