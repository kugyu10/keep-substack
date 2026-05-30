---
phase: 26
slug: e2e-playwright
status: ready
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-30
---

# Phase 26 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright (`@playwright/test@1.60.0`) — added alongside existing vitest 4.1.6 |
| **Config file** | `playwright.config.ts` (Plan 01 creates) + `vitest.config.ts` (Plan 01 creates, scopes vitest to `src/**`) |
| **Quick run command** | `npx playwright test e2e/<spec>.spec.ts` |
| **Full suite command** | `npx playwright test` (webServer runs `npm run build && npm run start` under `.env.test`) |
| **Estimated runtime** | ~180s first run (next build), ~30-60s on warm `reuseExistingServer`; vitest unit suite ~few s |

---

## Sampling Rate

- **After every task commit:** Run the relevant `npx playwright test e2e/<spec>` (or `npx vitest run` for the Plan 01 config tasks)
- **After every plan wave:** Run `npx playwright test`
- **Before `/gsd:verify-work`:** Full Playwright suite green AND `npx vitest run` green (proves no collision regression)
- **Max feedback latency:** ~180s (cold full suite); ~5s for the vitest collision check

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 26-01-01 | 01 | 1 | E2E-01/02/03 (infra) | T-26-01 / T-26-02 / T-26-SC | Secrets gitignored; only official @playwright/test installed | infra | `npx playwright --version` + gitignore/env.test.example greps | ❌ W0 | ⬜ pending |
| 26-01-02 | 01 | 1 | E2E-01/02/03 (infra) | — | vitest scoped to src/** (no e2e exec) | infra | `npx vitest run` (no e2e specs run) + config greps | ❌ W0 | ⬜ pending |
| 26-01-03 | 01 | 1 | E2E-01/02/03 (infra) | T-26-03 / T-26-04 | Non-admin seed; env fail-fast; localhost cookie domain | infra | `npx tsc --noEmit` (e2e) + harness file/grep checks | ❌ W0 | ⬜ pending |
| 26-02-01 | 02 | 2 | E2E-01/02/03 (precond) | T-26-03 / T-26-02 | Test URL ≠ prod URL; .env.test gitignored | manual | `.env.test` populated + placeholder-rejection script | ❌ W0 | ⬜ pending |
| 26-02-02 | 02 | 2 | E2E-01/02/03 (precond) | T-26-03 / T-26-05 | Migrations land on TEST project only | manual+auto | schema-check script (teams.status + member_publications) | ❌ W0 | ⬜ pending |
| 26-03-01 | 03 | 3 | E2E-01, E2E-03 | T-26-04 | Real proxy.ts gate; non-admin truly blocked | e2e | `npx playwright test e2e/login.spec.ts e2e/admin-guard.spec.ts` | ❌ W0 | ⬜ pending |
| 26-03-02 | 03 | 3 | E2E-02 | T-26-03 / T-26-06 | Scoped afterEach delete (no truncate); workers:1 | e2e | `npx playwright test` + `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Sampling continuity:** No 3 consecutive tasks lack an automated `<verify>` — every task above has an automated command (Plan 02's manual checkpoints still carry automated post-conditions). nyquist_compliant: true.

---

## Wave 0 Requirements

- [ ] `@playwright/test@1.60.0` install + `npx playwright install chromium` (Plan 01 Task 1)
- [ ] `playwright.config.ts` — webServer build+start + projects + globalSetup (Plan 01 Task 2)
- [ ] `vitest.config.ts` — `include: ['src/**/*.{test,spec}.{ts,tsx}']`, `exclude: ['e2e/**']` (Plan 01 Task 2)
- [ ] `.env.test.example` + `.gitignore` `e2e/.auth/` (Plan 01 Task 1)
- [ ] `e2e/helpers/{admin,session}.ts`, `e2e/fixtures/test-data.ts`, `e2e/global-setup.ts` (Plan 01 Task 3)
- [ ] Provision cloud TEST Supabase project + `supabase db push --db-url` + `.env.test` (Plan 02, blocking manual)
- [ ] The 3 spec files `e2e/{login,my-teams,admin-guard}.spec.ts` (Plan 03)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Provision dedicated cloud TEST Supabase project + populate `.env.test` | E2E-01..03 (precondition) | External resource provisioning + secret entry cannot be scripted safely | Plan 02 Task 1: create TEST project, copy URL/anon/service_role into `.env.test`, confirm URL ≠ prod |
| Apply migrations via `supabase db push --db-url <secret connection string>` | E2E-01..03 (precondition) | DB connection string (password) supplied interactively by operator | Plan 02 Task 2: run db push, then automated schema-check confirms teams.status + member_publications |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency documented
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ready
