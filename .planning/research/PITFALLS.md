# Domain Pitfalls

**Domain:** RSS feed activity visualization calendar app — v1.1 additions to existing static site
**Researched:** 2026-05-08
**Scope:** Adding Vercel KV (Upstash Redis), Basic Auth middleware, OGP thumbnail fetching, admin CRUD to an existing Next.js 16 App Router fully-static ISR app.

---

## Critical Pitfalls

Mistakes that cause rewrites, security holes, or complete feature failures.

---

### Pitfall V1: @vercel/kv is Deprecated — Use @upstash/redis Directly

**What goes wrong:** Developer installs `@vercel/kv` as if it is the current recommended package. Vercel KV was sunset in December 2024; existing stores were automatically migrated to Upstash Redis. New projects cannot create Vercel KV stores — only Upstash for Redis via the Vercel Marketplace.

**Why it happens:** Tutorials, blog posts, and even some Vercel docs still reference `@vercel/kv`. The package still exists on npm and the API appears to work, creating a false sense of safety.

**Consequences:** Blocked on provisioning a new store. Vendor dependency on a dead product. CI/CD breaks when Vercel removes the shim.

**Prevention:**
- Install `@upstash/redis` instead of `@vercel/kv`.
- Provision via Vercel Marketplace → Upstash for Redis integration.
- Environment variables become `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (not `KV_REST_API_URL`).
- Create a singleton client: `const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })`.

**Detection:** `vercel env pull` produces `KV_REST_API_URL` — this means you are on the old path. New Upstash integration produces `UPSTASH_REDIS_REST_URL`.

**Phase:** Must resolve before any KV work begins (Phase 1 / KV migration phase).

**Confidence:** HIGH — Verified via Vercel community forum and Vercel Marketplace docs.

---

### Pitfall V2: generateStaticParams + KV at Build Time Fails Silently

**What goes wrong:** `generateStaticParams` for `/member/[substackId]` currently reads from `members.json` at build time. After migrating to KV, the function must call `redis.get()` or `redis.lrange()` at build time. If environment variables are not set in Vercel's build environment, the call returns `null` and `generateStaticParams` returns an empty array — resulting in zero static pages being generated with no build error thrown.

**Why it happens:** `generateStaticParams` runs before any layout/page rendering. KV calls require `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to be available in the build environment, not just the runtime environment. Vercel distinguishes between "Build" and "Runtime" environment variable scopes in project settings.

**Consequences:** Build succeeds (no errors). All `/member/[substackId]` routes return 404 in production. With `dynamicParams = false`, there is no fallback.

