---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Dynamic Members + Weekly View
status: idle
stopped_at: ""
last_updated: "2026-05-10T00:00:00.000Z"
last_activity: 2026-05-10 -- v1.1 milestone complete. 次期v1.2計画中。
progress:
  total_phases: 3
  completed_phases: 0
  total_plans: 2
  completed_plans: 2
  percent: 33
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-08 for v1.1 milestone)

**Core value:** 仲間の書く頑張りが一目で見えて、継続のモチベーションにつながること
**Current focus:** Phase 4 — KVデータ層移行（完了）→ Phase 5 開始可能

## Current Position

Milestone: v1.1 — SHIPPED 2026-05-10
Status: All 6 phases complete. Awaiting v1.2 planning.
Last activity: 2026-05-10 — v1.1 milestone archived. 次期v1.2の計画を開始する場合は /gsd-new-milestone を実行。

Progress: [███░░░░░░░] 33%

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

- `src/lib/kvMembers.ts` — getMembers()（Upstash KVからMember[]取得）← Phase 4で新設
- `src/lib/redis.ts` — Redis.fromEnv()シングルトン
- `src/lib/fetchFeed.ts` — fetchAllFeedsCached（substackIdから動的feedUrl生成）
- `src/lib/calendarUtils.ts` — parseIsoDate, buildDayGrid, buildArticleMap
- `src/app/page.tsx` — ダッシュボード ← Phase 5でヒートマップに刷新

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-05-09
Stopped at: Phase 4 実行完了。
Resume file: None
Next step: `/gsd-verify-work 4` でPhase 4を検証 → その後 `/gsd-plan-phase 5` でPhase 5へ
