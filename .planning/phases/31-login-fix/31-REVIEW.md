---
phase: 31-login-fix
reviewed: 2026-06-05T00:00:00Z
depth: standard
files_reviewed: 16
files_reviewed_list:
  - src/app/admin/AdminMemberList.tsx
  - src/app/admin/__tests__/updateMemberAction.test.ts
  - src/app/admin/actions.ts
  - src/app/auth/__tests__/callback.test.ts
  - src/app/auth/callback/route.ts
  - src/app/login-51cf21389c56/LoginForm.tsx
  - src/app/login-51cf21389c56/__tests__/sendMagicLinkAction.test.ts
  - src/app/login-51cf21389c56/actions.ts
  - src/app/my/MyProfileForm.tsx
  - src/app/my/__tests__/updateMyProfileAction.test.ts
  - src/app/my/actions.ts
  - src/app/my/page.tsx
  - src/lib/members.ts
  - src/lib/types.ts
  - supabase/migrations/20260605000000_add_substack_handle_unique.sql
  - supabase/schema.sql
findings:
  critical: 2
  warning: 4
  info: 1
  total: 7
status: issues_found
---

# Phase 31: Code Review Report

**Reviewed:** 2026-06-05T00:00:00Z
**Depth:** standard
**Files Reviewed:** 16
**Status:** issues_found

## Summary

This phase implements a login flow fix: magic-link generation captures `pid` and `substack_handle` in the callback URL, the callback route auto-inserts a new member row if one does not exist, and the profile page allows a user to set their handle for the first time. The overall architecture is sound, but two blockers were found: a data-loss bug that silently clears `substack_handle` on every profile save, and an invalid PostgreSQL migration syntax that will fail at deploy time. Four additional warnings address error-handling gaps and a dead-code path.

---

## Critical Issues

### CR-01: `MyProfileForm` clears `substack_handle` to `null` on every save when a handle is already set

**File:** `src/app/my/MyProfileForm.tsx:52`

**Issue:** When `substackHandle != null`, the form renders the value inside a `<p>` element (read-only display) and does **not** render an `<input name="substack_handle">`. When the form is submitted, `FormData.get('substack_handle')` therefore returns `null`. In `updateMyProfileAction` (`src/app/my/actions.ts:50-51`):

```ts
const rawHandle = (formData.get('substack_handle') as string | null)?.trim() ?? ''
// null?.trim() → undefined; undefined ?? '' → ''
const substack_handle: string | null = rawHandle === '' ? null : ...
// '' === '' → null
```

The update then executes `.update({ name, substack_handle: null })`, overwriting the stored handle with `NULL`. Any user who saves their profile after their Substack handle has been auto-set by the callback route will lose that handle silently.

**Fix:** Add a hidden input to propagate the existing value when the handle is already set:

```tsx
{substackHandle != null ? (
  <div>
    <label className="block text-sm font-semibold mb-1">Substack ハンドル</label>
    {/* Hidden input preserves the value so the server action does not clear it */}
    <input type="hidden" name="substack_handle" value={substackHandle} />
    <p className="text-sm text-gray-400 border rounded px-3 py-2 bg-gray-100">{substackHandle}</p>
    <p className="text-xs text-gray-500 mt-1">Substack ハンドルは変更できません</p>
  </div>
) : (
  // ... editable input as before
)}
```

Alternatively, the server action can treat an absent `substack_handle` field (raw `null` from `FormData.get`) differently from an explicitly empty string, and skip the update in that case.

---

### CR-02: Migration uses invalid PostgreSQL syntax — `ADD CONSTRAINT IF NOT EXISTS` does not exist

**File:** `supabase/migrations/20260605000000_add_substack_handle_unique.sql:4`

**Issue:** The migration contains:

```sql
ALTER TABLE members ADD CONSTRAINT IF NOT EXISTS members_substack_handle_key UNIQUE (substack_handle);
```

`ALTER TABLE … ADD CONSTRAINT IF NOT EXISTS` is **not valid PostgreSQL syntax**. PostgreSQL supports `ADD COLUMN IF NOT EXISTS` but has never had an `IF NOT EXISTS` clause for `ADD CONSTRAINT`. Running this migration will fail with:

```
ERROR: syntax error at or near "IF"
```

The migration is intended to be idempotent so that it can be applied to databases where the column already exists without the unique constraint (added by the previous migration `20260602000000_add_substack_handle.sql`).

**Fix:** Use a `DO` block to check for constraint existence before adding it:

```sql
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'members_substack_handle_key'
      AND conrelid = 'members'::regclass
  ) THEN
    ALTER TABLE members
      ADD CONSTRAINT members_substack_handle_key UNIQUE (substack_handle);
  END IF;
END
$$;

COMMIT;
```

Note: `schema.sql` already declares `substack_handle TEXT UNIQUE` for fresh databases, so this migration only needs to target existing databases that have the column without the constraint.

---

## Warnings

### WR-01: `next` / `nextParam` variables computed but never used — dead code

**File:** `src/app/auth/callback/route.ts:10-12`

**Issue:** Two variables are computed that are never read again:

```ts
const nextParam = searchParams.get('next') ?? '/my'   // line 10
const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/my'  // line 12
```

Line 57 always redirects to `/my` unconditionally. The `?next=` query-parameter feature was apparently removed (per the D-02 comment on line 56), but the dead code was not cleaned up. This creates confusion: a reader may expect `next` to be respected but it silently never is.

**Fix:** Delete lines 10–12. If the `?next=` feature should be re-enabled, use `next` on line 57 instead of the hardcoded `'/my'`.

---

### WR-02: Fallback INSERT error in callback route is silently discarded

**File:** `src/app/auth/callback/route.ts:47-49`

**Issue:** When the first INSERT fails with code `23505` (duplicate `substack_handle`), a fallback INSERT is attempted with `substack_handle: null`. The result of the fallback is not captured:

```ts
if (insertError?.code === '23505') {
  // fallback — result not captured; errors silently lost
  await admin
    .from('members')
    .insert({ ...insertPayload, substack_handle: null })
}
```

If the fallback INSERT also fails (e.g., a race condition on `publication_id` uniqueness, or a transient DB error), the error is discarded, the user is still redirected to `/my`, and they will have no member row — causing a broken profile page.

**Fix:** Capture and log the fallback error:

```ts
if (insertError?.code === '23505') {
  const { error: fallbackError } = await admin
    .from('members')
    .insert({ ...insertPayload, substack_handle: null })
  if (fallbackError) {
    console.error('[auth/callback] fallback member insert:', fallbackError)
  }
}
```

---

### WR-03: `substack_handle` not normalized in callback route — inconsistent `@` prefix

**File:** `src/app/auth/callback/route.ts:39`

**Issue:** The callback stores the `handle` URL parameter directly:

```ts
substack_handle: handle || null,
```

The `handle` parameter originates from the magic-link URL generated by `sendMagicLinkAction`, which itself takes the value verbatim from the login page's `?handle=` query parameter. There is no `@` prefix normalization in the callback path. By contrast, both `updateMemberAction` (`src/app/admin/actions.ts:74-77`) and `updateMyProfileAction` (`src/app/my/actions.ts:51`) normalize handles by prepending `@` if absent.

If the login page URL is ever generated with `handle=hoge` (no `@`), the callback stores `"hoge"` while all other code paths would store `"@hoge"`. This creates inconsistent data and will break any downstream display logic that expects the `@` prefix.

**Fix:** Normalize the handle in the callback route before storing:

```ts
const rawHandle = handle?.trim() ?? ''
const normalizedHandle = rawHandle === '' ? null
  : rawHandle.startsWith('@') ? rawHandle : '@' + rawHandle

const insertPayload = {
  publication_id: pid,
  name: pid,
  user_id: user.id,
  substack_handle: normalizedHandle,
}
```

---

### WR-04: `deleteMemberAction` errors are unhandled in `AdminMemberList` — unhandled promise rejection

**File:** `src/app/admin/AdminMemberList.tsx:13-16`

**Issue:** `handleDelete` calls `deleteMemberAction` without a `try/catch`:

```ts
async function handleDelete(publicationId: string) {
  if (!window.confirm(`"${publicationId}" を削除しますか？`)) return
  await deleteMemberAction(publicationId)
  // no error handling
}
```

`deleteMemberAction` can throw in two ways: `requireAdmin()` throws `Error('Unauthorized')` if the session expires between page load and click, and `deleteMember` / `deleteArticles` throw on database errors. An unhandled rejection in a React event handler will surface as an uncaught browser error with no user-visible feedback.

**Fix:**

```ts
async function handleDelete(publicationId: string) {
  if (!window.confirm(`"${publicationId}" を削除しますか？`)) return
  try {
    await deleteMemberAction(publicationId)
  } catch (e) {
    setEditError(e instanceof Error ? e.message : '削除に失敗しました')
  }
}
```

Note: `editError` is only shown inside the currently-editing row. For the delete case (which operates on a non-editing row) a separate error state may be needed, or the error can be shown via an alert.

---

## Info

### IN-01: `origin` header fallback produces a non-functional magic-link callback URL

**File:** `src/app/login-51cf21389c56/actions.ts:20-23`

**Issue:** The callback URL is built from the HTTP `Origin` header:

```ts
const origin = headersList.get('origin') ?? ''
const callbackUrl = `${origin}/auth/callback?pid=...&handle=...`
```

When `origin` is absent (which can happen in non-browser HTTP clients, server-to-server calls, or certain proxy configurations), `callbackUrl` becomes a relative path like `/auth/callback?pid=…`. Supabase's `signInWithOtp` requires `emailRedirectTo` to be an absolute URL; a relative path will either be rejected or cause the magic link to redirect incorrectly.

This is not a security issue (Next.js server actions enforce same-origin via CSRF checks), but it is a reliability gap.

**Fix:** Fall back to a configured environment variable:

```ts
const origin = headersList.get('origin')
  ?? process.env.NEXT_PUBLIC_SITE_URL
  ?? ''
```

---

_Reviewed: 2026-06-05T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
