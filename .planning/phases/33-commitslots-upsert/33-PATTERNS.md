# Phase 33: バグ修正 + commitSlots upsert化 - Pattern Map

**Mapped:** 2026-06-08
**Files analyzed:** 9 (6 modified + 1 new + 2 new tests/migrations)
**Analogs found:** 9 / 9

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/middleware.ts` (NEW) | middleware | request-response | `src/proxy.ts` | exact |
| `src/app/auth/callback/route.ts` (MODIFY) | route handler | request-response | self (minimal change at line 59) | self |
| `src/app/login/page.tsx` (MODIFY) | component (Server) | request-response | `src/app/my/page.tsx` (searchParams pattern) | role-match |
| `src/app/login/actions.ts` (MODIFY) | service (Server Action) | request-response | self (add `next` param logic) | self |
| `src/app/login/LoginForm.tsx` (MODIFY) | component (Client) | request-response | self (add `next` prop + hidden input) | self |
| `src/app/my/actions.ts` (MODIFY) | service (Server Action) | CRUD | self (`updateCommitSlotsAction` → RPC) | self |
| `supabase/schema.sql` (MODIFY) | config | CRUD | `supabase/schema.sql` lines 116-143 (existing function) | exact |
| `supabase/migrations/20260608HHMMSS_add_replace_member_commit_slots_rpc.sql` (NEW) | migration | CRUD | `supabase/migrations/20260602000001_add_member_commit_slots.sql` | exact |
| `src/app/my/__tests__/updateCommitSlotsAction.test.ts` (MODIFY) | test | CRUD | self + `src/app/login/__tests__/sendMagicLinkAction.test.ts` (mock pattern) | exact |
| `e2e/admin-guard.spec.ts` (MODIFY) | test (E2E) | request-response | self (assertion update only) | self |

---

## Pattern Assignments

### `src/middleware.ts` (NEW — middleware, request-response)

**Analog:** `src/proxy.ts` (lines 1-52)

**Imports pattern** (`src/proxy.ts` lines 1-2):
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
```

**Core middleware pattern** (`src/proxy.ts` lines 4-48):
```typescript
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // セッションをリフレッシュ（getUser() はサーバー側検証でセキュア）
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // /my: ログイン必須
  if (pathname.startsWith('/my')) {
    if (!user) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/admin', '/admin/:path*', '/my', '/my/:path*'],
}
```

**Key delta from analog:** Three changes when creating `src/middleware.ts` from `proxy.ts`:
1. Rename export: `proxy` → `middleware`
2. Redirect target: `'/'` → `` `/login?next=${encodeURIComponent(pathname)}` ``
3. Matcher: remove `/admin` and `/admin/:path*`, keep `/my` and `/my/:path*` only

**Open Redirect guard** (`src/app/auth/callback/route.ts` line 14 — established project pattern):
```typescript
const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/my'
```
Apply the same `startsWith('/') && !startsWith('//')` check in middleware before building the redirect URL. In middleware context the pathname is always an internal path, but the pattern should be structurally consistent.

---

### `src/app/auth/callback/route.ts` (MODIFY — route handler, request-response)

**Analog:** self

**Existing redirect target** (line 59 — the line to change):
```typescript
// CURRENT (line 59):
return NextResponse.redirect(new URL('/my', origin))
```

**The `next` variable is already computed at line 14** (no change needed to the extraction/validation logic):
```typescript
// EXISTING lines 10-14 — already correct, keep as-is:
const nextParam = searchParams.get('next') ?? '/my'
// Open Redirect防止: 内部パスのみ許可
// TODO: next は現在ハードコードの '/my' リダイレクトに上書きされており未使用。
//       signin/login 両アクションが next= を渡すようになったら復活させること。
const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/my'
```

**Change:** Replace line 59 to use the already-validated `next` variable:
```typescript
// AFTER:
return NextResponse.redirect(new URL(next, origin))
```
Remove the TODO comment on line 12-13 as well.

---

### `src/app/login/page.tsx` (MODIFY — Server Component, request-response)

**Analog:** `src/app/login/page.tsx` (self) + `src/app/auth/callback/route.ts` lines 10-14 (searchParams pattern)

**Current file** (lines 1-16 — full current content):
```typescript
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import LoginForm from './LoginForm'

export default async function LoginPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/my')

  return (
    <main className="max-w-sm mx-auto px-4 py-16">
      <h1 className="text-2xl font-semibold mb-8 text-center">ログイン</h1>
      <LoginForm />
    </main>
  )
}
```

