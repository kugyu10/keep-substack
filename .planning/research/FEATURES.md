# Feature Landscape — v1.1 Weekly Heatmap + Admin UI

**Domain:** RSS feed activity visualization — multi-member weekly heatmap + member management
**Researched:** 2026-05-08
**Milestone:** v1.1 (existing v1.0 features already built — this file covers NEW features only)

---

## Context: What Already Exists (v1.0)

Do NOT re-research or re-plan these:
- Monthly calendar UI per member with 6-level color density
- Hover+click ArticleTooltip (title + link)
- All-member MiniCalendar dashboard grid
- Individual member detail page `/member/[substackId]`
- ISR-based RSS feed fetching via `fetchAllFeedsCached`
- Member data in `members.json` (type: `{ name, feedUrl }`)

---

## Table Stakes

Features users expect in v1.1. Missing = product feels incomplete or broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| 7-day heatmap grid (rows=members, cols=days) | Core new UI — 50 members on one screen. Monthly cards don't scale. | Med | CSS Grid. Fixed 7 cols + 1 name col. Replaces top-page MiniCalendar grid |
| Sort by 7-day post count desc, then added_at asc | Must show most active members first for motivation. Tie-break is deterministic. | Low | Client-side sort on computed 7-day counts. `added_at` is new field on Member type |
| Member name links to `/member/[substackId]` | Navigation to detail page is already in v1.0; must preserve in new view | Low | Already exists as pattern in v1.0. `Link` component reuse |
| Cell tooltip: truncated title (20 chars) + click → article | Core interaction already expected from v1.0. Heatmap must match v1.0 quality | Med | Extend existing ArticleTooltip; add thumbnail; keep title truncation |
| Admin form: add member (name, feedUrl, team-id) | Must be able to add members without editing code/JSON | Med | POST to Route Handler. Form with 3 fields. Inline on `/admin` page. |
| Admin form: delete member | Must be able to remove members who leave community | Low | DELETE button per row in member list. Confirm before delete. |
| Basic Auth protection for `/admin` | Admin must not be accessible by random visitors | Low | Next.js middleware with `Authorization` header check. ENV: `ADMIN_USER`, `ADMIN_PASSWORD` |
| KV-backed member store | Members must persist across deployments without code changes | Med | Upstash Redis (replaces `@vercel/kv` — migrated Dec 2024). `kv.hset/hget/hdel` or JSON list |

## Differentiators

Not required, but add meaningful value at 50-user scale.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Team filter (segmented tabs or dropdown) | Communities with sub-groups want to see "my team" view | Low-Med | URL param `?team=team-id`. Tabs if <= 5 teams (visible), dropdown if more. |
| OGP thumbnail in tooltip | Visual richness: see article image at a glance. Motivates clicks. | Med | `fetch` OGP meta at feed-parse time or lazily. Fallback to icon/initials. 48x48px or 64x64px. |
| Empty state messaging | When a member has 0 posts in 7 days, a clear gray cell vs ambiguous blank | Low | Gray cell = 0 posts. No special message needed; color contrast handles it. |
| Admin: empty member list state | First-use UX — admin with no members should not look broken | Low | Simple "メンバーがいません。追加してください" message. |

## Anti-Features

Features to explicitly NOT build in v1.1.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Ranking display with positions (1st, 2nd...) | PROJECT.md explicitly rules this out — "コミュニティの「ゆるさ」を壊す" | Sort rows by activity without showing rank numbers |
| Real-time / live update admin | YAGNI. ISR revalidation covers freshness. Live polling adds complexity. | ISR revalidate after member CRUD |
| Multi-field inline edit for members | Complexity cost high vs benefit. Members rarely change name/URL. | Delete + re-add if needed |
| Auth beyond Basic Auth for admin | Admin is internal tool. Full OAuth/JWT is over-engineering for 1-admin use. | ENV-based Basic Auth via middleware |
| Thumbnail caching layer | At 50 members with 1-7 articles/week, fetch-on-demand or at parse time is fine. | Fetch OGP at RSS parse time; cache via ISR |
| `team-id` hierarchical nesting | YAGNI. Flat team-id strings are sufficient for filter use case. | Single `team-id` string field per member |
| Vercel KV (legacy) | Migrated to Upstash Redis in Dec 2024. Old `@vercel/kv` package is deprecated. | Use `@upstash/redis` or `@vercel/kv` adapter that wraps Upstash |