**Prevention:**
- In Vercel Project Settings → Environment Variables, set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` for the **Build** environment scope (not just Production/Preview/Development).
- Add a guard in `generateStaticParams`: if KV returns empty, fall back to a hardcoded default list or throw explicitly so the build fails loudly.
- Test with `next build` locally using `.env.local` before deploying.

**Detection:** Deploy succeeds, but `/member/` routes return 404. Build logs show `generateStaticParams returned []`.

**Phase:** KV migration phase — verify before removing `members.json`.

**Confidence:** HIGH — Verified by Next.js generateStaticParams documentation and community discussion (vercel/next.js #49328).

---

### Pitfall V3: CVE-2025-29927 — Middleware Auth Bypass in Next.js < 15.2.3

**What goes wrong:** Next.js middleware (including Basic Auth middleware protecting `/admin`) can be completely bypassed by sending a crafted `x-middleware-subrequest` header. An attacker accesses `/admin` without credentials.

**Why it happens:** A flaw in the middleware invocation chain (CVSS 9.1, critical). Patched in Next.js 12.3.5 / 13.5.9 / 14.2.25 / 15.2.3. The current project uses **Next.js 16.2.6** which is a post-patch release — the vulnerability is already fixed.

**Consequences:** Full admin bypass if running a vulnerable version. Not directly applicable to v16.2.6, but relevant if the version is ever downgraded, or if self-hosting behind a proxy that strips headers differently.

**Prevention:**
- Confirm running Next.js 16.2.6 (already installed — safe).
- Do NOT downgrade to < 15.2.3 for any reason.
- Add a secondary check: validate the `Authorization` header in the admin route's Server Component as defense-in-depth (do not rely solely on middleware).

**Detection:** `npm list next` should show 16.2.6. Check Vercel deployment logs for Next.js version.

**Phase:** Basic Auth implementation phase — document this and add the secondary check.

**Confidence:** HIGH — NVD CVE record, Vercel postmortem, ProjectDiscovery analysis verified.

---

### Pitfall V4: Middleware Matcher Misconfiguration Breaks Static Assets

**What goes wrong:** Adding `middleware.ts` without a proper `matcher` causes middleware to run on every request: `/_next/static/*`, `/_next/image`, `favicon.ico`, all CSS, all JS chunks. Basic Auth challenges fire on CSS files, returning 401 HTML responses where the browser expects CSS. The site appears visually broken with a blank page after login.

**Why it happens:** Next.js middleware runs on every request by default. Developers test by loading the page, confirm the auth challenge appears, and miss that static asset requests are also being intercepted.

**Consequences:** After successful Basic Auth login, the page loads with broken styles and no JS because the browser cached 401 responses for asset requests.

**Prevention:** Use a tight matcher that only triggers on admin routes:

```typescript
export const config = {
  matcher: ['/admin', '/admin/:path*'],
}
```

Never use `/:path*` without explicit exclusions. The minimal matcher for admin-only protection is the safest approach.

**Detection:** Open browser DevTools → Network. After auth, CSS/JS requests show 401 or 200 with HTML bodies.

**Phase:** Basic Auth implementation phase.

**Confidence:** HIGH — Next.js middleware documentation, GitHub discussion #36308.

---

### Pitfall V5: Removing force-static Causes Full Route Dynamic Rendering

**What goes wrong:** The current `page.tsx` and `member/[substackId]/page.tsx` use `export const dynamic = 'force-static'`. When admin API routes or KV reads are added to the same route segments (or when middleware is introduced), developers sometimes remove `force-static` assuming dynamic rendering is now needed everywhere. This silently converts ISR pages to SSR — every user request triggers fresh RSS fetching, destroying the caching benefit and potentially hitting Vercel function limits.

**Why it happens:** The relationship between `force-static`, `unstable_cache`, and middleware is not obvious. Middleware does not affect the rendering mode of pages it passes through — pages remain static unless their own segment opts out.

**Consequences:** RSS feeds fetched on every request. 50 feeds × 300ms = 15s per request. Vercel free tier function timeout is 10s — pages time out.

**Prevention:**
- Keep `export const dynamic = 'force-static'` on public pages (`/`, `/member/[substackId]`).
- Only the `/admin` route and API routes should be dynamic (no `force-static`).
- Middleware running on `/admin` does NOT affect the `/` or `/member` routes.

**Phase:** KV migration phase and Basic Auth phase — check that public pages retain `force-static` after each change.

**Confidence:** HIGH — Next.js ISR documentation, confirmed in current codebase behavior.

---

## Moderate Pitfalls

---

### Pitfall V6: unstable_cache Tags Not Invalidated After KV Writes

**What goes wrong:** After an admin adds or removes a member via the CRUD UI, the KV store is updated but the public page still shows the old member list. `unstable_cache` with tag `'feeds'` is not invalidated because the admin API route does not call `revalidateTag('feeds')`.

**Why it happens:** `unstable_cache` caches the result of `fetchAllFeedsCached`. Writing to KV does not automatically invalidate this cache. The two systems are decoupled.

**Consequences:** Admin adds a member, reloads the public page, sees no change for up to `REVALIDATE_SECONDS` (currently 300s).

**Prevention:** In each admin API route handler (add member, delete member), call `revalidateTag('feeds')` immediately after the KV write succeeds. This triggers ISR revalidation on the next request.

```typescript
import { revalidateTag } from 'next/cache'
// After successful kv write:
revalidateTag('feeds')
```

**Phase:** Admin CRUD phase.

**Confidence:** HIGH — Next.js `revalidateTag` documentation.

---

### Pitfall V7: Upstash Free Tier — 500K Commands/Month is Consumed by Tooltip OGP Fetching

**What goes wrong:** OGP thumbnail URLs for articles are fetched and cached in Upstash Redis as a performance optimization. With 50 members × 7 days × multiple daily visitors, cache reads accumulate rapidly. Each tooltip hover triggers a KV read if not cached at the component level.

**Why it happens:** Upstash free tier limit is 500K commands/month (updated March 2025). Each `redis.get()` call counts as one command. If thumbnails are fetched per-request rather than cached in `unstable_cache`, commands multiply with traffic.

**Consequences:** KV commands exhausted mid-month. All KV reads return errors. Admin UI breaks (cannot load member list). Public site degrades if member list is also stored in KV.

**Prevention:**
- Cache OGP thumbnail URLs in `unstable_cache` (not in Upstash directly) with a long TTL (e.g., 24 hours). Upstash is the source of truth for member data only.
- Do NOT store per-article thumbnail data in Upstash — store it in Next.js data cache via `unstable_cache` with `fetch`.
- Monitor Upstash dashboard for command count after launch.

**Phase:** OGP thumbnail fetching phase.

**Confidence:** MEDIUM — Upstash pricing docs verified; command count projection is estimated.

---

### Pitfall V8: OGP Fetch from Substack — og:image May Not Exist

**What goes wrong:** Not all Substack articles have an `og:image` tag. Free-tier Substack newsletters, older articles, or articles with text-only content often have no cover image. A missing `og:image` causes the thumbnail to be `undefined`, and rendering `<img src={undefined}>` produces a broken image icon in the tooltip.

**Why it happens:** OGP is not mandatory — authors choose whether to upload a cover image. Substack sets `og:image` only when a cover image is explicitly set.

**Consequences:** Broken image icons in all tooltips for members who do not use cover images.

**Prevention:**
- Always provide a fallback: `thumbnailUrl ?? '/placeholder-article.png'`.
- Use a static local placeholder image rather than an external default URL (avoids another fetch).
- When fetching OGP, check `response.ok` and gracefully return `{ title: item.title, thumbnailUrl: null }` on failure.

**Phase:** OGP thumbnail fetching phase.

**Confidence:** HIGH — Substack support docs confirmed that og:image is optional; rss-parser issues confirm media:thumbnail is unreliable.

---

### Pitfall V9: OGP Fetch Performance — Blocking Tooltip Render

**What goes wrong:** Fetching OGP data (HTML scrape of each article URL) at tooltip hover time introduces 200–800ms latency. The tooltip appears blank until the fetch resolves, then jumps in size when the thumbnail appears. On slow connections, users see no tooltip at all.

**Why it happens:** Substack article pages are full HTML documents. Fetching them client-side for OGP parsing is slow and blocked by CORS. Fetching server-side via a Route Handler adds a round trip.

**Prevention (two-tier strategy):**
1. **RSS feed item fields first:** `rss-parser` with custom fields can extract `media:content`, `media:thumbnail`, and `enclosure` from Substack RSS items. These are available in the already-cached feed data — zero additional fetches. Use these fields as the primary thumbnail source.
2. **HTML OGP fallback only when RSS fields are absent.** Cache the result in `unstable_cache` with a tag so it survives ISR cycles.
3. Never fetch OGP synchronously on hover. Pre-fetch during ISR page generation.

**Detection:** Tooltip flicker or blank tooltips in production. Network tab showing 200–800ms requests on hover.

**Phase:** OGP thumbnail fetching phase — strategy must be decided before implementation.

**Confidence:** MEDIUM — Based on rss-parser GitHub issues (#130) and general OGP scraping behavior.

---

### Pitfall V10: members.json → KV Migration — ISR Cache Serves Stale Member List

**What goes wrong:** After deploying the KV migration, the `unstable_cache` for `'all-feeds'` still has a cached result based on the old `members.json` data (or the first KV read). If a member is added to KV but the cache has not expired, the new member does not appear on the public page.

**Why it happens:** `unstable_cache` caches the entire result of `fetchAllFeedsCached`. The cache key is `['all-feeds']`. Simply writing to KV does not invalidate this cache.

**Consequences:** During the migration deploy, the public site shows the old member list for up to 300 seconds. More importantly, during initial KV setup if `generateStaticParams` returns fewer members than before (because KV is empty), old member routes return 404.

**Prevention:**
1. Seed KV with all current `members.json` data before removing `members.json` from the codebase.
2. Verify KV data is correct by reading it back before deploying the removed-JSON version.
3. After KV migration deploy, manually trigger `revalidateTag('feeds')` via a one-time admin action.
4. Keep `members.json` as a read-only backup for one deploy cycle.

**Phase:** KV migration phase — this is the migration sequence, not just a code change.

**Confidence:** HIGH — Next.js `unstable_cache` documentation, current codebase structure confirmed.

---

### Pitfall V11: Basic Auth Credentials in URL (Browser Behavior)

**What goes wrong:** Some developers implement Basic Auth at the middleware level and then bookmark or share the admin URL as `https://user:pass@keep-substack.vercel.app/admin`. Modern browsers (Chrome 59+, Firefox) block inline credentials in URLs for security reasons and strip them silently. The admin page appears but shows an auth challenge.

**Why it happens:** RFC 3986 allows credentials in URLs, but browser vendors deprecated this. Vercel's CDN may also strip `Authorization` headers before they reach the origin.

**Prevention:**
- Implement the admin auth check in middleware using the `Authorization` header (standard `WWW-Authenticate: Basic` challenge). This works correctly.
- Do NOT rely on URL-embedded credentials.
- Test auth flow in incognito mode to verify the browser challenge dialog appears correctly.

**Phase:** Basic Auth implementation phase.

**Confidence:** MEDIUM — Browser compatibility knowledge; Vercel header handling is inferred.

---

## Minor Pitfalls

---

### Pitfall V12: Upstash Redis Key Naming — No Namespace Collision Guard

**What goes wrong:** Using bare key names like `"members"` or `"admin"` in Upstash Redis. If the same Upstash database is shared with other projects (unlikely but possible), keys collide. More practically, during development if you accidentally write test data to the same key, it overwrites production data.

**Prevention:** Use a consistent prefix: `kv:members` for the member list, `kv:ogp:{substackId}:{articleSlug}` for OGP cache (if stored in KV at all). Document key schema in a comment near the KV client initialization.

**Phase:** KV migration phase.

**Confidence:** MEDIUM — Standard Redis operational practice.

---

### Pitfall V13: Next.js next/image for External OGP Thumbnails Requires Domain Allowlist

**What goes wrong:** Using `<Image>` from `next/image` to display Substack article thumbnails (hosted on `substackcdn.com` or `substack-post-media.s3.amazonaws.com`) fails with a runtime error: "hostname not configured under images in your next.config.js".

**Why it happens:** `next/image` requires explicit domain or pattern allowlisting for external URLs to prevent SSRF.

**Prevention:** Add to `next.config.ts`:
```typescript
images: {
  remotePatterns: [
    { protocol: 'https', hostname: '**.substackcdn.com' },
    { protocol: 'https', hostname: 'substack-post-media.s3.amazonaws.com' },
  ],
},
```
Or use a plain `<img>` tag if image optimization is not needed for tooltip thumbnails (simpler, avoids the config).

**Phase:** OGP thumbnail fetching phase.

**Confidence:** HIGH — Next.js Image documentation.

---

### Pitfall V14: rss-parser media:thumbnail Custom Fields Not Configured

**What goes wrong:** Substack RSS feeds include article cover images as `<media:thumbnail>` or `<media:content>` elements. By default, `rss-parser` does not parse these fields — they appear as `undefined` on feed items. This forces unnecessary OGP scraping when the data is already in the feed.

**Why it happens:** `rss-parser` only parses a subset of RSS/Atom fields by default. Custom namespace fields require explicit configuration.

**Prevention:** Configure `rss-parser` with custom fields:
```typescript
const parser = new Parser({
  timeout: 5000,
  customFields: {
    item: [
      ['media:thumbnail', 'mediaThumbnail', { keepArray: false }],
      ['media:content', 'mediaContent', { keepArray: false }],
      ['enclosure', 'enclosure'],
    ],
  },
})
```
Check `item.mediaThumbnail?.$.url` or `item.enclosure?.url` before falling back to OGP scraping. This eliminates most OGP fetches since Substack includes media fields.

**Phase:** OGP thumbnail fetching phase — configure this first before building OGP fallback.

**Confidence:** MEDIUM — rss-parser GitHub issue #130 confirms the pattern; Substack-specific field availability is inferred.

---

## Pre-existing Pitfalls (v1.0 — still relevant)

The following pitfalls from v1.0 remain relevant in v1.1:

| Pitfall | Still Relevant | v1.1 Note |
|---------|----------------|-----------|
| rss-parser fetch timeout (Pitfall 1) | YES | Now also relevant for OGP fetches — apply same AbortController pattern |
| ISR stale content (Pitfall 2) | YES | Admin writes must trigger `revalidateTag` or users see stale data |
| Client Component creep (Pitfall 3) | YES | Heatmap grid + tooltips risk making entire view client-side |
| RSS feed URL differences (Pitfall 4) | YES | members.json → KV migration must normalize URLs at write time |
| Vercel function limits (Pitfall 8) | YES | Now applies to admin API routes and OGP fetch routes |
| Config change workflow (Pitfall 9) | RESOLVED | KV replaces the deploy-to-update pattern |

---

## Phase-Specific Warnings

| Phase Topic | Critical Pitfall | Mitigation |
|-------------|-----------------|------------|
| Package setup | V1: @vercel/kv deprecated | Use @upstash/redis from the start |
| KV migration | V2: generateStaticParams env scope | Set Build env vars in Vercel dashboard |
| KV migration | V10: stale ISR cache during migration | Seed KV first, verify, then redeploy |
| KV migration | V12: key naming | Use `kv:` prefix for all keys |
| Basic Auth setup | V4: matcher too broad | matcher: ['/admin', '/admin/:path*'] only |
| Basic Auth setup | V3: CVE-2025-29927 | Confirm Next.js 16.2.6, add secondary check |
| Basic Auth setup | V11: URL-embedded credentials | Use Authorization header challenge |
| OGP thumbnails | V14: rss-parser custom fields | Configure media:thumbnail before building OGP scraper |
| OGP thumbnails | V8: missing og:image | Always provide local fallback placeholder |
| OGP thumbnails | V9: blocking render | Pre-fetch in ISR, never on hover |
| OGP thumbnails | V13: next/image domain | Add substackcdn.com to remotePatterns |
| Admin CRUD | V6: cache not invalidated | Call revalidateTag('feeds') after every KV write |
| Admin CRUD | V5: force-static removed accidentally | Public pages retain force-static; only /admin is dynamic |
| All KV usage | V7: Upstash command budget | Cache OGP in unstable_cache, not Upstash; member list only in KV |

---

## Sources

- [Vercel Community: Switching from Vercel KV to Upstash KV](https://community.vercel.com/t/switching-from-vercel-kv-to-upstash-kv-questions/2660) — migration details, env var changes
- [Upstash Redis Pricing](https://upstash.com/docs/redis/overall/pricing) — 500K commands/month free tier (updated March 2025)
- [Vercel Redis docs](https://vercel.com/docs/redis) — Upstash as recommended KV on Vercel
- [Next.js generateStaticParams documentation](https://nextjs.org/docs/app/api-reference/functions/generate-static-params) — build-time execution behavior
- [vercel/next.js Discussion #49328](https://github.com/vercel/next.js/discussions/49328) — KV access from generateStaticParams
- [CVE-2025-29927 — NVD](https://nvd.nist.gov/vuln/detail/CVE-2025-29927) — middleware bypass vulnerability details
- [Vercel Postmortem on Next.js Middleware Bypass](https://vercel.com/blog/postmortem-on-next-js-middleware-bypass) — affected versions
- [GitHub Discussion #36308 — middleware on /public](https://github.com/vercel/next.js/discussions/36308) — static asset middleware issue
- [Next.js Middleware documentation](https://nextjs.org/docs/app/building-your-application/routing/middleware) — matcher configuration
- [Next.js unstable_cache documentation](https://nextjs.org/docs/app/api-reference/functions/unstable_cache) — cache tags and revalidation
- [rss-parser GitHub issue #130](https://github.com/rbren/rss-parser/issues/130) — media:thumbnail access
- [Next.js Image remotePatterns](https://nextjs.org/docs/app/api-reference/components/image#remotepatterns) — external image configuration
- PROJECT.md — current system constraints and architecture decisions
