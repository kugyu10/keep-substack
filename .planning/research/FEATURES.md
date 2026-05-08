# Feature Landscape

**Domain:** RSS feed activity visualization calendar app
**Researched:** 2026-05-08

## Table Stakes

Features users expect. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Monthly calendar display | Core UI. Must see activity by date | Med | date-fns for calendar grid construction |
| Post-day highlight per member | "Who wrote when" must be visible at a glance | Low | Color/mark on date cells |
| Hover tooltip with article title | Want to see what was written on each day | Low | CSS tooltip is sufficient |
| Link to original article | Want to read the article on Substack | Low | Simple anchor tag to Substack URL |
| All-members dashboard | Need overview of community activity | Med | Grid of all member calendars |
| Individual detail view | Want to see one member's activity in detail | Low | Member selection switches view |
| Responsive design | Want to check from mobile | Med | Tailwind responsive classes |
| Auto data refresh (ISR) | No manual rebuild needed for fresh data | Low | Next.js ISR (revalidate) |

## Differentiators

Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Streak count display | Motivation boost. "10 days in a row!" | Low | Computable from feed data |
| Monthly post count summary | Quantify monthly activity | Low | Simple count aggregation |
| Previous/next month navigation | Want to review past activity | Low | Month parameter toggle |
| Activity heatmap (color intensity) | GitHub-grass-like visual frequency representation | Low | Cell color based on post count |
| Member ranking | Sort by monthly activity for motivation | Low | Sort by post count |

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| User authentication | Public page for easy URL sharing (PROJECT.md spec) | URL sharing only |
| Feed management UI (admin panel) | v1 prioritizes simplicity. Config file is enough (PROJECT.md spec) | JSON config file |
| Real-time notifications | Substack already has notifications. Calendar is for review | Check the calendar |
| Comments/likes | Duplicates Substack functionality (PROJECT.md spec) | Link to Substack |
| Database | 50 feeds with RSS parsing per ISR cycle is fine. DB adds complexity for no gain | ISR cache is sufficient |
| Non-RSS data sources | Substack-specific is enough. Generalization is YAGNI | Substack RSS only |

## Feature Dependencies

```
JSON config file -> RSS feed fetching -> Article data parsing
Article data parsing -> Calendar UI display
Calendar UI display -> Hover tooltip
Calendar UI display -> Activity highlight (color/mark)
Calendar UI display -> Previous/next month navigation
Article data parsing -> Dashboard (all members list)
Dashboard -> Individual detail view (click navigation)
Article data parsing -> Streak calculation
Article data parsing -> Monthly summary
```

## MVP Recommendation

Prioritize:
1. JSON config file for member management (table stakes, foundation for everything)
2. RSS feed fetching and parsing (table stakes, data backbone)
3. Monthly calendar UI + post-day highlight (table stakes, core value)
4. Hover tooltip + article link (table stakes, usability)
5. Dashboard + individual view switching (table stakes, navigation)

Defer:
- Streak display: Easy to add post-MVP. Wait for data structure to stabilize
- Ranking: Depends on community culture. Could create pressure -- confirm before building
- Heatmap: Simple highlight is enough initially. Consider after user feedback

## Sources

- PROJECT.md: Requirements and out-of-scope definitions
- GitHub contribution graph: UI inspiration
