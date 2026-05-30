# Phase 24: /admin/teams/{teamName} hiddenチームビュー - Pattern Map

**Mapped:** 2026-05-30
**Files analyzed:** 2 (1 page + 1 test, both new)
**Analogs found:** 2 / 2 (both exact)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/app/admin/teams/[teamName]/page.tsx` (new) | route / RSC page | request-response (read-only, async params) | `src/app/page.tsx` (pipeline) + `src/app/admin/teams/page.tsx` (admin chrome) | exact (compose both) |
| `src/app/admin/teams/__tests__/teamPage.test.tsx` (new) | test | request-response (RSC element-tree inspection) | `src/app/my/__tests__/page.test.tsx` | exact |

Both files have strong analogs. There is no "No Analog Found" section — every pattern is copyable from existing code.

---

## Pattern Assignments

### `src/app/admin/teams/[teamName]/page.tsx` (route / RSC page, request-response)

**Primary analog:** `src/app/page.tsx` (data pipeline)
**Secondary analog:** `src/app/admin/teams/page.tsx` (admin page chrome: `← 管理画面へ` link + `<main>` wrapper)

This page is a COMPOSITION: copy the heatmap data pipeline from `page.tsx`, drop the team-tab / PrBanner / hidden-exclusion chrome, and adopt the admin back-link from the sibling admin page.

**Imports pattern** — copy from `src/app/page.tsx` lines 1-3 (DROP line 4 `PrBanner` — D-04):
```tsx
import { getMembers } from '@/lib/members'
import { fetchAllFeedsCached } from '@/lib/fetchFeed'
import WeeklyHeatmapGrid from '@/components/WeeklyHeatmapGrid'
```
All three use the `@/` path alias. `WeeklyHeatmapGrid` is a default export. No type imports needed in the page itself (types flow through the function signatures).

**revalidate pattern** — copy from `src/app/page.tsx` line 6 (D-05 Claude discretion: match top page):
```tsx
export const revalidate = 300
```

**Dynamic-route params signature** — Next.js 16: `params` is a Promise (NOT `searchParams` like the top page). Adapt `src/app/page.tsx` lines 8-13:
```tsx
type Props = {
  params: Promise<{ teamName: string }>
}

export default async function AdminTeamPage({ params }: Props) {
  const { teamName: raw } = await params
  const teamName = decodeURIComponent(raw)   // 日本語/特殊文字対応 — Pitfall 2, MANDATORY
  // ...
}
```
Reference for top page's async-params destructure (the structure to mirror, swapping `searchParams`→`params`): `src/app/page.tsx` lines 12-13.

**Core data pipeline** — copy from `src/app/page.tsx` lines 14, 23-27, BUT change the filter.

The top page filter (lines 23-25) MUST NOT be copied verbatim:
```tsx
// src/app/page.tsx lines 23-25 — DO NOT COPY (status-aware, excludes hidden):
const filteredMembers = team
  ? allMembers.filter((m) => m.teams.some((t) => t.name === team))
  : allMembers.filter((m) => m.teams.every((t) => t.status !== 'hidden'))
```
The `.every((t) => t.status !== 'hidden')` branch (line 25) violates D-06/D-07. The hidden-team route's whole purpose is to SHOW hidden teams.

Use the status-agnostic exact-match filter instead (D-07):
```tsx
const allMembers = await getMembers()
const filtered = allMembers.filter((m) => m.teams.some((t) => t.name === teamName))
```
The `getMembers()` call (copied from `src/app/page.tsx` line 14) and the `fetchAllFeedsCached(...)` call (line 27) are reused unchanged.

**Empty/unknown-team branch** (D-01/D-02) — NOT present in the top page; new logic. Single `filtered.length === 0` check, 200 + message, NO `notFound()`:
```tsx
if (filtered.length === 0) {
  // return message instead of heatmap — DB-absent and zero-member treated identically (Pitfall 5)
}
```

**Page chrome / back-link** — copy the admin back-link from sibling `src/app/admin/teams/page.tsx` lines 13-15:
```tsx
<a href="/admin" className="text-sm text-blue-600 hover:underline block mb-4">
  ← 管理画面へ
</a>
```
Wrapper `<main>`: D-05 permits adopting the top page's `className="max-w-[600px] mx-auto px-3 py-4"` (`src/app/page.tsx` line 30). The sibling admin page uses `max-w-3xl mx-auto p-6` (line 12) — either is acceptable; CONTEXT D-05 explicitly blesses the top-page width. DROP the team-tab block (`src/app/page.tsx` lines 33-55) and `<PrBanner />` (line 58) per D-04.

**Heatmap render** — copy from `src/app/page.tsx` line 57, props unchanged:
```tsx
<WeeklyHeatmapGrid results={results} />
```

**Do NOT add an in-page admin check** — proxy.ts covers it (see Shared Patterns). The sibling `src/app/admin/teams/page.tsx` has zero auth code; mirror that.

---

### `src/app/admin/teams/__tests__/teamPage.test.tsx` (test, request-response)

**Analog:** `src/app/my/__tests__/page.test.tsx` (exact — same RSC element-tree, no-jsdom style)

Clone the harness from `page.test.tsx`. Note `page.test.tsx` mocks Supabase clients directly; for THIS page mock the higher-level `@/lib/*` helpers instead (`getMembers`, `fetchAllFeedsCached`) since the page calls those, not Supabase directly.

**Imports + element-tree helpers** — copy verbatim from `src/app/my/__tests__/page.test.tsx` lines 1-2 and the `isElement` / `findByType` helpers (lines 45-69). These are framework-agnostic and reusable as-is:
```tsx
type AnyEl = ReactElement<Record<string, unknown>> & { type: unknown }
function isElement(node: unknown): node is AnyEl { /* lines 49-56 */ }
function findByType(node: unknown, target: unknown): AnyEl | null { /* lines 59-69 */ }
```

**Module-mock pattern** — adapt `src/app/my/__tests__/page.test.tsx` lines 4-39. For this page mock the lib helpers:
```tsx
const mockGetMembers = vi.fn()
vi.mock('@/lib/members', () => ({ getMembers: mockGetMembers }))

