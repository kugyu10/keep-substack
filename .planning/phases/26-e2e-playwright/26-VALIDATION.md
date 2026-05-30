---
phase: 26
slug: e2e-playwright
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-30
---

# Phase 26 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright (`@playwright/test`) — added alongside existing vitest |
| **Config file** | `playwright.config.ts` (Wave 0 installs) |
| **Quick run command** | `npx playwright test <spec>` |
| **Full suite command** | `npx playwright test` |
| **Estimated runtime** | ~{N} seconds (planner to estimate) |

---

## Sampling Rate

- **After every task commit:** Run the relevant `npx playwright test <spec>` (or `npm run test` for vitest-only tasks)
- **After every plan wave:** Run `npx playwright test`
- **Before `/gsd:verify-work`:** Full Playwright suite must be green
- **Max feedback latency:** {N} seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| {N}-01-01 | 01 | 1 | REQ-{XX} | T-{N}-01 / — | {expected secure behavior or "N/A"} | e2e | `{command}` | ❌ W0 | ⬜ pending |

*Planner fills this map from the final PLAN tasks. Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `@playwright/test` install + `npx playwright install` browsers — no Playwright framework today
- [ ] `playwright.config.ts` — webServer + storageState wiring
- [ ] `vitest.config.ts` scoped to `src/**` — prevent vitest from picking up `e2e/*.spec.ts`

*Planner refines based on final plan structure.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Provision dedicated cloud TEST Supabase project + populate `.env.test` | E2E-01..03 (precondition) | External resource provisioning + secret entry cannot be scripted safely | Create test project, apply migrations, copy URL/anon/service_role keys into `.env.test` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < {N}s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
