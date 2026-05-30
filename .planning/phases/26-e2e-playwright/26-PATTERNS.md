# Phase 26: E2Eテスト（Playwright） - Pattern Map

**Mapped:** 2026-05-30
**Files analyzed:** 13 (new + modified)
**Analogs found:** 13 / 13 (7 functional analog, 6 structural/convention analog)

> Almost all files in this phase are NEW test infrastructure (`e2e/` dir + config). There is no existing Playwright/E2E code in the repo, so for the test harness files the analog is **structural / convention** (mirror existing config-file style, existing Supabase client factories, existing test-file headers) rather than functional. The exception is the seed/session/cleanup code, which has a strong **functional** analog in `src/lib/supabase/admin.ts`, `src/lib/supabase/server.ts`, and `src/app/my/actions.ts` (same admin-client + `member_teams` queries).

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `playwright.config.ts` (new) | config | request-response | `tsconfig.json` / `next.config.*` (structural) + RESEARCH Pattern 2 | structural-convention |
| `vitest.config.ts` (new) | config | batch | none in repo (no config yet) — RESEARCH Pitfall 2 | no functional analog |
| `e2e/global-setup.ts` (new) | utility (test harness) | batch / CRUD | `src/lib/supabase/admin.ts` + `src/app/my/actions.ts` (member_teams writes) | role+flow match |
| `e2e/helpers/admin.ts` (new) | utility (factory) | CRUD | `src/lib/supabase/admin.ts` | exact |
| `e2e/helpers/session.ts` (new) | utility (test harness) | transform | `src/lib/supabase/server.ts` (createServerClient cookie adapter) | role+flow match |
| `e2e/fixtures/test-data.ts` (new) | config (constants) | — | `src/__tests__/proxy.test.ts` top-of-file constants | convention |
| `e2e/login.spec.ts` (new) | test (E2E) | request-response | `src/__tests__/proxy.test.ts` (asserts proxy behavior) | role-match (different runner) |
| `e2e/my-teams.spec.ts` (new) | test (E2E) | CRUD | `src/app/my/__tests__/updateMyProfileAction.test.ts` (member_teams join/leave) | role-match (different runner) |
| `e2e/admin-guard.spec.ts` (new) | test (E2E) | request-response | `src/__tests__/proxy.test.ts` (redirect-to-`/` assertions) | exact behavioral analog |
| `.env.test` (new, gitignored) | config | — | `.env.example` | exact |
| `.env.test.example` (new) | config | — | `.env.example` | exact |
| `.gitignore` (modify) | config | — | existing `.env*` entry pattern | exact |
| `package.json` (modify) | config | — | existing `scripts` block | exact |

## Pattern Assignments

### `e2e/helpers/admin.ts` (utility, CRUD) — EXACT analog

**Analog:** `src/lib/supabase/admin.ts` (full file, 14 lines)

This is the single strongest copy target. The E2E admin factory should be a near-verbatim clone of the production factory — same `createClient`, same env vars, same `autoRefreshToken/persistSession: false`. The only reason to copy rather than import `@/lib/supabase/admin` is that E2E code lives outside `src/` and (per RESEARCH) loads env via `.env.test`; importing the `@/` alias from Node test code requires the alias to resolve. Mirroring the factory keeps it self-contained.

**Copy verbatim from `src/lib/supabase/admin.ts:1-14`:**
```typescript
import { createClient } from '@supabase/supabase-js'

export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
```
Name the E2E version `createTestAdmin()` (RESEARCH calls it that in `my-teams.spec.ts` / Pattern 4). service_role bypasses RLS — that is what makes the afterEach `member_teams` DELETE work.

---

### `e2e/helpers/session.ts` (utility, transform) — role+flow match

**Analog:** `src/lib/supabase/server.ts:1-26` (the `createServerClient` cookie-adapter shape)

The critical pattern (RESEARCH Pattern 1) is to drive the **same** `@supabase/ssr` `createServerClient` the app uses, but with an in-memory `getAll/setAll` instead of `next/headers`. The production server client shows the exact adapter contract to mirror:

**Adapter shape to mirror (from `src/lib/supabase/server.ts:6-25`):**
```typescript
createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
      },
    },
  }
)
```
In `session.ts`, replace `cookieStore` with an in-memory capture array: `getAll: () => []`, `setAll: (toSet) => captured.push(...toSet)`, then call `.auth.setSession({ access_token, refresh_token })` and serialize `captured` to Playwright cookie shape with `domain: 'localhost'` (RESEARCH Pattern 1 + Pitfall 3). Tokens come from the admin client `generateLink({type:'magiclink'})` → `verifyOtp({type:'email', token_hash})`. Full reference impl is in RESEARCH lines 200-252.

> Why mirror, not hand-roll: `proxy.ts` validates via `createServerClient(...).auth.getUser()`. Using the same library to write the cookie guarantees format parity (name `sb-<ref>-auth-token`, `base64-` prefix, 3180-byte chunking). See RESEARCH Anti-Patterns + Pitfall 3.

---

### `e2e/global-setup.ts` (test harness, batch/CRUD) — role+flow match

