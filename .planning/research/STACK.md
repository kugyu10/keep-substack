# Technology Stack

**Project:** Keep Substack
**Milestone:** v1.1 Dynamic Members + Weekly View
**Researched:** 2026-05-08

---

## Existing Stack (DO NOT change)

| Technology | Version | Status |
|------------|---------|--------|
| Next.js | 16.2.6 | Locked — already deployed |
| React | 19.2.4 | Locked |
| rss-parser | 3.13.0 | Locked |
| TypeScript | 5.x | Locked |
| Tailwind CSS | 4.x | Locked |

---

## v1.1 Stack Additions

### KV Store (Member Data)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @upstash/redis | 1.37.0 | Member data storage on Vercel | Vercel KV is deprecated (moved to Upstash Redis in Dec 2024). Upstash Redis is the official Vercel Marketplace replacement. REST-based HTTP client — works in both Edge and Node.js runtimes. Free tier: 500K commands/month, 256MB, sufficient for 50 members |

**Critical:** `@vercel/kv` is deprecated and no longer available for new projects. Do NOT use it.

### Middleware (Admin Route Protection)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Next.js middleware (built-in) | - | Basic Auth for /admin routes | No external library needed. `middleware.ts` at project root reads `Authorization` header, decodes with native `atob()`, compares against env var `ADMIN_CREDENTIALS`. Edge-compatible, zero dependencies (KISS) |

No library recommendation: `next-basic-auth-middleware` (labd) works but adds a dependency for 20 lines of code. The built-in pattern is sufficient.

---

## Environment Variables (New for v1.1)

```
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxxxxxxxxx
ADMIN_USER=admin
ADMIN_PASSWORD=your-secure-password
```

`ADMIN_USER` and `ADMIN_PASSWORD` are checked in `middleware.ts`. Set in Vercel Dashboard > Project Settings > Environment Variables.

---

## Data Schema (Upstash Redis)

```typescript
// Key: "members"
// Type: Redis Hash (HSET/HGETALL) OR JSON string (SET/GET)
// Recommended: JSON string — simpler, atomic reads, no partial-read issues

type MemberRecord = {
  name: string
  substackId: string   // e.g. "example" from example.substack.com
  feedUrl: string      // e.g. "https://example.substack.com/feed"
  addedAt: string      // ISO 8601
  teamId: string       // e.g. "team-a", "" for no team
}

// Storage pattern: single JSON array
await redis.set('members', JSON.stringify(members))
const members = JSON.parse(await redis.get('members') ?? '[]')
```

Single JSON array per `redis.set/get` is preferred over Redis Hash for this use case:
- Member count is small (≤50), no performance concern
- Atomic read/write prevents partial state
- Simpler code than HSET/HGETALL (KISS)

---

## Thumbnail Fetching Strategy

### What Substack RSS feeds provide

Substack RSS 2.0 feeds do NOT include `<enclosure>` or `<media:thumbnail>` tags. Images exist only inside `<content:encoded>` as HTML `<img>` tags.

**Approach: Extract first `<img src>` from `content:encoded`**

Configure rss-parser to capture `content:encoded`:

```typescript
const parser = new Parser({
  timeout: 5000,
  customFields: {
    item: [['content:encoded', 'contentEncoded']],
  },
})
```

Extract thumbnail with regex:

```typescript
function extractThumbnail(contentEncoded?: string): string | null {
  if (!contentEncoded) return null
  const match = contentEncoded.match(/<img[^>]+src="([^"]+)"/i)
  return match ? match[1] : null
}
```

**Why regex, not HTML parser:** The `<content:encoded>` field is a short HTML fragment. A regex for the first `<img src>` is reliable and requires no additional dependency (KISS/YAGNI). Cheerio or DOMParser would add ~50KB for no practical benefit here.

**Why not OGP fetch:** Fetching `og:image` requires an HTTP request per article URL at render time. With 50 members × 7 days of articles, that is up to 350 additional HTTP requests per ISR cycle — too expensive. `content:encoded` regex requires zero additional requests.

---

## API Routes (Route Handlers)

New files for `/admin` management:

| Route | Method | Purpose |
|-------|--------|---------|
| `app/api/members/route.ts` | GET | Read all members from Upstash |
| `app/api/members/route.ts` | POST | Add a new member |
| `app/api/members/[substackId]/route.ts` | DELETE | Remove a member |

These are standard Next.js App Router Route Handlers. No additional library needed.

**ISR cache invalidation:** After POST/DELETE mutate Upstash, call `revalidateTag('feeds')` (already used in v1.0 `fetchAllFeedsCached`) to bust the ISR cache so the heatmap reflects the change on next load.

```typescript
import { revalidateTag } from 'next/cache'
// after mutating Upstash:
revalidateTag('feeds')
```

---

## Middleware Pattern (Basic Auth)

```typescript
// middleware.ts (project root, not inside src/app)
import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  const [scheme, encoded] = auth.split(' ')

  if (scheme === 'Basic' && encoded) {
    const decoded = atob(encoded)
    const [user, pass] = decoded.split(':')
    const validUser = process.env.ADMIN_USER ?? ''
    const validPass = process.env.ADMIN_PASSWORD ?? ''
    if (user === validUser && pass === validPass) {
      return NextResponse.next()
    }
  }

  return new NextResponse('Unauthorized', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Admin"' },
  })
}

export const config = {
  matcher: ['/admin/:path*', '/api/members/:path*'],
}
```

