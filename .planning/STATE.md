---
gsd_state_version: 1.0
milestone: v1.6
milestone_name: Team Roles + Member Self-Service
status: verifying
stopped_at: Phase 24 context gathered
last_updated: "2026-05-30T02:54:27.094Z"
last_activity: 2026-05-29
progress:
  total_phases: 5
  completed_phases: 2
  total_plans: 7
  completed_plans: 7
  percent: 40
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-17 — v1.6 Team Roles + Member Self-Service started)

**Core value:** 仲間の書く頑張りが一目で見えて、継続のモチベーションにつながること
**Current focus:** Phase 23 — my-team-join

## Current Position

Phase: 23 (my-team-join) — EXECUTING
Plan: 3 of 3
Status: Phase complete — ready for verification
Last activity: 2026-05-29

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
| Phase 23 P01 | 15min | 2 tasks | 2 files |
| Phase 23 P02 | ~5min | 2 tasks | 1 files |
| Phase 23 P03 | ~3min | 2 tasks | 1 files |

## Accumulated Context

### Key Architecture Decisions (v1.6 — 計画段階)

- teams.status = 'public' | 'private' | 'hidden'（DEFAULT 'public'）
- HIDDEN_TEAM定数廃止 → status='hidden'に統一
- member_publications テーブル追加（member_id FK, publication_id TEXT, is_primary BOOLEAN）
- /admin/teams/{teamName} は proxy.ts の matcher に追加
- E2EはPlaywright + Supabaseテスト用アカウントまたはモック

## Session Continuity

Last session: 2026-05-30T02:54:27.086Z
Stopped at: Phase 24 context gathered
Next step: Phase 22 Plan 02 を実行（types.ts・members.ts 等のコード変更）
