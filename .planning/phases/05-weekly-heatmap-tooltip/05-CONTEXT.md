# Phase 5: WeeklyHeatmap + リッチTooltip - Context

**Gathered:** 2026-05-09
**Status:** Ready for planning

<domain>
## Phase Boundary

トップページ（`src/app/page.tsx`）を、直近7日間 × 全メンバーのヒートマップに刷新する。
左端列にメンバー名（クリックで `/member/{substackId}` 遷移）、上端行に日付ヘッダー、各セルに投稿数による色の濃淡を表示する。
記事ありセルにホバー（モバイルはタップ）すると、サムネイル（RSSから取得）+ タイトル全文のTooltipを表示し、クリックで記事へ遷移できる。
ソートは7日間投稿量降順 → addedAt昇順。50人規模でも縦スクロールでレイアウトが崩れない。

</domain>

<decisions>
## Implementation Decisions

### セル色・濃淡デザイン
- **D-01:** 投稿数で6段階の濃淡を使用する — 現`MiniCalendar`の`bg-green-100/200/300/500/700`パターンを踏襲。記事なし=`bg-gray-100`
- **D-02:** 直近7日 = 今日（当日）から遡って6日前まで（今日含む7日間）。未来の日付は表示しない
- **D-03:** 記事なしセル = `bg-gray-100`（現MiniCalendarと同じグレー）

### Tooltipの見た目とトリガー
- **D-04:** レイアウト: サムネイル上・タイトル下の縦積み
- **D-05:** タイトルは全文表示（REQUIREMENTS.md TIP-01の「20文字」は変更）。`max-w-xs`（約160px）内で`break-words`折り返し
- **D-06:** サムネイルなし時はサムネイル領域を省略し、タイトルのみ上に詰めて表示（プレースホルダーなし）
- **D-07:** デスクトップ=ホバーで表示、モバイル=タップでトグル（既存`ArticleTooltip`と同じ挙動パターン）
- **D-08:** Tooltip最大幅 `max-w-xs`（160px相当）

### 50人対応レイアウト
- **D-09:** ページ内縦スクロール（全員を1ページに表示。スティッキーヘッダーなし）
- **D-10:** メンバー名列（左端）= `w-32`（8rem）固定幅、長い名前は`truncate`で省略

### コンポーネント構成
- **D-11:** ヒートマップ専用の新コンポーネントを作成する（例: `WeeklyHeatmapGrid.tsx` + `HeatmapRow.tsx`）。既存`MiniCalendar`は改造しない
- **D-12:** 既存`MiniCalendar`は `/member/{substackId}` ページで引き続き使用。Phase 5では削除・変更しない
- **D-13:** 日付ヘッダー（上端行）あり。形式は `MM/DD`（例: `5/3`、`5/4`...）

### Claude's Discretion
- サムネイル画像のサイズ（CSS）はコンパクトに収まるよう実装時に決定
- `FeedItem`型への`contentEncoded`フィールド追加と`rss-parser`のカスタムフィールド設定はClaude判断で実装
- セルサイズ（正方形の具体的なpx/rem）はレイアウト全体のバランスでClaude判断

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 要件定義
- `.planning/REQUIREMENTS.md` — HEAT-01〜03, TIP-01〜03, UX-01の詳細要件（TIP-01のタイトル20文字はD-05で上書き）
- `.planning/ROADMAP.md` — Phase 5のSuccess Criteria（5項目）

### 既存実装（変更対象・参照元）
- `src/app/page.tsx` — ヒートマップに刷新する対象ページ
- `src/lib/fetchFeed.ts` — `fetchAllFeedsCached`（署名変更なし）。`content:encoded`取得のためカスタムフィールド追加が必要
- `src/lib/types.ts` — 現`Member`型と`FeedItem`型（`FeedItem`に`contentEncoded`追加が必要）
- `src/lib/calendarUtils.ts` — `buildArticleMap`、`parseIsoDate`（再利用可能）
- `src/lib/kvMembers.ts` — `getMembers()`（Phase 4で新設済み）

### 既存コンポーネント（参照・維持）
- `src/components/MiniCalendar.tsx` — 月カレンダー実装パターンの参照元。`/member/`ページで継続使用
- `src/components/ArticleTooltip.tsx` — Tooltipの挙動パターン（ホバー/タップトグル）の参照元

### プロジェクト全体
- `.planning/PROJECT.md` — コアバリュー、制約（Next.js App Router + Tailwind CSS）

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `calendarUtils.ts:parseIsoDate` — ISO 8601をパースするタイムゾーン安全な実装。直近7日判定にも使える
- `calendarUtils.ts:buildArticleMap` — FeedItemから`"YYYY-MM-DD"`キーのMapを構築。ヒートマップセルのデータ取得に再利用可能
- `ArticleTooltip.tsx` — hover/tapトグルのTooltip実装パターン（`useRef` + `useEffect`でclick outside検知）。新Tooltipコンポーネントの参照実装
- `MiniCalendar.tsx` — 6段階濃淡のTailwindクラスパターン（D-01で継承）

### Established Patterns
- `'use client'` — TooltipなどのインタラクティブコンポーネントはClient Component
- Server Component（page.tsx）でデータ取得 → Client Componentにpropsで渡す分離パターン
- `fetchAllFeedsCached` の署名`(members: Member[])`は変更しない（Phase 4で確定）
- Tailwind CSS 4系でスタイリング

### Integration Points
- `page.tsx` の `getMembers()` + `fetchAllFeedsCached(members)` 呼び出しはPhase 4で整備済み。Phase 5ではその結果をWeeklyHeatmapGridに渡す
- `FeedItem`型への`contentEncoded?: string`追加と、`rss-parser`の`customFields`設定が必要
- `/member/{substackId}` ページ（`src/app/member/[substackId]/page.tsx`）はPhase 5では変更しない

</code_context>

<specifics>
## Specific Ideas

- サムネイルはRSS `content:encoded`からregexで最初の`<img src="...">`を抽出する（OGPフェッチ不使用。REQUIREMENTS.md Out of Scope確認済み）
- ヒートマップ行のソート: `results`を「直近7日の記事数降順 → addedAt昇順」で並び替えてからレンダリング
- 直近7日の計算: `new Date()` から遡って today, today-1, ..., today-6 の7日分の`"YYYY-MM-DD"`配列を生成
- `rss-parser`のカスタムフィールド設定例: `new Parser({ customFields: { item: [['content:encoded', 'contentEncoded']] } })`

</specifics>

<deferred>
## Deferred Ideas

- スティッキーヘッダー（メンバー名列と日付列を固定）— 実装複雑度が高い。50人縦スクロールで十分
- team-idフィルター — Phase 6（HEAT-04）で実装
- 年間ヒートマップ（GitHub草型）— Future要件

</deferred>

---

*Phase: 5-WeeklyHeatmap + リッチTooltip*
*Context gathered: 2026-05-09*
