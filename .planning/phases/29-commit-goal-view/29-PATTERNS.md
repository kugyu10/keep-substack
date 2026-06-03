# Phase 29: Commit & Goal View — Pattern Map

**Mapped:** 2026-06-04
**Files analyzed:** 9 new/modified files
**Analogs found:** 9 / 9

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/app/weekly-stamp/page.tsx` | page (Server Component) | request-response | `src/app/page.tsx` | exact (copy + href patch) |
| `src/app/page.tsx` | page (Server Component) | request-response + CRUD | `src/app/page.tsx` + `src/app/my/page.tsx` | exact (replace component, add Supabase SELECT) |
| `src/components/CommitGoalView.tsx` | component (Server) | request-response | `src/components/WeeklyHeatmapGrid.tsx` | role-match (no useState) |
| `src/components/CommitGoalRow.tsx` | component (Server) | request-response | `src/components/HeatmapRow.tsx` | exact (same layout structure) |
| `src/components/CommitGrid.tsx` | component (Server) | transform | `src/components/HeatmapRow.tsx` grid section | role-match (grid rendering) |
| `src/lib/commitUtils.ts` | utility | transform | `src/lib/heatmapUtils.ts` | role-match (date/sort logic) |
| `src/lib/types.ts` | model | — | `src/lib/types.ts` (self — add `CommitSlot` + `id` to `Member`) | self-extension |
| `src/app/__tests__/page.test.tsx` | test | — | `src/app/__tests__/page.test.tsx` (self — update component ref) | self-update |
| `src/app/weekly-stamp/__tests__/page.test.tsx` | test | — | `src/app/__tests__/page.test.tsx` | exact (RSC props-inspection pattern) |

---

## Pattern Assignments

### `src/app/weekly-stamp/page.tsx` (page, request-response)

**Analog:** `src/app/page.tsx` (lines 1–63)
**Action:** Copy current `src/app/page.tsx` verbatim, then patch all `href` values to use `/weekly-stamp` base.

**Full file pattern** (`src/app/page.tsx` lines 1–63):
```tsx
import { getMembers } from '@/lib/members'
import { fetchAllFeedsCached } from '@/lib/fetchFeed'
import WeeklyHeatmapGrid from '@/components/WeeklyHeatmapGrid'
import PrBanner from '@/components/PrBanner'

export const revalidate = 300

type Props = {
  searchParams: Promise<{ team?: string }>
}

export default async function Home({ searchParams }: Props) {
  const { team } = await searchParams
  const allMembers = await getMembers()
  // ... (identical logic, only href="" patch required)
}
```

**href patch required** (`src/app/page.tsx` lines 38–53):
```tsx
// BEFORE (current page.tsx):
href="/"
href={`/?team=${encodeURIComponent(t)}`}

// AFTER (weekly-stamp/page.tsx):
href="/weekly-stamp"
href={`/weekly-stamp?team=${encodeURIComponent(t)}`}
```

---

### `src/app/page.tsx` (page, request-response + CRUD)

**Analog:** `src/app/page.tsx` (current, lines 1–63) + `src/app/my/page.tsx` (lines 1–89)

**Imports pattern** (copy from current `page.tsx` lines 1–4, extend):
```tsx
import { getMembers } from '@/lib/members'
import { fetchAllFeedsCached } from '@/lib/fetchFeed'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import CommitGoalView from '@/components/CommitGoalView'
import PrBanner from '@/components/PrBanner'
```

**ISR revalidate** (`src/app/page.tsx` line 6):
```tsx
export const revalidate = 300
```

**Supabase admin SELECT pattern** (`src/app/my/page.tsx` lines 16–30 and 52–58):
```tsx
const admin = createSupabaseAdminClient()

// Fetch all commit slots for all members (D-05)
const { data: slotsData } = await admin
  .from('member_commit_slots')
  .select('member_id, day_of_week, hour')
