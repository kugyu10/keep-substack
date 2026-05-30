---
phase: 25-publication-id
verified: 2026-05-30T00:00:00Z
status: passed
score: 3/3 must-haves verified
overrides_applied: 0
---

# Phase 25: 複数publication_idスキーマ拡張 Verification Report

**Phase Goal:** member_publicationsテーブルを追加して1メンバーが複数のpublication_idを持てるDB構造を整える（アプリUIは1件前提のまま）
**Verified:** 2026-05-30
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| 1 | SCHEMA-01: member_publications table (member_id FK, publication_id TEXT UNIQUE, is_primary BOOLEAN) + partial unique index + RLS exists and is live | ✓ VERIFIED | Migration DDL `supabase/migrations/20260530_add_member_publications.sql` L7-24 defines table with all required columns, `uq_member_publications_one_primary ... WHERE is_primary`, RLS enable + public-select policy. Mirrored byte-equivalent in `supabase/schema.sql` L44-80. Human-confirmed live queries A (4 columns NOT NULL), B (partial index w/ `WHERE (is_primary)`), C (`relrowsecurity=true`, single SELECT policy, no write policy) all PASS per 25-02-SUMMARY.md. |
| 2 | SCHEMA-02: existing members.publication_id data migrated into member_publications via DDL/script; backfill parity | ✓ VERIFIED | Migration Statement 4 (L27-30): `INSERT INTO member_publications (member_id, publication_id, is_primary) SELECT id, publication_id, true FROM members ON CONFLICT (publication_id) DO NOTHING`. Human-confirmed live query D PASS: orphan count = 0 AND `members` count == `is_primary` count. Backfill correctly excluded from schema.sql (no `FROM members` SELECT — confirmed by grep). |
| 3 | SC#3: app UI and data-fetch logic unchanged; app builds and runs | ✓ VERIFIED | `git diff --name-only -- src/` empty; `grep -rn member_publications src/` exit 1 (no matches); `npm run build` exit 0 (10 routes generated); `npm test` exit 0, 34/34 passing (7 files). Last src/ commit 666cdf5 (Phase 24) predates this phase. |

**Score:** 3/3 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `supabase/migrations/20260530_add_member_publications.sql` | Idempotent migration: table + partial unique index + RLS + backfill + AFTER INSERT OR UPDATE sync trigger, BEGIN/COMMIT-wrapped | ✓ VERIFIED | 64 lines. PLAN grep gate prints MIGRATION_GATE_OK. `BEGIN;`/`COMMIT;` each exactly once. No `OR DELETE` (exit 1). FK `REFERENCES members(id) ON DELETE CASCADE` present. Backfill `SELECT id, publication_id, true FROM members`. Trigger function w/ INSERT branch + UPDATE branch guarded by `IS DISTINCT FROM`, no DELETE branch. Committed eb27f17. |
| `supabase/schema.sql` | Fresh-setup mirror of table + index + RLS + trigger (no backfill) | ✓ VERIFIED | Table L44-49, partial index L52-54, RLS enable L64 + policy L79-80, trigger function + trigger L93-119. SCHEMA_GATE_OK. No backfill `FROM members` (exit 1). Pre-existing members/teams/member_teams/articles blocks intact. Committed 560e80b. |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| migration / schema | members table | `member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE` | ✓ WIRED | Pattern present in both files (migration L9, schema L46). Human-confirmed live query G: DELETE cascade purges child rows (PASS). |
| `sync_member_publications()` trigger | members table | `AFTER INSERT OR UPDATE ON members FOR EACH ROW` | ✓ WIRED | Pattern present in both files (migration L60, schema L117). Human-confirmed live queries E (INSERT sync → primary row) and F (UPDATE sync follows publication_id change) PASS. |

### Data-Flow Trace (Level 4)