Protects both the admin UI and the mutation API routes. No external library needed.

**Security note:** Basic Auth over HTTPS (Vercel always uses HTTPS) is acceptable for a low-sensitivity internal admin tool. It is not suitable for user-facing authentication.

---

## Upstash Redis Setup

```bash
npm install @upstash/redis
```

Initialize in `src/lib/redis.ts`:

```typescript
import { Redis } from '@upstash/redis'

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})
```

Vercel integration path: Vercel Dashboard > Storage > Connect Store > Upstash Redis. This auto-injects `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` into the project environment.

---

## Vercel Free Tier Constraints

| Resource | Free Limit | v1.1 Usage | Status |
|----------|-----------|------------|--------|
| Upstash commands/month | 500K | <1K (admin writes are rare; reads only on ISR cycle) | Well within |
| Upstash storage | 256MB | ~5KB for 50 members | Well within |
| Vercel Serverless Function duration | 10s | Members API reads/writes are <1s | Well within |
| Vercel Edge Middleware | Unlimited requests | Basic auth check is stateless | Well within |

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| KV store | @upstash/redis | @vercel/kv | Deprecated Dec 2024. No longer available for new projects |
| KV store | @upstash/redis | Vercel Edge Config | Read-optimized, not designed for writes from admin UI |
| KV store | @upstash/redis | members.json in repo | Requires git commit + redeploy to change members — defeats the purpose of the admin UI |
| KV store | @upstash/redis | Vercel Postgres (Neon) | SQL is overkill for a flat list of 50 records |
| Basic Auth | Built-in middleware | next-basic-auth-middleware | Adds dependency for ~20 lines. YAGNI |
| Basic Auth | Built-in middleware | NextAuth.js / Clerk | OAuth/session-based auth is far more complex than needed for a single-admin tool |
| Thumbnail | content:encoded regex | OGP fetch per article | 350+ HTTP requests per ISR cycle — too expensive |
| Thumbnail | content:encoded regex | Substack API | No public API. RSS is the only supported access method |
| Thumbnail | content:encoded regex | media:thumbnail tag | rss-parser cannot read XML attributes — known unresolved bug (#130). Substack doesn't emit this tag anyway |

---

## Installation (New Packages Only)

```bash
# KV store
npm install @upstash/redis
```

No other new packages needed. `middleware.ts` uses only Next.js built-ins.

---

## Integration with Existing ISR/unstable_cache

The existing `fetchAllFeedsCached` in `src/lib/fetchFeed.ts` uses:

```typescript
unstable_cache(fn, ['all-feeds'], { revalidate: REVALIDATE_SECONDS, tags: ['feeds'] })
```

v1.1 changes:
1. Replace `members.json` import with Upstash `redis.get('members')` call inside the cached function
2. After admin POST/DELETE, call `revalidateTag('feeds')` to invalidate the cache

The ISR pattern remains unchanged. Member data flows through the same cache boundary.

---

## Confidence Assessment

| Decision | Confidence | Rationale |
|----------|------------|-----------|
| @upstash/redis over @vercel/kv | HIGH | @vercel/kv officially deprecated Dec 2024. Confirmed in Vercel docs, Context7 (vercel/storage), npm. Upstash is the stated replacement |
| Built-in middleware Basic Auth | HIGH | Native Next.js pattern. Multiple 2024 sources confirm. No external library needed |
| content:encoded regex for thumbnails | MEDIUM | rss-parser `media:thumbnail` confirmed broken (GitHub #130). content:encoded regex approach confirmed working by multiple sources. Specific Substack feed field availability tested anecdotally, not by direct inspection of a live feed |
| Single JSON array in Redis | MEDIUM | Correct for small data sets. Verified approach, though no authoritative source specifically endorses this for this exact schema |
| revalidateTag for ISR invalidation | HIGH | Documented Next.js App Router pattern, already used in v1.0 |

---

## Sources

- [Vercel KV Deprecated — Official Vercel Docs](https://vercel.com/docs/redis) — "Vercel KV is no longer available... automatically moved to Upstash Redis in December 2024"
- [vercel/storage README (Context7)](https://github.com/vercel/storage/blob/main/README.md) — "@vercel/kv are deprecated, and the associated products are no longer supported"
- [Upstash Redis Next.js App Router Quickstart](https://upstash.com/docs/redis/quickstarts/vercel-functions-app-router) — @upstash/redis setup
- [Upstash Redis Pricing (Free Tier)](https://upstash.com/docs/redis/overall/pricing) — 500K commands/month, 256MB, 1 free database
- [@upstash/redis on npm — version 1.37.0](https://www.npmjs.com/package/@upstash/redis)
- [Next.js Middleware Basic Auth — Medium (2024)](https://medium.com/@cloudapp_dev/next-js-14-app-router-middleware-http-basic-auth-bd0b2d613209)
- [next-basic-auth-middleware (labd/GitHub)](https://github.com/labd/nextjs-basic-auth-middleware) — reviewed, not recommended
- [rss-parser media:thumbnail issue #130](https://github.com/rbren/rss-parser/issues/130) — confirmed broken, unresolved
- [Substack RSS image extraction via content:encoded](https://www.osborndesign.works/guide/how-to-embed-a-substack-feed-on-any-website) — regex `/<img[^>]+src="([^"]+)"/i` pattern
