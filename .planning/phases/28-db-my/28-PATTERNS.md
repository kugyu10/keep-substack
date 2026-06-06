# Phase 28: コミットスケジュール — DB + /my ページ - Pattern Map

**Mapped:** 2026-06-02
**Files analyzed:** 7 (新規 3 + 変更 4)
**Analogs found:** 7 / 7

---

## File Classification

| 新規/変更ファイル | Role | Data Flow | Closest Analog | Match Quality |
|-----------------|------|-----------|----------------|---------------|
| `supabase/migrations/20260602000001_add_member_commit_slots.sql` | migration | batch | `supabase/migrations/20260602000000_add_substack_handle.sql` | role-match |
| `supabase/schema.sql` (変更) | config | batch | `supabase/schema.sql` 自身 (既存テーブル定義) | exact |
| `src/app/my/actions.ts` (変更: 追加) | service | request-response | `src/app/my/actions.ts:updateMyProfileAction` 自身 | exact |
| `src/app/my/CommitScheduleModal.tsx` (新規) | component | request-response | `src/app/my/MyProfileForm.tsx` | role-match |
| `src/app/my/page.tsx` (変更) | component | request-response | `src/app/my/page.tsx` 自身 | exact |
| `src/app/my/__tests__/updateCommitSlotsAction.test.ts` (新規) | test | request-response | `src/app/my/__tests__/updateMyProfileAction.test.ts` | exact |

---

## Pattern Assignments

### `supabase/migrations/20260602000001_add_member_commit_slots.sql` (migration, batch)

**Analog:** `supabase/migrations/20260602000000_add_substack_handle.sql`
**Pattern:** BEGIN/COMMIT ラップ + IF NOT EXISTS ガード

**Migration 全体構造** (`supabase/migrations/20260602000000_add_substack_handle.sql` lines 1-7):
```sql
BEGIN;

-- Phase 27: add substack_handle for Substack profile link
ALTER TABLE members ADD COLUMN IF NOT EXISTS substack_handle TEXT;

COMMIT;
```

**RLS ポリシーパターン** (`supabase/migrations/20260531000000_consolidated_schema.sql` lines 83-101):
```sql
-- DROP POLICY guard required — Postgres has no CREATE POLICY IF NOT EXISTS.
DROP POLICY IF EXISTS "public select members" ON members;
CREATE POLICY "public select members"
  ON members FOR SELECT USING (true);
```

**FK パターン** (`supabase/schema.sql` lines 27-31):
```sql
CREATE TABLE IF NOT EXISTS member_teams (
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  team_id   UUID REFERENCES teams(id)   ON DELETE CASCADE,
  PRIMARY KEY (member_id, team_id)
);
```

**Phase 28 の DDL 全体 (上記パターン合成):**
```sql
BEGIN;

-- Phase 28: add member_commit_slots for commit schedule
CREATE TABLE IF NOT EXISTS member_commit_slots (
  id           BIGINT  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  member_id    UUID    NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  day_of_week  INT     NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  hour         INT     NOT NULL CHECK (hour BETWEEN 0 AND 23)
);

ALTER TABLE member_commit_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public select member_commit_slots" ON member_commit_slots;
CREATE POLICY "public select member_commit_slots"
  ON member_commit_slots FOR SELECT USING (true);

DROP POLICY IF EXISTS "member write own commit slots" ON member_commit_slots;
CREATE POLICY "member write own commit slots"
  ON member_commit_slots
  FOR ALL
  USING (
    member_id = (SELECT id FROM members WHERE user_id = auth.uid())
  )
  WITH CHECK (
    member_id = (SELECT id FROM members WHERE user_id = auth.uid())
  );

COMMIT;
```

> **重要:** `member_id` は `UUID` — `members.id` が `UUID PRIMARY KEY DEFAULT gen_random_uuid()` のため BIGINT FK は FK 制約エラーになる (`supabase/schema.sql` line 10 で確認済み)

---