**Analog:** `src/app/my/actions.ts:43-114` (`updateMyProfileAction` — same admin-client `members`/`teams`/`member_teams` query vocabulary) + `src/app/my/page.tsx:13-43` (seed shape: member linked by `user_id`, public teams)

The seed writes exactly the rows the app reads. Mirror these query patterns:

**Member lookup / linkage (from `src/app/my/page.tsx:14-24` and `actions.ts:60-65`):**
```typescript
// page.tsx reads member by user_id:
admin.from('members').select(...).eq('user_id', user.id).maybeSingle()
// actions.ts updates member scoped to user_id:
admin.from('members').update({ name }).eq('user_id', user.id).select('id').single()
```
Seed must therefore create: an `auth.users` test user, a `members` row with `user_id` = that user's id and a unique `publication_id`, and at least one `teams` row with `status: 'public'`. Use upsert-by-unique-key for idempotency (RESEARCH Pattern 3, lines 319-340).

**Public-team selection contract (from `actions.ts:73-76` and `page.tsx:35-39`):**
```typescript
admin.from('teams').select('id, name').eq('status', 'public').order('name')
```
The seeded team MUST be `status='public'` or it will not render as a checkbox in `MyProfileForm` and E2E-02 cannot toggle it.

> Schema note: `members` has a `sync_member_publications` trigger (migration `20260530_add_member_publications.sql`) firing on INSERT/UPDATE — upsert is safe (RESEARCH Pattern 3 note). Migrations to apply to the test project: `20260516_rename_substack_id_to_publication_id.sql`, `20260517_add_team_status.sql`, `20260530_add_member_publications.sql`.

---

### `e2e/my-teams.spec.ts` (E2E test, CRUD) — role match (vitest → playwright)

**Analog:** `src/app/my/__tests__/updateMyProfileAction.test.ts` (the unit test of the same join/leave behavior) + `src/app/my/MyProfileForm.tsx:59-87` (the DOM selectors to drive)

**DOM contract — the checkbox the test drives (from `MyProfileForm.tsx:65-86`):**
```html
<input type="checkbox" name="teams" value={t.name} ... />   <!-- inside a <label> whose text is t.name -->
...
<button type="submit">保存する</button>   <!-- '保存中...' while pending -->
```
So Playwright selectors are: `page.getByRole('checkbox', { name: TEST.teamName })` (resolves the input via its `<label>` text) and `page.getByRole('button', { name: '保存する' })`. Heading for E2E-01 is `マイページ` (`page.tsx:48`).

**DB-delta assertion target — the table the action writes (from `actions.ts:89-105`):**
```typescript
admin.from('member_teams').delete().eq('member_id', member.id).in('team_id', publicTeamIds)
admin.from('member_teams').insert(allowed.map((t) => ({ member_id: member.id, team_id: t.id })))
```
The spec asserts the `member_teams` row count for the seeded member transitions 0→1 (join) / 1→0 (leave) via `expect.poll` with `createTestAdmin()` (RESEARCH Code Examples, lines 471-495).

**afterEach cleanup — mirror the action's own delete (RESEARCH Pattern 4, lines 344-353):** resolve `member.id` by `publication_id`, then `admin.from('member_teams').delete().eq('member_id', m.id)`. service_role bypasses RLS. Scope to the test member only — never a broad truncate (D-09).

---

### `e2e/admin-guard.spec.ts` (E2E test, request-response) — EXACT behavioral analog

**Analog:** `src/__tests__/proxy.test.ts:39-72` (the unit test asserts the exact same redirect behavior)

The unit test verifies non-admin/anon → redirect to root and admin → pass-through. The E2E version asserts the same contract end-to-end against `proxy.ts:34-45`:
```typescript
// proxy.ts behavior under test:
// /admin: !user || role !== 'admin'  → redirect '/'
// /my:    !user                      → redirect '/'
```
**E2E assertions (RESEARCH lines 441-456):** project `anonymous` (no storageState), `goto('/admin')` and `goto('/my')` → `expect(page).toHaveURL('http://localhost:3000/')`. Optional non-admin case reuses the seeded (non-admin) `user.json` storageState → `goto('/admin')` → expect `/` (the seeded test user is intentionally non-admin, per RESEARCH Open Question 1).

---

### `e2e/login.spec.ts` (E2E test, request-response) — role match

**Analog:** `src/__tests__/proxy.test.ts` (asserts the `getUser()` gate) + `src/app/my/page.tsx:48` (`マイページ` heading)

Proves the injected session is validated as real by `proxy.ts` `getUser()`: project `logged-in` (storageState=`user.json`), `goto('/my')` → `expect(page).toHaveURL(/\/my$/)` (NOT redirected) + `マイページ` heading visible (RESEARCH lines 458-468).

---

### `e2e/fixtures/test-data.ts` (config constants) — convention

**Analog:** top-of-file constants in `src/__tests__/proxy.test.ts:22-23` (`const ADMIN_TEAMS_URL = ...`) and `updateMyProfileAction.test.ts:30-33`

