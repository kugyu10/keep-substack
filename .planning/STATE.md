---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Dynamic Members + Weekly View
status: planning
stopped_at: ""
last_updated: "2026-05-09T00:00:00.000Z"
last_activity: 2026-05-09 -- ROADMAP.md created for v1.1 (Phases 4-6)
progress:
  total_phases: 3
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-08 for v1.1 milestone)

**Core value:** 仲間の書く頑張りが一目で見えて、継続のモチベーションにつながること
**Current focus:** Phase 4 — KVデータ層移行

## Current Position

Phase: 4 of 6 (KVデータ層移行)
Plan: — (Ready to plan)
Status: Ready to plan
Last activity: 2026-05-09 — v1.1 ROADMAP.md作成完了。Phase 4から着手可能。

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 6 (v1.0 全6プラン)
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| v1.0 Phases 1-3 | 6 | — | — |

*Updated after each plan completion*

## Accumulated Context

### Key Architecture Decisions (v1.1)

- feedUrl は保存せず `https://{substackId}.substack.com/feed` で動的生成
- `@upstash/redis` を使用 (`@vercel/kv` は2024年12月廃止)
- Next.js 16 では `src/proxy.ts` + `export function proxy`（middleware.tsは使わない）
- Server Actions + `revalidateTag('members')` でAPI Routes不要
- トップページは `force-static` を除去して `?team=teamId` searchParamsを受け取れるようにする
- サムネイルは RSS `content:encoded` からregexで取得（OGPフェッチ不使用）
- Vercel環境変数: UPSTASH_REDIS_REST_URL をBuildスコープにも設定すること

### Key Files (v1.0ベース)

- `src/data/members.json` — メンバー設定 ← Phase 4でKV移行後は参照元が変わる
- `src/lib/fetchFeed.ts` — fetchAllFeedsCached（並列取得 + unstable_cache）
- `src/lib/calendarUtils.ts` — parseIsoDate, buildDayGrid, buildArticleMap
- `src/app/page.tsx` — ダッシュボード ← Phase 5でヒートマップに刷新

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-05-09
Stopped at: v1.1 ROADMAP.md作成完了。
Resume file: None
Next step: `/gsd-plan-phase 4` でPhase 4のプランニングを開始する