### `supabase/schema.sql` (変更: `CREATE TABLE member_commit_slots` を追加)

**Analog:** `supabase/schema.sql` 既存テーブル定義

**追加位置:** `member_publications` テーブル定義 (lines 45-55) の直後、`-- 2. Row Level Security` セクションの前

**既存テーブル定義のパターン** (`supabase/schema.sql` lines 9-17):
```sql
CREATE TABLE IF NOT EXISTS members (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT        NOT NULL,
  publication_id TEXT        UNIQUE NOT NULL,
  image_url      TEXT,
  added_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id        UUID        REFERENCES auth.users(id) UNIQUE,
  substack_handle TEXT
);
```

**RLS 有効化のパターン** (`supabase/schema.sql` lines 61-65):
```sql
ALTER TABLE members      ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams        ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_publications ENABLE ROW LEVEL SECURITY;
```

**ポリシーのパターン** (`supabase/schema.sql` lines 68-77):
```sql
-- anon / authenticated: SELECT 全件許可（公開データ）
CREATE POLICY "public select members"
  ON members FOR SELECT USING (true);
```

> **注意:** `schema.sql` と `migrations/` の両方を同期して更新する (Phase 26 で確立したルール)

---

### `src/app/my/actions.ts` (変更: `updateCommitSlotsAction` 追加)

**Analog:** `src/app/my/actions.ts:updateMyProfileAction` (lines 43-117)

**Server Action シグネチャパターン** (lines 43-46):
```typescript
export async function updateMyProfileAction(
  prevState: string | null,
  formData: FormData
): Promise<string | null> {
```

**Import パターン** (lines 1-6):
```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
```

**認証・本人確認パターン** (lines 55-67):
```typescript
const supabase = await createSupabaseServerClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) return 'ログインセッションが切れました。再ログインしてください'

const admin = createSupabaseAdminClient()

// Update the authenticated member's name, scoped to their own user_id (no member_id from client).
const { data: member, error: updateError } = await admin
  .from('members')
  .update({ name, substack_handle })
  .eq('user_id', user.id)
  .select('id')
  .single()

if (updateError || !member) {
  console.error('[updateMyProfile] member update:', updateError)
  return '保存に失敗しました。もう一度お試しください'
}
```

**Delete + Insert 全置換パターン** (lines 91-113):
```typescript
// D-09: delete ONLY this member's public-team rows; private/hidden membership is preserved.
if (publicTeamIds.length > 0) {
  const { error: deleteError } = await admin
    .from('member_teams')
    .delete()
    .eq('member_id', member.id)
    .in('team_id', publicTeamIds)

  if (deleteError) {
    console.error('[updateMyProfile] delete member_teams:', deleteError)
    return '保存に失敗しました。もう一度お試しください'
  }
}

if (allowed.length > 0) {
  const { error: insertError } = await admin
    .from('member_teams')
    .insert(allowed.map((t) => ({ member_id: member.id, team_id: t.id })))

  if (insertError) {
    console.error('[updateMyProfile] insert member_teams:', insertError)
    return '保存に失敗しました。もう一度お試しください'
  }
}

revalidatePath('/my')
return null
```