// Note: member_id is UUID; requires Member type to have id field (see types.ts)
```

**21-day filter pattern** (from RESEARCH.md Pattern — use after `fetchAllFeedsCached`):
```tsx
const cutoff = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString()
const results = await fetchAllFeedsCached(filteredMembers)
const results21 = results.map(r => ({
  ...r,
  items: r.items.filter(item => item.isoDate && item.isoDate >= cutoff)
}))
```

**Component invocation** (replaces `<WeeklyHeatmapGrid>` from `page.tsx` line 59):
```tsx
return (
  <main className="max-w-[600px] mx-auto px-3 py-4">
    <h1 className="text-2xl mb-2" style={{ fontFamily: 'Georgia, serif', fontWeight: 900 }}>
      Keep Substack
    </h1>
    <CommitGoalView results={results21} slots={slotsData ?? []} />
    <PrBanner />
  </main>
)
```

---

### `src/components/CommitGoalView.tsx` (component, Server)

**Analog:** `src/components/WeeklyHeatmapGrid.tsx` (lines 1–68) — but as Server Component (no `'use client'`, no `useState`)

**Key difference from analog:** `WeeklyHeatmapGrid` uses `'use client'` + `useState(weekOffset)`. `CommitGoalView` has no interaction in Phase 29 scope — omit `'use client'` directive entirely.

**Imports pattern** (`src/components/WeeklyHeatmapGrid.tsx` lines 1–6, adapted):
```tsx
// NO 'use client' directive — Server Component
import type { MemberFeedResult } from '@/lib/types'
import type { CommitSlot } from '@/lib/types'
import CommitGoalRow from './CommitGoalRow'
import { sortMembersForCommitView } from '@/lib/commitUtils'
```

**Props type pattern** (`src/components/WeeklyHeatmapGrid.tsx` lines 8–10, adapted):
```tsx
type CommitGoalViewProps = {
  results: MemberFeedResult[]
  slots: CommitSlot[]
}
```

**Member iteration pattern** (`src/components/WeeklyHeatmapGrid.tsx` lines 57–65, adapted):
```tsx
// Group slots by member_id, then render one CommitGoalRow per member
{sorted.map(({ member, items, imageUrl }) => {
  const memberSlots = slots.filter(s => s.member_id === member.id)
  return (
    <CommitGoalRow
      key={member.publicationId}
      member={member}
      items={items}
      slots={memberSlots}
      imageUrl={imageUrl}
    />
  )
})}
```

---

### `src/components/CommitGoalRow.tsx` (component, Server)

**Analog:** `src/components/HeatmapRow.tsx` (lines 1–68) — closest structural match

**Layout pattern** (`src/components/HeatmapRow.tsx` lines 19–67):
```tsx
// Three-column flex layout: [avatar+name | grid | achievement]
<div className="flex items-center border-b border-[#ebebeb] py-1">
  {/* Column 1: avatar + name — copy exactly from HeatmapRow lines 21-40 */}
  <Link
    href={`/member/${member.publicationId}`}
    className="w-16 sm:w-52 shrink-0 pr-2 flex items-center gap-1 overflow-hidden"
  >
    {imageUrl ? (
      <img src={imageUrl} alt="" width={40} height={40}
           className="w-10 h-10 rounded-full shrink-0 object-cover" />
    ) : (
      <span className="w-10 h-10 rounded-full shrink-0 bg-gray-200 inline-block" aria-hidden="true" />
    )}
    <div className="flex-1 min-w-0 text-xs font-semibold leading-snug truncate hidden sm:block">
      {member.name}
    </div>
    <span className="shrink-0 text-gray-400 text-sm" aria-hidden="true">›</span>
  </Link>

  {/* Column 2: CommitGrid (flex-1) */}
  {slots.length === 0 ? (
    // VIEW-06: no-commit fallback
    <div className="flex-1 flex items-center justify-center">
      <span className="text-sm text-gray-400">未コミット</span>
    </div>
  ) : (
    <CommitGrid slots={slots} items={items} />
  )}

  {/* Column 3: Achievement placeholder (D-09) — w-8 empty div */}
  <div className="w-8 shrink-0" aria-hidden="true" />
