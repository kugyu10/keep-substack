---
phase: 22
slug: team-status
status: validated
nyquist_compliant: false
wave_0_complete: true
created: 2026-05-30
---

# Phase 22 — Validation Strategy

> Per-phase validation contract. Reconstructed retroactively from phase artifacts (State B).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x (unit) · playwright (e2e) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/app/__tests__/page.test.tsx src/app/admin/teams/__tests__/updateTeamStatusAction.test.ts` |
| **Full suite command** | `npm test` (`vitest run`) |
| **Estimated runtime** | ~1 second (these files: ~150ms) |

---

## Sampling Rate

- **After every task commit:** Run quick command for affected files
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 22-01 | 01 | 1 | TEAM-01 | T-22-01 / T-22-02 | 冪等マイグレーション（IF NOT EXISTS） | manual | — | N/A | ✅ manual-only |
| 22-04 | 04 | — | TEAM-02 | T-22-07 | requireAdmin() で admin 以外の書込をブロック | unit | `npx vitest run src/app/admin/teams/__tests__/updateTeamStatusAction.test.ts` | ✅ | ✅ green |
| 22-03 | 03 | — | TEAM-03 | T-22-05 | public チームのみタブ表示（private/hidden 非表示） | unit | `npx vitest run src/app/__tests__/page.test.tsx` | ✅ | ✅ green |
| 22-02/03 | 02,03 | — | TEAM-04 | T-22-06 | hidden を All ビューから除外・チーム選択時は status 無視 | unit | `npx vitest run src/app/__tests__/page.test.tsx` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure (vitest + playwright) covers all automatable phase requirements. Tests added retroactively during validation:*

- [x] `src/app/__tests__/page.test.tsx` — TEAM-03 + TEAM-04 (Home RSC tab filtering & All-view exclusion)
- [x] `src/app/admin/teams/__tests__/updateTeamStatusAction.test.ts` — TEAM-02 (Server Action requireAdmin gate + update + error branch)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| teams テーブルに status カラムが存在し chameleon=hidden | TEAM-01 | DB スキーマ DDL（Supabase 本番 DB へ適用済み）。アプリ層から再現できる自動テスト対象がない。冪等性は `IF NOT EXISTS` で担保 | Supabase SQL Editor で `SELECT status FROM teams;` を実行し、status カラムが存在し chameleon 行が 'hidden' であることを確認 |

---

## Validation Sign-Off

- [x] All tasks have automated verify or are documented manual-only
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all fillable MISSING references (TEAM-02/03/04)
- [x] No watch-mode flags
- [x] Feedback latency < 2s
- [ ] `nyquist_compliant: true` — not set: TEAM-01 is manual-only (DB migration, no feasible automated test)

**Approval:** validated 2026-05-30 (partial — 3/4 automated, TEAM-01 manual-only)

---

## Validation Audit 2026-05-30

| Metric | Count |
|--------|-------|
| Gaps found | 4 |
| Resolved (automated) | 3 |
| Escalated | 0 |
| Manual-only | 1 |
