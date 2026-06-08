---
phase: 34-ui-polish
plan: "04"
subsystem: components
tags: [server-component, client-component, footer, headernav, auth, ui-polish]
dependency_graph:
  requires: []
  provides:
    - src/components/Footer.tsx
    - src/components/HeaderNav.tsx
    - src/components/__tests__/Footer.test.tsx
    - src/components/__tests__/HeaderNav.test.tsx
  affects:
    - src/app/layout.tsx (to be updated in Plan 05)
    - src/components/Header.tsx (to be updated in Plan 05)
tech_stack:
  added: []
  patterns:
    - "Async Server Component with Supabase auth + admin query (Footer)"
    - "'use client' + usePathname() for path-based render control (HeaderNav)"
    - "Element-tree inspection tests (no jsdom)"
key_files:
  created:
    - src/components/Footer.tsx
    - src/components/HeaderNav.tsx
    - src/components/__tests__/Footer.test.tsx
    - src/components/__tests__/HeaderNav.test.tsx
  modified: []
decisions:
  - "Link mock in tests returns plain object with href prop; collectLinks fixed to detect any node with href prop (not just type='a')"
metrics:
  duration: "~4 minutes"
  completed: "2026-06-08"
  tasks_completed: 2
  tasks_total: 2
  files_created: 4
  files_modified: 0
---

# Phase 34 Plan 04: Footer and HeaderNav Components Summary

**One-liner:** Async Server Component Footer with 3-state auth-based copy and Client Component HeaderNav hiding マイページ on /my via usePathname()

## What Was Built

### Task 1: Footer.tsx Server Component

`src/components/Footer.tsx` is an async Server Component (no 'use client') that:

1. Calls `await createSupabaseServerClient()` to get the auth session
2. If user is authenticated, calls `createSupabaseAdminClient()` (sync) and queries `members.publication_id` via `.eq('user_id', user.id).maybeSingle()`
3. Returns one of three JSX variants:
   - **Unauthenticated**: "このSubstack継続可視化ツールに参加したい方は" + `<a>` to `https://uojun.substack.com/p/8cd` (external, `target="_blank"`)
   - **Authenticated + member linked**: "あなたの個人ビューは" + `<Link>` to `/member/{publicationId}`
   - **Authenticated + member unlinked**: "参加登録は" + `<Link>` to `/my`

All links use `className="hover:text-[#FF6719] underline"` per UI-SPEC.

### Task 2: HeaderNav.tsx Client Component

`src/components/HeaderNav.tsx` is a Client Component (`'use client'` as first line) that:

1. Reads `const pathname = usePathname()` from `next/navigation`
2. Returns `null` when `user !== null && pathname === '/my'` (hides マイページ button)
3. Returns マイページ Link when `user !== null && pathname !== '/my'`
4. Returns ログイン Link when `user === null`

Both links use `className="text-sm border border-gray-300 rounded px-3 py-1 hover:bg-gray-50 transition-colors"` matching existing Header.tsx nav styles.

### Tests

- **Footer.test.tsx**: 9 tests — 3 states × 3 assertions each (text content, link href, negative assertions)
- **HeaderNav.test.tsx**: 8 tests — all 3 behavior cases plus edge case (unauthenticated on /my)

Both test files use element-tree inspection (no jsdom), consistent with existing test patterns.

## Commits

| Task | Commit | Files |
|------|--------|-------|
| Task 1: Footer.tsx + tests | `0ed077d` | `src/components/Footer.tsx`, `src/components/__tests__/Footer.test.tsx` |
| Task 2: HeaderNav.tsx + tests | `0b62fe8` | `src/components/HeaderNav.tsx`, `src/components/__tests__/HeaderNav.test.tsx` |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed collectLinks helper in Footer test to detect next/link mock**
- **Found during:** Task 1 GREEN phase
- **Issue:** The `next/link` mock returns a plain object with `{ type: 'a', props: { href, ... } }`. The initial `collectLinks` helper only matched elements where `n.type === 'a'`, but the mock object structure meant the Link-rendered elements weren't being found via `isElement()` checks in some tree walks.
- **Fix:** Updated `collectLinks` to also match any element that has an `href` prop (regardless of `n.type`), catching both native `<a>` and Link mock outputs.
- **Files modified:** `src/components/__tests__/Footer.test.tsx`
- **Commit:** part of `0ed077d`

## Test Results

- Before: 128 tests passing (20 files)
- After: 146 tests passing (22 files)
- Added: 18 new tests (+2 test files)
- Regressions: 0

## Verification

```
grep -c "export default async function Footer" src/components/Footer.tsx → 1 ✓
grep -c "await createSupabaseServerClient" src/components/Footer.tsx → 1 ✓
grep -c "createSupabaseAdminClient()" src/components/Footer.tsx → 1 ✓
grep -c "'use client'" src/components/HeaderNav.tsx → 1 ✓
grep -c "usePathname" src/components/HeaderNav.tsx → 2 ✓
npm test exits 0 ✓
```

## Known Stubs

None. Both components are fully implemented with real Supabase queries.

## Threat Flags

None. No new network endpoints, auth paths, or file access patterns introduced beyond what was specified in the threat model.

## Self-Check: PASSED

- `src/components/Footer.tsx` exists ✓
- `src/components/HeaderNav.tsx` exists ✓
- `src/components/__tests__/Footer.test.tsx` exists ✓
- `src/components/__tests__/HeaderNav.test.tsx` exists ✓
- Commit `0ed077d` exists ✓
- Commit `0b62fe8` exists ✓
- npm test: 146 passed (22 files) ✓
