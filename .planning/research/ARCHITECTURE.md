# Architecture Patterns

**Domain:** RSS feed activity visualization calendar app
**Researched:** 2026-05-08

## Recommended Architecture

Server-side RSS fetching with ISR caching. No database. No client-side data fetching.

```
[JSON Config] -> [Server Component] -> [rss-parser] -> [Data Transform] -> [Calendar UI]
                       |
                  ISR Cache (revalidate=300s)
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `config/members.json` | Member names and Substack feed URLs | Read by data fetching layer |
| `lib/feed.ts` | Fetch and parse RSS feeds via rss-parser | Called by Server Components |
| `lib/calendar.ts` | Transform feed items into calendar data structure | Called by Server Components |
| `app/page.tsx` | Dashboard: all members overview | Renders MemberCalendar components |
| `app/member/[slug]/page.tsx` | Individual member detail view | Renders detailed calendar |
| `components/Calendar.tsx` | Monthly calendar grid (Server Component) | Receives parsed data as props |
| `components/DayCell.tsx` | Single day cell with highlight and tooltip (Client Component) | Receives day data as props |

### Data Flow

```
1. Request arrives at page
2. ISR checks: cached version fresh? -> YES: serve cached HTML
                                      -> NO: continue to step 3
3. Read members.json for feed URLs
4. Fetch all RSS feeds in parallel (Promise.all)
5. Parse each feed with rss-parser
6. Transform to calendar data: { [date]: Article[] } per member
7. Render Server Components with data
8. Cache the rendered page for revalidate seconds
9. Serve HTML to client
```

## Patterns to Follow

### Pattern 1: Server Components for Data Fetching
**What:** Fetch RSS data in Server Components, not in Client Components or API routes
**When:** Always. This is the primary data flow
**Why:** No client-side fetch waterfall. Data is fetched once at ISR time. No exposed API endpoints.
**Example:**
```typescript
// app/page.tsx (Server Component)
import { getAllMemberFeeds } from '@/lib/feed';

export const revalidate = 300; // ISR: 5 minutes

export default async function DashboardPage() {
  const members = await getAllMemberFeeds();
  return <Dashboard members={members} />;
}
```

### Pattern 2: Parallel Feed Fetching
**What:** Fetch all RSS feeds concurrently with Promise.allSettled
**When:** Dashboard page loads
**Why:** 50 sequential fetches would be slow. allSettled (not all) handles individual feed failures gracefully.
**Example:**
```typescript
// lib/feed.ts
export async function getAllMemberFeeds(): Promise<MemberFeed[]> {
  const members = getMembersConfig();
  const results = await Promise.allSettled(
    members.map(m => fetchFeed(m.feedUrl))
  );
  return results.map((result, i) => ({
    member: members[i],
    items: result.status === 'fulfilled' ? result.items : [],
    error: result.status === 'rejected' ? result.reason : null,
  }));
}
```

### Pattern 3: Data Transform Layer
**What:** Separate RSS parsing from calendar data structure creation
**When:** Between feed fetching and UI rendering
**Why:** Calendar grid needs data indexed by date. RSS items are sorted by publish date. Separate transformation keeps each layer simple (KISS).
**Example:**
```typescript
// lib/calendar.ts
export function toCalendarData(items: FeedItem[]): Map<string, Article[]> {
  const map = new Map<string, Article[]>();
  for (const item of items) {
    const dateKey = format(new Date(item.pubDate), 'yyyy-MM-dd');
    const existing = map.get(dateKey) || [];
    map.set(dateKey, [...existing, { title: item.title, link: item.link }]);
  }
  return map;
}
```

### Pattern 4: Minimal Client Components
**What:** Only use Client Components for interactive elements (tooltip hover, month navigation)
**When:** A component needs browser events (hover, click state)
**Why:** Server Components are default in App Router. Client Components increase bundle size. Keep the boundary small.

## Anti-Patterns to Avoid

### Anti-Pattern 1: API Routes for RSS Fetching
**What:** Creating `/api/feeds` endpoints to fetch RSS data
**Why bad:** Unnecessary indirection. Server Components can fetch directly. API routes add latency (extra hop) and complexity.
**Instead:** Fetch in Server Components via lib functions.

### Anti-Pattern 2: Client-Side RSS Fetching
**What:** Using useEffect or SWR to fetch RSS feeds from the browser
**Why bad:** CORS issues with Substack feeds. Exposes feed URLs. Every user triggers fetches. Bad for performance.
**Instead:** Server-side fetching with ISR caching.

### Anti-Pattern 3: Database for Feed Cache
**What:** Storing parsed RSS data in a database (e.g., SQLite, Postgres)
**Why bad:** At 50 feeds scale, ISR caching is sufficient. Database adds deployment complexity, maintenance burden, and cost for zero benefit.
**Instead:** ISR cache handles data freshness. RSS feeds are the source of truth.

### Anti-Pattern 4: Over-Engineering Calendar Component
**What:** Using a full calendar library (react-big-calendar, fullcalendar.js)
**Why bad:** These libraries are for event scheduling/editing. This project only needs read-only display. They add 50-200KB+ to bundle.
**Instead:** Build a simple 7-column CSS grid. date-fns provides the math. Tailwind provides the styling.

## Scalability Considerations

| Concern | At 10 members | At 50 members | At 200+ members |
|---------|--------------|--------------|-------------|
| RSS fetch time | <1s parallel | 2-5s parallel | Consider batching, longer revalidate, or background job |
| Page render size | Small | Medium (50 mini-calendars) | Pagination or virtual scrolling needed |
| ISR cache | No issue | No issue | May need per-member page caching strategy |
| Vercel free tier | Well within limits | Within limits | May hit function execution time limits |

**Current target: 50 members. Architecture is designed for this scale. Do not pre-optimize for 200+.**

## Directory Structure

```
src/
  app/
    page.tsx                    # Dashboard (all members)
    member/
      [slug]/
        page.tsx                # Individual member view
    layout.tsx                  # Root layout with header/nav
    globals.css                 # Tailwind imports
  components/
    Dashboard.tsx               # Members grid layout
    MemberCard.tsx              # Single member summary card
    Calendar.tsx                # Monthly calendar grid
    DayCell.tsx                 # Single day cell (client component for hover)
  lib/
    feed.ts                     # RSS fetching and parsing
    calendar.ts                 # Date-to-article data transformation
    config.ts                   # Read members.json config
    types.ts                    # Shared TypeScript types
  config/
    members.json                # Member names and feed URLs
```

## Sources

- [Next.js ISR docs (Context7)](https://github.com/vercel/next.js/blob/canary/docs/01-app/02-guides/incremental-static-regeneration.mdx) -- ISR pattern with `export const revalidate`
- [Next.js App Router data fetching](https://nextjs.org/docs/app/building-your-application/data-fetching) -- Server Component fetching pattern
- PROJECT.md -- Scale constraints (50 feeds, Vercel free tier)
