---
phase: 27-substack-handle-db
reviewed: 2026-06-02T00:00:00Z
depth: standard
files_reviewed: 15
files_reviewed_list:
  - src/app/auth/__tests__/callback.test.ts
  - src/app/auth/callback/route.ts
  - src/app/login-51cf21389c56/LoginForm.tsx
  - src/app/login-51cf21389c56/actions.ts
  - src/app/login-51cf21389c56/page.tsx
  - src/app/member/[publicationId]/page.tsx
  - src/app/my/MyProfileForm.tsx
  - src/app/my/actions.ts
  - src/app/my/page.tsx
  - src/components/CalendarGrid.tsx
  - src/components/__tests__/CalendarGrid.test.tsx
  - src/lib/members.ts
  - src/lib/types.ts
  - supabase/migrations/20260602000000_add_substack_handle.sql
  - supabase/schema.sql
findings:
  critical: 2
  warning: 3
  info: 1
  total: 6
status: issues_found
---

# Phase 27: Code Review Report

**Reviewed:** 2026-06-02T00:00:00Z
**Depth:** standard
**Files Reviewed:** 15
**Status:** issues_found

## Summary

Phase 27 adds a `substack_handle` column to the `members` table, wires it through the auth flow (magic-link → callback → `/my` pre-fill), and surfaces it in `CalendarGrid` as a profile link. The DB migration and schema are consistent. The auth flow propagation (login → callback → `/my?handle=`) is structurally correct.

Two blockers were found: the admin-path `updateMember()` utility silently drops `substackHandle` updates (dead write path), and the `sendMagicLinkAction` uses an unvalidated `Origin` request header to construct the magic-link redirect URL, enabling an attacker to redirect Supabase magic-link emails to an arbitrary domain. Three warnings cover missing input validation on the handle field, unsafe URL string concatenation in `CalendarGrid`, and a logic gap in the handle-vs-next redirect.

## Critical Issues

### CR-01: `updateMember()` silently drops `substackHandle` — admin writes are lost

**File:** `src/lib/members.ts:94-103`
**Issue:** `updateMember()` builds a `memberUpdate` object only for `name` and `addedAt`. The `substackHandle` field on the `Member` type is never mapped to `substack_handle` in the update payload. Any caller that passes `updates: { substackHandle: '...' }` will silently perform a no-op DB write. This is already a latent defect that will surface as soon as an admin tool or script attempts to set the handle via this function.
**Fix:**
```typescript
const memberUpdate: Record<string, unknown> = {}
if (updates.name !== undefined) memberUpdate.name = updates.name
if (updates.addedAt !== undefined) memberUpdate.added_at = updates.addedAt
// ADD THIS:
if (updates.substackHandle !== undefined) memberUpdate.substack_handle = updates.substackHandle ?? null
```

### CR-02: `sendMagicLinkAction` uses unvalidated `Origin` header as redirect base URL

**File:** `src/app/login-51cf21389c56/actions.ts:17`
**Issue:** The `Origin` request header is read from the incoming HTTP request and concatenated directly into `callbackUrl` (the `emailRedirectTo` value sent to Supabase). An attacker can forge a `POST` request with `Origin: https://evil.com` and cause Supabase to embed `https://evil.com/auth/callback?...` in the magic-link email. If the victim clicks the link, the auth code is delivered to the attacker's server instead. Supabase's redirect URL allowlist is the only defence — but the application should not rely solely on the email provider's allowlist for redirect safety.
**Fix:** Derive the application origin from a server-side environment variable, not from the request header:
```typescript
// Replace:
const origin = headersList.get('origin') ?? ''

// With:
const origin = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL ?? ''
// Ensure NEXT_PUBLIC_SITE_URL is set in all deployment environments.
```

## Warnings

### WR-01: `substack_handle` accepts arbitrary string with no character or length validation

