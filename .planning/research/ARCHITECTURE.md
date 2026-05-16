# Architecture Research: v1.5

**Domain:** RSS activity visualization — Supabase migration + Auth + long-term history
**Researched:** 2026-05-16
**Confidence:** HIGH (verified against Next.js 16.2.6 official docs, Supabase SSR Context7, official Supabase docs)

---

## Critical Context: Next.js 16 Breaking Changes That Affect v1.5

### 1. `middleware.ts` → `proxy.ts` (deprecated, not yet broken)

The existing `src/middleware.ts` still works in Next.js 16.2.6 but produces deprecation warnings.
When migrating middleware to Supabase Auth session handling, rename the file at the same time:

```
src/middleware.ts  →  src/proxy.ts
export function middleware()  →  export function proxy()
```

The edge runtime is NOT supported in `proxy.ts`. The runtime is always `nodejs`.
This means Supabase SSR session refresh (which requires Node.js) works correctly in `proxy.ts`.

### 2. `revalidateTag` requires second argument in Next.js 16

```typescript
// Next.js 15 (current code in actions.ts)
revalidatePath('/admin')  // still works, revalidatePath unchanged

// Next.js 16 — revalidateTag now requires cacheLife profile
revalidateTag('feeds')          // DEPRECATED — TypeScript error
revalidateTag('feeds', 'max')   // CORRECT — 'max' means stale-while-revalidate
updateTag('feeds')              // ALTERNATIVE — immediate expiration (Server Actions only)
```

The existing `revalidatePath('/admin')` calls in `actions.ts` are unaffected. Only `revalidateTag` changed.
For v1.5, use `revalidatePath` (already used) or `updateTag` for immediate cache busting after Supabase writes.

### 3. `unstable_cache` → `cacheLife` / `cacheTag` (stabilized)

`unstable_cache` can be replaced with stable `use cache` + `cacheLife` + `cacheTag` in Next.js 16.
v1.5 can continue using `unstable_cache` if keeping scope tight (YAGNI), but new Supabase query
functions should use stable `cacheLife`/`cacheTag` APIs.

---

## Data Layer Migration: Redis → Supabase

### Why Supabase PostgreSQL over Redis for v1.5

| Concern | Redis (current) | Supabase PostgreSQL (v1.5) |
|---------|----------------|--------------------------|
| Relational queries | No JOIN, manual denormalization | Native JOIN, date range queries |
| Long-term article history | KV blob grows unbounded | Indexed rows, efficient range queries |
| Auth integration | No native auth | `auth.users` table + RLS built-in |
| Member self-management | Not possible | Row-level ownership via `user_id` |
| Admin checkbox UI (teamNames) | JSON array in blob | Normalized or `text[]` column |

### Schema Design

#### `public.members` table

```sql
create table public.members (
  id           uuid primary key default gen_random_uuid(),
  substack_id  text not null unique,           -- e.g. "example" from example.substack.com
  name         text not null,
  team_names   text[] not null default '{}',   -- matches existing teamNames: string[]
  added_at     timestamptz not null default now(),
  user_id      uuid references auth.users(id) on delete set null,
  -- user_id is nullable: admin-added members have no auth account yet
  -- when a member signs up with Supabase Auth, user_id is linked
  image_url    text                             -- cached from RSS feed (moved from articles KV)
);

create index on public.members(substack_id);
create index on public.members(user_id);
```

#### `public.articles` table

```sql
create table public.articles (
  id           bigint generated always as identity primary key,
  substack_id  text not null references public.members(substack_id) on delete cascade,
  title        text,
  link         text not null unique,            -- dedup key (matches existing KV logic)
  iso_date     timestamptz,
  thumbnail    text,
  created_at   timestamptz not null default now()
);

create index on public.articles(substack_id, iso_date desc);
-- This index powers the heatmap query: WHERE substack_id = X AND iso_date BETWEEN a AND b
create index on public.articles(iso_date);
-- This index powers date-range queries across all members
```

#### Row Level Security (RLS)