**Changes required:**
1. Add `searchParams: Promise<{ next?: string }>` prop to component signature
2. Await `searchParams` and extract/validate `next`
3. Pass `next={safeNext}` to `<LoginForm />`

**Pattern to copy for searchParams prop** (from Next.js App Router convention confirmed in RESEARCH.md Pattern 2):
```typescript
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  // ... existing auth check ...
  const { next } = await searchParams
  const safeNext = next && next.startsWith('/') && !next.startsWith('//')
    ? next
    : undefined
  return (
    // ...
    <LoginForm next={safeNext} />
  )
}
```

---

### `src/app/login/LoginForm.tsx` (MODIFY — Client Component, request-response)

**Analog:** self

**Current file** (lines 1-48 — full current content):
```typescript
'use client'

import { useActionState } from 'react'
import { sendMagicLinkAction } from './actions'

export default function LoginForm() {
  const [state, action, isPending] = useActionState(sendMagicLinkAction, null)
  // ...
  return (
    <form action={action} className="space-y-4">
      {/* ... email input, submit button ... */}
    </form>
  )
}
```

**Changes required:**
1. Add `next?: string` prop to component
2. Add `<input type="hidden" name="next" value={next} />` inside `<form>` when `next` is defined

**Hidden input pattern** (standard HTML form hidden input, consistent with `sendMagicLinkAction` reading `formData.get('next')`):
```typescript
export default function LoginForm({ next }: { next?: string }) {
  // ...
  return (
    <form action={action} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      {/* ... rest unchanged ... */}
    </form>
  )
}
```

---

### `src/app/login/actions.ts` (MODIFY — Server Action, request-response)

**Analog:** self

**Current file** (lines 1-39 — full current content):
```typescript
'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

export async function sendMagicLinkAction(
  prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const email = formData.get('email') as string
  if (!email) return 'メールアドレスを入力してください'

  const headersList = await headers()
  const origin = headersList.get('origin') ?? ''

  // 既存メンバー再ログイン用: callbackUrl は /auth/callback のみ（クエリパラメータなし）
  const callbackUrl = `${origin}/auth/callback`

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: callbackUrl,
    },
  })
  // ...
}
```

**Changes required:** Replace the static `callbackUrl` construction with a `next`-aware version:
```typescript
const next = formData.get('next') as string | null
// next は page.tsx 側で既にバリデーション済み。ここでは存在チェックのみ
const callbackUrl = next
  ? `${origin}/auth/callback?next=${encodeURIComponent(next)}`
  : `${origin}/auth/callback`
```

**Error handling pattern** (lines 27-37 — keep unchanged):
```typescript
if (error) {
  console.error('[sendMagicLink /login]', error)
  if (error.status === 429) {
    return '送信制限に達しました。しばらく待ってから再試行してください'
  }
  if (error.status === 500) {
    return 'メール送信の設定に問題があります。管理者にお問い合わせください'
  }
  return 'メールの送信に失敗しました。しばらく経ってから再試行してください'
}
```

---

### `src/app/my/actions.ts` — `updateCommitSlotsAction` (MODIFY — Server Action, CRUD)

**Analog:** self (lines 132-200)

**Existing validation + auth check pattern** (lines 132-170 — keep entirely unchanged):
```typescript
export async function updateCommitSlotsAction(
  prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const rawSlots = formData.get('slots') as string | null
  if (!rawSlots) return 'スロットデータが見つかりません'

  let slots: { day_of_week: number; hour: number }[]
  try {
    slots = JSON.parse(rawSlots)
  } catch {
    return 'スロットデータが不正です'
  }

  if (!Array.isArray(slots) || slots.length > 4) return '不正なスロット数です'
  for (const s of slots) {
    if (
      typeof s !== 'object' || s === null ||
      !Number.isInteger(s.day_of_week) || !Number.isInteger(s.hour)
    ) return 'スロットデータが不正です'
    if (s.day_of_week < 1 || s.day_of_week > 7) return '曜日の値が不正です'
    if (s.hour < 0 || s.hour > 23) return '時刻の値が不正です'
  }

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 'ログインセッションが切れました。再ログインしてください'

  const admin = createSupabaseAdminClient()

  const { data: member, error: memberError } = await admin
    .from('members')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (memberError || !member) {
    console.error('[updateCommitSlots] member lookup:', memberError)
    return '保存に失敗しました。もう一度お試しください'
  }
  // ... DB write follows (this is the part to replace)
```

