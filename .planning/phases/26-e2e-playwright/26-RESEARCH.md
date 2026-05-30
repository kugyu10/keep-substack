# Phase 26: E2Eテスト（Playwright） - Research

**Researched:** 2026-05-30
**Domain:** E2E testing (Playwright) for a Next.js 16 App Router + Supabase (`@supabase/ssr`) app
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** service_role を使った**セッション注入方式**を採用。admin API でテストユーザーのセッションを生成し、Playwright の `storageState` に Supabase 認証Cookieを仕込んでログイン済み状態を作る。メール往復は完全にバイパス。
- **D-02:** proxy.ts の `getUser()` は注入セッションを**実セッションとして検証**するため、認証ガードのテストは本物の挙動を検証できる。「テスト用アカウント使用」に合致。
- **D-03:** 現行 `/auth/callback` は PKCE の `?code=` を `exchangeCodeForSession` する実装。`admin.generateLink` は `token_hash`（`verifyOtp` 用）を返し `code` フローと直接互換しない。本フェーズはコールバック経由を採らず、セッション注入で回避。`/auth/callback` ルート自体のE2E網羅は対象外。
- **D-04:** **専用テスト用 Supabase cloud プロジェクト**を新規作成し、既存 `supabase/migrations/` を適用。本番データと完全分離。
- **D-05:** テスト接続情報（URL / anon key / service_role key）は `.env.test`（または同等）で本番設定と切り替える。secret はコミットしない。
- **D-06:** supabase CLI のローカルDockerスタックは**採用しない**。
- **D-07:** **Playwright global-setup で seed**。admin クライアントで「テストユーザー（auth）・公開チーム・user_id 紐付け済みテストメンバー」を冪等に作成。
- **D-08:** 静的fixture（チーム・メンバー）と可変データ（member_teams）を分けて管理。`/my` 参加退出テストが書き込む member_teams 行は各テストの **afterEach で削除**し idempotent に保つ。
- **D-09:** beforeEach での全テーブル truncate 方式は採らない。
- **D-10:** スコープは **ローカル `npx playwright test` が通ること**まで。GitHub Actions 組み込みは別フェーズ。

### Claude's Discretion
- Playwright のディレクトリ構成（`e2e/` 等）・`playwright.config.ts` の詳細設定（baseURL、webServer で `next dev`/`next start` 起動か等）・テストファイル分割は planner/executor 裁量。
- セッション注入の具体的実装（`admin.generateLink` + `verifyOtp` でトークン交換 → Cookie組み立て、あるいは別手法）は research/plan で確定。D-01 の方針が満たされれば手段は問わない。
- global-setup で作るテストユーザーのメールアドレス・チーム名等の具体値は executor 裁量（衝突しない命名を推奨）。

### Deferred Ideas (OUT OF SCOPE)
- GitHub Actions への CI 組み込み（D-10）。
- `/auth/callback` ルート自体のE2E網羅（実コールバック経由の `code` 交換・`pid` 自動紐付け）。
- supabase CLI ローカルスタック導入。
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| E2E-01 | Magic Linkログインフロー（メール送信→/auth/callback→/myリダイレクト）をPlaywrightでテストできる | Session-injection storageState (Architecture Pattern 1) replaces the email round-trip per D-01/D-03. Test asserts an injected session reaches `/my` (logged-in state), satisfying success criterion #1 "テスト用アカウント使用". Real email/callback flow is explicitly out of scope. |
| E2E-02 | /myページのメンバー操作（publicチーム参加・退出）をPlaywrightでテストできる | `/my` UI is `MyProfileForm` checkboxes `name="teams"` → server action `updateMyProfileAction` → `member_teams` INSERT/DELETE. Test toggles checkbox, clicks 保存する, asserts DB row delta. afterEach cleanup (Pattern 4) keeps idempotent. |
| E2E-03 | /adminが未認証ユーザーおよび非adminユーザーからブロックされることをPlaywrightでテストできる | `proxy.ts` redirects `/admin` (non-admin or anon) and `/my` (anon) to `/`. Test uses NO storageState (anon) and asserts redirect to `/`. Non-admin case uses the injected non-admin session. |
</phase_requirements>

## Summary

This phase adds a Playwright E2E layer alongside the existing vitest unit suite, with zero changes to production code. The three flows under test are auth-gated by `src/proxy.ts`, which validates sessions via `@supabase/ssr` `createServerClient(...).auth.getUser()`. The locked decision (D-01/D-03) is to bypass the email round-trip and the `?code=` PKCE callback entirely, instead **minting a real Supabase session with the service_role admin client and writing the exact auth cookies into Playwright `storageState`** so that `proxy.ts`'s `getUser()` validates them as genuine.

The single highest-risk technical detail is **cookie fidelity**: `@supabase/ssr` reads/writes a cookie named `sb-<project-ref>-auth-token` (where `<project-ref>` = the first hostname label of `NEXT_PUBLIC_SUPABASE_URL`), base64url-encoded with a `base64-` prefix, and **chunked** into `.0`, `.1`, … cookies when the value exceeds 3180 bytes. Rather than hand-roll this encoding (fragile, version-coupled), the verified-correct approach is to drive `@supabase/ssr`'s own `createServerClient` with an in-memory cookie store, call `setSession({access_token, refresh_token})`, and capture whatever cookies it emits via the `setAll` callback — then serialize those exact cookies into storageState. This makes the test cookie format identical to production by construction. Tokens come from `admin.generateLink({type:'magiclink'})` → `verifyOtp({type:'email', token_hash})` (server-side, no email), or equivalently from a direct GoTrue admin sign-in; either yields a `{access_token, refresh_token}` session.

The test Supabase project is provisioned as a dedicated cloud project (D-04, D-06: no Docker) and schema is applied with `supabase db push --db-url <test-connection-string>` (no `link`, no local stack — verified against installed CLI 2.75.0). Tests live in a top-level `e2e/` directory using `*.spec.ts`, and vitest's `include` is scoped to `src/**` so the two runners never pick up each other's files.

