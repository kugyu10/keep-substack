---
phase: 30
slug: achievement
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-05
---

# Phase 30 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.6 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/lib/__tests__/commitUtils.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/__tests__/commitUtils.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 30-01 (TDD) | 01 | 1 | ACHIEV-01, ACHIEV-02 | — | N/A（表示ロジックのみ） | unit | `npx vitest run src/lib/__tests__/commitUtils.test.ts` | ❌ Wave 0 | ⬜ pending |
| 30-02-T1 | 02 | 2 | ACHIEV-01, ACHIEV-02 | — | N/A | unit | `npx vitest run src/components/__tests__/CommitGoalRow.test.tsx` | ❌ Wave 0 | ⬜ pending |
| 30-02-T2 | 02 | 2 | ACHIEV-01, ACHIEV-02 | — | N/A | unit | `npx vitest run src/components/__tests__/CommitGoalRow.test.tsx` | ❌ Wave 0 | ⬜ pending |
| 30-02-T3 | 02 | 2 | ACHIEV-01, ACHIEV-02 | — | N/A | unit | `npx vitest run` | ✅ 既存 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/__tests__/commitUtils.test.ts` — `isCurrentWeekComplete` / `consecutiveWeekStreak` / D-10完全版ソートのテストケース追加（既存ファイル拡張）
- [ ] `src/components/__tests__/CommitGoalRow.test.tsx` — streak=0/1/≥2 の3状態表示テスト（新規作成）

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 実際の UI で 👑/🔥 アイコンが正しく表示される | ACHIEV-01, ACHIEV-02 | ブラウザ確認が必要 | dev サーバー起動後、コミット達成・連続達成メンバーがいるチームで CommitGoalView を表示して確認 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
