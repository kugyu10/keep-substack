---
phase: 25
slug: publication-id
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| TBD | — | — | SCHEMA-01 | — | RLS public-select policy present on member_publications | manual (SQL) | post-migration verification query | ❌ W0 | ⬜ pending |
| TBD | — | — | SCHEMA-02 | — | existing members rows migrated as is_primary=true | manual (SQL) | post-migration verification query | ❌ W0 | ⬜ pending |

*Planner populates concrete Task IDs. Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

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

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
