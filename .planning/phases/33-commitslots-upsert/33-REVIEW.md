---
phase: 33-commitslots-upsert
reviewed: 2026-06-08T00:00:00Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - e2e/admin-guard.spec.ts
  - src/__tests__/proxy.test.ts
  - src/admin-guard.ts
  - src/app/auth/callback/route.ts
  - src/app/login/LoginForm.tsx
  - src/app/login/__tests__/sendMagicLinkAction.test.ts
  - src/app/login/actions.ts
  - src/app/login/page.tsx
  - src/app/my/__tests__/updateCommitSlotsAction.test.ts
  - src/app/my/actions.ts
  - src/middleware.test.ts
  - src/middleware.ts
  - supabase/migrations/20260608000000_add_replace_member_commit_slots_rpc.sql
  - supabase/schema.sql
findings:
  critical: 1
  warning: 3
  info: 2
  total: 6
status: issues_found
---

# Phase 33: Code Review Report

**Reviewed:** 2026-06-08T00:00:00Z
**Depth:** standard
**Files Reviewed:** 14
**Status:** issues_found

## Summary

Phase 33 adds the `updateCommitSlotsAction` server action backed by a new `replace_member_commit_slots` RPC, plus middleware fixes that redirect unauthenticated `/my` requests to `/login?next=...`. The SQL migration and schema.sql are consistent and the action's input validation is structurally sound. However, a latent open-redirect bypass via backslash-prefixed paths (`/\evil.com`) exists in two separate validation points and reaches production code paths. Several secondary issues exist around guard-module divergence, missing input deduplication, and a misleading comment in the E2E spec.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: Open redirect bypass via backslash path (`/\evil.com`)

**Files:**
- `src/app/auth/callback/route.ts:12`
- `src/app/login/page.tsx:15`

**Issue:** Both files validate the `next` parameter using `startsWith('/') && !startsWith('//')`. This guard misses the `\` (backslash) path bypass: `new URL('/\\evil.com', origin)` resolves to `https://evil.com/` in the WHATWG URL API used by Node.js and browsers.

Verified in the runtime:
```
node -e "console.log(new URL('/\\\\evil.com', 'https://myapp.com').href)"
# → https://evil.com/
```

Attack vector in `auth/callback/route.ts`:
1. Attacker sends a magic-link request with `next=/\evil.com` encoded in the email callback URL.
2. `nextParam = '/\\evil.com'`, passes both checks (`startsWith('/')=true`, `startsWith('//')=false`).
3. `new URL('/\\evil.com', origin)` resolves to `https://evil.com/` and the user is redirected there after login.

The same flaw exists in `login/page.tsx` `safeNext` computation, which feeds the hidden `next` field in the form and eventually reaches `sendMagicLinkAction`.

**Fix:** Replace the hand-rolled check with a URL-parse-based validation that verifies the resolved URL stays on the same origin:

```typescript
// Shared utility (e.g., src/lib/safe-redirect.ts)
export function safeRedirectPath(input: string | null | undefined, fallback = '/my'): string {
  if (!input) return fallback
  try {
    // Resolve against a dummy base; if the result's origin differs, reject it
    const resolved = new URL(input, 'https://__internal__')
    if (resolved.origin !== 'https://__internal__') return fallback
    return resolved.pathname + resolved.search + resolved.hash
  } catch {
    return fallback
  }
}
```

Apply in `auth/callback/route.ts`:
```typescript
import { safeRedirectPath } from '@/lib/safe-redirect'
const next = safeRedirectPath(searchParams.get('next'), '/my')
```

Apply in `login/page.tsx`:
```typescript
import { safeRedirectPath } from '@/lib/safe-redirect'
const safeNext = safeRedirectPath(next) ?? undefined
```

## Warnings

### WR-01: `admin-guard.ts` redirects `/my` to `/` — diverges from `middleware.ts`

**File:** `src/admin-guard.ts:44-47`

**Issue:** The `proxy()` function in `admin-guard.ts` redirects unauthenticated `/my` requests to `/` (the site root):

```typescript
if (pathname.startsWith('/my')) {
  if (!user) {
    return NextResponse.redirect(new URL('/', request.url))  // ← redirects to /
  }
}
```

`middleware.ts` (the actual production middleware) correctly redirects to `/login?next=<path>`. `admin-guard.ts` is described as a unit-test-only module, but this behavioral divergence means `proxy.test.ts` does not exercise the correct redirect semantics for `/my`. If `admin-guard.ts` is ever referenced outside of tests, the wrong redirect would silently break the UX. The E2E spec (`admin-guard.spec.ts:16-18`) verifies the middleware redirect to `/login` and that test would pass while the guard module contains incorrect logic.

