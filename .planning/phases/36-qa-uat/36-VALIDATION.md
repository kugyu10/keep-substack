---
phase: 36
slug: qa-uat
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-08
---

# Phase 36 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright (E2E) + vitest (existing unit suite, green) |
| **Config file** | `playwright.config.ts` (webServer build+start, TEST project otydhiumsdsyxepnjqjp) |
| **Quick run command** | `npx playwright test <spec>` |
| **Full suite command** | `npx playwright test` |
| **Estimated runtime** | ~90–180 seconds (webServer build + specs) |

---

## Sampling Rate

- **After every task commit:** Run the new/affected spec — `npx playwright test e2e/<spec>`
- **After every plan wave:** Run `npx playwright test` (full E2E suite must stay green)
- **Before `/gsd:verify-work`:** Full E2E suite + manual production-UAT runbook complete
- **Max feedback latency:** ~180 seconds (automated layer); manual-production items are out-of-band

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| (to be filled by planner) | — | — | QA-02/03/04 | — | N/A (verification phase, src/ unchanged) | e2e | `npx playwright test e2e/<spec>` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Note: QA-01 (Phase 27 本番6シナリオ) is satisfied by the manual production-UAT runbook, not an automated command — see Manual-Only Verifications. The TEST-project E2E specs are the durable additive regression layer (D-04/D-05).*

---

## Wave 0 Requirements

- [ ] `e2e/handle-uat.spec.ts` — new spec for @handle render/save round-trip (Phase 27 automatable items)
- [ ] `e2e/commit-flow.spec.ts` — new spec for /my schedule-declaration full flow (Phase 28 #2)
- [ ] `e2e/mobile-collapse.spec.ts` / `e2e/layout-nav.spec.ts` — 375px viewport visual collapse + 3-column/weekly-stamp (Phase 29 #1–#3)
- [ ] `playwright.config.ts` — add 375px mobile viewport project for collapse assertions
- [ ] Reuse existing `mintAuthCookies` + member_id-scoped `afterEach` cleanup (no new fixtures expected)

*Final spec file names/count are at planner discretion per CONTEXT.md Claude's Discretion.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Phase 27 全6 UAT シナリオ本番一巡（@handle 描画/保存往復/プロフィールリンク/null フォールバック/Magic Link 往復/DB migration 適用） | QA-01 | SC#1 が「本番環境で」を要求。TEST-project E2E は本番に向けられない（D-04/D-05） | 本番 https://keep-substack.com で開発者自身のアカウントに対し手動実行、検証後に値を元に戻す |
| Magic Link メール往復（27 シナリオ6） | QA-01 / QA-02 | 実メール配信は自動化困難（D-03） | §0 で本番 Supabase の Site URL / Redirect URLs が `https://keep-substack.com` を許可しているか事前確認（D-06 landmine）してから実行 |
| 本番ブラウザ目視（視覚レイアウト最終確認） | QA-01 | 視覚目視（D-02） | 本番で対象ページを目視確認 |

---

## Validation Sign-Off

- [ ] All automatable tasks have a Playwright spec or Wave 0 dependency
- [ ] Sampling continuity: no 3 consecutive automatable tasks without an automated verify
- [ ] Wave 0 covers all MISSING spec references
- [ ] No watch-mode flags
- [ ] Feedback latency < 180s for the automated layer
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
