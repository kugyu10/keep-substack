---
phase: 36
slug: qa-uat
status: approved
nyquist_compliant: true
wave_0_complete: true
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
| **Quick run command** | `npx playwright test e2e/<spec>` |
| **Full suite command** | `npx playwright test` |
| **Estimated runtime** | ~90–180 seconds (webServer build + specs) |

---

## Sampling Rate

- **After every task commit:** Run the new/affected spec — `npx playwright test e2e/<spec>`
- **After every plan wave:** Run `npx playwright test` (full E2E suite must stay green)
- **Before `/gsd:verify-work`:** Full E2E suite green + manual production-UAT runbook (36-03) complete
- **Max feedback latency:** ~180 seconds (automated layer); manual production-UAT items (QA-01) are out-of-band by design (D-04/D-05)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 36-01-T1 | 01 | 1 | QA-03 | — | N/A (TEST-project readiness check) | e2e (smoke) | `npx playwright test e2e/28-commit-flow.spec.ts -g "RPC 前提"` | ❌ W1 | ⬜ pending |
| 36-01-T2 | 01 | 1 | QA-02 | — | N/A (verification, src/ unchanged) | e2e (tdd) | `npx playwright test e2e/27-handle.spec.ts` | ❌ W1 | ⬜ pending |
| 36-01-T3 | 01 | 1 | QA-03 | — | N/A | e2e (tdd) | `npx playwright test e2e/28-commit-flow.spec.ts` | ❌ W1 | ⬜ pending |
| 36-02-T1 | 02 | 2 | QA-04 | — | N/A | e2e (tdd) | `npx playwright test e2e/29-mobile.spec.ts` | ❌ W1 | ⬜ pending |
| 36-02-T2 | 02 | 2 | QA-04 | — | N/A | e2e (tdd) | `npx playwright test e2e/29-layout-nav.spec.ts` | ❌ W1 | ⬜ pending |
| 36-03-T1 | 03 | 2 | QA-01 | T-36-MANUAL | Redirect URL pre-check (D-06) gates Magic Link | manual | (manual — Supabase dashboard check) | n/a | ⬜ pending |
| 36-03-T2 | 03 | 2 | QA-01/QA-02 | T-36-MANUAL | Restore mutated prod values, scope to own member row (D-04) | manual | (manual — prod walkthrough, https://keep-substack.com) | n/a | ⬜ pending |
| 36-03-T3 | 03 | 2 | QA-01 | — | N/A | doc in-place | (assertion: 27-HUMAN-UAT.md result lines + Summary updated) | n/a | ⬜ pending |
| 36-03-T4 | 03 | 2 | QA-02 | — | N/A | doc in-place | (assertion: 27-VERIFICATION.md status: human_needed → verified) | n/a | ⬜ pending |
| 36-04-T1 | 04 | 3 | QA-03 | — | N/A | doc in-place | (assertion: 28-VERIFICATION.md status: verified, #1 resolved-by-reference) | n/a | ⬜ pending |
| 36-04-T2 | 04 | 3 | QA-04 | — | N/A | doc in-place | (assertion: 29-VERIFICATION.md status: verified, /daily rename note) | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*QA-01 (Phase 27 本番6シナリオ) is satisfied by the manual production-UAT runbook (36-03-T1/T2), NOT an automated command — SC#1 requires "本番環境で" and the TEST-project E2E cannot target production (D-04/D-05). The TEST-project specs (36-01/36-02) are the durable additive regression layer. Doc-in-place tasks have no `<automated>` command by design (they record results); their acceptance is a source assertion on the updated .md file.*

---

## Wave 0 Requirements

**Existing infrastructure covers all phase requirements.** The Playwright session-injection harness (mintAuthCookies + createTestAdmin + member_id-scoped afterEach) was established in Phase 26 and is green. No framework install, no shared-fixture scaffolding, and no separate Wave 0 are required. The four new spec files are authored as normal Wave 1–2 deliverable tasks:

- `e2e/27-handle.spec.ts` (36-01-T2)
- `e2e/28-commit-flow.spec.ts` (36-01-T3, with `-g "RPC 前提"` smoke in 36-01-T1)
- `e2e/29-mobile.spec.ts` (36-02-T1)
- `e2e/29-layout-nav.spec.ts` (36-02-T2)
- `playwright.config.ts` mobile-375 viewport project addition (36-01-T1)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Phase 27 全6 UAT シナリオ本番一巡（#1 DB migration / #2 @handle 描画 / #3 保存往復 read-only / #4 プロフィールリンクあり / #5 null フォールバック / #6 Magic Link 往復）— **#2〜#5 も本番で記録** | QA-01 | SC#1 が「本番環境で」を要求。TEST-project E2E は本番に向けられない（D-04/D-05） | 本番 https://keep-substack.com で開発者自身のアカウントに対し手動実行、各シナリオ #1〜#6 の本番 pass/fail を個別に記録、検証後に値を元に戻す（36-03-T2） |
| Magic Link メール往復（27 シナリオ6） | QA-01 / QA-02 | 実メール配信は自動化困難（D-03） | §0 で本番 Supabase の Site URL / Redirect URLs が `https://keep-substack.com` を許可しているか blocking 事前確認（D-06 landmine）してから実行（36-03-T1 → T2） |
| 本番ブラウザ目視（29 #2 3列レイアウト ピクセル整列） | QA-01 / QA-04 | 視覚目視（D-02、Pitfall 4）。自動 spec は DOM 構造のみ検証 | 本番で対象ページを目視確認し結果を記録 |

---

## Validation Sign-Off

- [x] All automatable tasks have a Playwright spec or are explicitly manual-production / doc-in-place
- [x] Sampling continuity: no 3 consecutive automatable tasks without an automated verify (36-01/36-02 each carry `<automated>` commands)
- [x] Wave 0 covers all MISSING spec references (harness pre-exists; new specs are normal wave 1-2 tasks)
- [x] No watch-mode flags
- [x] Feedback latency < 180s for the automated layer
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-06-08