**Primary recommendation:** Install `@playwright/test@1.60.0`. Use a `globalSetup` (or a setup *project dependency*) that (1) idempotently seeds the test user + public team + linked member via the admin client, and (2) mints the auth-cookie `storageState` by round-tripping `setSession` through `@supabase/ssr`. Configure `playwright.config.ts` `webServer` to `next build && next start` against `.env.test`, with `baseURL: http://localhost:3000`. Put E2E tests under `e2e/*.spec.ts`, add a `vitest.config.ts` with `include: ['src/**/*.{test,spec}.{ts,tsx}']`, and add npm scripts `test:e2e` / `test:e2e:ui`. Clean up `member_teams` test rows in `afterEach` with the admin client (bypasses RLS).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Auth session validation (the thing under test) | Frontend Server (Next.js middleware `proxy.ts`) | API/Supabase GoTrue | `proxy.ts` calls `getUser()` which validates the JWT against Supabase; the cookie must satisfy this server-side check |
| Session minting (test infra) | Test harness (Node, global-setup) | Database/Supabase admin | service_role admin client + GoTrue produce tokens; not a runtime app tier |
| Cookie serialization into browser | Test harness → Browser/Client | — | storageState `cookies[]` injected into the Playwright browser context before navigation |
| `/my` team join/leave | Frontend Server (server action `updateMyProfileAction`) | Database (`member_teams`) | Server action runs with `getUser()` gate then admin-client DB writes |
| `/admin` & `/my` route protection | Frontend Server (middleware) | — | All redirect logic is in `proxy.ts` matcher |
| Schema provisioning (test infra) | Database/Storage | — | `supabase db push --db-url` against the cloud test project |
| Seed data lifecycle | Test harness | Database | global-setup seeds static fixtures; afterEach cleans mutable `member_teams` |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@playwright/test` | `1.60.0` | E2E test runner + browser automation + assertions | The de-facto standard for Next.js E2E; bundles test runner, fixtures, `webServer`, `storageState`, projects/dependencies `[VERIFIED: npm registry — npm view @playwright/test version → 1.60.0]` |

### Supporting (already installed — reuse, do NOT re-add)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@supabase/ssr` | `0.10.3` (installed) | Mint the exact auth cookies in global-setup via `createServerClient` + `setSession` | Cookie-format fidelity — reuse the same lib production uses `[VERIFIED: node_modules/@supabase/ssr/package.json]` |
| `@supabase/supabase-js` | `2.105.4` (installed) | service_role admin client for seed + token generation (`createClient`, `auth.admin.generateLink`, `auth.verifyOtp`) `[VERIFIED: package.json + node_modules/@supabase/auth-js GoTrueClient.js]` |
| `dotenv` | `17.4.2` (installed) | Load `.env.test` into the Playwright process / webServer env | global-setup + config loading; already a devDependency `[VERIFIED: package.json]` |
| `tsx` | `4.21.0` (installed) | Run TS seed/migration helper scripts if needed | Already used by the project `[VERIFIED: package.json]` |
| `supabase` CLI | `2.75.0` (installed globally) | `supabase db push --db-url` to apply migrations to the cloud test project | Schema provisioning, no Docker `[VERIFIED: supabase --version]` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Mint cookies via `@supabase/ssr` round-trip | Hand-roll `sb-<ref>-auth-token` JSON + base64url + chunking | Hand-rolling couples the test to internal encoding (chunk size 3180, `base64-` prefix, `.N` naming). Brittle across `@supabase/ssr` upgrades. Round-trip is self-correcting. **Recommend round-trip.** |
| `context.addCookies()` at runtime | `storageState` JSON file referenced from config | Both work. storageState file is reusable across all logged-in test projects and is the Playwright-blessed pattern. `addCookies` is fine for a per-test variant. **Recommend storageState file produced in global-setup.** |
| `supabase db push --db-url` | psql piping each migration file | `db push` tracks migration history and ordering automatically; psql requires manual ordering and no history table. **Recommend `db push --db-url`.** |
| `admin.generateLink` + `verifyOtp` for tokens | `admin.createUser` + a password sign-in, or admin GoTrue token endpoint | generateLink+verifyOtp needs no password and mirrors the magic-link semantics (E2E-01 intent). Acceptable alternative: create user with a known password, then `signInWithPassword` to get tokens. **Either is fine; generateLink is closer to "magic link".** |

**Installation:**
```bash
npm install -D @playwright/test@1.60.0
npx playwright install --with-deps chromium
```

**Version verification (performed this session):**
- `npm view @playwright/test version` → `1.60.0` (latest stable; 1.61 only as alpha dailies) `[VERIFIED: npm registry, 2026-05-30]`
- `@supabase/ssr` installed `0.10.3`, `@supabase/supabase-js` `2.105.4`, `next` `16.2.6`, `vitest` `4.1.6`, Node `v22.12.0`, supabase CLI `2.75.0` `[VERIFIED: package.json, node_modules, --version]`

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `@playwright/test` | npm | ~7 yrs (Playwright project) | ~10M+/wk | github.com/microsoft/playwright | not run (offline) | Approved — Microsoft-maintained, canonical |
| `@supabase/ssr` | npm | installed | n/a | github.com/supabase/ssr | n/a | Already a project dependency |
| `@supabase/supabase-js` | npm | installed | n/a | github.com/supabase/supabase-js | n/a | Already a project dependency |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

> slopcheck was not executed in this session (sandboxed/offline pip). The only new package is `@playwright/test`, the official Microsoft Playwright test runner — name verified against `npm view` and the canonical GitHub org `microsoft/playwright`. No third-party Supabase-Playwright helper packages are recommended (the integration is hand-written from first-party libs), so there is no slopsquatting surface beyond `@playwright/test`. Planner MAY still gate the install behind a `checkpoint:human-verify` if desired, but risk is minimal.