</div>
```

**Key differences from HeatmapRow:**
- Replace `<div className="grid grid-cols-7 ... flex-1">` with `<CommitGrid>` component
- Replace `<div className="w-10 shrink-0 ...">` (count) with `<div className="w-8 shrink-0">` (achievement placeholder)
- Add no-commit branch before CommitGrid

---

### `src/components/CommitGrid.tsx` (component, Server, transform)

**Analog:** Grid section of `src/components/HeatmapRow.tsx` (lines 41–61) + responsive pattern from `HeatmapRow.tsx` (line 36: `hidden sm:block`)

**Mobile-collapse pattern** (`HeatmapRow.tsx` line 36 + RESEARCH.md Pattern 3):
```tsx
// CSS-only responsive: oldest 2 weeks hidden on mobile (D-07/D-08)
<div className="flex flex-1">
  {/* Week 0 (oldest): hidden on mobile */}
  <div className="hidden sm:flex flex-1 gap-1">
    {/* cells */}
  </div>
  {/* Week 1 (middle): hidden on mobile */}
  <div className="hidden sm:flex flex-1 gap-1 border-l border-gray-200">
    {/* cells */}
  </div>
  {/* Week 2 (current): always visible */}
  <div className="flex flex-1 gap-1 border-l border-gray-200 sm:border-l-0">
    {/* cells */}
  </div>
</div>
```

**Cell rendering pattern** (from RESEARCH.md Code Examples):
```tsx
// Day-of-week mapping (D-03)
const DAY_NAMES: Record<number, string> = {
  1: '月', 2: '火', 3: '水', 4: '木', 5: '金', 6: '土', 7: '日'
}

// Posted cell (VIEW-05)
<a href={article.link} target="_blank" rel="noreferrer"
   className="aspect-square rounded overflow-hidden">
  <img src={article.thumbnail} alt="" className="object-cover w-full h-full" />
</a>

// Unposted slot cell (VIEW-05)
<div className="aspect-square flex items-center justify-center rounded border border-dashed border-gray-300">
  <span className="text-xs text-gray-400">{DAY_NAMES[slot.day_of_week]}</span>
</div>
```

**Tailwind grid static class pattern** (Pitfall 2 from RESEARCH.md):
```tsx
// NEVER use dynamic: `grid-cols-${n*3}` — purged in production
// USE static map instead:
const colsClass = {
  1: 'grid-cols-3',
  2: 'grid-cols-6',
  3: 'grid-cols-9',
  4: 'grid-cols-12',
}[freq] ?? 'grid-cols-3'
```

**Or use flex-1 week-block approach** (RESEARCH.md Pattern 2 — recommended):
```tsx
// Each week block is flex-1 (equal width), cells within use grid-cols-N
// This achieves visual width uniformity without 36-col arbitrary grid
<div className={`grid gap-1`} style={{ gridTemplateColumns: `repeat(${slots.length}, minmax(0, 1fr))` }}>
  {slots.map(slot => /* cell */)}
</div>
```

---

### `src/lib/commitUtils.ts` (utility, transform)

**Analog:** `src/lib/heatmapUtils.ts` (lines 1–75)

**Imports pattern** (`src/lib/heatmapUtils.ts` lines 1–3):
```typescript
import { isoToJSTDateKey } from './calendarUtils'
import type { FeedItem, MemberFeedResult } from './types'
// Add:
import type { CommitSlot } from './types'
```

**JST date key pattern** (`src/lib/heatmapUtils.ts` lines 25–35 — JST offset):
```typescript
// JST UTC+9 offset pattern (established in project)
const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000)
```

**Sort pattern** (`src/lib/heatmapUtils.ts` lines 64–75 — copy structure, adapt criteria):
```typescript
export function sortByWeeklyCount(
  results: MemberFeedResult[],
  dates: string[]
): MemberFeedResult[] {
  const dateSet = new Set(dates)
  return [...results].sort((a, b) => {
    const aCount = countArticlesInDates(a.items, dateSet)
    const bCount = countArticlesInDates(b.items, dateSet)
    if (bCount !== aCount) return bCount - aCount  // 降順
    return a.member.addedAt.localeCompare(b.member.addedAt)  // addedAt昇順
  })
}
// commitUtils.ts: adapt for D-10 — sort by (thisWeekRate desc, streak desc, addedAt asc)
// For Phase 29 simplified version, use today's week post count as proxy
```

**New utility functions needed** (no analog — use JST pattern from `getRecentDays`):
```typescript
// Get Monday-start week dates in JST (ISO 8601 week, day_of_week 1=Mon)
// Different from getRecentDays (today-anchor, 7 days back)
// New: Monday-anchor, 7 days forward from that Monday

