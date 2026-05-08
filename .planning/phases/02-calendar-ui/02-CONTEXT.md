# Phase 2: カレンダーUI - Context

**Gathered:** 2026-05-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 1で構築したRSSフィード取得ロジック（fetchAllFeedsCached, MemberFeedResult）を活用し、各メンバーの記事公開日を月別カレンダーグリッドで表示するUIを実装する。記事ありの日のハイライト、ホバー/クリックで開くツールチップ（タイトル＋リンク）、前月/次月ナビゲーションを含む。メンバー一覧ダッシュボードはPhase 3のスコープ。

</domain>

<decisions>
## Implementation Decisions

### ホバーツールチップ（CAL-03）
- **D-01:** ツールチップのトリガーはホバー＋クリック両対応。スマートフォンでもクリックで開く
- **D-02:** 1日に複数記事がある場合は全件リスト表示（タイトル＋リンクを縦に並べる）
- **D-03:** ツールチップはセルの上方向に表示する

### Claude's Discretion
- **セルのハイライト表現（CAL-02）:** 記事ありの日の色・スタイルはClaude判断。GitHub草風の濃淡、色付き塗りつぶし、ドット表示など。「頑張りが一目でわかる」コアバリューに合う表現を選ぶ
- **カレンダービュー構成:** Phase 2でのビュー構造（新規ページ追加か、page.tsx拡張か）はClaude判断。Phase 3ダッシュボード（全員ミニカレンダー）への拡張性を考慮すること
- **月ナビゲーション実装（CAL-04）:** URLクエリパラメータかReact stateかはClaude判断。Next.js App Routerのパターンに自然に沿う方法を選ぶ

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### プロジェクト要件
- `.planning/PROJECT.md` — プロジェクト概要、制約、技術スタック、コアバリュー
- `.planning/REQUIREMENTS.md` — CAL-01〜04がPhase 2対象
- `.planning/ROADMAP.md` — Phase 2のSuccess Criteria（月別グリッド、ホバー、月ナビゲーション）

### Phase 1成果物（統合ポイント）
- `src/lib/types.ts` — FeedItem（isoDate, title, link）, Member, MemberFeedResult 型定義
- `src/lib/fetchFeed.ts` — fetchAllFeedsCached のシグネチャと動作
- `src/app/page.tsx` — 現在のページ構造（カレンダーUIに置き換え・拡張する起点）
- `.planning/phases/01-project-foundation-data-layer/01-CONTEXT.md` — Phase 1の決定事項

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `fetchAllFeedsCached(members: Member[]): Promise<MemberFeedResult[]>` — カレンダーへのデータ供給。そのまま使う
- `FeedItem.isoDate` — ISO 8601形式。Date オブジェクトへの変換が簡単でカレンダー日付マッピングに最適
- `src/app/page.tsx` — `export const dynamic = 'force-static'` パターン確立済み。カレンダーページも同じISR設定を使う

### Established Patterns
- Tailwind CSS（インストール済み）— カレンダーグリッドのスタイリングに使う
- Next.js App Router — Server Componentでデータ取得、インタラクション部分はClient Component

### Integration Points
- カレンダーUIは `fetchAllFeedsCached` から受け取った `MemberFeedResult[]` を「メンバーごとの日付→記事マッピング」に変換して使う
- `isoDate` を `new Date(isoDate)` で変換し、年・月・日で記事を分類する

</code_context>

<specifics>
## Specific Ideas

- ツールチップはホバー＋クリック両対応。外クリックまたは×ボタンで閉じるUIパターン
- 複数記事がある日は全件タイトル＋リンクをリスト表示

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 2-カレンダーUI*
*Context gathered: 2026-05-08*