## Architecture Patterns

### System Architecture Diagram

```
                          npx playwright test
                                  │
                                  ▼
                   ┌──────────────────────────────┐
                   │  playwright.config.ts         │
                   │  - loads .env.test (dotenv)   │
                   │  - webServer: next build &&   │
                   │    next start  (port 3000)    │
                   │  - globalSetup ───────────┐   │
                   │  - projects.use.           │   │
                   │    storageState ◄──────┐   │   │
                   └────────────────────────┼───┼───┘
                                            │   │
        ┌───────────────────────────────────┼───▼──────────────────────────┐
        │ global-setup.ts (runs ONCE, Node, service_role)                   │
        │                                                                   │
        │  1. SEED (idempotent, admin client bypasses RLS):                 │
        │     auth.admin user (test email) ──► members(user_id) ──► teams   │
        │     (status='public') ──► [member_teams left empty for E2E-02]    │
        │                                                                   │
        │  2. MINT SESSION:                                                 │
        │     admin.generateLink({type:'magiclink', email})                 │
        │        └─► token_hash                                             │
        │     verifyOtp({type:'email', token_hash})                         │
        │        └─► { access_token, refresh_token }                        │
        │                                                                   │
        │  3. SERIALIZE COOKIES (fidelity via @supabase/ssr):               │
        │     createServerClient(url, anonKey, {cookies:{getAll/setAll}})   │
        │       .auth.setSession({access_token, refresh_token})             │
        │     setAll() callback captures: sb-<ref>-auth-token[.N]           │
        │     write → e2e/.auth/user.json  (storageState)                   │
        │     (repeat with non-admin user → e2e/.auth/nonadmin.json if      │
        │      needed for E2E-03 non-admin case)                            │
        └───────────────────────────────────────────────────────────────────┘
                                  │ storageState files
                                  ▼
        ┌───────────────────────────────────────────────────────────────────┐
        │ Test projects                                                     │
        │                                                                   │
        │  [logged-in]  use.storageState = e2e/.auth/user.json              │
        │     e2e/my-teams.spec.ts (E2E-02): visit /my → toggle checkbox    │
        │       name="teams" → click 保存する → assert member_teams delta   │
        │       afterEach: admin DELETE member_teams for test member        │
        │     e2e/login.spec.ts (E2E-01): visit /my → asserts logged-in     │
        │       (no redirect to /) i.e. session injection works             │
        │                                                                   │
        │  [anonymous]  NO storageState                                     │
        │     e2e/admin-guard.spec.ts (E2E-03): goto /admin → expect URL /  │
        │       goto /my → expect URL /                                     │
        │     (optional non-admin: use nonadmin.json → /admin → /)          │
        └───────────────────────────────────────────────────────────────────┘
                                  │ HTTP
                                  ▼
                   Next.js app (next start, :3000)
                   proxy.ts getUser() validates injected cookie
                   against TEST Supabase project (cloud)
```

### Recommended Project Structure
```
e2e/                          # top-level — OUTSIDE src/ so vitest never globs it
├── .auth/                    # gitignored — generated storageState (contains real tokens)
│   ├── user.json             # admin/logged-in test user storageState
│   └── nonadmin.json         # optional, for E2E-03 non-admin case
├── global-setup.ts           # seed + mint storageState (runs once)
├── fixtures/
│   └── test-data.ts          # constants: test email, team name, publication_id (collision-safe)
├── helpers/
│   ├── admin.ts              # service_role client factory for tests (mirrors src/lib/supabase/admin.ts)
│   └── session.ts            # mintStorageState(email) → writes cookies via @supabase/ssr
├── login.spec.ts             # E2E-01
├── my-teams.spec.ts          # E2E-02
└── admin-guard.spec.ts       # E2E-03
playwright.config.ts          # root
vitest.config.ts              # NEW — scope include to src/** (prevents collision)
.env.test                     # gitignored (matches .env* in .gitignore)
```

### Pattern 1: Session minting via `@supabase/ssr` round-trip (THE critical pattern)
**What:** Produce production-identical auth cookies without hand-rolling encoding.
**When to use:** In global-setup, once per test user.
**Why it works:** `proxy.ts` reads cookies through `createServerClient(...).auth.getUser()`. If the *same* library writes the cookies, the format is guaranteed compatible — name `sb-<ref>-auth-token`, `base64-` prefix, chunking at 3180 bytes, `.N` suffixes — all handled internally `[VERIFIED: node_modules/@supabase/ssr/dist/main/cookies.js applyServerStorage, utils/chunker.js MAX_CHUNK_SIZE=3180, utils/constants.js DEFAULT_COOKIE_OPTIONS]`.

```typescript
// e2e/helpers/session.ts
// Source pattern verified against @supabase/ssr@0.10.3 internals (cookies.js applyServerStorage)
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

type Cookie = { name: string; value: string; domain: string; path: string;
  expires: number; httpOnly: boolean; secure: boolean; sameSite: 'Lax' }

export async function mintAuthCookies(email: string): Promise<Cookie[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 1. Mint tokens server-side, no email sent.
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink', email,
  })
  if (linkErr) throw linkErr
  const tokenHash = link.properties.hashed_token // generateLink returns properties.hashed_token

  const { data: verified, error: vErr } = await admin.auth.verifyOtp({
    type: 'email', token_hash: tokenHash,
  })
  if (vErr || !verified.session) throw vErr ?? new Error('no session')
  const { access_token, refresh_token } = verified.session

  // 2. Let @supabase/ssr serialize the cookies for us.
  const captured: { name: string; value: string; options: any }[] = []
  const ssr = createServerClient(url, anon, {
    cookies: {
      getAll: () => [],
      setAll: (toSet) => { captured.push(...toSet) },
    },
  })
  await ssr.auth.setSession({ access_token, refresh_token })

  // 3. Map to Playwright cookie shape. host = <ref>.supabase.co (cookie domain
  //    is the APP host at localhost — Playwright stores cookies by domain of the
  //    page, so set domain to 'localhost').
  return captured.map((c) => ({
    name: c.name,
    value: c.value,
    domain: 'localhost',
    path: '/',
    expires: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 1 day; refresh handled by app
    httpOnly: false,           // @supabase/ssr default DEFAULT_COOKIE_OPTIONS.httpOnly=false
    secure: false,             // localhost http
    sameSite: 'Lax' as const,  // DEFAULT_COOKIE_OPTIONS.sameSite='lax'
  }))
}
```

