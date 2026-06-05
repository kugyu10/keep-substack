---
gsd_state_version: 1.0
milestone: v1.7
milestone_name: Commit & Goal View + Substack Profile Link
status: milestone_complete
stopped_at: Milestone complete (Phase 30 was final phase)
last_updated: 2026-06-04T17:22:52.003Z
last_activity: 2026-06-04 -- Phase 30 planning complete
progress:
  total_phases: 4
  completed_phases: 4
  total_plans: 8
  completed_plans: 8
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-02 — v1.7 Commit & Goal View + Substack Profile Link started)

**Core value:** 仲間の書く頑張りが一目で見えて、継続のモチベーションにつながること
**Current focus:** Milestone complete

## Current Position

Phase: 30
Plan: Not started
Status: Milestone complete
Last activity: 2026-06-05 - Completed quick task 260605-42o: grid hoverでタイトルpopover

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260605-42o | grid hoverでタイトルpopover | 2026-06-05 | d4bc6f6 | [260605-42o-grid-hover-popover](.planning/quick/260605-42o-grid-hover-popover/) |
| 260605-qqq | 未投稿日は曜日・日付だけでなく時刻HH:mmも表示 | 2026-06-05 | d2f55a2 | [260605-qqq-hh-mm](.planning/quick/260605-qqq-hh-mm/) |

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
| v1.6 Team Roles + Member Self-Service | 5 | 14 | ~5日 |
| Phase 23 P01 | 15min | 2 tasks | 2 files |
| Phase 23 P02 | ~5min | 2 tasks | 1 files |
| Phase 23 P03 | ~3min | 2 tasks | 1 files |
| Phase 24 P01 | 8min | 2 tasks | 2 files |
| Phase 24 P02 | 4min | 1 tasks | 1 files |
| Phase 25 P01 | 12min | 2 tasks | 2 files |
| Phase 25 P02 | ~6min | 3 tasks | 0 src files (live DB apply + verify) |
| Phase 26 P01 | ~10min | 3 tasks | 10 files |
| Phase 26 P02 | ~5min | 2 tasks | 0 src files (TEST project provision + schema apply) |
| Phase 26 P03 | ~8min | 2 tasks | 3 files |
| Phase 27 P02 | 25min | 3 tasks | 12 files |
| Phase 29 P01 | ~25min | 3 tasks | 9 files |
| Phase 29 P02 | ~4min | 3 tasks | 5 files |

## Accumulated Context

### Key Architecture Decisions (v1.6 — 計画段階)