**`updateCommitSlotsAction` に適用するパターン (合成):**
```typescript
export async function updateCommitSlotsAction(
  prevState: string | null,
  formData: FormData
): Promise<string | null> {
  // 1. FormData から slots を取り出す
  const rawSlots = formData.get('slots') as string | null
  if (!rawSlots) return 'スロットデータが見つかりません'

  let slots: { day_of_week: number; hour: number }[]
  try {
    slots = JSON.parse(rawSlots)
  } catch {
    return 'スロットデータが不正です'
  }

  // 2. バリデーション
  if (!Array.isArray(slots) || slots.length > 4) return '不正なスロット数です'
  for (const s of slots) {
    if (s.day_of_week < 1 || s.day_of_week > 7) return '曜日の値が不正です'
    if (s.hour < 0 || s.hour > 23) return '時刻の値が不正です'
  }

  // 3. 認証 (updateMyProfileAction lines 55-57 と同一)
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 'ログインセッションが切れました。再ログインしてください'

  const admin = createSupabaseAdminClient()

  // 4. user_id → member.id 解決 (client から member_id を受け取らない — Pitfall 4)
  const { data: member, error: memberError } = await admin
    .from('members')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (memberError || !member) {
    console.error('[updateCommitSlots] member lookup:', memberError)
    return '保存に失敗しました。もう一度お試しください'
  }

  // 5. DELETE フェーズ (member_teams パターンと同一)
  const { error: deleteError } = await admin
    .from('member_commit_slots')
    .delete()
    .eq('member_id', member.id)

  if (deleteError) {
    console.error('[updateCommitSlots] delete:', deleteError)
    return '保存に失敗しました。もう一度お試しください'
  }

  // 6. INSERT フェーズ (slots が空の場合はスキップ)
  if (slots.length > 0) {
    const { error: insertError } = await admin
      .from('member_commit_slots')
      .insert(slots.map(s => ({ member_id: member.id, day_of_week: s.day_of_week, hour: s.hour })))

    if (insertError) {
      console.error('[updateCommitSlots] insert:', insertError)
      return '保存に失敗しました。もう一度お試しください'
    }
  }

  revalidatePath('/my')
  return null
}
```

---

### `src/app/my/CommitScheduleModal.tsx` (新規 Client Component)

**Analog:** `src/app/my/MyProfileForm.tsx` (全文)

**'use client' + import パターン** (lines 1-4):
```typescript
'use client'

import { useActionState } from 'react'
import { updateMyProfileAction } from './actions'
```

**useActionState パターン** (line 14):
```typescript
const [state, action, isPending] = useActionState(updateMyProfileAction, null)
```

**エラー表示パターン** (lines 24-28):
```tsx
{state && (
  <p role="alert" className="text-sm text-red-600">
    {state}
  </p>
)}
```

**フォーム送信ボタンパターン** (lines 128-135):
```tsx
<button
  type="submit"
  disabled={isPending}
  aria-disabled={isPending}
  className="w-full bg-orange-500 text-white rounded px-4 py-2 text-sm font-semibold disabled:opacity-50"
>
  {isPending ? '保存中...' : '保存する'}
</button>
```

**セレクト要素の label + input パターン** (lines 39-49 — name フィールドを参考):
```tsx
<div>
  <label htmlFor="name" className="block text-sm font-semibold mb-1">
    名前
  </label>
  <input
    id="name"
    name="name"
    type="text"
    required
    defaultValue={member.name}
    className="w-full border rounded px-3 py-2 text-sm"
  />
</div>
```

**CommitScheduleModal 向け追加パターン:**

成功時モーダルクローズ (RESEARCH.md Pitfall 6):
```typescript
// useEffect で state === null && !isPending を監視してモーダルを閉じる
// 初回レンダー誤作動防止に useRef を使う
import { useActionState, useEffect, useRef, useState } from 'react'

const isFirstRender = useRef(true)
useEffect(() => {
  if (isFirstRender.current) {
    isFirstRender.current = false
    return
  }
  if (state === null && !isPending) setIsOpen(false)
}, [state, isPending])
```

JSON hidden input パターン:
```tsx
<input type="hidden" name="slots" value={JSON.stringify(slots)} />
```

モーダルオーバーレイ構造 (UI-SPEC.md):
```tsx
<div
  className="fixed inset-0 z-50 flex items-center justify-center"
  onClick={() => setIsOpen(false)}
>
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="commit-schedule-modal-title"
    onKeyDown={(e) => { if (e.key === 'Escape') setIsOpen(false) }}
    onClick={(e) => e.stopPropagation()}
    className="bg-[#fafafa] rounded shadow-xl w-full max-w-sm mx-4 p-6 relative"
  >
    {/* コンテンツ */}
  </div>
</div>
```

---