N/A — DB-schema phase. The artifacts are SQL DDL/triggers, not dynamic-data-rendering app components. Per phase boundary, no src/ wiring is in scope (SC#3 mandates src/ remain untouched). Live data flow (backfill parity, trigger sync, cascade) was confirmed via human-run live-DB queries A–H, recorded below under Behavioral Spot-Checks.

### Behavioral Spot-Checks

Repo-side checks run by verifier:

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| App compiles unchanged | `npm run build` | exit 0, 10 routes generated | ✓ PASS |
| Test suite green | `npm test` | exit 0, 34/34 passing | ✓ PASS |
| No app code changed | `git diff --name-only -- src/` | empty | ✓ PASS |
| New table not read by app | `grep -rn member_publications src/` | exit 1 (no matches) | ✓ PASS |
| Migration grep gate | PLAN Task 1 automated gate | MIGRATION_GATE_OK | ✓ PASS |
| schema.sql grep gate | PLAN Task 2 automated gate | SCHEMA_GATE_OK | ✓ PASS |

Live-DB checks (human-run via Supabase SQL Editor, project xolhjcngrwwwqtklmoyk — not re-checkable from repo, no DB credentials; accepted as evidence per verification-boundary note):

| Query | Check | Requirement | Result |
| ----- | ----- | ----------- | ------ |
| A | 4 columns id/member_id/publication_id/is_primary, all NOT NULL | SCHEMA-01 | ✓ PASS |
| B | Partial index `uq_member_publications_one_primary` w/ `WHERE (is_primary)` | SCHEMA-01 / D-05 | ✓ PASS |
| C | `relrowsecurity=true`; only `public select member_publications` (SELECT); no write policy | SCHEMA-01 / T-25-01 | ✓ PASS |
| D | Backfill parity: orphan count = 0; members count == is_primary count | SCHEMA-02 / D-07 | ✓ PASS |
| E | INSERT-sync: throwaway member → one is_primary=true row | D-08 | ✓ PASS |
| F | UPDATE-sync: primary row publication_id followed members UPDATE | D-08 | ✓ PASS |
| G | DELETE cascade: 0 leftover rows for test ids; no zz_phase25_* rows remain | D-08 | ✓ PASS |
| H | Single-primary: second-primary INSERT rejected (ERROR 23505 on uq index) | D-05 | ✓ PASS |

### Probe Execution

N/A — no `scripts/*/tests/probe-*.sh` exist in repo; phase uses live-DB SQL-Editor verification (queries A–H above) as its runnable check, executed by the human per the blocking-human checkpoint design.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ----------- | ----------- | ------ | -------- |
| SCHEMA-01 | 25-01, 25-02 | member_publicationsテーブルを追加し、1メンバーが複数publication_idを持てる構造にできる | ✓ SATISFIED | Truth 1 + artifacts + live queries A/B/C/H. REQUIREMENTS.md L31/L74 marks Complete. |
| SCHEMA-02 | 25-01, 25-02 | 既存のmembers.publication_idをmember_publicationsに移行するスクリプトまたはDDLを用意できる（アプリUIは1件前提のまま） | ✓ SATISFIED | Truth 2 + backfill DDL + live query D parity. REQUIREMENTS.md L32/L75 marks Complete. |

No orphaned requirements — both IDs declared in both PLAN frontmatters and accounted for in REQUIREMENTS.md.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| (none) | — | No TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER in migration or schema.sql | — | Clean |

Note: `npm run lint` fails on pre-existing `@typescript-eslint/no-explicit-any` / `no-img-element` issues in untouched src/ files and vendored `.claude/**/*.cjs` tooling. These are NOT caused by this SQL-only phase (`git diff src/` empty) and do NOT contradict SC#3, which requires the app to "ビルド・動作する" (build/run) — satisfied by build exit 0 + tests 34/34 + empty src diff. Out of scope per the phase boundary; ℹ️ Info only.

### Human Verification Required

None. The live-DB verification this phase depends on (queries A–H) was already executed by the human during the blocking-human checkpoint (Task 2, resume-signal "verified") and the results are recorded in 25-02-SUMMARY.md. No PLAN `<verify><human-check>` blocks were deferred to end-of-phase. All remaining checks are repo-side and were run by the verifier (build/test/git/grep).

### Gaps Summary

No gaps. All three ROADMAP success criteria are met:
1. member_publications table with correct columns + partial unique index + RLS exists in DDL (both migration and schema.sql) and is live (queries A/B/C).
2. Backfill DDL exists and migrated data is at parity (query D).
3. App UI/data-fetch logic untouched (empty src diff, member_publications absent from src/) and the app builds (exit 0) and tests green (34/34).

Both requirement IDs (SCHEMA-01, SCHEMA-02) are fully accounted for. The two artifacts exist, are substantive, contain the mandated DDL, and are committed. Key links (FK cascade, sync trigger) are wired in the SQL and verified firing against the live DB. No debt markers, no stubs.

---

_Verified: 2026-05-30_
_Verifier: Claude (gsd-verifier)_