- teams.status = 'public' | 'private' | 'hidden'（DEFAULT 'public'）
- HIDDEN_TEAM定数廃止 → status='hidden'に統一
- member_publications テーブル追加（member_id FK, publication_id TEXT, is_primary BOOLEAN）
- /admin/teams/{teamName} は proxy.ts の matcher に追加
- E2EはPlaywright + Supabaseテスト用アカウントまたはモック
- Phase 25 P01: member_publications を additive テーブル（surrogate PK）として追加。single-primary は partial unique index で保証、sync trigger は ON CONFLICT DO NOTHING・DELETE ブランチ無し（CASCADE）、backfill は migration のみ・schema.sql は durable 定義をミラー（D-01..D-09）。app code は無変更（SC#3）。
- Phase 26 P02: Dedicated cloud TEST Supabase project provisioned (otydhiumsdsyxepnjqjp, distinct from prod xolhjcngrwwwqtklmoyk); .env.test populated + gitignored. DEVIATION (Rule 3): supabase/migrations/ are incremental diffs that cannot bootstrap a fresh empty project (`relation "articles" does not exist`), so the operator applied supabase/schema.sql (durable final-state mirror) via the SQL Editor instead — same goal achieved (teams.status, members.publication_id, member_publications all queryable; SCHEMA_OK). Canonical from-scratch bootstrap source for fresh DBs is schema.sql, not migrations/.
- Phase 26 P01: E2E harness via session-injection — mintAuthCookies uses @supabase/ssr setSession round-trip (no hand-rolled sb-<ref>-auth-token encoding); seeded test user is NON-admin (doubles as E2E-03 negative case); vitest.config.ts scopes include to src/** to avoid Playwright collision; webServer is build+start (NEXT_PUBLIC_* are build-time inlined). Zero production-code changes. (Actual E2E run gated on Plan 02 .env.test provisioning.)
- Phase 29 P01: CommitSlot type added to types.ts; Member.id optional field added; getMembers() SELECT extended with id; DB policy "public select member_commit_slots" confirmed in schema.sql + migration (no new migration needed). commitUtils.ts: getWeekDates (JST Monday-start), matchArticleToSlot (day_of_week 1=Mon index mapping), sortMembersForCommitView (D-10 simplified: this-week count desc, addedAt asc). /weekly-stamp route: copy of old page.tsx with /weekly-stamp hrefs. CommitGoalView stub created for Plan 02. team-selected filter bug fixed (Rule 1: removed erroneous t.status !== 'hidden' check). 79 tests passing.
- Phase 29 P02: CommitGrid Server Component: flex-1 week blocks (not 36-col grid), static COLS_CLASS map, DAY_NAMES, CSS-only hidden sm:flex mobile collapse. CommitGoalRow: three-column HeatmapRow analog, 未コミット fallback, w-8 placeholder. CommitGoalView: stub replaced with sortMembersForCommitView + per-member slot filter. page.tsx: 21-day cutoff filter producing results21. 88 tests passing. VIEW-01 through VIEW-07 all satisfied.
- Phase 26 P03: Three E2E specs green against the TEST project — login.spec (E2E-01 injected session reaches /my, heading マイページ), my-teams.spec (E2E-02 public-team join → member_teams INSERT via expect.poll + scoped afterEach delete by member_id, no truncate per D-09), admin-guard.spec (E2E-03 anon /admin+/my redirect + non-admin /admin redirect via nested test.use storageState inside the anonymous project). Full Playwright suite 5 passed; vitest 24 passed (src/** only, no runner collision). Zero src/ changes. Real end-to-end (no Supabase mocking) — distinct from src/__tests__/proxy.test.ts. Stopped a stale next-server on :3000 to avoid reuseExistingServer attaching to a prod-env build (Pitfall 6). Phase 26 success criteria fully met.

## Session Continuity

Last session: 2026-06-04T17:16:39.641Z
Stopped at: Phase 30 UI-SPEC approved
Next step: Execute Phase 30 — Achievement calculation (👑/🔥)

## Deferred Items

Items acknowledged and deferred at milestone close on 2026-05-30. The v1.6 audit
confirmed all 14 requirements are functionally satisfied (6/6 integration WIRED,
0 blockers); these are verification-artifact/bookkeeping process gaps and
long-standing backlog ideas, not functional gaps.

| Category | Item | Status |
|----------|------|--------|
| uat_gap | Phase 24 — 24-HUMAN-UAT.md (VIEW-01 live browser render) | partial |
| verification_gap | Phase 17 — 17-VERIFICATION.md (predates v1.5 close) | gaps_found |
| verification_gap | Phase 23 — 23-VERIFICATION.md | human_needed |
| verification_gap | Phase 24 — 24-VERIFICATION.md | human_needed |
| quick_task | 260515-mx8-white-bg-to-black-fix-text | missing |
| quick_task | 260516-001-substackid-to-publicationid | unknown |
| quick_task | 260516-r2r-master-main | missing |
| quick_task | 260516-rz5-pr-component | missing |
| todo | 2026-05-11-article-history-persistence | pending |
| todo | 2026-05-11-multi-team-membership | pending |
| todo | 2026-05-11-supabase-migration | pending |

## Operator Next Steps

- Plan Phase 29: `/gsd:discuss-phase 29` or `/gsd:plan-phase 29`
