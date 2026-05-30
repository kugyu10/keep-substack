---
phase: 26-e2e-playwright
reviewed: 2026-05-30T00:00:00Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - e2e/helpers/admin.ts
  - e2e/helpers/session.ts
  - e2e/fixtures/test-data.ts
  - e2e/global-setup.ts
  - e2e/login.spec.ts
  - e2e/my-teams.spec.ts
  - e2e/admin-guard.spec.ts
  - playwright.config.ts
  - vitest.config.ts
findings:
  critical: 0
  warning: 4
  info: 4
  total: 8
status: issues_found
---

# Phase 26: Code Review Report

**Reviewed:** 2026-05-30T00:00:00Z
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found

## Summary

Reviewed the Phase 26 Playwright E2E harness (helpers, fixtures, global-setup) and three spec files plus the Playwright/Vitest configs. This is test-only code with zero production changes. I traced the test contracts against the real production code they exercise (`src/proxy.ts`, `src/app/my/actions.ts`, `src/app/my/MyProfileForm.tsx`) and the DB schema (`supabase/schema.sql`).

Overall the harness is well-constructed and shows clear awareness of the documented pitfalls: secrets are never logged, env fail-fast is enforced, auto-waiting is used (no `waitForTimeout`), cleanup is `member_id`-scoped (no truncate), `NEXT_PUBLIC_*` are forwarded at build time, and Vitest is scoped away from `e2e/`. Schema-level assumptions (UNIQUE on `members.publication_id`, `members.user_id`, `teams.name`) all check out, so the upserts are valid.

No BLOCKER-class issues found. The findings below are correctness/robustness gaps that should be addressed before relying on the suite for CI gating, and several quality items.

## Warnings

### WR-01: global-setup member upsert can violate the `members.user_id` UNIQUE constraint on reruns

**File:** `e2e/global-setup.ts:64-72`
**Issue:** The `members` upsert is keyed `onConflict: 'publication_id'` and writes `user_id: userId`. The schema declares `members.user_id UUID REFERENCES auth.users(id) UNIQUE` (`supabase/schema.sql:15`). The seeded auth user is reused across runs (the `listUsers()` idempotency branch, lines 44-51), so `userId` is stable — that path is fine. However, if a *different* member row in the TEST project already holds this `user_id` (e.g., a stale row from a prior experiment, a manually seeded member, or a member whose `publication_id` was changed), this upsert will fail with a unique-violation on `user_id` rather than conflicting on `publication_id`, and `globalSetup` will throw with a raw Postgres error that does not explain the real cause. The seed is also not self-healing: it never clears a pre-existing `user_id` linkage on a *different* member.
**Fix:** Before the member upsert, defensively clear any stray linkage, then upsert:
```ts
// Detach this test user from any other member row first (user_id is UNIQUE).
await admin.from('members').update({ user_id: null }).eq('user_id', userId)
  .neq('publication_id', TEST.publicationId)
const { error: memberErr } = await admin.from('members').upsert(
  { name: TEST.memberName, publication_id: TEST.publicationId, user_id: userId },
  { onConflict: 'publication_id' }
)
if (memberErr) {
  throw new Error(`[global-setup] member upsert failed: ${memberErr.message}`)
}
```
At minimum, wrap the bare `throw memberErr` so the failure is diagnosable.

### WR-02: `ADMIN_PASSWORD ?? 'test'` fallback weakens test/prod isolation intent

**File:** `playwright.config.ts:54`
**Issue:** Every other secret in `webServer.env` uses the non-null assertion (`process.env.X!`) so a missing value surfaces loudly. `ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ?? 'test'` instead silently injects a hardcoded credential into the app process under test. If a contributor copies this config pattern, or if a future test asserts on admin-password behavior, the silent `'test'` default masks a misconfigured `.env.test` and can produce false-pass results. It also means the documented env-fail-fast guarantee (global-setup) does not cover `ADMIN_PASSWORD`.
**Fix:** Either add `ADMIN_PASSWORD` to the `required` list in `e2e/global-setup.ts:18-22` and forward it with `!`, or document explicitly why a literal default is acceptable here. Prefer fail-fast for consistency:
```ts
ADMIN_PASSWORD: process.env.ADMIN_PASSWORD!,
```

### WR-03: `mintAuthCookies` cookie expiry (~1 day) ignores the real session token lifetime