### `src/app/my/page.tsx` (変更: member.id + commitSlots クエリ + CommitScheduleModal 追加)

**Analog:** `src/app/my/page.tsx` 自身

**既存の admin クエリパターン** (lines 15-27):
```typescript
const admin = createSupabaseAdminClient()
const { data: member } = await admin
  .from('members')
  .select(`
    name,
    publication_id,
    substack_handle,
    member_teams (
      teams (name, status)
    )
  `)
  .eq('user_id', user.id)
  .maybeSingle()
```

**変更点 1:** `members` の SELECT に `id` を追加する (Pitfall 2):
```typescript
const { data: member } = await admin
  .from('members')
  .select(`
    id,
    name,
    publication_id,
    substack_handle,
    member_teams (
      teams (name, status)
    )
  `)
  .eq('user_id', user.id)
  .maybeSingle()
```

**変更点 2:** commitSlots クエリを追加 (member クエリの後):
```typescript
const { data: commitSlotsData } = await admin
  .from('member_commit_slots')
  .select('id, day_of_week, hour')
  .eq('member_id', member.id)
  .order('day_of_week')

const commitSlots = commitSlotsData ?? []
```

**変更点 3:** JSX に CommitScheduleModal を追加 (MyProfileForm の後):
```tsx
<div className="mt-8">
  <h2 className="text-sm font-semibold mb-2">投稿スケジュール</h2>
  <CommitScheduleModal memberId={member.id} initialSlots={commitSlots} />
</div>
```

**既存の JSX パターン** (lines 51-70):
```tsx
return (
  <main className="max-w-sm mx-auto px-4 py-8">
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-semibold">マイページ</h1>
      <LogoutButton />
    </div>
    {!member ? (
      <LinkMemberForm />
    ) : (
      <MyProfileForm ... />
    )}
  </main>
)
```

---

### `src/app/my/__tests__/updateCommitSlotsAction.test.ts` (新規テスト)

**Analog:** `src/app/my/__tests__/updateMyProfileAction.test.ts` (全文)

**モジュールモックパターン** (lines 1-24):
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// next/cache revalidatePath → no-op
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Supabase server client (anon, cookie-based) → only used for auth.getUser()
const mockGetUser = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}))

// Supabase admin client (service role) → table reads/writes
const mockAdminFrom = vi.fn()
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: vi.fn(() => ({
    from: mockAdminFrom,
  })),
}))
```

**beforeEach パターン** (lines 218-222):
```typescript
beforeEach(() => {
  vi.clearAllMocks()
  // default: authenticated user
  mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
})
```

**認証失敗テストパターン** (lines 282-293):
```typescript
it('auth fail: no user returns exact JP auth string and performs zero writes', async () => {
  mockGetUser.mockResolvedValue({ data: { user: null } })

  const result = await updateMyProfileAction(null, makeFormData('Tester', ['Alpha']))

  expect(result).toBe(AUTH_ERROR)
  expect(updateSpy).not.toHaveBeenCalled()
  expect(insertSpy).not.toHaveBeenCalled()
  expect(deleteSpy).not.toHaveBeenCalled()
})
```

**テーブル別 mockAdminFrom パターン** (lines 63-83):
```typescript
mockAdminFrom.mockImplementation((table: string) => {
  if (table === 'members') {
    return { update: updateSpy }
  }
  if (table === 'teams') {
    return {
      select: () => ({
        eq: async () => ({
          data: opts.teamsError ? null : opts.publicTeams,
          error: opts.teamsError ?? null,
        }),
      }),
    }
  }
  if (table === 'member_teams') {
    return { delete: deleteSpy, insert: insertSpy }
  }
  throw new Error(`unexpected table: ${table}`)
})
```

**`updateCommitSlotsAction.test.ts` 向けの admin mock 構造:**
```typescript
function setupAdminMock(opts: {
  member?: { id: string } | null
  memberError?: unknown
  deleteError?: unknown
  insertError?: unknown
}) {
  const insertSpy = vi.fn(async () => ({ error: opts.insertError ?? null }))
  const deleteSpy = vi.fn(() => ({
    eq: async () => ({ error: opts.deleteError ?? null }),
  }))
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
    if (table === 'member_commit_slots') return { delete: deleteSpy, insert: insertSpy }
    throw new Error(`unexpected table: ${table}`)
  })

  return { insertSpy, deleteSpy, selectSpy }
}

