---
gsd_state_version: 1.0
milestone: v1.6
milestone_name: Team Roles + Member Self-Service
status: executing
stopped_at: Phase 22 UI-SPEC approved
last_updated: "2026-05-20T03:37:52.231Z"
last_activity: 2026-05-20 -- Phase 22 planning complete
progress:
  total_phases: 5
  completed_phases: 0
  total_plans: 4
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-17 — v1.6 Team Roles + Member Self-Service started)

**Core value:** 仲間の書く頑張りが一目で見えて、継続のモチベーションにつながること
**Current focus:** v1.6 — Phase 22: チームステータス管理

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Ready to execute
Last activity: 2026-05-20 -- Phase 22 planning complete

Progress: [----------] 0%

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

## Accumulated Context

### Key Architecture Decisions (v1.6 — 計画段階)

- teams.status = 'public' | 'private' | 'hidden'（DEFAULT 'public'）
- HIDDEN_TEAM定数廃止 → status='hidden'に統一
- member_publications テーブル追加（member_id FK, publication_id TEXT, is_primary BOOLEAN）
- /admin/teams/{teamName} は proxy.ts の matcher に追加
- E2EはPlaywright + Supabaseテスト用アカウントまたはモック

## Session Continuity

Last session: 2026-05-17T12:45:06.444Z
Stopped at: Phase 22 UI-SPEC approved
Next step: /gsd-discuss-phase 22 または /gsd-plan-phase 22 で実装開始
