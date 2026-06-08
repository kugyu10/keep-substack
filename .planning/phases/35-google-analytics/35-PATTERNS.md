# Phase 35: チーム可視性拡張 + Google Analytics - Pattern Map

**Mapped:** 2026-06-08
**Files analyzed:** 3 (2 modified source files + 1 modified test file)
**Analogs found:** 3 / 3

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/app/page.tsx` | component (RSC) | request-response | `src/app/page.tsx` itself (1-line filter change) | exact (self) |
| `src/app/layout.tsx` | config / provider | request-response | `src/app/layout.tsx` itself (additive import + JSX) | exact (self) |
| `src/app/__tests__/page.test.tsx` | test | — | `src/app/__tests__/page.test.tsx` itself (assertion update) | exact (self) |

---

## Pattern Assignments

### `src/app/page.tsx` (RSC component, request-response)

**Change type:** 1-line filter change — no structural change to the file.

**Current pattern to modify** (`src/app/page.tsx` lines 18-24):
```tsx
const teams = [
  ...new Set(
    allMembers
      .flatMap((m) => m.teams.filter((t) => t.status === 'public').map((t) => t.name))
      .filter(Boolean)
  ),
]
```

**After change** — replace line 21 only:
```tsx
const teams = [
  ...new Set(
    allMembers
      .flatMap((m) => m.teams.filter((t) => t.status !== 'hidden').map((t) => t.name))
      .filter(Boolean)
  ),
]
```

**Do NOT touch** (`src/app/page.tsx` lines 25-30) — `filteredMembers` filter is unchanged per D-03:
```tsx
const filteredMembers = team
  ? allMembers.filter((m) =>
      m.teams.some((t) => t.name === team)
    )
  : allMembers.filter((m) => m.teams.every((t) => t.status !== 'hidden'))
```

---

### `src/app/layout.tsx` (root layout / provider, request-response)

**Change type:** Additive — 1 new import + 1 conditional JSX element inside `<body>`.

**Current imports pattern** (`src/app/layout.tsx` lines 1-4):
```tsx
import type { Metadata } from 'next'
import './globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
```

**After change** — append one import line:
```tsx
import type { Metadata } from 'next'
import './globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { GoogleAnalytics } from '@next/third-parties/google'
```

**Current body pattern** (`src/app/layout.tsx` lines 23-29):
```tsx
    <html lang="ja">
      <body>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
```

**After change** — append GoogleAnalytics as last child of `<body>`:
```tsx
    <html lang="ja">
      <body>
        <Header />
        {children}
        <Footer />
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
        )}
      </body>
    </html>
```

**Why `&&` short-circuit:** TypeScript narrows `string | undefined` to `string` in the right-hand side, satisfying `gaId: string`. No non-null assertion (`!`) needed. This follows the same env-var guard pattern already used in `src/app/api/cron/route.ts` line 9 (`const cronSecret = process.env.CRON_SECRET`), but with conditional rendering instead of a guard clause.

---

### `src/app/__tests__/page.test.tsx` (unit test, —)

**Change type:** 3-line assertion update inside the TEAM-03 `it` block at lines 139-161. No new test file needed.

**Current test describe name + failing assertions** (`src/app/__tests__/page.test.tsx` lines 139-161):
```typescript
it('shows ONLY public team names as tabs — private/hidden teams absent', async () => {
  // ... mock setup unchanged ...

  // lines 157-159 — these FAIL after TEAM-01 change:
  expect(labels).not.toContain('PrivateTeam')
  expect(labels).not.toContain('SecretTeam')
  expect(labels).not.toContain('HiddenTeam')
})
```

**After change** — update describe name and flip two assertions:
```typescript
it('shows public AND private team names as tabs — hidden teams absent', async () => {
  mockGetMembers.mockResolvedValue([
    member('Alice', [{ name: 'PublicTeam', status: 'public' }]),
    member('Bob', [{ name: 'PrivateTeam', status: 'private' }]),
    member('Carol', [{ name: 'HiddenTeam', status: 'hidden' }]),
    member('Dave', [
      { name: 'PublicTeam', status: 'public' },
      { name: 'SecretTeam', status: 'private' },
    ]),
  ])

  const el = await Home({ searchParams: Promise.resolve({}) })
  const labels = collectAnchorLabels(el)

  expect(labels).toContain('All')
  expect(labels).toContain('PublicTeam')
  expect(labels).toContain('PrivateTeam')      // CHANGED: not → toContain
  expect(labels).toContain('SecretTeam')       // CHANGED: not → toContain
  expect(labels).not.toContain('HiddenTeam')   // UNCHANGED: hidden still excluded
})
```

**Unchanged tests** (do NOT modify):
- `it('dedupes public team names...')` — lines 163-177 — still valid
- `it('All view: excludes members belonging to any hidden team')` — lines 180-201 — assertion `expect(names).toEqual(['Alice', 'Bob'])` is already correct post-change (Bob is private, not hidden; already included)
- `it('team-selected view: shows members of selected team REGARDLESS of status')` — lines 204-220 — unchanged

---

## Shared Patterns

### NEXT_PUBLIC_* Environment Variable Guard
**Source:** `src/app/api/cron/route.ts` line 9 (presence check for `CRON_SECRET`) and D-07 pattern
**Apply to:** `src/app/layout.tsx` GoogleAnalytics conditional render

The project's established pattern for optional env vars is to read them directly from `process.env` without a non-null assertion. For conditional rendering, `&&` short-circuit is the idiomatic approach:

```tsx
// Pattern: conditional render on NEXT_PUBLIC_* env var presence
{process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
  <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
)}
```

This differs from required env vars (e.g., `process.env.NEXT_PUBLIC_SUPABASE_URL!` in `src/lib/supabase/client.ts`) which use `!` to assert presence. GA ID uses `&&` because absence is valid (local dev).

### Team Status Filter Pattern
**Source:** `src/app/page.tsx` lines 25-30 (`filteredMembers` uses `t.status !== 'hidden'`)
**Apply to:** `src/app/page.tsx` line 21 (`teams` array)

The `filteredMembers` All-tab filter (`m.teams.every((t) => t.status !== 'hidden')`) already uses the `!== 'hidden'` pattern. The `teams` array at line 21 is being updated to match this same pattern, making both filters consistent in how they treat `private` vs `hidden`.

### Vitest Mock + RSC Test Pattern
**Source:** `src/app/__tests__/page.test.tsx` lines 1-101

All RSC page tests in this file follow a fixed structure:
1. `vi.hoisted()` to declare mocks before imports
2. `vi.mock(...)` for all dependencies (members, feedFeed, components, Supabase)
3. `import Home from '../page'` after mocks
4. Tree-walking helpers (`isElement`, `flattenChildren`, `findByType`, `collectAnchorLabels`) to inspect React element trees without jsdom
5. `member()` fixture factory for consistent test data
6. `beforeEach` with `vi.clearAllMocks()` + default stub setup

New test assertions must reuse these helpers unchanged.

---

## No Analog Found

None. All files to be modified are existing files with clear self-analogs. No new files are created in this phase.

---

## Metadata

**Analog search scope:** `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/__tests__/page.test.tsx`
**Files scanned:** 3 source files + grep across `src/**/*.{ts,tsx}` for env var patterns
**Pattern extraction date:** 2026-06-08
