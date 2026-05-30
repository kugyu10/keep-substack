---
phase: 25
slug: publication-id
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-30
---

# Phase 25 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Detailed observation points are defined in `25-RESEARCH.md` §Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Build/lint/test gates + post-migration SQL verification queries (no DB-integration harness in repo) |
| **Config file** | none |
| **Quick run command** | `npm run lint` |
| **Full suite command** | `npm run build && npm test && npm run lint` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run lint`
- **After every plan wave:** Run `npm run build && npm test && npm run lint`
- **Before `/gsd:verify-work`:** Full suite must be green AND `git diff src/` must be empty (Success Criteria #3 — app code unchanged)
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 25-01-T1 | 25-01 | 1 | SCHEMA-01 | T-25-01/T-25-02 | table+partial index+RLS+AFTER INSERT OR UPDATE trigger authored, idempotent | source | migration SQL contains required DDL (grep assertions) | ✅ | ⬜ pending |
| 25-01-T2 | 25-01 | 1 | SCHEMA-01 | T-25-01 | durable defs mirrored into schema.sql (no backfill) | source | schema.sql contains CREATE TABLE member_publications + RLS | ✅ | ⬜ pending |
| 25-02-T3 | 25-02 | 2 | SCHEMA-01 | — | app code unchanged | behavior | `test -z "$(git diff --name-only -- src/)" && ! grep -rn member_publications src/` | ✅ | ⬜ pending |
| 25-02-T1 (manual) | 25-02 | 2 | SCHEMA-01/02 | T-25-AP | migration applied atomically via Supabase SQL Editor | manual (SQL) | A–H post-migration verification queries | ✅ | ⬜ pending |
| 25-02-T2 (manual) | 25-02 | 2 | SCHEMA-02 | — | members → member_publications row-count parity, is_primary=true | manual (SQL) | parity + single-primary verification queries | ✅ | ⬜ pending |

*Manual (SQL) checkpoints are legitimately exempt from automation — no DB-integration harness exists in the repo (RESEARCH §Validation Architecture). Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- Existing build/lint/test infrastructure covers app-code-unchanged verification.
- Schema/trigger behavior is verified via post-migration SQL verification queries (documented in the plan), not an automated harness — adding a DB-integration harness is out of scope for this additive phase.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| member_publications table + partial unique index + RLS exist | SCHEMA-01 | No DB-integration test harness in repo | Run verification SELECT queries against the DB after applying the migration |
| Existing members data backfilled (one is_primary=true row per member) | SCHEMA-02 | Same | `SELECT count(*)` parity between members and member_publications |
| INSERT/UPDATE sync trigger fires correctly | SCHEMA-01 | Same | INSERT/UPDATE a members row, confirm member_publications row appears/updates |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or legitimately-exempt manual SQL checkpoints
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (none — additive phase, existing build/test/lint suffices)
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-30
