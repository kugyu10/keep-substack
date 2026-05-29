---
gsd_state_version: 1.0
milestone: v1.6
milestone_name: Team Roles + Member Self-Service
status: executing
stopped_at: Phase 23 UI-SPEC approved
last_updated: "2026-05-29T23:40:30.145Z"
last_activity: 2026-05-29 -- Phase 23 planning complete
progress:
  total_phases: 5
  completed_phases: 1
  total_plans: 7
  completed_plans: 4
  percent: 20
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-17 — v1.6 Team Roles + Member Self-Service started)

**Core value:** 仲間の書く頑張りが一目で見えて、継続のモチベーションにつながること
**Current focus:** Phase 22 — team-status

## Current Position

Phase: 22 — COMPLETE
Plan: 4 of 4
Status: Ready to execute
Last activity: 2026-05-29 -- Phase 23 planning complete

Progress: [██████████] 100%

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

Last session: 2026-05-27T01:51:49.645Z
Stopped at: Phase 23 UI-SPEC approved
Next step: Phase 22 Plan 02 を実行（types.ts・members.ts 等のコード変更）
