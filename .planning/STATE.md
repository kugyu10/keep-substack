---
gsd_state_version: 1.0
milestone: v1.6
milestone_name: Team Roles + Member Self-Service
status: executing
stopped_at: Phase 26 context gathered
last_updated: "2026-05-30T08:26:18.372Z"
last_activity: 2026-05-30
progress:
  total_phases: 5
  completed_phases: 4
  total_plans: 14
  completed_plans: 12
  percent: 80
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-17 — v1.6 Team Roles + Member Self-Service started)

**Core value:** 仲間の書く頑張りが一目で見えて、継続のモチベーションにつながること
**Current focus:** Phase 26 — e2e-playwright

## Current Position

Phase: 26 (e2e-playwright) — EXECUTING
Plan: 2 of 3
Status: Ready to execute
Last activity: 2026-05-30

Progress: [█████████░] 86%

## Performance Metrics

**By Milestone:**

| Milestone | Phases | Plans | Sessions |
|-----------|--------|-------|----------|
| v1.0 MVP | 3 | 6 | 1日 |
| v1.1 Dynamic Members | 3 | 6 | 2日 |
| v1.2 UX Polish | 3 | 3 | 1日 |
| v1.3 Data Persistence | 4 | 4 | 2日 |
| v1.4 UI/UX Refresh | 4 | 4 | 1日 |
| v1.5 Member Auth + Supabase Migration | 5 | 11 | 2日 |
| v1.6 Team Roles + Member Self-Service | 5 | TBD | - |
| Phase 23 P01 | 15min | 2 tasks | 2 files |
| Phase 23 P02 | ~5min | 2 tasks | 1 files |
| Phase 23 P03 | ~3min | 2 tasks | 1 files |
| Phase 24 P01 | 8min | 2 tasks | 2 files |
| Phase 24 P02 | 4min | 1 tasks | 1 files |
| Phase 25 P01 | 12min | 2 tasks | 2 files |
| Phase 25 P02 | ~6min | 3 tasks | 0 src files (live DB apply + verify) |
| Phase 26 P01 | ~10min | 3 tasks | 10 files |

## Accumulated Context

### Key Architecture Decisions (v1.6 — 計画段階)

- teams.status = 'public' | 'private' | 'hidden'（DEFAULT 'public'）
- HIDDEN_TEAM定数廃止 → status='hidden'に統一
- member_publications テーブル追加（member_id FK, publication_id TEXT, is_primary BOOLEAN）
- /admin/teams/{teamName} は proxy.ts の matcher に追加
- E2EはPlaywright + Supabaseテスト用アカウントまたはモック
- Phase 25 P01: member_publications を additive テーブル（surrogate PK）として追加。single-primary は partial unique index で保証、sync trigger は ON CONFLICT DO NOTHING・DELETE ブランチ無し（CASCADE）、backfill は migration のみ・schema.sql は durable 定義をミラー（D-01..D-09）。app code は無変更（SC#3）。
- Phase 26 P01: E2E harness via session-injection — mintAuthCookies uses @supabase/ssr setSession round-trip (no hand-rolled sb-<ref>-auth-token encoding); seeded test user is NON-admin (doubles as E2E-03 negative case); vitest.config.ts scopes include to src/** to avoid Playwright collision; webServer is build+start (NEXT_PUBLIC_* are build-time inlined). Zero production-code changes. (Actual E2E run gated on Plan 02 .env.test provisioning.)

## Session Continuity

Last session: 2026-05-30T08:25:50.325Z
Stopped at: Completed 26-01-PLAN.md
Next step: Execute Phase 26 Plan 02 (provision TEST Supabase project, apply migrations via db push, create .env.test). Then Plan 03 (specs).
