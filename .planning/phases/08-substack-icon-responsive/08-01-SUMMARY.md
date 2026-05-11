---
phase: 08-substack-icon-responsive
plan: 01
subsystem: ui
tags: [rss-parser, tailwindcss, responsive, icon, substack]

# Dependency graph
requires:
  - phase: 04-kv-migration
    provides: "MemberFeedResult 型、fetchAllFeedsCached 関数"
  - phase: 01-foundation
    provides: "HeatmapRow、WeeklyHeatmapGrid、CalendarGrid コンポーネント基盤"
provides:
  - "MemberFeedResult に imageUrl?: string を追加（channel.image.url から取得）"
  - "HeatmapRow にアイコン表示 + スマホ幅レスポンシブ対応（アイコンのみ / アイコン+名前）"
  - "WeeklyHeatmapGrid でヘッダー列幅を HeatmapRow と同期"
  - "CalendarGrid ヘッダーにアイコン+名前の横並びレイアウト"
  - "imageUrl が undefined 時のグレー円フォールバック（画面崩れなし）"
affects:
  - ui
  - heatmap
  - member-calendar

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "rss-parser の feed.image?.url を FeedResult 型でラップして上位に伝播するパターン"
    - "Server Component（HeatmapRow）で条件レンダリングによるフォールバック（onError 不使用）"
    - "Tailwind sm: ブレークポイント（640px）でモバイルファーストレスポンシブを CSS のみで実装"
    - "imageUrl が undefined の場合に同サイズの bg-gray-200 span でプレースホルダーを表示"

key-files:
  created: []
  modified:
    - src/lib/types.ts
    - src/lib/fetchFeed.ts
    - src/components/HeatmapRow.tsx
    - src/components/WeeklyHeatmapGrid.tsx
    - src/components/CalendarGrid.tsx
    - src/app/member/[substackId]/page.tsx

key-decisions:
  - "<img> タグを使用し next/image は不採用（next.config.ts 変更不要、KISSに準拠）"
  - "HeatmapRow は Server Component のままとし、onError ハンドラーを使わない条件レンダリングで実装"
  - "CalendarGrid は Client Component だが onError は省略し imageUrl 存在チェックのみで実装（KISS）"
  - "スマホ幅ブレークポイントは sm:（640px）を採用（Tailwind デフォルト）"
  - "imageUrl が undefined の場合は同サイズの span（グレー円）でフォールバック（幅ゼロ崩れを防止）"

patterns-established:
  - "Pattern: FeedResult ローカル型で items と imageUrl を一括管理し MemberFeedResult にスプレッド伝播"
  - "Pattern: ヒートマップ列幅は WeeklyHeatmapGrid（ヘッダー）と HeatmapRow（データ行）を同じクラスで同期"

requirements-completed:
  - ICON-01
  - ICON-02
  - ICON-03

# Metrics
duration: 15min
completed: 2026-05-11
---

# Phase 8 Plan 01: Substackアイコン表示+レスポンシブ対応 Summary

**rss-parser の feed.image?.url をアイコンとして全ビューに表示し、スマホ幅（640px未満）ではアイコンのみ / PC幅ではアイコン+名前を Tailwind sm: クラスで切り替えるレスポンシブ実装**

## Performance

- **Duration:** 15 min
- **Started:** 2026-05-11T00:00:00Z
- **Completed:** 2026-05-11T00:15:00Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- rss-parser の標準フィールド `feed.image?.url` を `FeedResult` 型でラップし、`MemberFeedResult` まで伝播
- トップビュー（HeatmapRow）の各メンバー行に Substack アイコンを表示し、スマホ幅でアイコンのみ・PC幅でアイコン+名前のレスポンシブ対応を実装（ICON-01/03）
- メンバーカレンダーページ（CalendarGrid）のヘッダーにアイコン+名前の flex 横並びレイアウトを追加（ICON-02）
- imageUrl が undefined の場合に同サイズのグレー円 span でフォールバックを実装し、画面崩れを防止
- WeeklyHeatmapGrid のヘッダー列幅を HeatmapRow の列幅と同期（w-8 sm:w-32）してグリッドズレを防止

## Task Commits

各タスクをアトミックにコミット:

1. **Task 1: 型定義とfetchFeed.tsの変更** - `dc60ce0` (feat)
2. **Task 2: HeatmapRow と WeeklyHeatmapGrid のアイコン表示+レスポンシブ対応** - `ab6f745` (feat)
3. **Task 3: CalendarGrid と member/[substackId]/page.tsx のアイコン表示** - `6d7d67c` (feat)

## Files Created/Modified

- `src/lib/types.ts` - MemberFeedResult に imageUrl?: string を追加
- `src/lib/fetchFeed.ts` - FeedResult ローカル型を追加。fetchWithRetry が feed.image?.url を返す形に変更。fetchMemberFeedCached/fetchAllFeeds/fetchAllFeedsCached を更新
- `src/components/HeatmapRow.tsx` - imageUrl prop 追加、列幅を w-8 sm:w-32 に変更、アイコン表示（フォールバック付き）、メンバー名を hidden sm:block でPC幅のみ表示
- `src/components/WeeklyHeatmapGrid.tsx` - ヘッダー列幅を w-8 sm:w-32 に変更（HeatmapRow と同期）、imageUrl を HeatmapRow に渡す
- `src/components/CalendarGrid.tsx` - imageUrl prop 追加、h2 を flex div でラップしてアイコン+名前の横並びに変更
- `src/app/member/[substackId]/page.tsx` - memberResult.imageUrl を CalendarGrid に渡す

## 追加した型

- **FeedResult**（fetchFeed.ts ローカル型）: `{ items: FeedItem[]; imageUrl?: string }` — fetchWithRetry の戻り値
- **MemberFeedResult.imageUrl?**（types.ts）: `imageUrl?: string` — channel.image.url から取得した Substack アイコン URL

## レスポンシブ実装

- ブレークポイント: `sm:` = 640px 以上（Tailwind デフォルト、モバイルファースト）
- スマホ（640px未満）: アイコン（w-5 = 20px）のみ表示。列幅 w-8（32px）
- PC（640px以上）: アイコン + 名前（hidden sm:block）。列幅 w-8 sm:w-32
- CSSのみで完結（JavaScript 幅検知なし）

## フォールバック方針

imageUrl が undefined の場合:
- HeatmapRow: `<span className="w-5 h-5 rounded-full shrink-0 bg-gray-200 inline-block" aria-hidden="true" />`（20px グレー円）
- CalendarGrid: `<span className="w-8 h-8 rounded-full bg-gray-200 inline-block shrink-0" aria-hidden="true" />`（32px グレー円）

同サイズのプレースホルダーを常に表示するため、アイコンなしのメンバーがいてもレイアウトが崩れない。

## 実装上の判断

- **HeatmapRow は Server Component のまま**: onError（イベントハンドラ）は Server Component で使用不可。imageUrl の存在チェックによる条件レンダリングで十分なためクライアント化しなかった
- **CalendarGrid の onError は省略**: Client Component なので onError を使用できるが、imageUrl 存在チェックの条件レンダリングのみでフォールバックが十分機能するため、KISS 原則に従い省略した
- **next/image 不採用**: remotePatterns 設定（next.config.ts 変更）が必要になり変更箇所が増える。既存コードが `<img>` 統一のため KISS に反する

## Decisions Made

- `<img>` タグ（通常の HTML）を使用し next/image は採用しなかった（KISS・next.config.ts 変更不要）
- HeatmapRow は Server Component のままとし、onError 不使用で条件レンダリングのみで実装
- CalendarGrid は Client Component だが KISS により onError を省略
- スマホ幅ブレークポイントは sm:（640px）を採用

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## Known Stubs

None - 全コンポーネントが実際の imageUrl データソース（fetchFeed.ts 経由の RSS フィード）と接続済み。

## Threat Flags

脅威モデル T-08-01〜T-08-04 は PLAN.md に記載済み。追加の新規脅威面なし。

- `<img src={imageUrl}>` は JSX の文字列属性エスケープにより XSS リスクなし（T-08-03: mitigate 済み）
- imageUrl は Substack RSS フィードから取得した公開 CDN URL（ユーザー入力ではない）

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- ICON-01/02/03 の要件をすべて実装完了
- TypeScript 型チェックとビルドが成功
- 次フェーズ（Phase 9 以降）の前提条件はなし

---
*Phase: 08-substack-icon-responsive*
*Completed: 2026-05-11*