function makeFormData(slots: { day_of_week: number; hour: number }[]): FormData {
  const fd = new FormData()
  fd.append('slots', JSON.stringify(slots))
  return fd
}
```

---

## Shared Patterns

### 認証パターン
**Source:** `src/app/my/actions.ts` lines 55-58
**Apply to:** `updateCommitSlotsAction`
```typescript
const supabase = await createSupabaseServerClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) return 'ログインセッションが切れました。再ログインしてください'
```

### エラーハンドリングパターン
**Source:** `src/app/my/actions.ts` lines 69-72
**Apply to:** `updateCommitSlotsAction` の全 DB 操作後
```typescript
if (error || !data) {
  console.error('[updateCommitSlots] <operation>:', error)
  return '保存に失敗しました。もう一度お試しください'
}
```

### revalidatePath + null 返し
**Source:** `src/app/my/actions.ts` lines 115-116
**Apply to:** `updateCommitSlotsAction` の最終行
```typescript
revalidatePath('/my')
return null
```

### useActionState + form action
**Source:** `src/app/my/MyProfileForm.tsx` lines 3, 14, 23
**Apply to:** `CommitScheduleModal.tsx`
```typescript
import { useActionState } from 'react'
const [state, action, isPending] = useActionState(updateCommitSlotsAction, null)
// ...
<form action={action}>
```

### role="alert" エラー表示
**Source:** `src/app/my/MyProfileForm.tsx` lines 24-28
**Apply to:** `CommitScheduleModal.tsx`
```tsx
{state && (
  <p role="alert" className="text-sm text-red-600">
    {state}
  </p>
)}
```

### Tailwind ボタンスタイル
**Source:** `src/app/my/MyProfileForm.tsx` lines 128-135
**Apply to:** `CommitScheduleModal.tsx` の「宣言する」ボタン
```tsx
className="w-full bg-orange-500 text-white rounded px-4 py-2 text-sm font-semibold disabled:opacity-50"
```

### セレクト/入力 label パターン
**Source:** `src/app/my/MyProfileForm.tsx` lines 39-49
**Apply to:** `CommitScheduleModal.tsx` の各 select 要素
```tsx
<label htmlFor="<id>" className="block text-sm font-semibold mb-1">ラベル</label>
<select id="<id>" name="<name>" className="border rounded px-3 py-2 text-sm w-full">
```

---

## No Analog Found

なし — 全ファイルについて既存コードベース内にアナログが存在する。

---

## Critical Pitfalls (Pattern Mapper からの警告)

| Pitfall | 影響ファイル | 対処法 |
|---------|------------|--------|
| `member_id` を BIGINT で定義 | migration + schema.sql | `UUID NOT NULL REFERENCES members(id)` を使う (`members.id` は UUID) |
| `page.tsx` の members クエリに `id` がない | `page.tsx` | SELECT に `id,` を追加する |
| FormData からの slots parse 忘れ | `updateCommitSlotsAction` | `JSON.parse(formData.get('slots') as string)` + 型ガード |
| `formAction` を直接呼び出す | `CommitScheduleModal.tsx` | `<form action={action}>` を使い、`useEffect` で state 変化を監視してモーダルを閉じる |
| `schema.sql` の更新忘れ | `schema.sql` | migration ファイル追加と同時に `schema.sql` も更新する |

---

## Metadata

**Analog search scope:** `src/app/my/`, `supabase/migrations/`, `supabase/schema.sql`
**Files scanned:** 6
**Pattern extraction date:** 2026-06-02
