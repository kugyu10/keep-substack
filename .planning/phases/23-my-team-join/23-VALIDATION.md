---
phase: 23
slug: my-team-join
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-30
---

# Phase 23 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Reconstructed retroactively from SUMMARY/PLAN/VERIFICATION artifacts (State B).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^4.1.6 (node environment — no jsdom, no @testing-library) |
| **Config file** | none on disk — vitest defaults; `@/` alias resolves to `src/` |
| **Quick run command** | `npx vitest run src/app/my/__tests__/<file>` |
| **Full suite command** | `npm test` (→ `vitest run`) |
| **Estimated runtime** | ~3 seconds (26 tests) |

---

## Sampling Rate

- **After every task commit:** Run the per-file quick command for the touched area
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~3 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 23-01 | 01 | 1 | SELF-02 | T-23-01 / T-23-02 / T-23-03 | Public-set validation; scoped `.in('team_id',publicTeamIds)` delete; member resolved via `auth.getUser()`; unauth → JP error, zero writes | unit | `npx vitest run src/app/my/__tests__/updateMyProfileAction.test.ts` | ✅ | ✅ green |
| 23-02 | 02 | 1 | SELF-01, SELF-03 | T-23-05 / T-23-06 | Public-only fetch (no private/hidden leakage); `currentTeams` status passthrough; member read scoped `.eq('user_id', user.id)`; unauth → `redirect('/')` before any read | unit (RSC element-tree) | `npx vitest run src/app/my/__tests__/page.test.tsx` | ✅ | ✅ green |
| 23-03 | 03 | 2 | SELF-01, SELF-03 | T-23-08 / T-23-10 | Public checkboxes `name="teams"`; private rows `disabled` + no `name` (excluded from submit); only public/joined names render | manual | — (see Manual-Only) | n/a | ⚠️ manual |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky/manual*

---

## Wave 0 Requirements

Existing infrastructure (vitest, node env) covers all automatable phase requirements. The Phase 23 audit added one test file to close the read-path gap:

- [x] `src/app/my/__tests__/updateMyProfileAction.test.ts` — SELF-02 write reconcile + security (6 tests, pre-existing from Plan 01)
- [x] `src/app/my/__tests__/page.test.tsx` — SELF-01/SELF-03 read path: auth redirect, public-only fetch, `currentTeams` status passthrough, per-user scope, no-member regression (5 tests, added by this audit)

No framework install required.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Checkbox list renders; joined public teams initially checked | SELF-01 | DOM rendering + initial `defaultChecked` state needs a real browser; project has no jsdom/`@testing-library` and the derivation logic is inline JSX (cannot extract without modifying impl) | Log in, open `/my` — every `status='public'` team appears as a checkbox; teams you belong to are pre-checked. (HUMAN-UAT #1, **pass**) |
| Check + 保存する joins; uncheck + 保存する leaves | SELF-02 (UI round-trip) | Live Supabase write + `revalidatePath` re-render needs a running server + DB | Check an unjoined public team → save → reload: still checked (`member_teams` row added). Uncheck → save → reload: unchecked (row removed); private rows survive (D-09). (HUMAN-UAT #2/#3, **pass**) |
| Private joined rows are disabled, labelled 「管理者が設定」, never submitted | SELF-03 | `disabled` real behavior + "not submitted" (no `name` attr) confirmable only by a real browser submit | Private row cannot be toggled; saving does not remove the private `member_teams` row. (HUMAN-UAT #4, **pass**) |
| D-05/D-06 empty-state copy (「参加できる公開チームはありません」/「すべての公開チームに参加中です」) | SELF-01 | Conditional render of inline JSX strings — same jsdom limitation as above | Verify copy appears when no public teams exist / when member is in every public team. (grep-verified present; visual confirmed under HUMAN-UAT #1) |

*Note: the manual-only behaviors all passed Human UAT (4/4, 2026-05-30, `23-HUMAN-UAT.md`); the one cosmetic finding (orange checkbox / black glyph) was fixed (white-checkmark overlay, commit `eba9de2`).*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or are documented Manual-Only with passing Human UAT
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (write path + read path both automated)
- [x] Wave 0 covers all MISSING references (read-path gap closed by `page.test.tsx`)
- [x] No watch-mode flags
- [x] Feedback latency < 5s (~3s full suite)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-30

---

## Validation Audit 2026-05-30

| Metric | Count |
|--------|-------|
| Gaps found | 1 (SELF-01/SELF-03 read path — `page.tsx` RSC) |
| Resolved | 1 (`src/app/my/__tests__/page.test.tsx`, 5 tests green) |
| Escalated | 0 |
| Manual-only | 1 layer (`MyProfileForm` DOM rendering — needs jsdom; Human UAT 4/4 pass) |

**Result:** Write path (SELF-02) and read path (SELF-01/SELF-03 data) are automated and green (11 tests across two files; full suite 26/26). The UI rendering layer is intentionally Manual-Only — adding jsdom + `@testing-library/react` was declined to avoid new supply-chain surface, and Human UAT already confirms the visual behaviors.
