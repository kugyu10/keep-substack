---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Dynamic Members + Weekly View
status: planning
stopped_at: ""
last_updated: "2026-05-08T13:00:00.000Z"
last_activity: 2026-05-08 -- Milestone v1.1 started
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-08 for v1.1 milestone)

**Core value:** 仲間の書く頑張りが一目で見えて、継続のモチベーションにつながること
**Current focus:** v1.1 — Dynamic Members + Weekly View

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-05-08 — Milestone v1.1 started

## Accumulated Context

### Established Patterns

- `unstable_cache` + `export const dynamic = 'force-static'` + `REVALIDATE_SECONDS` 環境変数でISR制御
- Server→Client props での Map シリアライズ: `Array.from(map.entries())` → Client側で `new Map()` 再構築
- Tailwind 動的クラスはJIT非検知のため `style={{ gridColumnStart }}` を使用
- `generateStaticParams` + `dynamicParams=false` で静的生成 + 未知パス自動404

### Key Files

- `src/data/members.json` — メンバー設定（name, feedUrl）← v1.1でVercel KVへ移行予定
- `src/lib/fetchFeed.ts` — fetchAllFeedsCached（並列取得 + unstable_cache）
- `src/lib/calendarUtils.ts` — parseIsoDate, buildDayGrid, buildArticleMap, extractSubstackId
- `src/components/CalendarGrid.tsx` — 月ナビ付きカレンダー Client Component
- `src/components/ArticleTooltip.tsx` — hover+click対応ツールチップ
- `src/components/MiniCalendar.tsx` — ダッシュボード用ミニカレンダー Server Component
- `src/app/page.tsx` — ダッシュボード（全メンバーMiniCalendarグリッド）← v1.1でヒートマップに刷新
- `src/app/member/[substackId]/page.tsx` — 個人詳細ページ

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-05-08
Stopped at: Milestone v1.1 planning started. Defining requirements.
Resume file: None
Next step: Define REQUIREMENTS.md then create ROADMAP.md