```sql
-- Members table: public read, member can update their own row
alter table public.members enable row level security;

create policy "Anyone can read members"
  on public.members for select using (true);

create policy "Members can update own profile"
  on public.members for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Admin inserts/deletes via service_role key (bypasses RLS)

-- Articles table: public read, Cron writes via service_role
alter table public.articles enable row level security;

create policy "Anyone can read articles"
  on public.articles for select using (true);
-- INSERT/UPDATE/DELETE only via service_role (Cron job uses SUPABASE_SERVICE_ROLE_KEY)
```

### Migration Strategy: Redis → Supabase (Zero-Downtime)

The migration must not break the live site. Use a parallel-run approach:

**Phase A: Supabase schema + dual-write**
1. Create Supabase tables (members + articles)
2. Run one-time migration script: read all Redis keys → insert into Supabase
3. Modify `saveArticles` and `getArticles` to write/read BOTH Redis and Supabase
4. Verify Supabase data matches Redis for 1 Cron cycle

**Phase B: Supabase primary, Redis fallback**
1. Switch `getMembers` to read from Supabase first, Redis as fallback
2. Switch `fetchAllFeedsCached` to read articles from Supabase
3. Verify ISR heatmap still renders correctly with Supabase data

**Phase C: Remove Redis**
1. Remove `@upstash/redis` dependency
2. Delete `src/lib/redis.ts`, `src/lib/kvMembers.ts`, `src/lib/kvArticles.ts`
3. Remove `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` from Vercel env

**Migration script** (one-shot, run via `tsx scripts/migrate-redis-to-supabase.ts`):

```typescript
// scripts/migrate-redis-to-supabase.ts
// 1. getMembers() from Redis
// 2. For each member: insert into public.members
// 3. getArticles(substackId) from Redis
// 4. For each article: insert into public.articles (ON CONFLICT DO NOTHING)
```

---

## Auth Integration: Supabase Auth + Next.js App Router

### Package

```bash
npm install @supabase/supabase-js @supabase/ssr
```

`@supabase/ssr` is the correct package for Next.js App Router (NOT the deprecated `@supabase/auth-helpers-nextjs`).

### New Library Files

#### `src/lib/supabase/server.ts` — Server Component / Server Action client

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createSupabaseServerClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
```

#### `src/lib/supabase/client.ts` — Client Component browser client

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

#### `src/lib/supabase/admin.ts` — Service role client (Cron, migration)

```typescript
import { createClient } from '@supabase/supabase-js'

// Service role bypasses RLS — only use in server-side Cron/admin scripts
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

### Session Handling: Server/Client Split

| Location | Client type | Purpose |
|----------|-------------|---------|
| `src/proxy.ts` (middleware) | `createServerClient` with request/response cookies | Session refresh before every page render, redirect unauthenticated users from `/my` |
| Server Components / Server Actions | `createSupabaseServerClient()` | Read user, query Supabase with user context |
| Client Components | `createSupabaseBrowserClient()` | Login/logout UI, email magic link trigger |

### Protected Route Pattern: `/my` page

```typescript
// src/proxy.ts (renamed from middleware.ts)
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — required for Server Components to see fresh auth state
  // Note: do NOT await here in proxy, use getUser() in the page itself for protection
  supabase.auth.getUser()

  // Protect /my routes
  // (actual redirect logic should check user in the page for security)
  return response
}

export const config = {
  // Keep /admin matcher (Basic Auth still active for admin)
  // Add /my to refresh session cookies
  matcher: ['/admin', '/admin/:path*', '/my', '/my/:path*'],
}
```

**Important:** Per Supabase official docs, `getSession()` inside Server Components is NOT safe
(does not revalidate token). Always use `getUser()` to protect pages — it sends a request to
the Supabase Auth server every time to revalidate.

```typescript
// src/app/my/page.tsx
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function MyPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch this member's profile from members table
  const { data: member } = await supabase
    .from('members')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return <div>...</div>
}
```

### Auth Callback Route (PKCE flow for email magic link / OAuth)

