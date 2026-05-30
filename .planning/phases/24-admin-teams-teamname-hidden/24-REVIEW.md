---
phase: 24-admin-teams-teamname-hidden
reviewed: 2026-05-30T00:00:00Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - src/app/admin/teams/[teamName]/page.tsx
  - src/app/admin/teams/__tests__/teamPage.test.tsx
  - src/__tests__/proxy.test.ts
findings:
  critical: 1
  warning: 3
  info: 2
  total: 6
status: issues_found
---

# Phase 24: Code Review Report

**Reviewed:** 2026-05-30T00:00:00Z
**Depth:** standard
**Files Reviewed:** 3
**Status:** issues_found

## Summary

Reviewed the hidden-team admin view RSC (`/admin/teams/[teamName]`), its element-tree
unit tests, and the `proxy.ts` authorization-gate tests.

Context verified against the repo (not in the changed-file set but load-bearing for
correctness):
- `proxy.ts` (Next.js 16 `proxy`/`config.matcher` convention) **is** the active request
  interceptor that replaced `middleware.ts` (commit `24bc3a7`). The authorization gate is
  wired and the matcher `'/admin/:path*'` does cover `/admin/teams/{teamName}`. So the page
  itself is protected at the edge — good. The page intentionally does NOT re-check the role
  (it relies entirely on the proxy gate), which is acceptable given the matcher, but creates
  a single point of failure (see WR-03).

The most serious finding is an unhandled `URIError` crash path in the page from
`decodeURIComponent` on malformed input. There are also test-coverage gaps that let real
regressions slip through, and a duplicated-link merge edge case worth noting.

## Critical Issues

### CR-01: Malformed `teamName` crashes the route with an unhandled `URIError`

**File:** `src/app/admin/teams/[teamName]/page.tsx:13`
**Issue:** `decodeURIComponent(raw)` throws `URIError: URI malformed` for any input
containing an invalid percent sequence (e.g. `/admin/teams/%`, `/admin/teams/%E0%A4%A`).
Confirmed at runtime: `decodeURIComponent('%E0%A4%A')` throws `URIError`. Because the throw
is uncaught in the async Server Component, the route renders the framework error boundary
(500) instead of the intended "該当するチームのメンバーがいません" 200 response. An
authenticated admin can trigger this trivially by editing the URL, and any crawler/scanner
hitting a malformed path turns it into a 500. The design intent (D-01/D-02) is that a
non-existent team returns 200 with a message — a malformed segment breaks that contract.

**Fix:**
```tsx
const { teamName: raw } = await params
let teamName: string
try {
  teamName = decodeURIComponent(raw)
} catch {
  // Malformed percent-encoding → treat as a non-existent team (D-01/D-02): 200 + message.
  teamName = raw
}
```
(Or wrap the decode in a helper and fall through to the empty-state branch; the key point is
the decode must not be allowed to throw.) Add a regression test feeding `teamName: '%'`.

## Warnings

### WR-01: Tests never exercise the `decodeURIComponent` failure path

**File:** `src/app/admin/teams/__tests__/teamPage.test.tsx:131-145`
**Issue:** The "decodes encoded teamName" test only covers a well-formed encoding
(`encodeURIComponent('営業部')`). There is no case for malformed input, so CR-01 is
completely invisible to the suite. The test set claims to cover "decode" (see the describe
title) but only covers the happy path.
**Fix:** Add a test:
```ts
it('malformed teamName does not crash (falls back to empty-state)', async () => {
  mockGetMembers.mockResolvedValue([member('Alice', [{ name: 'Alpha', status: 'public' }])])
  const el = await AdminTeamPage({ params: Promise.resolve({ teamName: '%' }) })
  expect(findByType(el, WeeklyHeatmapGrid)).toBeNull()
  expect(collectParagraphText(el).length).toBeGreaterThan(0)
})
```
This will fail against the current implementation, proving CR-01, then pass after the fix.

### WR-02: `collectParagraphText` only captures string children, silently passing on structural changes

**File:** `src/app/admin/teams/__tests__/teamPage.test.tsx:57-72`
**Issue:** `collectParagraphText` pushes a child only when `typeof c === 'string'`. The
empty-state assertion is `expect(collectParagraphText(el).length).toBeGreaterThan(0)`. If the
empty-state message were ever refactored to wrap text in a `<span>`/interpolation
(non-string child), `collectParagraphText` would return `[]` and the assertion would fail
for the wrong reason — or worse, a future `<p>` with only element children would make the
test pass/fail unrelated to the message actually shown. The test asserts "some paragraph has
text" rather than "the empty-state message is present", so it does not actually verify the
D-01/D-02 message content.
**Fix:** Assert on the specific message text:
```ts
expect(collectParagraphText(el)).toContain('該当するチームのメンバーがいません')
```
and have `collectParagraphText` recurse through non-string children too (or flatten with
`String(c)` guarded against objects).

### WR-03: `proxy` "admin passes through" test does not verify the request actually proceeds

**File:** `src/__tests__/proxy.test.ts:63-72`
**Issue:** The admin-passthrough test asserts only `res.headers.get('location') === null`.
`NextResponse.next()` and a `NextResponse.redirect()` to a relative/missing location, an
error response, or even an unexpected 4xx could all satisfy "no location header". The test
does not assert a 2xx/`next()` status, so a regression that, say, blocks admins with a 403
(no `location`) would pass. Combined with the fact that the page relies entirely on this gate
for authorization (the RSC does no role check itself), this passthrough behavior is the exact
thing that must be locked down.
**Fix:** Assert positively that it is a pass-through:
```ts
expect(res.status).toBe(200)
// and/or assert the x-middleware-next header set by NextResponse.next()
expect(res.headers.get('x-middleware-next')).toBe('1')
```

## Info

### IN-01: Empty `filtered` array still constructs the empty-state branch but `fetchAllFeedsCached` guard is correct

**File:** `src/app/admin/teams/[teamName]/page.tsx:28-33`
**Issue:** The `filtered.length === 0` guard correctly avoids calling
`fetchAllFeedsCached([])`, and the test asserts `mockFetchAllFeedsCached` is not called — good.
This is a confirmation, not a defect: the short-circuit is correct and worth keeping. No
change required; noted so a future refactor does not accidentally remove the guard (which
would issue a pointless network/DB fan-out for zero members).
**Fix:** None. Keep the length guard.

### IN-02: `proxy` matcher uses prefix semantics that also match sibling paths via `startsWith`

**File:** `src/proxy.ts:34,41,50-52` (out of changed set; flagged for awareness)
**Issue:** The runtime checks use `pathname.startsWith('/admin')` / `startsWith('/my')`. The
`config.matcher` already scopes invocation to `/admin`, `/admin/:path*`, `/my`, `/my/:path*`,
so the `startsWith` check is redundant with the matcher and would also be true for a
hypothetical `/administrator` or `/mypage` path (confirmed `'/administrator'.startsWith('/admin')`
is `true`). Today no such routes exist so there is no live vulnerability, but the
prefix-match pattern is a latent authorization-scope hazard if a route like `/myaccount` (no
auth intended) is added later. Not in scope for this phase's files but relevant to the
authorization story under review.
**Fix:** Prefer exact segment matching, e.g. `pathname === '/admin' || pathname.startsWith('/admin/')`.

---

_Reviewed: 2026-05-30T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