---

## Feature Details

### Weekly Heatmap Layout

```
[member name] | Mon | Tue | Wed | Thu | Fri | Sat | Sun
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Alice         |  ●  |  ○  |  ●  |  ○  |  ○  |  ●  |  ○
Bob           |  ○  |  ●  |  ○  |  ○  |  ●  |  ○  |  ●
...50 rows
```

- **Cell size:** Small enough for 50 rows without scrolling on laptop (target ~20-24px per cell).
- **Color scale:** Reuse existing 6-level green intensity from MiniCalendar (`bg-green-100` to `bg-green-700`). No articles = `bg-gray-100`.
- **Date header:** Show day-of-week label + date (e.g., "月 5/5"). Today column highlighted.
- **Name column width:** Fixed, `truncate` at 8-10 chars for mobile.

### Sort Logic: UX Implications

Sort: `7-day post count DESC`, then `added_at ASC` (tie-break = join order).

UX impact:
- Members with 0 posts naturally sink to bottom — motivates writing without explicit shaming.
- `added_at` tie-break gives long-time members slight priority, rewarding tenure.
- Sort is computed client-side on pre-fetched data — no additional API calls.
- No live re-sort animation needed (ISR data, not real-time).

Dependency: `Member` type must be extended from `{ name, feedUrl }` to `{ name, feedUrl, substackId, teamId, addedAt }`.

### Team Filter UX

**Recommendation: segmented tabs (not dropdown) when teams <= 6, dropdown when > 6.**

Rationale from research: tabs are better when options are few and need to be immediately visible. Dropdown is space-efficient for longer lists. For this community (sub-groups within ~50 people), expect 2-5 teams — tabs are the right choice.

URL param pattern: `?team=teamId` — enables link-sharing of filtered views (important for team-specific channels like Slack/Discord).

"All" tab always shown first. No team-id (i.e., members without team) shown under "All" only, or a configurable "その他" group.

### Rich Tooltip: Thumbnail + Title

Current ArticleTooltip shows title + link (text only). v1.1 adds:
- **Thumbnail:** OGP image from article URL. Fetched at RSS parse time via `fetch(articleUrl)` → parse `<meta property="og:image">`. Store as `thumbnail?: string` in `FeedItem`.
- **Size:** 64x64px (`w-16 h-16`) with `object-cover`. Compact enough for the heatmap cell hover.
- **Fallback:** No OGP image → show first letter of member name in colored box (same initials pattern as avatars). Avoids broken image state.
- **Title truncation:** `title.slice(0, 20)` + `…` if longer. Already specified in PROJECT.md.
- **Click behavior:** Click cell toggles tooltip (existing behavior). Click article link navigates to Substack (existing behavior). No change to interaction model.

**Complexity note:** OGP fetch adds latency at RSS parse time. At 50 members × 7 articles = 350 fetches per ISR cycle. At 300s revalidate, this is acceptable on Vercel free tier but should be fire-and-forget with graceful fallback (not blocking render).

### Admin UI

**Layout:** Single page `/admin`. Two sections:
1. Member list (table: name, substackId, team-id, addedAt, delete button)
2. Add member form (below or alongside list)

**Form fields:**
- `name` — text input, required
- `feedUrl` — URL input, required, validate Substack RSS pattern (`https://*.substack.com/feed`)
- `teamId` — text input, optional

**Form UX pattern:** Inline form (not modal). Rationale: admin page is internal, not customer-facing; modal adds unnecessary JS complexity. Inline form is simpler and KISS-compliant.

**Validation feedback:**
- Client-side: HTML5 `required` + `type="url"` for instant feedback.
- Server-side: Route Handler returns error JSON on invalid input. Display error message below form.
- No complex validation library needed — Zod inline in Route Handler is sufficient.

**Delete confirmation:** Confirm via `window.confirm()` before DELETE request. Simple and avoids accidental deletion. No need for a modal confirmation UI at this scale.

**Empty state:** When no members exist, show "メンバーがまだ登録されていません" in the member list area.