**File:** `src/app/my/actions.ts:50-51`
**Issue:** The only normalization applied to the raw handle value is trimming and optional `@`-prefix addition. No character set, length limit, or format check is performed. A user can store multi-kilobyte values, Unicode control characters, or path-traversal sequences (e.g. `@../../../../etc/passwd`). The DB column is plain `TEXT` with no `CHECK` constraint, so all such values persist. When the stored handle is later used to construct a Substack profile URL in `CalendarGrid` (see WR-02), it is concatenated without encoding.
**Fix:** Apply a format constraint before writing:
```typescript
const HANDLE_RE = /^@[A-Za-z0-9_.-]{1,50}$/
const substack_handle: string | null =
  rawHandle === ''
    ? null
    : (() => {
        const h = rawHandle.startsWith('@') ? rawHandle : '@' + rawHandle
        if (!HANDLE_RE.test(h)) return 'INVALID' // propagate error upstream
        return h
      })()

if (substack_handle === 'INVALID') return 'Substack ハンドルの形式が正しくありません（例: @yourname）'
```
Also add a DB-level CHECK constraint in a follow-up migration:
```sql
ALTER TABLE members
  ADD CONSTRAINT chk_substack_handle
  CHECK (substack_handle IS NULL OR substack_handle ~ '^@[A-Za-z0-9_.\\-]{1,50}$');
```

### WR-02: `CalendarGrid` constructs Substack URL by raw string concatenation — no encoding

**File:** `src/components/CalendarGrid.tsx:65`
**Issue:** The anchor's `href` is built as `'https://substack.com/' + substackHandle`. If `substackHandle` contains characters such as `?`, `#`, spaces, or path segments (e.g. `@foo%2F../bar`), the resulting URL is malformed or navigates to an unexpected location. Even though the current DB-stored values are normalized (and WR-01 fix would constrain them further), the field also flows from the unvalidated URL query param via `substackHandleDefault` in `my/page.tsx` line 48 before any DB save occurs, so on first render the value may be raw user input.
**Fix:** Use a `URL` constructor or `encodeURIComponent` to build the href safely:
```tsx
const substackUrl = substackHandle
  ? `https://substack.com/${encodeURIComponent(substackHandle)}`
  : undefined
```
Then use `href={substackUrl}` in the anchor tag.

### WR-03: When `handle` is present in callback, the validated `next` parameter is unconditionally ignored

**File:** `src/app/auth/callback/route.ts:36`
**Issue:** The `next` parameter is validated (lines 10-12) to prevent open-redirect via protocol-relative URLs. However on line 36, when `handle` is non-null, the redirect destination is always `/my?handle=...` regardless of what `next` contains. If a caller intended `next=/some/deep/path` alongside a `handle`, that intent is silently discarded. Conversely, if `handle` is absent, `next` is used as-is — so the two parameters are not composable. This is a logic inconsistency: the handle and the next destination are treated as mutually exclusive rather than orthogonal.

This is not an open-redirect vulnerability (because `handle` is just appended to `/my`), but it is a behaviour contract gap that will cause silent misdirection if another flow tries to combine both.
**Fix:** Apply handle as a query parameter on top of the `next` path rather than replacing it:
```typescript
// Build redirect URL from validated `next`, then conditionally append handle
const redirectUrl = new URL(next, origin)
if (handle) redirectUrl.searchParams.set('handle', handle)
return NextResponse.redirect(redirectUrl)
```

## Info

### IN-01: `members.ts` `updateMember` team upsert creates teams without status restriction

**File:** `src/lib/members.ts:113-116`
**Issue:** The `updateMember` admin utility uses `.upsert({ name: teamName })` which creates any team with no `status` value set (defaults to `'public'` by DB constraint). This is inconsistent with the web UI path in `actions.ts` that restricts team operations to pre-existing public teams only. An admin script calling `updateMember` with a novel team name could inadvertently expose it publicly. This is a pre-existing issue, not introduced in Phase 27, but surfaced here because the `Member` type now has an additional field that made this function's gap visible.
**Fix:** For admin writes that only intend to update teams, prefer explicit `INSERT` with `status` set rather than relying on the default via `upsert`.

---

_Reviewed: 2026-06-02T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