**Fix:** Either align `admin-guard.ts` to match `middleware.ts`:
```typescript
if (pathname.startsWith('/my')) {
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = `?next=${encodeURIComponent(pathname)}`
    return NextResponse.redirect(url)
  }
}
```
Or delete `admin-guard.ts` and have `proxy.test.ts` import and test `middleware.ts` directly (since `middleware.ts` now exports `middleware` and the test infrastructure is identical).

### WR-02: No duplicate `day_of_week` validation in `updateCommitSlotsAction`

**File:** `src/app/my/actions.ts:146-154`

**Issue:** The action validates slot count, type, and range but does not check for duplicate `day_of_week` values within the submitted array. If a client submits `[{day_of_week:1,hour:8},{day_of_week:1,hour:9}]` (two slots for the same weekday), the array passes all current checks, reaches the RPC, and the `INSERT` inside `replace_member_commit_slots` fails on the `UNIQUE (member_id, day_of_week)` constraint. The user receives the generic `'保存に失敗しました。もう一度お試しください'` message with no explanation.

**Fix:** Add a uniqueness check before the auth check (early validation):
```typescript
const daySet = new Set(slots.map((s) => s.day_of_week))
if (daySet.size !== slots.length) return '同じ曜日を複数指定することはできません'
```

### WR-03: E2E comment names the wrong role field

**File:** `e2e/admin-guard.spec.ts:21`

**Issue:** The comment reads `"proxy.ts checks app_metadata.role === 'admin'"` but the actual guard code in both `admin-guard.ts:38` and `middleware.ts:36` checks `user.role !== 'admin'` — the JWT-level `role` claim on `auth.users`, not `app_metadata.role`. These are different fields. `app_metadata.role` is the conventional location for custom roles set by application logic; `user.role` is the Supabase-assigned JWT audience claim (defaulting to `authenticated`).

This misleading comment will cause confusion when an admin needs to be provisioned: a developer following the comment would set `app_metadata.role = 'admin'` (which has no effect on the check) rather than `auth.users.role = 'admin'` (which is what the code actually reads).

**Fix:** Correct the comment and ensure provisioning documentation matches the implementation:
```typescript
// Non-admin logged-in case: middleware checks user.role === 'admin'
// (auth.users.role JWT claim — set via Supabase admin API or SQL:
//   UPDATE auth.users SET role = 'admin' WHERE id = '<uuid>')
```

## Info

### IN-01: `replace_member_commit_slots` RPC has no `REVOKE EXECUTE` for the anon role

**Files:**
- `supabase/schema.sql:150-170`
- `supabase/migrations/20260608000000_add_replace_member_commit_slots_rpc.sql:4-24`

**Issue:** PostgreSQL grants `EXECUTE` on new functions to `PUBLIC` by default. An anonymous (unauthenticated) caller with the public anon key can invoke `replace_member_commit_slots` directly via the PostgREST RPC endpoint. Because `auth.uid()` is `NULL` for anon callers, the RLS policy `USING (member_id = (SELECT id FROM members WHERE user_id = auth.uid()))` will match no rows, so the `DELETE` silently deletes nothing and the `INSERT` is skipped (or blocked by RLS). The operation is harmless in practice, but the unnecessary exposure violates the principle of least privilege.

**Fix:** Add to the migration (and schema.sql) after the function definition:
```sql
REVOKE EXECUTE ON FUNCTION replace_member_commit_slots(UUID, JSONB) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION replace_member_commit_slots(UUID, JSONB) TO service_role;
```

### IN-02: Member-lookup error path not exercised in unit tests

**File:** `src/app/my/__tests__/updateCommitSlotsAction.test.ts`

**Issue:** The `setupAdminMock()` helper supports `memberError` and `member: null` options, but no test actually passes either of these. The code path at `src/app/my/actions.ts:168-171` (member lookup failure → `'保存に失敗しました...'`) is never exercised. If the member lookup logic is later changed, the untested branch could silently regress.

**Fix:** Add a test case:
```typescript
it('メンバーが見つからない場合は保存エラーを返す', async () => {
  setupAdminMock({ member: null })
  const result = await updateCommitSlotsAction(null, makeFormData([{ day_of_week: 1, hour: 8 }]))
  expect(result).toBe('保存に失敗しました。もう一度お試しください')
  expect(mockAdminRpc).not.toHaveBeenCalled()
})
```

---

_Reviewed: 2026-06-08T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
