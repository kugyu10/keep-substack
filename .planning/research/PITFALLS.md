# Domain Pitfalls

**Domain:** RSS feed activity visualization calendar app
**Researched:** 2026-05-08

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: rss-parser Fetch Timeout on Multiple Feeds
**What goes wrong:** rss-parser has no default timeout. A single unresponsive Substack feed blocks the entire page render during ISR.
**Why it happens:** Promise.all rejects on first failure. Or with allSettled, one slow feed delays all others.
**Consequences:** ISR regeneration times out (Vercel serverless function limit: 10s on free tier). Users see stale page indefinitely.
**Prevention:** Set a per-feed timeout (e.g., 5s) using AbortController with fetch. Use Promise.allSettled instead of Promise.all so one failure does not block others.
**Detection:** ISR pages not updating. Vercel function logs showing timeouts.

### Pitfall 2: Treating ISR revalidate as "Guaranteed Freshness"
**What goes wrong:** Developers assume `revalidate = 300` means data is always less than 5 minutes old. In reality, ISR serves stale content while revalidating in background. First visitor after expiry gets stale page.
**Why it happens:** Misunderstanding of stale-while-revalidate pattern.
**Consequences:** Users complain "I just published but it is not showing." This is especially problematic given PROJECT.md notes users want quick reflection of published articles.
**Prevention:** Document this behavior for community members. Set revalidate to a short value (e.g., 60s) in development, 300s in production. Add a "last updated" timestamp on the page.
**Detection:** User reports of missing recent articles.

### Pitfall 3: Client Component Creep
**What goes wrong:** Marking too many components as 'use client' because they seem interactive.
**Why it happens:** Calendar cells need hover events -> developer makes the entire Calendar a Client Component -> all child components become client too -> large bundle, no SSR benefit.
**Consequences:** Increased JavaScript bundle size. Slower initial page load. Defeats the purpose of Server Components + ISR.
**Prevention:** Only the leaf DayCell component (with hover tooltip) should be 'use client'. Calendar grid layout, data fetching, and data transformation stay as Server Components.
**Detection:** Large client-side bundle in Next.js build output.

## Moderate Pitfalls

### Pitfall 4: RSS Feed URL Format Differences
**What goes wrong:** Substack feeds may have slightly different URL patterns. Some users may provide the blog URL instead of the RSS feed URL.
**Prevention:** Normalize URLs in config. Substack RSS is always at `https://{subdomain}.substack.com/feed`. Validate URLs at config read time, not at fetch time.

### Pitfall 5: Calendar Grid Off-by-One Errors
**What goes wrong:** Calendar first day of month does not align with correct weekday. Timezone differences cause articles to appear on wrong dates.
**Prevention:** Use date-fns consistently for all date math. Normalize all dates to UTC or a single timezone. Test with edge cases: month starting on Sunday, month starting on Saturday, leap year February.

### Pitfall 6: Substack RSS Feed Item Limits
**What goes wrong:** Substack RSS feeds only return the most recent ~20 items. Developers assume they get full publication history.
**Why it happens:** RSS feeds are paginated by design.
**Prevention:** Accept this limitation in v1. The calendar shows "recent" activity, not complete history. Document this in the UI. If full history is needed later, paginated feed fetching would require multiple requests per member.

### Pitfall 7: Missing Error Handling for Individual Feeds
**What goes wrong:** One member's feed URL is wrong or their Substack is down. The entire dashboard breaks.
**Prevention:** Use Promise.allSettled. Show "feed unavailable" for failed members instead of crashing the whole page. Log errors for debugging.

## Minor Pitfalls

### Pitfall 8: Vercel Free Tier Function Duration
**What goes wrong:** With many feeds (approaching 50), parallel fetching may exceed the 10-second function execution limit on Vercel's free tier.
**Prevention:** Monitor execution times early. Consider increasing revalidate interval if this becomes an issue. 50 feeds at ~200ms each should be ~2-3s with parallelization, well within limits.

### Pitfall 9: JSON Config File Deployment
**What goes wrong:** Changing members.json requires a redeployment. Users expect changes to take effect immediately.
**Prevention:** Document that member changes require a git push + deploy. This is an accepted trade-off in v1 (PROJECT.md: admin UI is out of scope).

### Pitfall 10: Tooltip Positioning on Mobile
**What goes wrong:** CSS-based tooltips may overflow viewport on narrow screens.
**Prevention:** Use responsive tooltip positioning. On mobile, consider showing article info in a different way (e.g., below the calendar or in a modal). If CSS tooltip positioning becomes too complex, Floating UI (3KB) is a reasonable upgrade.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| RSS feed fetching | Timeout and error handling (Pitfall 1, 7) | AbortController + Promise.allSettled from day one |
| Calendar UI | Off-by-one date errors (Pitfall 5) | date-fns for all date math, UTC normalization |
| ISR setup | Freshness expectations (Pitfall 2) | Short revalidate + "last updated" timestamp |
| Dashboard | Client Component creep (Pitfall 3) | Only DayCell as 'use client' |
| Deploy | Vercel function limits (Pitfall 8) | Monitor early, increase revalidate if needed |
| Member management | Config change workflow (Pitfall 9) | Document deploy requirement |

## Sources

- Next.js ISR documentation (Context7) -- stale-while-revalidate behavior
- Vercel free tier limits -- 10s function duration
- rss-parser GitHub -- timeout handling considerations
- PROJECT.md -- user psychology and scale constraints