**Existing non-atomic DB write** (lines 174-199 — REPLACE this entire block):
```typescript
  // TODO: delete+insert は非アトミック...
  const { error: deleteError } = await admin
    .from('member_commit_slots')
    .delete()
    .eq('member_id', member.id)
  // ... delete error check ...
  if (slots.length > 0) {
    const { error: insertError } = await admin
      .from('member_commit_slots')
      .insert(slots.map(s => ({ member_id: member.id, day_of_week: s.day_of_week, hour: s.hour })))
    // ...
  }
```

**Replacement RPC pattern** (from RESEARCH.md Pattern 3):
```typescript
  const { error: rpcError } = await admin.rpc('replace_member_commit_slots', {
    p_member_id: member.id,
    p_slots: slots,
  })

  if (rpcError) {
    console.error('[updateCommitSlots] rpc failed:', rpcError)
    return '保存に失敗しました。もう一度お試しください'
  }

  revalidatePath('/my')
  return null
```

---

### `supabase/schema.sql` (MODIFY — config, CRUD)

**Analog:** `supabase/schema.sql` lines 116-143 (existing `sync_member_publications` function)

**Existing function pattern** (lines 116-143 — copy structure):
```sql
CREATE OR REPLACE FUNCTION sync_member_publications()
RETURNS TRIGGER AS $$
BEGIN
  -- ... function body ...
END;
$$ LANGUAGE plpgsql;
```

**New function to append** after the existing trigger definition (after line 143):
```sql
-- ============================================================
-- 4. RPC Functions — アトミック書き込み
-- ============================================================

-- commitSlots の DELETE → INSERT をアトミックに行う。
-- p_slots が空配列の場合は DELETE のみ実行（全スロット解除）。
CREATE OR REPLACE FUNCTION replace_member_commit_slots(
  p_member_id UUID,
  p_slots     JSONB
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM member_commit_slots
  WHERE member_id = p_member_id;

  IF jsonb_array_length(p_slots) > 0 THEN
    INSERT INTO member_commit_slots (member_id, day_of_week, hour)
    SELECT
      p_member_id,
      (elem->>'day_of_week')::INT,
      (elem->>'hour')::INT
    FROM jsonb_array_elements(p_slots) AS elem;
  END IF;
END;
$$;
```

---

### `supabase/migrations/20260608HHMMSS_add_replace_member_commit_slots_rpc.sql` (NEW — migration, CRUD)

**Analog:** `supabase/migrations/20260602000001_add_member_commit_slots.sql` (lines 1-28)

**Migration file structure pattern** (lines 1-28 of analog — copy BEGIN/COMMIT wrapper + phase comment):
```sql
BEGIN;

-- Phase 28: add member_commit_slots for commit schedule
CREATE TABLE IF NOT EXISTS member_commit_slots (
  -- ...
);
-- ...

COMMIT;
```

**New migration file content** (copy `BEGIN;` / `-- Phase comment` / SQL body / `COMMIT;` structure):
```sql
BEGIN;

-- Phase 33: add replace_member_commit_slots RPC for atomic commit slot updates
CREATE OR REPLACE FUNCTION replace_member_commit_slots(
  p_member_id UUID,
  p_slots     JSONB
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM member_commit_slots
  WHERE member_id = p_member_id;

  IF jsonb_array_length(p_slots) > 0 THEN
    INSERT INTO member_commit_slots (member_id, day_of_week, hour)
    SELECT
      p_member_id,
      (elem->>'day_of_week')::INT,
      (elem->>'hour')::INT
    FROM jsonb_array_elements(p_slots) AS elem;
  END IF;
END;
$$;

COMMIT;
```

**Naming convention:** `YYYYMMDDHHMMSS_description.sql` — e.g., `20260608000000_add_replace_member_commit_slots_rpc.sql`.

---

### `src/app/my/__tests__/updateCommitSlotsAction.test.ts` (MODIFY — test, CRUD)

**Analog:** self (lines 1-149) + `src/app/login/__tests__/sendMagicLinkAction.test.ts` mock pattern

**Current mock structure** (lines 19-58 — the part that changes):
```typescript
// Supabase admin client — currently mocks from() only
const mockAdminFrom = vi.fn()
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: vi.fn(() => ({
    from: mockAdminFrom,
  })),
}))
```

**Updated mock** — add `rpc` alongside `from`:
```typescript
const mockAdminFrom = vi.fn()
const mockAdminRpc = vi.fn()
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: vi.fn(() => ({
    from: mockAdminFrom,
    rpc: mockAdminRpc,
  })),
}))
```