export function getWeekDates(mondayOffsetWeeks: number): string[]
// Returns ['YYYY-MM-DD', ...] for Mon–Sun of the target week (JST)
// Pattern: same UTC+9 offset as getRecentDays lines 25-26

export function matchArticleToSlot(
  slot: CommitSlot,
  weekDates: string[],        // 7-element array Mon=index0 … Sun=index6
  articleDateMap: Map<string, FeedItem[]>
): FeedItem | undefined
// slot.day_of_week 1=Mon maps to weekDates[0] (index = day_of_week - 1)
// Uses isoToJSTDateKey pattern from heatmapUtils.ts
```

---

### `src/lib/types.ts` (model — self-extension)

**Analog:** `src/lib/types.ts` itself (lines 1–25)

**Existing Member type** (lines 10–16 — add `id` field):
```typescript
export type Member = {
  name: string
  publicationId: string
  teams: { name: string; status: string }[]
  addedAt: string
  substackHandle?: string
  // ADD (Pitfall 1 fix — needed for member_commit_slots JOIN):
  id?: string  // UUID from members.id
}
```

**New CommitSlot type** (add after MemberFeedResult):
```typescript
export type CommitSlot = {
  member_id: string  // UUID FK → members.id
  day_of_week: number  // 1=Mon … 7=Sun (ISO 8601, Phase 28 D-15)
  hour: number         // 0–23
}
```

**`getMembers()` SELECT extension** (`src/lib/members.ts` lines 6–17):
```typescript
// Add 'id' to the SELECT list:
const { data, error } = await supabase
  .from('members')
  .select(`
    id,           // ADD THIS
    name,
    publication_id,
    added_at,
    substack_handle,
    member_teams (
      teams (name, status)
    )
  `)
// And add to the map() transform:
id: m.id,         // ADD THIS
```

---

### `src/app/__tests__/page.test.tsx` (test — self-update)

**Analog:** `src/app/__tests__/page.test.tsx` itself (lines 1–184)

**Module mock pattern to update** (lines 23–28 — swap `WeeklyHeatmapGrid` → `CommitGoalView`):
```typescript
// REMOVE:
vi.mock('@/components/WeeklyHeatmapGrid', () => ({ default: () => null }))
import WeeklyHeatmapGrid from '@/components/WeeklyHeatmapGrid'

// ADD:
vi.mock('@/components/CommitGoalView', () => ({ default: () => null }))
// Also mock createSupabaseAdminClient (new dependency of page.tsx):
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({ select: vi.fn(() => ({ data: [], error: null })) })),
  })),
}))
import CommitGoalView from '@/components/CommitGoalView'
```

**findByType usage pattern** (lines 53–62 — keep identical helper, update target):
```typescript
// Keep findByType, findByTag, collectAnchorLabels helpers intact
// Update test assertions to reference CommitGoalView instead of WeeklyHeatmapGrid:
const grid = findByType(el, CommitGoalView)
expect(grid).not.toBeNull()
const props = (grid!.props as { results: MemberFeedResult[]; slots: CommitSlot[] })
```

---

### `src/app/weekly-stamp/__tests__/page.test.tsx` (test — new)

**Analog:** `src/app/__tests__/page.test.tsx` (lines 1–184) — copy RSC props-inspection pattern wholesale

**Same mock/helper boilerplate** (lines 1–78): copy `isElement`, `flattenChildren`, `findByType`, `collectAnchorLabels` helpers verbatim.

**Module mocks** (lines 7–28): same `mockGetMembers`, `mockFetchAllFeedsCached` pattern, but mock `WeeklyHeatmapGrid` (not `CommitGoalView`):
```typescript
vi.mock('@/components/WeeklyHeatmapGrid', () => ({ default: () => null }))
vi.mock('@/components/PrBanner', () => ({ default: () => null }))

import Home from '../page'  // weekly-stamp/page.tsx
import WeeklyHeatmapGrid from '@/components/WeeklyHeatmapGrid'
```

**Key test to add** (mirrors VIEW-01):
```typescript
it('renders WeeklyHeatmapGrid with member results', async () => {
  mockGetMembers.mockResolvedValue([member('Alice', [])])
  const el = await Home({ searchParams: Promise.resolve({}) })
  const grid = findByType(el, WeeklyHeatmapGrid)
  expect(grid).not.toBeNull()
})

