---
phase: 31-login-fix
reviewed: 2026-06-06T00:00:00Z
depth: standard
files_reviewed: 22
files_reviewed_list:
  - supabase/migrations/20260605000000_add_substack_handle_unique.sql
  - supabase/schema.sql
  - src/app/auth/callback/route.ts
  - src/app/auth/__tests__/callback.test.ts
  - src/app/my/actions.ts
  - src/app/my/__tests__/updateMyProfileAction.test.ts
  - src/app/admin/__tests__/updateMemberAction.test.ts
  - src/lib/members.ts
  - src/lib/types.ts
  - src/app/admin/actions.ts
  - src/app/admin/AdminMemberList.tsx
  - src/app/my/MyProfileForm.tsx
  - src/app/my/page.tsx
  - src/app/my/__tests__/page.test.tsx
  - src/app/member/[publicationId]/page.tsx
  - src/app/login/actions.ts
  - src/app/login/LoginForm.tsx
  - src/app/login/page.tsx
  - src/app/login/__tests__/sendMagicLinkAction.test.ts
  - src/app/signin-51cf21389c56/actions.ts
  - src/app/signin-51cf21389c56/LoginForm.tsx
  - src/app/signin-51cf21389c56/page.tsx
  - src/app/signin-51cf21389c56/__tests__/sendMagicLinkAction.test.ts
findings:
  critical: 2
  warning: 3
  info: 3
  total: 8
status: issues_found
---

# Phase 31: Code Review Report

**Reviewed:** 2026-06-06T00:00:00Z
**Depth:** standard
**Files Reviewed:** 22
**Status:** issues_found

## Summary

This phase splits the login flow into two routes: `signin-51cf21389c56` (new member registration, requires `pid` + `handle`) and `/login` (existing member re-login, bare callback URL). The `auth/callback` route was extended to INSERT a new member row when `pid` is present but no existing member record is found, including a 23505-fallback that retries with `substack_handle: null`. The `MyProfileForm` renders the handle as read-only once set (via a hidden input to preserve the value on save).

Two critical issues were found. First, `updateMyProfileAction` does not enforce server-side immutability of `substack_handle`: any authenticated user can POST an arbitrary handle value to overwrite their stored handle, bypassing the client-side read-only UI. Second, the 23505 error code check in the callback route does not distinguish a `substack_handle` collision from a `publication_id` collision — the fallback INSERT silently discards its own error, leaving the user with no member record on a `publication_id` conflict.

---

## Critical Issues

### CR-01: `substack_handle` immutability enforced client-side only — any user can overwrite their handle

**File:** `src/app/my/actions.ts:50-51` / `src/app/my/MyProfileForm.tsx:52-58`

**Issue:** `MyProfileForm` renders a `<input type="hidden" name="substack_handle" value={substackHandle} />` to preserve a non-null handle through the form submission. This is a client-side mechanism only. `updateMyProfileAction` reads `formData.get('substack_handle')` and writes whatever value arrives unconditionally:

```ts
// actions.ts lines 50-51, 64
const rawHandle = (formData.get('substack_handle') as string | null)?.trim() ?? ''
const substack_handle: string | null = rawHandle === '' ? null : rawHandle.startsWith('@') ? rawHandle : '@' + rawHandle
// ...
await admin.from('members').update({ name, substack_handle }).eq('user_id', user.id)
```

Any authenticated user can craft a POST request with a different `substack_handle` value, overwriting their stored handle to any string, including attempting to claim another user's handle (which would fail with a 23505 unique error returned as a user-facing message — but the attempt is unbounded). There is no server-side check that the existing handle is already set before accepting a new one.

**Fix:** In `updateMyProfileAction`, fetch the current `substack_handle` from the database first. If already non-null, preserve it and ignore the submitted value:

```ts
const { data: current } = await admin
  .from('members')
  .select('substack_handle')
  .eq('user_id', user.id)
  .single()

const substack_handle: string | null =
  current?.substack_handle != null
    ? current.substack_handle          // already set — preserve DB value, ignore form input
    : rawHandle === '' ? null
      : rawHandle.startsWith('@') ? rawHandle : '@' + rawHandle
```

---

### CR-02: 23505 error in `auth/callback` does not distinguish `publication_id` collision from `substack_handle` collision; fallback INSERT error is silently discarded

**File:** `src/app/auth/callback/route.ts:44-51`

**Issue:** Both `publication_id` (UNIQUE NOT NULL) and `substack_handle` (UNIQUE) carry unique constraints. When the initial INSERT fails, the code checks only for error code `'23505'` and assumes the conflict is on `substack_handle`:

```ts
if (insertError?.code === '23505') {
  // assumed to be substack_handle collision, but could be publication_id
  await admin
    .from('members')
    .insert({ ...insertPayload, substack_handle: null })
  // ← result never captured; error silently discarded
}
```

If the conflict is on `publication_id` (another user has already claimed the same `pid`), the fallback INSERT also fails with 23505 and the error is silently dropped. The user is then redirected to `/my` with no member record, which renders `LinkMemberForm` instead of their profile — a confusing broken state with no error message.

**Fix:** Capture and log the fallback INSERT error at minimum. Ideally inspect the error detail to distinguish which constraint was violated:

```ts
if (insertError?.code === '23505') {
  const { error: fallbackError } = await admin
    .from('members')
    .insert({ ...insertPayload, substack_handle: null })
  if (fallbackError) {
    console.error('[auth/callback] fallback member insert:', fallbackError)
    // Consider redirecting to an error page or / instead of /my
  }
}
```