```typescript
// src/app/auth/callback/route.ts
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createSupabaseServerClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(new URL('/my', request.url))
}
```

### Member Self-Link Flow

When a member authenticates for the first time, their `auth.users.id` must be linked to
the existing `members.user_id`. Options:

**Option A: Automatic trigger (recommended for simplicity)**

```sql
-- Supabase trigger: after a user signs up, try to match by email claim or manual link
-- NOT recommended for this app — members don't have emails stored in members table
```

**Option B: Self-link in `/my` page Server Action (KISS)**

```typescript
// src/app/my/actions.ts
'use server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function linkMemberAccount(substackId: string) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Member enters their substackId to claim their profile
  await supabase
    .from('members')
    .update({ user_id: user.id })
    .eq('substack_id', substackId)
    .is('user_id', null) // prevent claiming already-linked profiles
}
```

This keeps it simple: member logs in with email magic link, then enters their `substackId`
to claim their profile. No complex trigger needed.

---

## Long-term Article History

### Data Flow: Cron → Supabase articles table

Current flow (Redis):
```
Vercel Cron (UTC 20:00) → GET /api/cron
  → getMembers() [Redis 'members' key]
  → fetchWithRetry(feedUrl) [RSS fetch]
  → saveArticles(substackId, items, imageUrl) [Redis articles:{substackId}]
```

New flow (Supabase):
```
Vercel Cron (UTC 20:00) → GET /api/cron
  → getMembers() [Supabase members table, via service_role]
  → fetchWithRetry(feedUrl) [RSS fetch — unchanged]
  → saveArticles(substackId, items, imageUrl) [Supabase articles table, upsert on link]
```

The `saveArticles` signature stays identical (substackId, items, imageUrl).
Internal implementation changes from Redis to Supabase insert with ON CONFLICT DO NOTHING on `link`.

```typescript
// src/lib/supabaseArticles.ts (new, replaces kvArticles.ts)
export async function saveArticles(
  substackId: string,
  newItems: FeedItem[],
  imageUrl?: string
): Promise<void> {
  if (newItems.length === 0) return

  const rows = newItems.map((item) => ({
    substack_id: substackId,
    title: item.title ?? null,
    link: item.link!,
    iso_date: item.isoDate ? new Date(item.isoDate).toISOString() : null,
    thumbnail: item.thumbnail ?? null,
  }))

  await supabaseAdmin
    .from('articles')
    .upsert(rows, { onConflict: 'link', ignoreDuplicates: true })

  // Update image_url on member row
  if (imageUrl) {
    await supabaseAdmin
      .from('members')
      .update({ image_url: imageUrl })
      .eq('substack_id', substackId)
  }
}
```

### Query Pattern for Heatmap (date range)

The heatmap needs articles for all members within the last 7 days (weekly view).
The `fetchAllFeedsCached` function currently merges live RSS + KV articles.
After migration, Supabase replaces KV — live RSS fetch continues for freshness (ISR hybrid).

```typescript
// src/lib/supabaseArticles.ts
export async function getArticles(substackId: string): Promise<StoredFeed> {
  // Anon client is sufficient (RLS allows public read)
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('articles')
    .select('title, link, iso_date, thumbnail')
    .eq('substack_id', substackId)
    .order('iso_date', { ascending: false })
    .limit(500)  // cap to avoid unbounded growth in memory

  return {
    items: (data ?? []).map((row) => ({
      title: row.title ?? undefined,
      link: row.link,
      isoDate: row.iso_date ?? undefined,
      thumbnail: row.thumbnail ?? undefined,
    })),
    imageUrl: undefined, // imageUrl now on members table
  }
}
```

For future year heatmap / streak features, use date range queries:

```typescript
// Date range query for heatmap: last N days
const { data } = await supabase
  .from('articles')
  .select('substack_id, iso_date')
  .gte('iso_date', startDate.toISOString())
  .lte('iso_date', endDate.toISOString())
  .order('iso_date', { ascending: false })
```