it('All link href points to /weekly-stamp (not /)', async () => {
  mockGetMembers.mockResolvedValue([
    member('Alice', [{ name: 'Team', status: 'public' }]),
  ])
  const el = await Home({ searchParams: Promise.resolve({}) })
  const labels = collectAnchorLabels(el)  // returns link text
  // Verify hrefs contain /weekly-stamp — use findByTag('a') and check href prop
})
```

---

## Shared Patterns

### JST Date Calculation
**Source:** `src/lib/heatmapUtils.ts` lines 24–26 and `src/lib/calendarUtils.ts` lines 29–35
**Apply to:** `src/lib/commitUtils.ts` — all date/week computations
```typescript
// Always apply +9h offset to get JST from UTC
const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000)
// For date keys, use isoToJSTDateKey (not raw Date parsing)
import { isoToJSTDateKey } from './calendarUtils'
```

### Supabase Admin Client
**Source:** `src/lib/supabase/admin.ts` (lines 1–14) + `src/app/my/page.tsx` lines 3, 16
**Apply to:** `src/app/page.tsx` (new CommitGoalView page)
```typescript
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
const admin = createSupabaseAdminClient()
const { data, error } = await admin.from('table').select('...')
```

### ISR Revalidate
**Source:** `src/app/page.tsx` line 6
**Apply to:** `src/app/page.tsx` (replacement), `src/app/weekly-stamp/page.tsx`
```typescript
export const revalidate = 300
```

### Responsive Hidden Pattern
**Source:** `src/components/HeatmapRow.tsx` line 36 (`hidden sm:block`)
**Apply to:** `src/components/CommitGrid.tsx` week blocks (D-07)
```tsx
className="hidden sm:flex flex-1 ..."   // oldest 2 weeks
className="flex flex-1 ..."              // current week (always visible)
```

### React Element Test Helpers
**Source:** `src/app/__tests__/page.test.tsx` lines 36–78 (`isElement`, `flattenChildren`, `findByType`, `collectAnchorLabels`)
**Apply to:** All new test files — copy these helpers verbatim; do not rewrite.

### Tailwind Static Class Map (anti-dynamic-purge)
**Source:** RESEARCH.md Pitfall 2 (no codebase analog yet — first use)
**Apply to:** `src/components/CommitGrid.tsx`
```tsx
// NEVER: `grid-cols-${n}`
// ALWAYS use static lookup:
const colsClass = { 1: 'grid-cols-3', 2: 'grid-cols-6', 3: 'grid-cols-9', 4: 'grid-cols-12' }[freq]
```

---

## No Analog Found

All files have analogs in the codebase. No files require fallback to external reference patterns only.

---

## Critical Implementation Notes for Planner

1. **`Member.id` must be added before `member_commit_slots` SELECT is possible.** Update `src/lib/members.ts` SELECT and `src/lib/types.ts` in the same plan step. Existing tests for `getMembers()` use the `member()` fixture which does not include `id` — adding optional `id?: string` causes no degrade.

2. **D-06 migration is already done.** `supabase/migrations/20260602000001_add_member_commit_slots.sql` already has `"public select member_commit_slots"` policy with `USING (true)`. No new migration needed. Do not create a duplicate.

3. **`page.test.tsx` must be updated before `page.tsx` content changes.** Otherwise `vitest run` breaks mid-plan. Update the test in Plan 01 before replacing `page.tsx` in Plan 02 (or do it as first task of Plan 02).

4. **`weekly-stamp/page.tsx` href patch.** When copying `page.tsx`, change `href="/"` → `href="/weekly-stamp"` and `href={\`/?team=...\`}` → `href={\`/weekly-stamp?team=...\`}` on lines 38 and 49 of the current `page.tsx`.

5. **`CommitGoalView` is a Server Component.** Do NOT add `'use client'`. Contrast with `WeeklyHeatmapGrid` which requires it for `useState(weekOffset)`. Phase 29 has no client-side interactivity.

---

## Metadata

**Analog search scope:** `src/app/`, `src/components/`, `src/lib/`, `src/app/__tests__/`, `src/components/__tests__/`, `supabase/migrations/`
**Files scanned:** 12
**Pattern extraction date:** 2026-06-04
