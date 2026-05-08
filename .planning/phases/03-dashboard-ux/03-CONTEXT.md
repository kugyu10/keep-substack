# Phase 3: ダッシュボードとUX仕上げ - Context

**Gathered:** 2026-05-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 2で構築したCalendarGridコンポーネントを活用し、全メンバーのミニカレンダーを一覧表示するダッシュボード（トップページ）と、個人詳細ページ（/member/[substackId]）を実装する。モバイルでも見やすいレスポンシブデザインを適用する。

</domain>

<decisions>
## Implementation Decisions

### 個人詳細ビュー（DASH-02）
- **D-01:** 個人詳細は別ページ遷移。URL は `/member/[substackId]` 形式
- **D-02:** `substackId` は `feedUrl` のサブドメインから自動抽出する（`https://uojun.substack.com/feed` → `uojun`）。`members.json` への項目追加は不要
- **D-03:** 個人詳細ページの内容はフルサイズ CalendarGrid（月ナビ付き）をそのまま再利用する。Phase 2コンポーネントを再利用することでコード重複を避ける
- **D-04:** 個人詳細ページには「← ダッシュボードに戻る」リンクを表示する

### Claude's Discretion
- **ミニカレンダーの定義（DASH-01）:** ダッシュボードに表示するミニカレンダーの見せ方はClaude判断。CalendarGridの縮小版（月ナビなし、今月のみ表示）が適切と思われるが、実装方法は研究・判断に委ねる
- **ダッシュボードレイアウト（DASH-01/DASH-03）:** グリッド列数（2列、3列など）とレスポンシブ設計はClaude判断。モバイル（1列）→タブレット（2列）→PC（3列）のブレークポイント設計を推奨
- **静的生成方式（DASH-02）:** `/member/[substackId]` の静的生成（generateStaticParams）vs ISR の選択はClaude判断。force-static維持の観点から検討すること

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### プロジェクト要件
- `.planning/PROJECT.md` — プロジェクト概要、制約、コアバリュー
- `.planning/REQUIREMENTS.md` — DASH-01〜03がPhase 3対象
- `.planning/ROADMAP.md` — Phase 3のSuccess Criteria

### Phase 1〜2成果物（統合ポイント）
- `src/lib/types.ts` — FeedItem, Member, MemberFeedResult 型定義
- `src/lib/fetchFeed.ts` — fetchAllFeedsCached のシグネチャ
- `src/lib/calendarUtils.ts` — buildArticleMap, parseIsoDate（substackId抽出にも応用可）
- `src/components/CalendarGrid.tsx` — 個人詳細ページで再利用する（月ナビ付き）
- `src/data/members.json` — メンバー設定（name, feedUrl のみ。substackIdはfeedUrlから抽出）
- `src/app/page.tsx` — ダッシュボード（トップページ）として置き換え・拡張する起点
- `.planning/phases/02-calendar-ui/02-CONTEXT.md` — Phase 2の決定事項（ツールチップ方針等）

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CalendarGrid.tsx` — 個人詳細ページ（/member/[substackId]）でそのまま再利用。Props: `{ memberName, articleMap }`
- `fetchAllFeedsCached(members)` — 全フィードデータ取得。トップページ・個人詳細ページ両方で使用
- `buildArticleMap(items)` — 記事→日付マップ変換。個人詳細ページでも使用

### Established Patterns
- `export const dynamic = 'force-static'` パターン — page.tsx で確立済み。個人詳細ページも同様のISR設定を維持すること
- Server Component（データ取得）→ Client Component（インタラクション）の分割パターン確立済み
- `Array.from(map.entries())` でMap→配列変換してからClientコンポーネントに渡すパターン確立済み

### Integration Points
- ダッシュボード（page.tsx）: 現在の全メンバーフルカレンダー縦並び → ミニカレンダーグリッドに変更
- 個人詳細ページ: `src/app/member/[substackId]/page.tsx` を新規作成
- substackId抽出: `feedUrl.match(/^https?:\/\/([^.]+)\.substack\.com/)` パターンで抽出

</code_context>

<specifics>
## Specific Ideas

- 個人詳細ページのURL例: `/member/uojun`, `/member/careerkoumei`（Substackのサブドメインそのもの）
- substackIdはfeedUrlから自動抽出するため、members.jsonの変更不要

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 3-ダッシュボードとUX仕上げ*
*Context gathered: 2026-05-08*