Supabase index on `(substack_id, iso_date desc)` makes this O(log n) — efficient even with
months of history.

---

## Admin UI: teamNames Checkbox

Currently `AdminMemberList.tsx` uses a comma-separated text input for `teamNames`.
v1.5 adds a checkbox UI. This requires knowing all available team names upfront.

```typescript
// Server Component: fetch all distinct team names from Supabase
const { data } = await supabase
  .from('members')
  .select('team_names')

const allTeams = [...new Set(data?.flatMap((m) => m.team_names ?? []) ?? [])]
  .filter((t) => t !== 'chameleon')
```

The `team_names text[]` column in PostgreSQL maps directly to `string[]` in TypeScript.
No schema change needed — the data model already supports it.

The `updateMember` Server Action changes from accepting comma-separated string to
accepting `string[]` directly (or multiple checkbox values via `formData.getAll('teamNames')`).

---

## Component Map: New vs Modified

### New Files

| File | Type | Purpose |
|------|------|---------|
| `src/lib/supabase/server.ts` | Utility | Server-side Supabase client factory |
| `src/lib/supabase/client.ts` | Utility | Browser-side Supabase client factory |
| `src/lib/supabase/admin.ts` | Utility | Service role client for Cron/migration |
| `src/lib/supabaseMembers.ts` | Data layer | Replaces `kvMembers.ts` |
| `src/lib/supabaseArticles.ts` | Data layer | Replaces `kvArticles.ts` |
| `src/app/auth/callback/route.ts` | Route Handler | PKCE code exchange for email/OAuth |
| `src/app/login/page.tsx` | Page | Email magic link login form |
| `src/app/my/page.tsx` | Page (Server) | Member self-management dashboard |
| `src/app/my/actions.ts` | Server Action | Update own profile, link account |
| `src/proxy.ts` | Middleware (renamed) | Session refresh + route protection |
| `scripts/migrate-redis-to-supabase.ts` | Script | One-time data migration |
| `supabase/migrations/001_initial_schema.sql` | DB migration | Schema definition |

### Modified Files

| File | Change | Why |
|------|--------|-----|
| `src/middleware.ts` | Rename to `src/proxy.ts`, export `proxy()` | Next.js 16 deprecation |
| `src/lib/fetchFeed.ts` | `getArticles()` call → Supabase instead of Redis | Data layer swap |
| `src/app/api/cron/route.ts` | `getMembers()` + `saveArticles()` → Supabase | Data layer swap |
| `src/app/admin/actions.ts` | CRUD → Supabase, teamNames as `string[]` | Data layer swap |
| `src/app/admin/page.tsx` | Read members from Supabase | Data layer swap |
| `src/app/admin/AdminMemberList.tsx` | teamNames: checkbox UI instead of text input | v1.5 feature |
| `src/app/layout.tsx` | Add login/logout nav link | Auth UI |
| `src/lib/types.ts` | No change to `Member` type shape (backward compatible) | |

### Removed Files (Phase C of migration)

| File | Reason |
|------|--------|
| `src/lib/redis.ts` | Upstash Redis removed |
| `src/lib/kvMembers.ts` | Replaced by supabaseMembers.ts |
| `src/lib/kvArticles.ts` | Replaced by supabaseArticles.ts |

---

## Build Order

Dependencies flow: Supabase schema → data layer → auth → UI features.
Each phase is independently deployable and testable.

### Phase 1: Supabase Setup + Schema

Deliverable: Supabase project created, schema deployed, env vars set.

1. Create Supabase project (free tier: 500MB database, 50k monthly active users)
2. Write `supabase/migrations/001_initial_schema.sql` (members + articles tables + RLS)
3. Add env vars to Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
4. Create `src/lib/supabase/server.ts`, `client.ts`, `admin.ts`

No app changes yet. Existing Redis path still active.

### Phase 2: Data Migration (Redis → Supabase)

Deliverable: All existing data in Supabase, verified correct.