**File:** `e2e/helpers/session.ts:79`
**Issue:** The cookie `expires` is hardcoded to `now + 24h`, independent of the actual `access_token`/`refresh_token` validity returned by `verifyOtp`. Supabase access tokens default to 1 hour. Because `autoRefreshToken: false` is set on the minting client and the storageState is static (written once in global-setup, never refreshed), a suite run that starts and then exceeds the access-token TTL during the slow `next build` (`timeout: 180_000`, lines 48) plus test execution could present an expired access token to `proxy.ts getUser()`. The cookie itself is still "valid" (24h expiry) so the browser sends it, but `getUser()` rejects an expired token — producing intermittent redirects to `/` and flaky E2E-01/E2E-02 failures that look like auth-gate bugs.
**Fix:** Derive `expires` from the session, or (more robustly) have `proxy.ts`'s `createServerClient` refresh path work by also persisting the refresh-token cookie correctly (it already is via `setSession`). The cleaner fix is to drop the arbitrary 24h and align expiry with the token, and/or document that the suite must complete within the access-token TTL. If refresh is expected to work, add a fast-path assertion in global-setup that the minted state actually resolves a user before the suite starts.

### WR-04: E2E-02 assertion `.toBe(1)` is brittle against pre-existing private/hidden joins and order-of-execution

**File:** `e2e/my-teams.spec.ts:58-72`
**Issue:** The poll counts ALL `member_teams` rows for the member (`select('*', { count }).eq('member_id', m.id)`) and asserts exactly `1`. But the production action (`src/app/my/actions.ts:84-93`) deletes/inserts ONLY rows whose `team_id` is in the *public* team set (D-09) — private/hidden memberships are intentionally preserved. If the TEST project's seeded member ever has a private/hidden `member_teams` row (now or in a future fixture change), this count becomes `>= 2` and the test fails spuriously, even though the public-team join under test succeeded. The `afterEach` cleanup (lines 38-44) deletes ALL `member_teams` for the member regardless of team status, which masks the problem run-to-run but is itself inconsistent with the production scoping it claims to mirror.
**Fix:** Scope the assertion (and ideally the cleanup) to the public team being joined, so the test asserts the actual delta rather than total cardinality:
```ts
const { data: team } = await admin.from('teams')
  .select('id').eq('name', TEST.teamName).single()
const { count } = await admin.from('member_teams')
  .select('*', { count: 'exact', head: true })
  .eq('member_id', m.id).eq('team_id', team!.id)
return count // expect .toBe(1)
```

## Info

### IN-01: `createTestAdmin()` re-instantiated three times per E2E-02 run

**File:** `e2e/my-teams.spec.ts:19,36,57`
**Issue:** A fresh service_role client is created in `resolveTestMemberId()`, again in `afterEach`, and again inside the test body. Each call re-reads env and spins up a client. Harmless, but it duplicates setup and obscures that all three share the same privileged credential.
**Fix:** Create one admin client per test (e.g., in `beforeEach` or a module-scoped lazy singleton) and reuse it. Not a correctness issue.

### IN-02: Duplicated service_role minting client between `admin.ts` and `session.ts`

**File:** `e2e/helpers/session.ts:28-30` (and `e2e/helpers/admin.ts:8-19`)
**Issue:** `session.ts` hand-rolls its own `createClient(url, SERVICE_ROLE_KEY, { auth: {...} })` instead of reusing `createTestAdmin()` from `admin.ts`, duplicating the exact same construction and the "never expose to client" invariant in two places.
**Fix:** Import and call `createTestAdmin()` in `session.ts` for the admin client to keep the privileged-client construction in one audited location.

### IN-03: `resolveTestMemberId` is dead/duplicated relative to the inline poll lookup

**File:** `e2e/my-teams.spec.ts:18-31` vs `58-65`
**Issue:** `resolveTestMemberId()` and the inline `members` lookup inside `expect.poll` do the same `select('id').eq('publication_id', ...).single()` query with different error handling. The poll path silently returns `null` on missing member while the helper throws — two behaviors for the same lookup.
**Fix:** Reuse `resolveTestMemberId()` inside the poll (resolve the member id once before the poll, since it is static for the run) to remove the duplication and unify error handling.

### IN-04: Hardcoded URL literals in assertions couple specs to `baseURL`

**File:** `e2e/admin-guard.spec.ts:13,18,30`
**Issue:** Assertions use the absolute literal `'http://localhost:3000/'` while `playwright.config.ts:27` already defines `baseURL`. If the base URL/port ever changes (or differs in CI), these specs silently break or must be edited in lockstip. `login.spec.ts:13` correctly uses a relative regex (`/\/my$/`).
**Fix:** Assert against a path/regex instead of the hardcoded origin, e.g. `await expect(page).toHaveURL(/\/$/)` or `toHaveURL(new URL('/', baseURL))`.

---

_Reviewed: 2026-05-30T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