```typescript
// e2e/global-setup.ts
import { mintAuthCookies } from './helpers/session'
import { writeFileSync, mkdirSync } from 'node:fs'
import { TEST } from './fixtures/test-data'

export default async function globalSetup() {
  // ...idempotent seed here (see Pattern 3)...
  const cookies = await mintAuthCookies(TEST.userEmail)
  mkdirSync('e2e/.auth', { recursive: true })
  writeFileSync('e2e/.auth/user.json',
    JSON.stringify({ cookies, origins: [] }, null, 2))
}
```

> **NOTE on `generateLink` return field:** `auth-js` returns the hashed token under `properties.hashed_token` (the `?token_hash=` query param value). Verify the exact field at implementation time by logging `link.properties` — the planner should add a one-line assertion that `tokenHash` is defined before `verifyOtp`. `[VERIFIED: node_modules/@supabase/auth-js GoTrueAdminApi.js exposes hashed_token in properties]`

### Pattern 2: `playwright.config.ts` with webServer + projects
**What:** Launch the real app and reference storageState per project.
**When to use:** Always.

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'
import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.test' }) // load BEFORE config object is built

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,        // shared test user + member_teams → serialize to avoid cross-test races
  workers: 1,                  // see Pitfall 5
  reporter: 'list',
  use: { baseURL: 'http://localhost:3000', trace: 'on-first-retry' },
  projects: [
    { name: 'logged-in', testMatch: ['login.spec.ts', 'my-teams.spec.ts'],
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/user.json' } },
    { name: 'anonymous', testMatch: ['admin-guard.spec.ts'],
      use: { ...devices['Desktop Chrome'] } }, // no storageState
  ],
  webServer: {
    command: 'npm run build && npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,          // next build can be slow on first run
    env: {                     // pass test secrets into the app process
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ?? 'test',
    },
  },
})
```

**`next dev` vs `next build && next start` tradeoff:**
- `next dev`: faster cold start, no build step, but slower per-request (on-demand compilation) → flaky/slow E2E, dev-only behaviors. NOT recommended.
- `next build && next start`: ~production-faithful (middleware/proxy.ts runs in prod mode exactly as deployed), fast requests. Build is slow once (~mitigated by `timeout: 180000` and `reuseExistingServer`). **Recommended** because E2E-03 tests middleware redirect behavior that should match production.

### Pattern 3: Idempotent seed in global-setup
**What:** Create test user + public team + linked member, safe to re-run.
**When to use:** global-setup, before minting cookies.

```typescript
// inside global-setup.ts, using admin (service_role) client
// idempotency strategy: look up by unique key, create only if absent.
// 1. auth user: list/find by email or createUser (ignore "already exists")
const { data: created, error } = await admin.auth.admin.createUser({
  email: TEST.userEmail, email_confirm: true,
  app_metadata: { role: undefined }, // logged-in test user is NOT admin
})
// if error is "already registered", fetch existing via listUsers and reuse id.

// 2. team (status='public') — upsert by unique name
await admin.from('teams').upsert({ name: TEST.teamName, status: 'public' },
  { onConflict: 'name' })

// 3. member linked to the auth user — upsert by unique publication_id,
//    then ensure user_id is set (members.user_id is UNIQUE + FK to auth.users)
await admin.from('members').upsert(
  { name: TEST.memberName, publication_id: TEST.publicationId, user_id: userId },
  { onConflict: 'publication_id' })