1. Write `scripts/migrate-redis-to-supabase.ts`
2. Run script: all members + articles transferred to Supabase
3. Verify row counts match Redis keys
4. Dual-write mode: new Cron writes to BOTH Redis and Supabase (1 Cron cycle for confidence)

App still reads from Redis. Zero user impact.

### Phase 3: Data Layer Swap (Supabase primary)

Deliverable: App reads/writes Supabase, Redis unused.

1. Create `src/lib/supabaseMembers.ts` (same interface as `kvMembers.ts`)
2. Create `src/lib/supabaseArticles.ts` (same interface as `kvArticles.ts`)
3. Swap import in `fetchFeed.ts`: `kvArticles` → `supabaseArticles`
4. Swap import in `cron/route.ts`: `kvMembers` + `kvArticles` → Supabase equivalents
5. Swap import in `admin/actions.ts`: `kvMembers` + `kvArticles` → Supabase equivalents
6. Deploy + verify heatmap loads correctly
7. Rename `middleware.ts` → `proxy.ts` (safe to do here, unrelated to auth)

### Phase 4: Supabase Auth

Deliverable: Email magic link login works, `/my` page accessible to logged-in members.

1. Enable Email provider in Supabase Dashboard (Auth > Providers)
2. Set `Site URL` and `Redirect URLs` in Supabase Dashboard
3. Create `src/app/auth/callback/route.ts`
4. Create `src/app/login/page.tsx` (email input + `signInWithOtp`)
5. Create `src/app/my/page.tsx` (protected, shows member profile or "claim your profile" UI)
6. Create `src/app/my/actions.ts` (`linkMemberAccount`, `updateOwnProfile`)
7. Update `proxy.ts` config matcher to include `/my/:path*`
8. Add login/logout links to `layout.tsx`

### Phase 5: Admin UI Checkbox + Cleanup

Deliverable: teamNames rendered as checkboxes, Redis fully removed.

1. Update `AdminMemberList.tsx`: replace teamNames text input with checkbox group
2. Update `updateMemberAction` in `admin/actions.ts`: accept `string[]` from checkboxes
3. Remove Redis dependencies: `redis.ts`, `kvMembers.ts`, `kvArticles.ts`
4. Remove `@upstash/redis` from `package.json`
5. Remove Upstash env vars from Vercel

---

## Environment Variables

### New for v1.5

| Variable | Where Set | Visible in Browser |
|----------|-----------|-------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel env | YES (NEXT_PUBLIC_ prefix) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel env | YES (safe, RLS enforces access) |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel env | NO (server-only, bypasses RLS) |

### Existing (keep until Phase 5 complete)

| Variable | Status |
|----------|--------|
| `UPSTASH_REDIS_REST_URL` | Remove after Phase 5 |
| `UPSTASH_REDIS_REST_TOKEN` | Remove after Phase 5 |
| `ADMIN_PASSWORD` | Keep (Basic Auth for /admin) |
| `CRON_SECRET` | Keep (Cron Bearer auth unchanged) |

---

## Supabase Free Tier Fit

| Resource | Free Limit | v1.5 Estimated Usage | Status |
|----------|-----------|----------------------|--------|
| Database storage | 500MB | ~5MB (50 members × 365 days × 3 articles/day) | Well within |
| Monthly active users | 50K MAU | <100 members | Well within |
| Auth emails | 3/hour (free), 100/day | <10/day (magic links) | Within limit |
| API calls | Unlimited | Same as current ISR + Cron pattern | Fine |
| Edge Functions | 500K invocations/month | Not used | N/A |

Auth email rate limit (3/hour on free tier) is the only concern. Sufficient for a small community.
If members sign up simultaneously at launch, they may hit the limit. Mitigate by using OAuth
(GitHub/Google) as an alternative — one OAuth login = no email sent.

---

## Data Flow Diagram (v1.5 Target State)