**Updated `setupAdminMock`** — remove `deleteSpy`/`insertSpy`, add RPC mock setup:
```typescript
function setupAdminMock(opts: {
  member?: { id: string } | null
  memberError?: unknown
  rpcError?: unknown
} = {}) {
  const selectSpy = vi.fn(() => ({
    eq: () => ({
      single: async () => ({
        data: opts.member === undefined ? { id: MEMBER_ID } : opts.member,
        error: opts.memberError ?? null,
      }),
    }),
  }))

  mockAdminFrom.mockImplementation((table: string) => {
    if (table === 'members') return { select: selectSpy }
    throw new Error(`unexpected table: ${table}`)
  })

  mockAdminRpc.mockResolvedValue({ error: opts.rpcError ?? null })

  return { selectSpy, mockAdminRpc }
}
```

**Updated test cases** (テスト1 becomes RPC-based, テスト3 verifies empty slots still calls RPC):
```typescript
it('テスト1: 認証済みユーザーで rpc を呼び出し null を返す', async () => {
  setupAdminMock()
  const result = await updateCommitSlotsAction(null, makeFormData([{ day_of_week: 1, hour: 8 }]))
  expect(result).toBeNull()
  expect(mockAdminRpc).toHaveBeenCalledWith('replace_member_commit_slots', {
    p_member_id: MEMBER_ID,
    p_slots: [{ day_of_week: 1, hour: 8 }],
  })
})

it('テスト3: slots が空配列のとき rpc を空配列で呼び出す', async () => {
  setupAdminMock()
  const result = await updateCommitSlotsAction(null, makeFormData([]))
  expect(result).toBeNull()
  expect(mockAdminRpc).toHaveBeenCalledWith('replace_member_commit_slots', {
    p_member_id: MEMBER_ID,
    p_slots: [],
  })
})

it('rpc エラー時は "保存に失敗しました..." を返す', async () => {
  setupAdminMock({ rpcError: { message: 'db error' } })
  const result = await updateCommitSlotsAction(null, makeFormData([{ day_of_week: 1, hour: 8 }]))
  expect(result).toBe('保存に失敗しました。もう一度お試しください')
})
```

---

### `e2e/admin-guard.spec.ts` (MODIFY — E2E test, request-response)

**Analog:** self

**Current assertion that breaks** (line 17-18):
```typescript
test('未認証で /my → / にリダイレクト (E2E-03)', async ({ page }) => {
  await page.goto('/my')
  await expect(page).toHaveURL('http://localhost:3000/')
})
```

**Updated assertion** — redirect target changes from `/` to `/login?next=...`:
```typescript
test('未認証で /my → /login にリダイレクト (E2E-03)', async ({ page }) => {
  await page.goto('/my')
  await expect(page).toHaveURL(/http:\/\/localhost:3000\/login(\?next=.*)?/)
})
```

Note: The `/admin` test on line 12-14 is NOT changed — `/admin` is not in the new middleware matcher and continues to be handled by `proxy.ts` (test) code redirecting to `/`.

---

## Shared Patterns

### Supabase SSR client creation (cookie getAll/setAll)
**Source:** `src/proxy.ts` lines 7-24
**Apply to:** `src/middleware.ts` (new file)
```typescript
const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      },
    },
  }
)
```

### Open Redirect guard
**Source:** `src/app/auth/callback/route.ts` line 14
**Apply to:** `src/middleware.ts`, `src/app/login/page.tsx`
```typescript
const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/my'
```

### Server Action auth check pattern
**Source:** `src/app/my/actions.ts` lines 156-170
**Apply to:** All server actions that require authentication (maintained as-is in `updateCommitSlotsAction`)
```typescript
const supabase = await createSupabaseServerClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) return 'ログインセッションが切れました。再ログインしてください'
```

### Server Action error handling pattern
**Source:** `src/app/my/actions.ts` lines 168-171 and 181-184
**Apply to:** RPC error handling in `updateCommitSlotsAction`
```typescript
if (rpcError) {
  console.error('[updateCommitSlots] rpc failed:', rpcError)
  return '保存に失敗しました。もう一度お試しください'
}
```

### Migration file structure
**Source:** `supabase/migrations/20260602000001_add_member_commit_slots.sql` lines 1-28
**Apply to:** new migration file
```sql
BEGIN;
-- Phase XX: description
-- SQL body
COMMIT;
```

---

## No Analog Found

All files have direct analogs in the codebase. No files require falling back to RESEARCH.md patterns exclusively.

---

## Metadata

**Analog search scope:** `src/`, `supabase/migrations/`, `e2e/`
**Files scanned:** 11
**Pattern extraction date:** 2026-06-08
