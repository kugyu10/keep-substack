---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: UX Polish + Member Edit
status: in_progress
stopped_at: ""
last_updated: "2026-05-11T00:10:00.000Z"
last_activity: 2026-05-11 -- Phase 7 Plan 01 (07-01) completed
progress:
  total_phases: 3
  completed_phases: 0
  total_plans: 3
  completed_plans: 1
  percent: 33
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-08 for v1.1 milestone)

**Core value:** 仲間の書く頑張りが一目で見えて、継続のモチベーションにつながること
**Current focus:** Phase 4 — KVデータ層移行（完了）→ Phase 5 開始可能

## Current Position

Phase: Phase 7 — UI小改善バッチ（Tooltip・ナビ・フッター）
Plan: 01 完了
Status: Phase 7 Plan 01 実行完了
Last activity: 2026-05-11 — 07-01-PLAN.md 実行完了（3ファイル・5件UX改善）

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

### Key Architecture Decisions (v1.2)

- HeatmapTooltipのタイトル<a>を<span>に変更し親<a>でリンク構造一本化（ネストaタグ回避）
- teamIdが空の場合は'/'にフォールバック（三項演算子のみ、追加フェッチ不要）
- フッターをlayout.tsxのbody直下に配置し全ページ自動適用

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

Last session: 2026-05-11
Stopped at: Completed 07-01-PLAN.md
Resume file: None
Next step: Phase 7 Plan 02以降があれば実施、またはv1.2マイルストーン完了を確認