```
                     ┌─────────────────────────────────────────┐
                     │  Supabase PostgreSQL                     │
                     │  public.members (id, substack_id,        │
                     │    name, team_names, user_id, image_url) │
                     │  public.articles (substack_id, link,     │
                     │    iso_date, title, thumbnail)           │
                     │  auth.users (built-in)                   │
                     └──────────┬──────────────────────────────┘
                                │ @supabase/ssr (HTTP)
        ┌───────────────────────┼───────────────────────────┐
        │                       │                           │
  ISR (revalidate=300)    Cron (UTC 20:00)          Server Actions
        │                       │                           │
  page.tsx (/)            /api/cron                  /admin/*
  getMembers()            getMembers()               CRUD members
  getArticles()           fetchWithRetry()           /my/*
  fetchWithRetry()        saveArticles()             updateOwnProfile()
  merge live+DB           (upsert on link)           linkMemberAccount()
        │
  WeeklyHeatmapGrid
  (unchanged)

  Auth flow:
  /login → signInWithOtp → email → /auth/callback → exchangeCodeForSession → /my
```

---

## Anti-Patterns to Avoid (v1.5)

### Anti-Pattern 1: `getSession()` in Server Components

**What goes wrong:** `getSession()` returns cached session without revalidating. An expired or
revoked token appears valid. Security risk for the `/my` page.

**Prevention:** Always use `supabase.auth.getUser()` in Server Components to protect routes.
`getUser()` sends a network request to the Supabase Auth server every time.

### Anti-Pattern 2: Service Role Key in Client Components

**What goes wrong:** `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS. Exposing it to the browser
gives anyone full database access.

**Prevention:** `supabaseAdmin` (service role) is ONLY used in `src/lib/supabase/admin.ts`,
imported only by Cron route handler and migration scripts. Never import in Client Components.

### Anti-Pattern 3: Removing Redis Before Supabase Data Verified

**What goes wrong:** If Supabase data is incomplete, removing Redis leaves the app with no
member/article data. Heatmap renders empty.

**Prevention:** Follow the 3-phase migration. Only remove Redis (Phase C/5) after:
- At least 2 Cron cycles have written to Supabase
- Manual verification: article count in Supabase ≥ article count in Redis

### Anti-Pattern 4: Skipping `proxy.ts` Session Refresh

**What goes wrong:** Without session refresh in `proxy.ts`, Server Components receive stale
tokens. The user appears logged out after token expiry even with valid refresh token.

**Prevention:** The `proxy.ts` must call `supabase.auth.getUser()` (which triggers token
refresh) and pass updated cookies back in the response. This is the Supabase SSR pattern.

### Anti-Pattern 5: Storing `substackId` in auth.users Metadata Instead of members Table

**What goes wrong:** User metadata in Supabase Auth is not queryable via SQL. Cannot JOIN
to articles. Cannot filter by team.

**Prevention:** Keep `substack_id` in `public.members`. The link between auth and member
is `members.user_id = auth.users.id`.

---

## Sources

- [Next.js 16 Upgrade Guide — middleware to proxy, revalidateTag changes](https://nextjs.org/docs/app/guides/upgrading/version-16) — HIGH confidence, official docs, last updated 2026-05-13
- [Supabase SSR — createServerClient for Next.js middleware, Server Components, Route Handlers](https://context7.com/supabase/ssr/llms.txt) — HIGH confidence, Context7
- [Supabase Auth — getUser() vs getSession() in Server Components](https://supabase.com/docs/guides/auth/server-side/nextjs) — HIGH confidence, official docs
- [Supabase Auth — PKCE flow, auth/callback route for Next.js](https://supabase.com/docs/guides/auth/quickstarts/nextjs) — HIGH confidence, official docs
- [Supabase RLS — auth.uid() policy pattern](https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/database/postgres/row-level-security.mdx) — HIGH confidence, Context7
- [Supabase — profiles table + trigger pattern for linking auth.users to custom tables](https://context7.com/supabase/supabase/llms.txt) — HIGH confidence, Context7
- [Next.js 16 proxy.ts — edge runtime NOT supported](https://nextjs.org/docs/messages/middleware-to-proxy) — HIGH confidence, official docs
