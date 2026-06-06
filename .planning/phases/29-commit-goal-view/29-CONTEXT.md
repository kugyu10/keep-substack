# Phase 29: Commit & Goal View — 新トップページ - Context

**Gathered:** 2026-06-03
**Status:** Ready for planning

<domain>
## Phase Boundary

現トップ（週次ヒートマップ）を `/weekly-stamp` に移動し、新トップ (`/`) に `CommitGoalView` + `CommitGrid` コンポーネントを実装する。

**Requirements:** VIEW-01, VIEW-02, VIEW-03, VIEW-04, VIEW-05, VIEW-06, VIEW-07

**ACHIEV-01/02（👑/🔥計算ロジック）はPhase 30スコープ外。Phase 29ではアチーブメント列のスペース確保のみ。**

</domain>

<decisions>
## Implementation Decisions

### CommitGridセル幅設計
- **D-01:** セル幅統一アプローチ: 固定グリッドで全メンバーの CommitGrid 総横幅を同一にする。週N回 × 3週 = N×3 セルで、グリッド列数の LCM（週1〜4の場合 LCM = 12、ただし週3回は9セルで余りが出るため実装は36列グリッド [col-span-12/6/4/3] またはプランナーが最適解を決定）
- **D-02:** 週の区切り: 3週ブロックの間（2箇所）に細い縦線（`border-r` や `divide-x` 的なスタイル）を入れる
- **D-03:** 未投稿スロットセルの曜日名: 日本語2文字（月、火、水、木、金、土、日）— ISO 8601 day_of_week マッピング（1=月〜7=日、Phase 28 D-15）に対応

### データ層設計
- **D-04:** 3週分（21日間）の記事データは `fetchAllFeedsCached` を流用する。KVアーカイブ全件を返すので、`isoDate` で21日以内にフィルタすれば足りる
- **D-05:** `member_commit_slots` は `src/app/page.tsx`（Server Component）で全メンバー分まとめて Supabase SELECT し、props として `CommitGoalView` に渡す
- **D-06:** `member_commit_slots` の RLS: `anon` ロールに `SELECT` を許可する（公開読み取り OK）。書き込みは既存 D-18（本人のみ）を維持。既存 migration に追加 policy が必要

### スマホ縮退
- **D-07:** CSS-only 実装。3週分をレンダリングし、古い2週（最初の2ブロック）を `sm:` ブレークポイント以下で `hidden` にする。JS viewport 検知は不要
- **D-08:** 縮退時の表示は「現在週（最新週）」のみ — 最も関心が高い情報

### アチーブメント列スコープ境界
- **D-09:** Phase 29 では Achievement 列のスペースのみ確保（`w-8` 程度の空 div）。👑/🔥 アイコンの計算・表示は Phase 30 が担当
- **D-10:** メンバー並び順: ①今週の実績率（達成スロット / 全スロット）降順 → ②同率ならストリーク週数降順 → ③同位なら登録順（id 昇順）。**仮の実装** — 後で変える可能性あり

### Claude's Discretion
- `/weekly-stamp` 移行: 既存 `src/app/page.tsx` のロジックを `src/app/weekly-stamp/page.tsx` としてコピーし、`src/app/page.tsx` を新規 CommitGoalView ページに差し替える
- 固定グリッドの具体的列数実装（36列 or 他のアプローチ）: 見た目の均一性を保てる方法をプランナーが選択
- `member_commit_slots` の Supabase クライアント種別: 公開ページなので `server` クライアント（`getUser()` 不要）で OK
- `revalidate` 値: 既存の `300`（5分）を踏襲

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/ROADMAP.md` §Phase 29 — Goals, plans (2本), success criteria
- `.planning/REQUIREMENTS.md` §VIEW-01〜07 — 詳細要件と受け入れ条件
- `.planning/REQUIREMENTS.md` §ACHIEV-01, ACHIEV-02 — Phase 30スコープ（参照のみ）

### 既存トップページ実装
- `src/app/page.tsx` — 現在のトップページ（移行元。この構造を `/weekly-stamp` に複製）
- `src/components/WeeklyHeatmapGrid.tsx` — `Client Component` のパターン参照
- `src/components/HeatmapRow.tsx` — 行レイアウトのパターン（avatar+name / grid / count）

### データ取得パターン
- `src/lib/fetchFeed.ts` — `fetchAllFeedsCached` (流用対象)
- `src/lib/types.ts` — `Member`, `FeedItem`, `MemberFeedResult` 型定義
- `src/lib/members.ts` — `getMembers()` パターン

### Phase 28 コンテキスト（DB設計の引き継ぎ）
- `.planning/phases/28-db-my/28-CONTEXT.md` — `member_commit_slots` テーブル定義 (D-13〜18)、特に D-15（day_of_week ISO 8601マッピング）

### DB・RLS
- `supabase/schema.sql` — 現行スキーマ定義（`member_commit_slots` テーブルに `anon SELECT` ポリシー追加が必要）
- `supabase/migrations/` — 最新 migration の形式参照（RLS policy 追加 migration を追加）

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/fetchFeed.ts:fetchAllFeedsCached` — 全メンバーの記事を KV+ライブフィードで取得。KVアーカイブ全件を返すため21日フィルタで3週分取得可能
- `src/components/HeatmapRow.tsx` — 行レイアウト参照: `w-16 sm:w-52`（avatar+name）+ flex-1 grid + `w-10`（count）。CommitGoalRow の設計ベースにできる
- `src/lib/types.ts:FeedItem.thumbnail` — サムネイルURL（投稿済みスロットのセルに表示）
- `src/lib/types.ts:FeedItem.isoDate` — 日付フィルタリングに使用

### Established Patterns
- Server Component でデータ取得 → Client Component に props 渡し（`page.tsx` → `WeeklyHeatmapGrid` パターン）
- Tailwind レスポンシブ: `hidden sm:block` パターン（HeatmapRow の名前表示で確立済み）
- Supabase `server` クライアント: `src/lib/supabase/server.ts` の `createServerClient`
- ISR `revalidate = 300` — 既存トップページから踏襲

### Integration Points
- `src/app/page.tsx` → `src/app/weekly-stamp/page.tsx` にコピー移行
- `src/app/page.tsx` を新規 CommitGoalView ページで置き換え
- Supabase `member_commit_slots` テーブル: `anon` SELECT policy 追加（`schema.sql` + 新規 migration）
- `src/lib/types.ts`: `CommitSlot` 型（`member_id, day_of_week, hour`）を追加

</code_context>

<specifics>
## Specific Ideas

- CommitGrid の行内週区切り: 縦線をシンプルな `border-l border-gray-200` 的スタイルで実現。派手にならないよう細く
- 並び順は仮実装 — 実績率計算が複雑になるようなら `sortByWeeklyCount`（投稿数）で代替して良い
- 未設定メンバーの「未コミット」グレー表示は `text-gray-400` + `text-sm` 程度でシンプルに

</specifics>

<deferred>
## Deferred Ideas

- メンバー並び順の最終確定 — 今週の実績率 → ストリーク → 登録順は仮。運用後に調整予定（出現を backlog に追加推奨）

</deferred>

---

*Phase: 29-commit-goal-view*
*Context gathered: 2026-06-03*