// NOTE: members has a sync_member_publications trigger on INSERT/UPDATE — upsert
//       is fine; the trigger writes member_publications (ON CONFLICT DO NOTHING).
```

**Static vs mutable split (D-08):** `teams`, `members`, auth user = static fixtures (created once, left in place). `member_teams` = mutable (E2E-02 writes them) → cleaned per test in afterEach, NOT in global-setup.

### Pattern 4: `member_teams` cleanup in afterEach (D-08/D-09)
```typescript
// e2e/my-teams.spec.ts
test.afterEach(async () => {
  const admin = createTestAdmin() // service_role — BYPASSES RLS
  // delete ONLY this test member's rows; resolve member_id by publication_id
  const { data: m } = await admin.from('members')
    .select('id').eq('publication_id', TEST.publicationId).single()
  if (m) await admin.from('member_teams').delete().eq('member_id', m.id)
})
```
- service_role bypasses RLS, so the DELETE is unhindered by the SELECT-only public policies `[VERIFIED: supabase/schema.sql — only "public select" policies exist; service_role has BYPASSRLS]`.
- Scope to the test member's `member_id` only — never a broad `member_teams` truncate (D-09).
- `member_teams` FK is `ON DELETE CASCADE` on both sides, but deleting the join rows directly is the precise, safe operation.

### Anti-Patterns to Avoid
- **Hand-rolling the auth cookie JSON/base64/chunk format:** couples tests to `@supabase/ssr` internals (3180-byte chunk size, `base64-` prefix, `.N` naming). Use Pattern 1 instead.
- **Putting E2E specs under `src/`:** vitest's default glob would execute them in `vitest run` and fail (no browser). Keep `e2e/` top-level and scope vitest `include`.
- **`fullyParallel: true` / multiple workers with a single shared test user:** concurrent `/my` saves race on `member_teams`. Serialize (`workers: 1`) for this small suite.
- **`beforeEach` truncate of all tables (D-09):** RLS + FK ordering friction; use targeted afterEach delete.
- **Storing storageState in git:** it contains a real (short-lived) access token. Gitignore `e2e/.auth/`.
- **Using `next dev` for middleware tests:** dev-mode middleware/redirect timing differs from production.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Supabase auth cookie name/encoding/chunking | Custom `sb-<ref>-auth-token` writer with base64url + `.0/.1` splitting | `@supabase/ssr` `createServerClient` + `setSession`, capture via `setAll` | Internal format (3180-byte chunks, `base64-` prefix) changes across versions; round-trip is self-correcting |
| Project ref derivation | Regex/parse of the URL | Let ssr derive it (it computes `sb-${hostname.split('.')[0]}-auth-token` from the URL you pass) | Already correct in-lib `[VERIFIED: supabase-js index.cjs defaultStorageKey]` |
| Magic-link token without email | SMTP capture / InBucket polling | `admin.generateLink` → `verifyOtp` (server-side) | No mail server needed; matches D-01 bypass |
| Migration application to remote | psql loop over .sql files | `supabase db push --db-url` | Tracks migration history/order automatically |
| Browser login flow for state | Drive the UI login form each test | `storageState` produced once in global-setup | Faster, deterministic, decoupled from the obfuscated login page |
| Waiting for save to complete | `waitForTimeout` | Playwright auto-waiting + assert on DOM/redirect/`expect.poll` on DB | Time-based waits are flaky |

**Key insight:** Every fragile piece of Supabase-SSR auth (cookie naming, encoding, chunking, ref derivation) already lives in libraries you have installed. The entire job is *orchestration*, not *reimplementation*.

## Runtime State Inventory

> This is test-infra addition, not a rename. Included because schema/data provisioning to a NEW cloud project is runtime state.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | New TEST Supabase project: `auth.users` test user, `teams`(public), `members`(linked), `member_teams`(mutable) | global-setup seed (idempotent) + afterEach cleanup |
| Live service config | Test Supabase project must have **email confirmations / auto-confirm** acceptable for `generateLink` (no SMTP needed since we never send). RLS policies already SELECT-only — service_role bypasses. Verify the test project's Auth settings allow `admin.generateLink`. | Confirm test project Auth config; no SMTP setup required |
| OS-registered state | None — no scheduler/daemon registrations. Verified: this is a local `npx playwright test` run only (D-10). | None |
| Secrets/env vars | `.env.test` holds TEST `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (test project values). `.env*` is gitignored → not committed. The connection string for `db push --db-url` (test project DB password) is an additional secret. | Create `.env.test` (+ document a `.env.test.example`); never commit |
| Build artifacts | `next build` output `.next/` is shared between dev and test — building with `.env.test` then later `npm run dev` will have used different env at build vs runtime for `NEXT_PUBLIC_*` (inlined at build). Minor: re-build for prod deploy as usual. Playwright `webServer` build uses the test env it's given. | Be aware `NEXT_PUBLIC_*` are build-time inlined (Pitfall 6) |

**Nothing found in OS-registered category:** None — verified by D-10 scope (local run only) and absence of any scheduler config in repo.

## Common Pitfalls

### Pitfall 1: `NEXT_PUBLIC_*` are inlined at build time, not read at runtime
**What goes wrong:** You set `.env.test` but the running app still talks to the PRODUCTION Supabase because the URL/anon key were baked into `.next/` at build time from the default env.
**Why it happens:** Next.js inlines `NEXT_PUBLIC_*` into the client/edge bundle during `next build`. The `webServer.env` only affects the *server runtime*; the `proxy.ts` middleware uses `process.env` at runtime (edge) so it DOES pick up webServer.env — but client components and any build-time reads do not.
**How to avoid:** Run the build with the test env: `webServer.command: 'npm run build && npm run start'` AND ensure `NEXT_PUBLIC_*` are present in the build step's environment (export them before build, or use an env file the build reads). Verify in a test that the app hits the test project (e.g., assert seeded team appears).
**Warning signs:** Tests mutate/read PRODUCTION data; redirects behave but data assertions fail.

### Pitfall 2: vitest and Playwright globbing each other's files
**What goes wrong:** `vitest run` tries to execute `e2e/*.spec.ts` (no browser) → failures; or Playwright runs `src/**/*.test.ts`.
**Why it happens:** No `vitest.config.ts` exists today; vitest uses its default include (`**/*.{test,spec}.?(c|m)[jt]s?(x)`) across the repo. All current tests are `*.test.ts(x)` under `src/`.
**How to avoid:** Add `vitest.config.ts` with `test.include: ['src/**/*.{test,spec}.{ts,tsx}']` (and optionally `exclude: ['e2e/**']`). Keep Playwright `testDir: './e2e'` + `testMatch: '**/*.spec.ts'`. Use `.spec.ts` only for E2E and `.test.ts` for unit (current convention).
**Warning signs:** `npm test` suddenly fails after adding `e2e/`. `[VERIFIED: find src -name '*.test.ts*' shows all 5 unit tests under src/; no spec.ts exists yet]`

### Pitfall 3: Session cookie domain mismatch
**What goes wrong:** Injected cookies never reach the app; `getUser()` returns null; `/my` redirects to `/`.
**Why it happens:** `@supabase/ssr` would normally set the cookie on the app's own host. In storageState, Playwright matches cookies by the page's domain. If you set `domain` to the Supabase host instead of `localhost`, the browser won't send it to `localhost:3000`.
**How to avoid:** In Pattern 1, override `domain: 'localhost'`, `path: '/'`, `secure: false` (http localhost), `sameSite: 'Lax'`. Do NOT copy the Supabase host into the cookie domain.
**Warning signs:** Logged-in project still redirects to `/`.