const mockFetchAllFeedsCached = vi.fn()
vi.mock('@/lib/fetchFeed', () => ({ fetchAllFeedsCached: mockFetchAllFeedsCached }))
```
`WeeklyHeatmapGrid` is `'use client'` and imported by the page; import the real default export to use as the `findByType` target (like `MyProfileForm`/`LinkMemberForm` are imported at lines 41-43). It does not need stubbing because the test inspects the element tree, never renders it. If alias resolution complains, stub it like `LogoutButton` (lines 29-31).

**Invocation + assertion pattern** — the page takes `params: Promise<{teamName}>`, so call it with a resolved promise (the `my` page took no args; adapt):
```tsx
const el = await AdminTeamPage({ params: Promise.resolve({ teamName: encodeURIComponent('営業部') }) })
const grid = findByType(el, WeeklyHeatmapGrid)
expect(grid).not.toBeNull()
expect((grid!.props as { results: unknown[] }).results).toHaveLength(/* n */)
```
Mirror `src/app/my/__tests__/page.test.tsx` lines 143-154 (await the RSC, `findByType`, assert `.props`).

**beforeEach reset** — copy `src/app/my/__tests__/page.test.tsx` lines 113-117 (`vi.clearAllMocks()` + default mock return).

**Test cases to cover** (from RESEARCH §Phase Requirements → Test Map):
- `renders heatmap` — valid teamName → `WeeklyHeatmapGrid` present, `results` populated (VIEW-01)
- `filters by exact teamName` — other-team members excluded; hidden-status member INCLUDED (D-06/D-07)
- `unknown team shows message` — DB-absent teamName → message `<p>`, no `WeeklyHeatmapGrid` (D-01)
- `empty team shows message` — existing team, 0 members → message (D-01)
- `decodes encoded teamName` — `%E5%96...` encoded input matches Japanese team name (Pitfall 2)

For the "no grid" assertions use the inverse of the positive assertion (mirror `page.test.tsx` lines 207-208: `expect(findByType(el, X)).toBeNull()`).

---

## Shared Patterns

### Authentication / Authorization (admin gate)
**Source:** `src/proxy.ts` lines 34-38 and matcher line 50-52
**Apply to:** the new page — by NOT implementing anything. Confirm-only.
```ts
if (pathname.startsWith('/admin')) {
  if (!user || user.app_metadata?.role !== 'admin') {
    return NextResponse.redirect(new URL('/', request.url))
  }
}
export const config = { matcher: ['/admin', '/admin/:path*', '/my', '/my/:path*'] }
```
`'/admin/:path*'` already matches `/admin/teams/{teamName}`. VIEW-02 needs ZERO new code. Editing proxy.ts = scope violation (Pitfall 4). The sibling admin page `src/app/admin/teams/page.tsx` contains no auth logic — follow that precedent.

### Member fetch + in-memory filter
**Source:** `src/lib/members.ts` lines 4-28 (`getMembers(): Promise<Member[]>`)
**Apply to:** the new page.
`getMembers()` returns ALL members with `teams: {name, status}[]` and does NO status filtering internally (confirmed lines 18-27 — it maps every `member_teams` join, dropping only null teams). So hidden-team members are present in the result; the page's exact-match filter is the only gate.

### Feed fetch / aggregation
**Source:** `src/lib/fetchFeed.ts` line 59 — `fetchAllFeedsCached(members: Member[]): Promise<MemberFeedResult[]>`
**Apply to:** the new page (call AFTER the empty-check so `[]` is never fetched — Assumption A3 / Pitfall 5).

### Heatmap component contract
**Source:** `src/components/WeeklyHeatmapGrid.tsx` lines 8-12
**Apply to:** the new page (render) and the test (findByType target).
```tsx
type WeeklyHeatmapGridProps = { results: MemberFeedResult[] }
export default function WeeklyHeatmapGrid({ results }: WeeklyHeatmapGridProps) { ... }
```
Default export, single `results` prop, `'use client'`. Reuse with zero changes.

### Type contracts
**Source:** `src/lib/types.ts` lines 10-15 (`Member`), lines 20-24 (`MemberFeedResult`)
```tsx
type Member = { name: string; publicationId: string; teams: { name: string; status: string }[]; addedAt: string }
type MemberFeedResult = { member: Member; items: FeedItem[]; imageUrl?: string }
```
`Member.teams[].status` is a plain `string` (not a union) — the filter `t.name === teamName` ignores it (D-07). Test fixtures must shape `Member[]` to this exact contract.

---

## No Analog Found

None. Every pattern has a concrete source in the existing codebase.

---

## Metadata

**Analog search scope:** `src/app/` (page + admin sibling + my test), `src/lib/` (members, fetchFeed, types), `src/components/` (WeeklyHeatmapGrid), `src/proxy.ts`
**Files scanned:** 7 (page.tsx, admin/teams/page.tsx, my/__tests__/page.test.tsx, members.ts, types.ts, proxy.ts, WeeklyHeatmapGrid.tsx) + fetchFeed.ts signature grep
**Pattern extraction date:** 2026-05-30
