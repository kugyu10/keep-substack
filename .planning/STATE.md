---
gsd_state_version: 1.0
milestone: v1.6
milestone_name: Team Roles + Member Self-Service
status: ready_to_plan
stopped_at: Phase 25 complete (2/2) — ready to discuss Phase 26
last_updated: 2026-05-30T06:41:04.488Z
last_activity: 2026-05-30
progress:
  total_phases: 5
  completed_phases: 4
  total_plans: 11
  completed_plans: 26
  percent: 80
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-17 — v1.6 Team Roles + Member Self-Service started)

**Core value:** 仲間の書く頑張りが一目で見えて、継続のモチベーションにつながること
**Current focus:** Phase 26 — e2eテスト（playwright）

## Current Position

Phase: 26
Plan: Not started
Status: Ready to plan
Last activity: 2026-05-30

Progress: [██████████] 100% (Phase 25)

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

## Accumulated Context

### Key Architecture Decisions (v1.6 — 計画段階)

- teams.status = 'public' | 'private' | 'hidden'（DEFAULT 'public'）
- HIDDEN_TEAM定数廃止 → status='hidden'に統一
- member_publications テーブル追加（member_id FK, publication_id TEXT, is_primary BOOLEAN）
- /admin/teams/{teamName} は proxy.ts の matcher に追加
- E2EはPlaywright + Supabaseテスト用アカウントまたはモック
- Phase 25 P01: member_publications を additive テーブル（surrogate PK）として追加。single-primary は partial unique index で保証、sync trigger は ON CONFLICT DO NOTHING・DELETE ブランチ無し（CASCADE）、backfill は migration のみ・schema.sql は durable 定義をミラー（D-01..D-09）。app code は無変更（SC#3）。

## Session Continuity

Last session: 2026-05-30T06:35:00.000Z
Stopped at: 25-02-PLAN.md complete. Migration applied live to Supabase (project xolhjcngrwwwqtklmoyk) — "Success. No rows returned". Verification A–H all PASS (table/columns, partial unique index, RLS+single SELECT policy, backfill parity, INSERT/UPDATE sync, DELETE cascade, single-primary enforcement). Task 3 app-unchanged gate: build/test green, src/ diff empty, member_publications absent from src/ (lint failures all pre-existing/out-of-scope).
Next step: Phase 25 (publication-id) is complete. Proceed to the next phase of v1.6 (see ROADMAP.md).
