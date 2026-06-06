---
phase: 29
slug: commit-goal-view
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-04
---

# Phase 29 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 29-01-01 | 01 | 1 | VIEW-01 | — | N/A | unit | `npx vitest run` | ✅ | ⬜ pending |
| 29-01-02 | 01 | 1 | VIEW-01 | — | N/A | unit | `npx vitest run` | ✅ | ⬜ pending |
| 29-01-03 | 01 | 1 | VIEW-02 | — | N/A | integration | `npx vitest run` | ✅ W0 | ⬜ pending |
| 29-01-04 | 01 | 1 | VIEW-03 | — | N/A | integration | `npx vitest run` | ✅ W0 | ⬜ pending |
| 29-02-01 | 02 | 2 | VIEW-04 | — | N/A | unit | `npx vitest run` | ✅ W0 | ⬜ pending |
| 29-02-02 | 02 | 2 | VIEW-05 | — | N/A | unit | `npx vitest run` | ✅ W0 | ⬜ pending |
| 29-02-03 | 02 | 2 | VIEW-06 | — | N/A | unit | `npx vitest run` | ✅ W0 | ⬜ pending |
| 29-02-04 | 02 | 2 | VIEW-07 | — | N/A | unit | `npx vitest run` | ✅ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/app/page.test.tsx` — 既存 WeeklyHeatmapGrid テストを `/weekly-stamp` 移行後の CommitGoalView に更新
- [ ] `src/app/weekly-stamp/page.test.tsx` — `/weekly-stamp` ルートの基本テスト（旧トップと同等）
- [ ] `src/components/CommitGoalView.test.tsx` — CommitGoalView コンポーネントのスタブ
- [ ] `src/components/CommitGrid.test.tsx` — CommitGrid コンポーネントのスタブ

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| スマホ幅1週縮退 | VIEW-06 | CSS-only `hidden sm:block`、jsdom では viewport 検知不可 | DevTools で 375px 幅に縮小し、最新週のみ表示されることを確認 |
| Grid 総横幅均一 | VIEW-04 | Pixel-perfect レイアウト比較は jsdom 不可 | Chrome DevTools で週1〜4メンバーの CommitGrid 幅を計測し同一であることを確認 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