### Pitfall 4: `generateLink` token field name / type mismatch in `verifyOtp`
**What goes wrong:** `verifyOtp` errors "Token has expired or is invalid".
**Why it happens:** Passing the wrong field (`action_link` vs `properties.hashed_token`) or wrong `type`. For `generateLink({type:'magiclink'})`, verify with `verifyOtp({type:'email', token_hash})` (magiclink verifies as `email` type server-side).
**How to avoid:** Use `link.properties.hashed_token` as `token_hash`, `type: 'email'`. Log `link.properties` once during implementation to confirm. Alternative: create the user with a password and `signInWithPassword` to sidestep generateLink entirely.
**Warning signs:** No session returned from verifyOtp. `[CITED: supabase auth-js verifyOtp examples — token_hash + type:'email']`

### Pitfall 5: Parallel tests racing on shared `member_teams`
**What goes wrong:** E2E-02 join/leave assertions are nondeterministic.
**Why it happens:** A single shared test user + parallel workers → afterEach of one test deletes rows another test just wrote.
**How to avoid:** `workers: 1` + `fullyParallel: false` for this suite (it's 3 small specs). If parallelism is later wanted, give each worker a distinct member/publication_id.
**Warning signs:** Flaky pass/fail on reruns.

### Pitfall 6: Port 3000 conflict with a running dev server
**What goes wrong:** `webServer` fails to start or `reuseExistingServer` attaches to a stale dev server with prod env.
**Why it happens:** Developer already has `npm run dev` on :3000.
**How to avoid:** `reuseExistingServer: !process.env.CI` is convenient but in local dev can attach to a dev server built with the wrong env. For deterministic data tests, prefer a dedicated port (e.g., `PORT=3100 next start`, `url`/`baseURL` :3100) or stop the dev server. Document this in the test README.
**Warning signs:** Data assertions hit production; or "port in use".

### Pitfall 7: Access token expiry mid-suite
**What goes wrong:** Long suites fail late as the injected access_token expires (default ~1h).
**Why it happens:** storageState holds a fixed token; `next start` server-side `getUser()` will refresh via the refresh_token cookie (also in the session cookie), so this is usually fine — but only if both tokens were captured.
**How to avoid:** Ensure `setSession` captured the full session cookie (it includes refresh_token). Suite runtime here is short. If needed, re-mint in global-setup per run (it always runs fresh).
**Warning signs:** First specs pass, later ones redirect to `/`.

## Code Examples

### E2E-03: /admin guard (anonymous → redirect to /)
```typescript
// e2e/admin-guard.spec.ts  (project: anonymous, no storageState)
import { test, expect } from '@playwright/test'

test('未認証で /admin → / にリダイレクト (E2E-03)', async ({ page }) => {
  await page.goto('/admin')
  await expect(page).toHaveURL('http://localhost:3000/')
})

test('未認証で /my → / にリダイレクト (E2E-03)', async ({ page }) => {
  await page.goto('/my')
  await expect(page).toHaveURL('http://localhost:3000/')
})
// Optional non-admin case: a second project using nonadmin storageState,
// goto('/admin') → expect URL '/'  (proxy.ts checks app_metadata.role==='admin')
```

### E2E-01: logged-in session reaches /my
```typescript
// e2e/login.spec.ts  (project: logged-in, storageState=user.json)
import { test, expect } from '@playwright/test'

test('注入セッションで /my に到達できる (E2E-01)', async ({ page }) => {
  await page.goto('/my')
  await expect(page).toHaveURL(/\/my$/)          // NOT redirected to /
  await expect(page.getByRole('heading', { name: 'マイページ' })).toBeVisible()
})
```

### E2E-02: public team join via checkbox → DB delta
```typescript
// e2e/my-teams.spec.ts  (project: logged-in)
import { test, expect } from '@playwright/test'
import { createTestAdmin } from './helpers/admin'
import { TEST } from './fixtures/test-data'

test('public チームに参加できる (E2E-02)', async ({ page }) => {
  await page.goto('/my')
  // checkbox uses name="teams" value=<team name>  (MyProfileForm.tsx)
  await page.getByRole('checkbox', { name: TEST.teamName }).check()
  await page.getByRole('button', { name: '保存する' }).click()
  // assert DB row exists (poll to absorb server-action latency)
  const admin = createTestAdmin()
  await expect.poll(async () => {
    const { data: m } = await admin.from('members')
      .select('id').eq('publication_id', TEST.publicationId).single()
    const { count } = await admin.from('member_teams')
      .select('*', { count: 'exact', head: true }).eq('member_id', m!.id)
    return count
  }).toBe(1)
})

test.afterEach(async () => { /* delete test member's member_teams — Pattern 4 */ })
```
> Checkbox uses native `<input type="checkbox" name="teams" value={t.name}>`; the visible custom check is an overlaid SVG. `getByRole('checkbox', { name })` targets the input via its `<label>` text. `[VERIFIED: src/app/my/MyProfileForm.tsx lines 59-87]`

### Migration application to the test project (no Docker)
```bash
# D-04/D-06: apply existing supabase/migrations/ to the cloud TEST project.
# Lowest-friction, no link, no local stack:
supabase db push --db-url "postgresql://postgres:<PWD>@db.<test-ref>.supabase.co:5432/postgres"
# (connection string must be percent-encoded; use the test project's DB connection string)
# Verified flag exists: `supabase db push --help` → --db-url
```
> Use the **direct connection** (port 5432) or the session pooler for migrations; the app itself uses the transaction pooler (6543) per `.env.example`. `[VERIFIED: supabase db push --help, CLI 2.75.0]`

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `globalSetup` function returning teardown | `globalSetup` + optional **setup project as dependency** (`projects[].dependencies`) | Playwright 1.31+ | Either works; setup-project gives per-project storageState + UI-mode visibility. globalSetup is simpler for one-time seed. |
| Cookie-based auth via localStorage in storageState | Supabase SSR uses **cookies** (`sb-<ref>-auth-token`), so storageState must carry cookies, not localStorage | `@supabase/ssr` (vs old `auth-helpers`) | Inject `cookies[]`, leave `origins`/localStorage empty `[CITED: Playwright auth docs note client-side auth apps detect/clear restored localStorage]` |
| `supabase auth-helpers-nextjs` | `@supabase/ssr` (installed 0.10.3) | 2023→ | Cookie naming/encoding lives in `@supabase/ssr`; this is what proxy.ts uses |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs`: replaced by `@supabase/ssr`. Do not reference its cookie format.
- InBucket/email-polling for magic link (bekapod.dev article): valid generally, but **rejected by D-01/D-03** for this phase. Listed only as the alternative the team chose against.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `admin.generateLink({type:'magiclink'})` returns the usable hashed token at `link.properties.hashed_token`, and `verifyOtp({type:'email', token_hash})` returns a full session server-side without SMTP | Pattern 1, Pitfall 4 | If field/type differ, token exchange fails — mitigated by documented fallback (create user + `signInWithPassword`). Verify by logging `link.properties` at implementation. |
| A2 | Test Supabase project allows `admin.generateLink` and `auth.admin.createUser` with email auto-confirm under service_role | Runtime State Inventory | If auth config blocks it, seed/mint fails — confirm test project Auth settings during setup task. |
| A3 | `proxy.ts` (edge middleware) reads `process.env` at runtime so `webServer.env` reaches it; but `NEXT_PUBLIC_*` for client are build-time | Pitfall 1 | If the build wasn't run with test env, app talks to prod. Mitigated by building under test env + a data-sanity assertion. |
| A4 | `@playwright/test@1.60.0` is the right pin (latest stable; Next 16 / Node 22 compatible) | Standard Stack | Low risk; 1.60.0 is current stable. Could float to `^1.60`. |
| A5 | Single shared test user with `workers:1` is sufficient for the 3 specs | Pattern 2, Pitfall 5 | If suite grows or parallelism needed, per-worker fixtures required. |
| A6 | Cookie `domain:'localhost'`, `secure:false`, `sameSite:'Lax'` lets the browser send the auth cookie to the app | Pattern 1, Pitfall 3 | If app is served on a non-localhost host/https, adjust domain/secure. |

## Open Questions

1. **Non-admin case for E2E-03**
   - What we know: E2E-03 requires both "未認証" AND "非adminユーザー" are blocked from `/admin`. `proxy.ts` checks `user.app_metadata.role !== 'admin'`.
   - What's unclear: Whether the planner wants a second (non-admin, logged-in) storageState. The logged-in test user seeded in Pattern 3 is intentionally non-admin, so it can serve double duty: use `user.json` to hit `/admin` and assert redirect to `/`.
   - Recommendation: Add a single test in the logged-in project: `goto('/admin')` → `expect URL '/'`. No separate admin user needed unless a positive `/admin` access test is also wanted (not required by E2E-03).

2. **Direct DB connection availability for `db push`**
   - What we know: `--db-url` works without Docker/link.
   - What's unclear: Whether the test project exposes the direct (5432) connection or only poolers (some Supabase plans). 
   - Recommendation: Use the connection string from the test project's dashboard (Settings → Database). If direct is unavailable, the session pooler URL also works for migrations.

3. **`reuseExistingServer` ergonomics during local dev**
   - What we know: it can attach to a stale dev server with prod env (Pitfall 6).
   - Recommendation: Default to a dedicated port for E2E (e.g., 3100) to fully isolate from `npm run dev`, OR document "stop your dev server before `npm run test:e2e`."

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | Playwright + Next | ✓ | v22.12.0 | — |
| `supabase` CLI | `db push --db-url` (schema to test project) | ✓ | 2.75.0 (2.102.0 available) | psql against connection string |
| `@playwright/test` | the whole phase | ✗ (not installed) | recommend 1.60.0 | none — must install |
| Playwright browsers (chromium) | running tests | ✗ (not installed) | — | `npx playwright install chromium` |
| Docker | NOT used (D-06) | n/a | — | n/a — cloud test project |
| Test Supabase cloud project | seed/mint/migrate | ✗ (must be created) | — | none — must provision (D-04) |

**Missing dependencies with no fallback:**
- `@playwright/test` + chromium browser — install step required (`npm i -D @playwright/test@1.60.0 && npx playwright install --with-deps chromium`).
- A provisioned cloud TEST Supabase project + `.env.test` with its keys — manual provisioning step (D-04/D-05). This is the one human/manual prerequisite; the planner should make it an explicit checkpoint task.

**Missing dependencies with fallback:**
- supabase CLI is slightly behind (2.75.0 vs 2.102.0) but `db push --db-url` is stable; upgrade optional. Fallback: psql.

## Validation Architecture

> nyquist_validation is enabled (`.planning/config.json` workflow.nyquist_validation = true).

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `@playwright/test` 1.60.0 (E2E) — coexists with existing vitest 4.1.6 (unit) |
| Config file | `playwright.config.ts` (NEW) + `vitest.config.ts` (NEW, scopes vitest to `src/**`) |
| Quick run command | `npx playwright test --project=anonymous` (E2E-03, no server build dependency on auth) or single spec `npx playwright test e2e/admin-guard.spec.ts` |
| Full suite command | `npx playwright test` (all 3 specs; webServer builds + starts app) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| E2E-01 | Injected session reaches `/my` (logged-in, no redirect) | e2e | `npx playwright test e2e/login.spec.ts` | ❌ Wave 0 |
| E2E-02 | public team join/leave via checkbox → `member_teams` INSERT/DELETE | e2e | `npx playwright test e2e/my-teams.spec.ts` | ❌ Wave 0 |
| E2E-03 | anon (and non-admin) `/admin`,`/my` → redirect `/` | e2e | `npx playwright test e2e/admin-guard.spec.ts` | ❌ Wave 0 |

**Observable signals (Nyquist sampling points):**
- E2E-01: final URL is `/my` (not `/`) + 「マイページ」 heading visible — proves `getUser()` validated the injected cookie.
- E2E-02: DB row count in `member_teams` for the test member transitions 0→1 (join) and 1→0 (leave). Assert via admin client `expect.poll` (absorbs server-action async). UI signal: checkbox `checked` state persists after reload.
- E2E-03: final URL equals `/` after `goto('/admin')` and `goto('/my')` while anonymous.

### Sampling Rate
- **Per task commit:** `npx playwright test e2e/<the-spec-you-changed>.spec.ts`
- **Per wave merge:** `npx playwright test` (full 3-spec suite)
- **Phase gate:** full `npx playwright test` green AND existing `npm test` (vitest) still green (proves no collision regression) before `/gsd:verify-work`.

### Wave 0 Gaps
- [ ] `@playwright/test@1.60.0` install + `npx playwright install chromium`
- [ ] `playwright.config.ts` — webServer + projects + globalSetup
- [ ] `vitest.config.ts` — `include: ['src/**/*.{test,spec}.{ts,tsx}']` (prevent E2E collision)
- [ ] `.env.test` (+ `.env.test.example`) for TEST Supabase project
- [ ] Provision cloud TEST Supabase project + `supabase db push --db-url` migrations (manual/checkpoint)
- [ ] `e2e/global-setup.ts` — idempotent seed + storageState minting
- [ ] `e2e/helpers/{admin,session}.ts`, `e2e/fixtures/test-data.ts`
- [ ] `.gitignore` entry for `e2e/.auth/`
- [ ] npm scripts: `"test:e2e": "playwright test"`, `"test:e2e:ui": "playwright test --ui"`

## Security Domain

> security_enforcement not configured in `.planning/config.json` (treated as enabled). This is test infrastructure; the production security surface is the existing `proxy.ts` getUser() gate, which is the subject under test, not modified.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Session injection must validate via real `getUser()` (not bypass the gate) — preserves the integrity of what E2E-01/03 prove |
| V3 Session Management | yes | Auth tokens live in storageState files — treat as secrets, gitignore `e2e/.auth/` and `.env.test` |
| V4 Access Control | yes | E2E-03 directly verifies access control (anon/non-admin blocked from `/admin`) |
| V5 Input Validation | no | No new input handling added (test infra only) |
| V6 Cryptography | no | No hand-rolled crypto; tokens minted by GoTrue |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| service_role key leakage | Information Disclosure / Elevation | `.env.test` gitignored (`.env*` already in `.gitignore`); never log keys; service_role used ONLY in test/global-setup, never shipped to client |
| storageState token in VCS | Information Disclosure | gitignore `e2e/.auth/`; tokens are short-lived but still secrets |
| Test writes to PRODUCTION data | Tampering | Dedicated TEST project (D-04) + Pitfall 1 build-env discipline + a data-sanity assertion that the app hit the test project |
| Weakening proxy.ts to make tests pass | Tampering / Elevation | Phase boundary forbids production code changes (D-01 note) — verify proxy.ts unchanged in code review |

## Sources

### Primary (HIGH confidence)
- `node_modules/@supabase/ssr@0.10.3` source — `cookies.js` (`applyServerStorage`, `BASE64_PREFIX="base64-"`), `utils/chunker.js` (`MAX_CHUNK_SIZE=3180`, `.N` chunk naming), `utils/constants.js` (`DEFAULT_COOKIE_OPTIONS`: path `/`, sameSite `lax`, httpOnly `false`, maxAge 400d), `createServerClient.js`, `createBrowserClient.js` — cookie format, storageKey derivation
- `node_modules/@supabase/supabase-js@2.105.4` `dist/index.cjs` — `defaultStorageKey = sb-${baseUrl.hostname.split(".")[0]}-auth-token`
- `node_modules/@supabase/auth-js` `GoTrueClient.js`/`GoTrueAdminApi.js` — `generateLink`, `verifyOtp`, `setSession`, `properties.hashed_token`
- Project files: `src/proxy.ts`, `src/app/auth/callback/route.ts`, `src/lib/supabase/{server,client,admin}.ts`, `src/app/my/{page,MyProfileForm,LinkMemberForm,actions}.tsx/ts`, `supabase/schema.sql`, `supabase/migrations/`, `package.json`, `tsconfig.json`, `.gitignore`, `src/__tests__/proxy.test.ts`
- `supabase db push --help` (CLI 2.75.0) — `--db-url` flag confirmed
- `npm view @playwright/test version` → 1.60.0
- [Playwright Authentication docs](https://playwright.dev/docs/auth) — storageState, globalSetup, projects/dependencies, client-side-auth cookie note

### Secondary (MEDIUM confidence)
- [Supabase CLI db push reference](https://supabase.com/docs/reference/cli/supabase-db-push) — push to remote via connection string
- [Supabase Database Migrations guide](https://supabase.com/docs/guides/deployment/database-migrations)

### Tertiary (LOW confidence / rejected alternative)
- [bekapod.dev: Supabase magic login testing with Playwright](https://www.bekapod.dev/articles/supabase-magic-login-testing-with-playwright/) — uses InBucket email polling; documents the alternative approach the team rejected (D-01/D-03)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions verified against installed node_modules and npm registry
- Cookie/session injection mechanics: HIGH — read directly from `@supabase/ssr@0.10.3` source; round-trip approach sidesteps version coupling
- Migration to test project: HIGH — `--db-url` flag verified in installed CLI
- generateLink/verifyOtp exact field: MEDIUM — present in auth-js, but field name (`properties.hashed_token`) should be log-confirmed at implementation (A1); password-signin fallback documented
- Architecture/layout/pitfalls: HIGH — grounded in actual repo files (vitest glob, gitignore, forms, proxy)

**Research date:** 2026-05-30
**Valid until:** 2026-06-29 (30 days; stable libs — re-check `@playwright/test` and `@supabase/ssr` if either bumps a minor)