### Basic Auth (middleware)

```
middleware.ts matches /admin/**
→ Check Authorization header (Basic base64(user:password))
→ If missing/wrong: return 401 with WWW-Authenticate header
→ Env vars: ADMIN_USER, ADMIN_PASSWORD
```

This triggers the browser's native Basic Auth dialog — no custom login page needed. Simple, zero-dependency, secure for single-admin use.

**Limitation:** Basic Auth over HTTPS is secure, but credentials are sent with every request. Acceptable for internal admin tool; not for multi-user auth.

---

## Feature Dependencies

```
Member type extension (name, feedUrl, substackId, teamId, addedAt)
  → Vercel KV / Upstash Redis store
  → Admin CRUD Route Handlers
  → Admin UI form + member list

7-day window computation (date math: today - 6 days)
  → HeatmapGrid component (new, replaces top-page MiniCalendar grid)
  → Sort logic (7-day count DESC + addedAt ASC)
  → Team filter (filter rows before sort)

OGP fetch at parse time
  → FeedItem type extension (thumbnail?: string)
  → fetchFeed.ts update (parallel OGP fetch per item)
  → RichTooltip component (new, extends ArticleTooltip)

Basic Auth middleware
  → /admin page (protected route)
  → Admin API routes (POST /api/members, DELETE /api/members/[id])
```

---

## Complexity Summary by Feature

| Feature | Complexity | Primary Risk |
|---------|------------|--------------|
| 7-day heatmap grid layout | Medium | 50-row layout fitting on screen without horizontal scroll on mobile |
| Sort logic | Low | None — pure data transform |
| Team filter tabs/dropdown | Low-Med | URL param sync with React state; ensure filter persists on refresh |
| OGP thumbnail fetch | Medium | Latency per ISR cycle; Substack may block headless fetches (fallback required) |
| Rich tooltip | Low | Extends existing component; thumbnail sizing and fallback |
| Admin member list + delete | Low | Confirm UX; KV delete operation |
| Admin add member form | Medium | URL validation; KV write; ISR revalidation after write |
| Basic Auth middleware | Low | ENV var setup; redirect loop pitfall (exclude /login from matcher) |
| Upstash Redis / KV store | Medium | Schema design for member list; `@vercel/kv` to Upstash migration path |

---

## Dependencies on Existing Architecture

| Existing Piece | v1.1 Change Required |
|----------------|---------------------|
| `Member` type in `types.ts` | Extend: add `substackId`, `teamId`, `addedAt` fields |
| `members.json` | Replace with Upstash Redis KV store. Seed from existing JSON for migration. |
| `fetchAllFeedsCached` | Add OGP fetch per item; update cache key if member list is dynamic |
| `MiniCalendar` component | Keep as-is for `/member/[substackId]` page. NOT used on new top page. |
| `ArticleTooltip` component | Extend or fork to `RichTooltip` for heatmap cells (adds thumbnail) |
| Top page `page.tsx` | Replace MiniCalendar grid with HeatmapGrid. Large rewrite of this file. |
| `calendarUtils.ts` | Add 7-day window helper: `getLast7Days(): string[]` |

---

## Sources

- [PROJECT.md]: v1.1 requirements, constraints, out-of-scope decisions
- [Filter UX Design Patterns](https://blog.logrocket.com/ux-design/filtering-ux-ui-design-patterns-best-practices/) — tabs vs dropdown criteria
- [Why Segmented Buttons Are Better Filters Than Dropdowns](https://uxmovement.com/buttons/why-segmented-buttons-are-better-filters-than-dropdowns/) — tabs for small option sets
- [Vercel KV → Upstash Redis migration](https://vercel.com/docs/storage/vercel-kv) — `@vercel/kv` deprecated Dec 2024
- [Inline Edit UX Pattern](https://cloudscape.design/patterns/resource-management/edit/inline-edit/) — inline vs modal for admin tables
- [Next.js Middleware Authentication](https://www.authgear.com/post/nextjs-middleware-authentication/) — Basic Auth middleware pattern
- Existing codebase: `ArticleTooltip.tsx`, `CalendarGrid.tsx`, `MiniCalendar.tsx`, `types.ts`, `fetchFeed.ts`