Export a single `TEST` object: `{ userEmail, teamName, memberName, publicationId }` with collision-safe values (executor discretion, D-43). Referenced by global-setup, my-teams.spec, admin-guard.spec.

---

### `playwright.config.ts` (config) — structural convention

**Analog:** structural — repo has no JS/TS config-with-logic file to copy; mirror RESEARCH Pattern 2 (lines 276-308) verbatim as the baseline. Load `.env.test` via `dotenv` (already installed) BEFORE building the config object. Key decisions already locked by RESEARCH: `testDir: './e2e'`, `testMatch: '**/*.spec.ts'`, `globalSetup`, `workers: 1` + `fullyParallel: false` (Pitfall 5), `webServer.command: 'npm run build && npm run start'` (Pitfall 1 — `NEXT_PUBLIC_*` are build-time inlined), two projects (`logged-in` with storageState, `anonymous` without).

> Existing `next.config.*` — check which extension exists before assuming; the repo uses Next 16. (Not load-bearing for this file; the config is authored from RESEARCH Pattern 2.)

---

### `vitest.config.ts` (config) — no functional analog (new)

**Analog:** none — no vitest config exists today; vitest uses its default glob. This file exists solely to prevent the `e2e/*.spec.ts` files from being globbed by `vitest run` (RESEARCH Pitfall 2). Minimal content:
```typescript
import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: { include: ['src/**/*.{test,spec}.{ts,tsx}'], exclude: ['e2e/**', 'node_modules/**'] },
})
```
Current convention (verified): all 5 unit tests are `*.test.ts(x)` under `src/`; reserve `.spec.ts` for E2E.

---

### `.env.test` / `.env.test.example` (config) — EXACT analog

**Analog:** `.env.example:11-16` (the Supabase block)

Mirror the three Supabase vars pointing at the TEST project:
```
NEXT_PUBLIC_SUPABASE_URL=https://<test-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<test-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<test-service-role-key>
ADMIN_PASSWORD=test
```
`.env.test` holds real test-project values (gitignored — `.env*` already matches, `.gitignore:34`). Commit only `.env.test.example` with placeholders. Note `.env.example` line 13 says use the **transaction pooler (6543)** for the app; for `supabase db push --db-url` use the **direct (5432)** connection (RESEARCH lines 499-505).

---

## Shared Patterns

### Supabase admin (service_role) client
**Source:** `src/lib/supabase/admin.ts:1-14`
**Apply to:** `e2e/helpers/admin.ts`, `e2e/global-setup.ts`, `e2e/my-teams.spec.ts` afterEach
```typescript
createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)
```
service_role bypasses RLS — required for seed, session-token minting, and `member_teams` cleanup. NEVER expose to the browser/client bundle.

### `@supabase/ssr` cookie adapter (getAll/setAll)
**Source:** `src/lib/supabase/server.ts:10-23` (and `src/proxy.ts:11-22`)
**Apply to:** `e2e/helpers/session.ts`
The same `cookies: { getAll, setAll }` contract the app uses — reuse it with an in-memory store to capture the exact auth cookies `proxy.ts` will validate. This is the integrity-preserving choice: the cookie that the test injects is produced by the same code path that reads it.

### `member_teams` query vocabulary
**Source:** `src/app/my/actions.ts:60,73,89-105` and `src/app/my/page.tsx:14-39`
**Apply to:** `e2e/global-setup.ts` (seed), `e2e/my-teams.spec.ts` (assert + cleanup)
- member resolved by `user_id` (page/action) or `publication_id` (tests/cleanup)
- public teams are `status='public'` only
- join/leave = `member_teams` INSERT/DELETE scoped by `member_id` (+`team_id` in for delete)

### Test-file header / module-mock convention
**Source:** `src/__tests__/proxy.test.ts:1-29`, `src/app/my/__tests__/updateMyProfileAction.test.ts:1-33`
**Apply to:** all `e2e/*.spec.ts`
Existing unit tests use a top comment explaining the stub strategy, then constants, then `describe/it`. E2E specs use Playwright (`import { test, expect } from '@playwright/test'`) — different runner, but keep the explanatory-header + top-level-constants convention. Do NOT mock Supabase in E2E (the whole point is real validation).

### npm scripts
**Source:** `package.json:5-11` (`"test": "vitest run"`)
**Apply to:** `package.json` (modify) — add alongside, do not replace:
```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui"
```
Keep `"test": "vitest run"` unchanged (D: E2E is additive). Add `@playwright/test@1.60.0` to `devDependencies`.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `vitest.config.ts` | config | batch | No vitest config currently exists; created only to scope `include` away from `e2e/` (RESEARCH Pitfall 2). Structural template provided above. |

(All other files have at least a structural or convention analog, listed in Pattern Assignments.)

## Metadata

**Analog search scope:** `src/lib/supabase/`, `src/app/my/`, `src/__tests__/`, `src/proxy.ts`, repo root config files (`package.json`, `tsconfig.json`, `.gitignore`, `.env.example`), `supabase/migrations/`
**Files scanned:** 11 source/config files read in full
**Pattern extraction date:** 2026-05-30