To distinguish constraints, check `insertError.message` — Supabase includes the constraint name in the error detail (e.g., `members_substack_handle_key` vs `members_publication_id_key`).

---

## Warnings

### WR-01: `substack_handle` not normalized in `auth/callback` — missing `@` prefix

**File:** `src/app/auth/callback/route.ts:9,39`

**Issue:** `handle = searchParams.get('handle')` is stored directly as `substack_handle: handle || null` without normalization. Every other write path for `substack_handle` (`my/actions.ts:51`, `admin/actions.ts:75-77`) ensures a leading `@` prefix is present. If the callback URL contains `?handle=hoge` (no `@`), the DB stores `'hoge'`. `CalendarGrid` constructs the Substack profile URL as `'https://substack.com/' + substackHandle`, so a handle stored without `@` produces `https://substack.com/hoge` instead of the correct `https://substack.com/@hoge`.

**Fix:** Apply the same normalization used in the other action files:

```ts
const rawHandle = (searchParams.get('handle') ?? '').trim()
const normalizedHandle: string | null =
  rawHandle === '' ? null
  : rawHandle.startsWith('@') ? rawHandle : '@' + rawHandle
// then use normalizedHandle instead of handle || null
```

---

### WR-02: Dead `next` / `nextParam` variables — misleading dead code in `auth/callback`

**File:** `src/app/auth/callback/route.ts:10-12`

**Issue:** Two variables are computed but never consumed:

```ts
const nextParam = searchParams.get('next') ?? '/my'
// open-redirect protection applied...
const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/my'
// 'next' is never used below; line 57 redirects to hardcoded '/my'
```

The presence of the open-redirect guard logic implies that `next` is or will be used for dynamic post-login routing, but it is not. A future developer may add a redirect that inadvertently skips the protection, or may add `?next=/somewhere` to a URL and be confused when it is silently ignored.

**Fix:** Delete lines 10-12. If the `?next=` feature is ever needed, introduce it deliberately and use the `next` variable in the redirect.

---

### WR-03: `deleteMemberAction` propagates unhandled exception to browser on auth failure

**File:** `src/app/admin/actions.ts:52-57` / `src/app/admin/AdminMemberList.tsx:13-16`

**Issue:** `deleteMemberAction` does not wrap `requireAdmin()` in a try/catch, unlike `addMemberAction` and `updateMemberAction`:

```ts
export async function deleteMemberAction(publicationId: string): Promise<void> {
  await requireAdmin()  // throws Error('Unauthorized') if session expires
  await deleteMember(publicationId)
  await deleteArticles(publicationId)
  revalidatePath('/admin')
}
```

`AdminMemberList.handleDelete` also lacks error handling. An expired session or DB error causes an unhandled promise rejection in the browser with no user-visible feedback.

**Fix:** Wrap requireAdmin in the action, matching the pattern used by other admin actions:

```ts
export async function deleteMemberAction(publicationId: string): Promise<string | null> {
  try { await requireAdmin() } catch { return '権限がありません' }
  try {
    await deleteMember(publicationId)
    await deleteArticles(publicationId)
  } catch (e) {
    return e instanceof Error ? e.message : '削除に失敗しました'
  }
  revalidatePath('/admin')
  return null
}
```

And in `handleDelete`:

```ts
async function handleDelete(publicationId: string) {
  if (!window.confirm(`"${publicationId}" を削除しますか？`)) return
  const error = await deleteMemberAction(publicationId)
  if (error) setEditError(error)
}
```

---

## Info

### IN-01: Dead `handle` variable in `my/page.tsx` after D-03 refactor

**File:** `src/app/my/page.tsx:14`

**Issue:** `const { handle } = await searchParams` destructures the `handle` URL parameter, but `handle` is never referenced anywhere in the function body. After the D-03 change, `substackHandle` is read exclusively from the database (`(member as any)?.substack_handle ?? null`). The unused destructuring and the `handle?: string` in the searchParams type are leftover dead code that mislead readers into thinking the URL parameter has an effect.

**Fix:** Remove the unused `handle` destructuring. If `searchParams` is also otherwise unused, simplify the page signature to remove the parameter entirely.

---

### IN-02: `getMembers()` maps DB `null` to `undefined` for `substackHandle` — loses the null signal

**File:** `src/lib/members.ts:30`

**Issue:** `substackHandle: m.substack_handle ?? undefined` converts a DB `null` (explicitly cleared handle) to `undefined` (field not set). The `Member` type declares `substackHandle?: string | null`, so both are valid. However, any caller that tests `substackHandle === null` to detect an explicitly cleared handle (as opposed to an unset/unavailable one) will never see `null` from `getMembers()`. Currently this does not cause a runtime bug, but it pollutes the type contract and could cause silent failures if the distinction is relied upon in future code.

**Fix:** Preserve the `null`:

```ts
// Before
substackHandle: m.substack_handle ?? undefined,
// After
substackHandle: m.substack_handle,   // null from DB stays null
```

---

### IN-03: SQL migration uses unqualified `'members'::regclass`

**File:** `supabase/migrations/20260605000000_add_substack_handle_unique.sql:7`

**Issue:** `AND conrelid = 'members'::regclass` resolves the table using the current `search_path`. If the migration runs in a context where `search_path` does not include `public` (e.g., a migration runner that sets `search_path = ''`), the cast will throw "relation does not exist" and the idempotency guard will fail, causing the `ALTER TABLE` below it to execute even when the constraint already exists and fail with a duplicate-constraint error.

**Fix:** Use a schema-qualified reference:

```sql
AND conrelid = 'public.members'::regclass
```

---

_Reviewed: 2026-06-06_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
