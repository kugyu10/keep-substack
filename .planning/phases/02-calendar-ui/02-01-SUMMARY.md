---
phase: 02-calendar-ui
plan: 01
subsystem: ui
tags: [nextjs, react, tailwindcss, calendar, rss]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: fetchAllFeedsCached, FeedItem, Member, MemberFeedResult の型とキャッシュ付きフィード取得関数
provides:
  - calendarUtils.ts — parseIsoDate（タイムゾーン安全）、buildDayGrid、buildArticleMap ユーティリティ
  - CalendarGrid.tsx — 月ナビゲーション付き7列グリッドの Client Component
  - page.tsx — CalendarGrid を使うよう更新されたServer Component
affects: [02-calendar-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Server Component → Client Component へは Map でなく Array.from(map.entries()) でシリアライズして渡す
    - CSS グリッドの動的 colStart は Tailwind 動的クラスではなく style prop で指定する
    - isoDate パースは new Date() を使わず正規表現で行う（タイムゾーン安全）

key-files:
  created:
    - src/lib/calendarUtils.ts
    - src/components/CalendarGrid.tsx
  modified:
    - src/app/page.tsx

key-decisions:
  - "Map シリアライズ不可問題: Server→Client 渡しは Array.from(map.entries()) で配列化し Client 側で new Map(articleMap) で再構築"
  - "Tailwind JIT 動的クラス問題: col-start-${n} は検知されないため gridColumnStart を style prop で付与"
  - "タイムゾーン安全パース: new Date(isoDate) はタイムゾーンによりズレるため正規表現マッチで年月日を直接取得"

patterns-established:
  - "CalendarGrid pattern: articleMap を [string, Article[]][] 配列としてシリアライズして渡し Client 側で Map に戻す"
  - "parseIsoDate pattern: isoDate.match(/^(\\d{4})-(\\d{2})-(\\d{2})/) でタイムゾーン非依存パース"

requirements-completed: [CAL-01, CAL-02, CAL-04]

# Metrics
duration: 15min
completed: 2026-05-08
---

# Phase 2 Plan 01: カレンダーグリッドUI基盤実装 Summary

**calendarUtils（タイムゾーン安全 isoDate パース・7列グリッド生成・ArticleMap構築）と CalendarGrid（月ナビゲーション付き Client Component）をゼロから実装し、page.tsx を記事リストからカレンダー表示へ置き換え**

## Performance

- **Duration:** 15 min
- **Started:** 2026-05-08T00:00:00Z
- **Completed:** 2026-05-08T00:15:00Z
- **Tasks:** 3
- **Files modified:** 3（新規2、更新1）

## Accomplishments
- タイムゾーン依存のない isoDate パーサー（正規表現）を実装
- 7列グリッドで月の日付を表示する CalendarGrid Client Component を実装（prev/next ナビゲーション付き）
- page.tsx をカレンダーグリッド表示に置き換え（force-static 維持）

## Task Commits

各タスクをアトミックにコミット:

1. **Task 1: calendarUtils.ts** - `9e877ae` (feat)
2. **Task 2: CalendarGrid.tsx** - `148d6be` (feat)
3. **Task 3: page.tsx 更新** - `3d399c6` (feat)

## Files Created/Modified
- `src/lib/calendarUtils.ts` - parseIsoDate / buildDayGrid / buildArticleMap エクスポート
- `src/components/CalendarGrid.tsx` - 'use client' 付き月ナビゲーションカレンダーグリッド
- `src/app/page.tsx` - CalendarGrid 統合、記事リスト UI 削除

## Decisions Made
- Map は Next.js Server→Client props としてシリアライズ不可のため、配列変換して渡し Client 側で再構築する設計を採用
- Tailwind の `col-start-${n}` 動的クラスは JIT で検知されないため `style={{ gridColumnStart: n }}` を使用
- `new Date(isoDate)` はローカルタイムゾーン依存のためバグになりやすく、正規表現パースに統一

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- カレンダーグリッドUI基盤が完成。Plan 02-02 で ArticleTooltip（hover 表示・リンク）を追加する準備が整っている
- CalendarGrid は現在クリック/ホバーインタラクションなし（Plan 02-02 で追加予定）

---
*Phase: 02-calendar-ui*
*Completed: 2026-05-08*
