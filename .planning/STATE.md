---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: MVP
status: archived
stopped_at: v1.0 milestone archived — planning next milestone
last_updated: "2026-05-08T12:00:00.000Z"
last_activity: 2026-05-08 -- v1.0 milestone complete and archived
progress:
  total_phases: 3
  completed_phases: 3
  total_plans: 6
  completed_plans: 6
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-08 after v1.0 milestone)

**Core value:** 仲間の書く頑張りが一目で見えて、継続のモチベーションにつながること
**Current focus:** v1.0 archived — ready for next milestone planning

## Current Position

Phase: v1.0 complete and archived
Status: Milestone archived — start next milestone with `/gsd-new-milestone`

Progress: [██████████] 100% (v1.0 complete)

## v1.0 Summary

- 3 phases, 6 plans completed
- Deployed: https://keep-substack.vercel.app/
- All 12 v1 requirements fulfilled
- Archive: .planning/milestones/v1.0-ROADMAP.md

## Accumulated Context

### Established Patterns

- `unstable_cache` + `export const dynamic = 'force-static'` + `REVALIDATE_SECONDS` 環境変数でISR制御
- Server→Client props での Map シリアライズ: `Array.from(map.entries())` → Client側で `new Map()` 再構築
- Tailwind 動的クラスはJIT非検知のため `style={{ gridColumnStart }}` を使用
- `generateStaticParams` + `dynamicParams=false` で静的生成 + 未知パス自動404

### Key Files

- `src/data/members.json` — メンバー設定（name, feedUrl）
- `src/lib/fetchFeed.ts` — fetchAllFeedsCached（並列取得 + unstable_cache）
- `src/lib/calendarUtils.ts` — parseIsoDate, buildDayGrid, buildArticleMap, extractSubstackId
- `src/components/CalendarGrid.tsx` — 月ナビ付きカレンダー Client Component
- `src/components/ArticleTooltip.tsx` — hover+click対応ツールチップ
- `src/components/MiniCalendar.tsx` — ダッシュボード用ミニカレンダー Server Component
- `src/app/page.tsx` — ダッシュボード（全メンバーMiniCalendarグリッド）
- `src/app/member/[substackId]/page.tsx` — 個人詳細ページ

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-05-08
Stopped at: v1.0 milestone archived.
Resume file: None
Next step: `/gsd-new-milestone` for v1.1 or v2.0 planning
