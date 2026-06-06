# Phase 31: ログインフロー修正 - Pattern Map

**Mapped:** 2026-06-05
**Files analyzed:** 9 (修正対象ファイル + 新規 migration)
**Analogs found:** 9 / 9

## File Classification

| 新規/修正ファイル | Role | Data Flow | 最近傍アナログ | 一致度 |
|-------------------|------|-----------|----------------|--------|
| `src/app/auth/callback/route.ts` | route handler | request-response | 同ファイル（既存コード拡張） | exact |
| `src/app/login-51cf21389c56/actions.ts` | server action | request-response | 同ファイル（既存コード拡張） | exact |
| `src/app/my/MyProfileForm.tsx` | component (client) | request-response | 同ファイル（既存コード拡張） | exact |
| `src/app/my/page.tsx` | page (SSR) | request-response | 同ファイル（既存コード拡張） | exact |
| `src/app/my/actions.ts` | server action | CRUD | 同ファイル（既存コード拡張） | exact |
| `src/app/admin/AdminMemberList.tsx` | component (client) | request-response | 同ファイル（既存コード拡張） | exact |
| `src/app/admin/actions.ts` | server action | CRUD | 同ファイル（既存コード拡張） | exact |
| `src/lib/members.ts` | service/repository | CRUD | 同ファイル（既存コード拡張） | exact |
| `supabase/migrations/20260605000000_add_substack_handle_unique.sql` | migration | batch | `supabase/migrations/20260602000000_add_substack_handle.sql` | role-match |

---

## Pattern Assignments

### `src/app/auth/callback/route.ts` (route handler, request-response)

**Analog:** 同ファイル（既存実装を拡張）

**既存 imports パターン** (lines 1-3):
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
```

**既存の pid → user_id 紐付けコア** (lines 22-34):
```typescript
const admin = createSupabaseAdminClient()
const { data: member } = await admin
  .from('members')
  .select('id, user_id')
  .eq('publication_id', pid)
  .maybeSingle()
if (member && !member.user_id) {
  await admin
    .from('members')
    .update({ user_id: user.id })
    .eq('id', member.id)
}
```

**追加する D-02 パターン — member が存在しない場合の新規 INSERT + フォールバック:**
```typescript
// member が存在しない場合: 新規 member を INSERT
if (!member) {
  const insertPayload = {
    publication_id: pid,
    name: pid,  // D-02: 仮置き。ユーザーが /my から後で変更可能
    user_id: user.id,
    substack_handle: handle || null,
  }
  const { error: insertError } = await admin
    .from('members')
    .insert(insertPayload)

  if (insertError?.code === '23505') {
    // substack_handle unique 違反 → null でフォールバック INSERT (D-02, D-05)
    await admin
      .from('members')
      .insert({ ...insertPayload, substack_handle: null })
  }
}
```

**既存のリダイレクトパターン** (lines 36-37):
```typescript
const myRedirectPath = handle ? '/my?handle=' + encodeURIComponent(handle) : next
return NextResponse.redirect(new URL(myRedirectPath, origin))
```

**D-02 修正後のリダイレクト** — handle パラメータ付きリダイレクトは廃止し `/my` に直接リダイレクト:
```typescript
// callback で substack_handle は INSERT 済みのため、/my?handle= 付与は不要
return NextResponse.redirect(new URL('/my', origin))
```

**エラーハンドリングパターン** (lines 39, 42):
```typescript
console.error('[auth/callback] exchangeCodeForSession error:', error)
// ...
return NextResponse.redirect(new URL('/', origin))
```

---

### `src/app/login-51cf21389c56/actions.ts` (server action, request-response)

**Analog:** 同ファイル（既存実装を拡張）

**既存 imports パターン** (lines 1-4):
```typescript
'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
```

**既存の入力バリデーション + エラー返却パターン** (lines 10-11):
```typescript
const email = formData.get('email') as string
if (!email) return 'メールアドレスを入力してください'
```

**D-01 追加: pid/handle 必須バリデーション — 既存の email チェック直後に追加:**
```typescript
const pid = (formData.get('pid') as string | null)?.trim() || null
const handle = (formData.get('handle') as string | null)?.trim() || null

// D-01: 両方必須。片方でも欠けていたら「登録リンクが不正です」を返す
if (!pid || !handle) return '登録リンクが不正です'
```

**既存の callback URL 生成 + Supabase signInWithOtp パターン** (lines 19-28):
```typescript
// D-01 確定後: pid && handle が保証された状態で callbackUrl を単純化できる
callbackUrl = `${origin}/auth/callback?pid=${encodeURIComponent(pid)}&handle=${encodeURIComponent(handle)}`

const { error } = await supabase.auth.signInWithOtp({
  email,
  options: { emailRedirectTo: callbackUrl },
})
```

**既存のエラーハンドリングパターン** (lines 38-49):
```typescript
if (error) {
  console.error('[sendMagicLink]', error)
  if (error.status === 429) {
    return '送信制限に達しました。しばらく待ってから再試行してください'
  }
  if (error.status === 500) {
    return 'メール送信の設定に問題があります。管理者にお問い合わせください'
  }
  return 'メールの送信に失敗しました。しばらく経ってから再試行してください'
}
return 'SENT'
```

---

### `src/app/my/MyProfileForm.tsx` (component client, request-response)

**Analog:** 同ファイル（既存実装を拡張）

**既存の props 型定義パターン** (lines 6-13):
```typescript
type Member = {
  name: string
  publicationId: string
  currentTeams: { name: string; status: string }[]
  publicTeams: { name: string }[]
}

export default function MyProfileForm({ member, substackHandleDefault }: { member: Member; substackHandleDefault?: string })
```

**D-03 に合わせた props 型変更 — `substackHandleDefault` を `substackHandle` に改名し null/undefined を区別:**
```typescript
// 変更後: substackHandle が null = DB で null（フォールバックケース）、undefined = 未取得
export default function MyProfileForm({
  member,
  substackHandle,
}: {
  member: Member
  substackHandle: string | null | undefined
})
```

**既存の publicationId 読み取り専用表示パターン** (lines 31-35):
```typescript
<div>
  <label className="block text-sm font-semibold mb-1">パブリケーションID</label>
  <p className="text-sm text-gray-400 border rounded px-3 py-2 bg-gray-100">
    {member.publicationId}
  </p>
  <p className="text-xs text-gray-500 mt-1">パブリケーションID は変更できません</p>
</div>
```

**D-03 の substack_handle 条件付きレンダリング — publicationId パターンを踏襲:**
```tsx
{substackHandle != null ? (
  // 設定済み → 読み取り専用 (publicationId と同じスタイル)
  <div>
    <label className="block text-sm font-semibold mb-1">Substack ハンドル</label>
    <p className="text-sm text-gray-400 border rounded px-3 py-2 bg-gray-100">
      {substackHandle}
    </p>
    <p className="text-xs text-gray-500 mt-1">Substack ハンドルは変更できません</p>
  </div>
) : (
  // null = フォールバックケース → 一度だけ入力可能
  <div>
    <label htmlFor="substack_handle" className="block text-sm font-semibold mb-1">
      Substack ハンドル
    </label>
    <input
      id="substack_handle"
      name="substack_handle"
      type="text"
      placeholder="@yourhandle"
      className="w-full border rounded px-3 py-2 text-sm"
    />
    <p className="text-xs text-gray-500 mt-1">
      例: @yourname — 入力すると個人ページからプロフィールへのリンクが作成されます
    </p>
  </div>
)}
```

**既存の useActionState + alert パターン** (lines 14, 23-28):
```typescript
const [state, action, isPending] = useActionState(updateMyProfileAction, null)

{state && (
  <p role="alert" className="text-sm text-red-600">
    {state}
  </p>
)}
```

---

### `src/app/my/page.tsx` (page SSR, request-response)

**Analog:** 同ファイル（既存実装を拡張）

**既存の Supabase DB クエリパターン** (lines 17-29):
```typescript
const admin = createSupabaseAdminClient()
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

**既存の props 渡しパターン** (lines 50, 72-80):
```typescript
const substackHandleDefault = (member as any)?.substack_handle ?? handle ?? undefined
// ↓ D-03: handle URL param によるフォールバックを廃止し、DB 値を直接渡す
const substackHandle = (member as any)?.substack_handle ?? null

// MyProfileForm への渡し方変更
<MyProfileForm
  member={{ name: member.name, publicationId: member.publication_id, currentTeams, publicTeams }}
  substackHandle={substackHandle}
/>
```

---

### `src/app/my/actions.ts` (server action, CRUD)

**Analog:** 同ファイル（既存実装を拡張）

**既存のユーザー認証 + admin client パターン** (lines 55-59):
```typescript
const supabase = await createSupabaseServerClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) return 'ログインセッションが切れました。再ログインしてください'

const admin = createSupabaseAdminClient()
```

**既存の DB update + エラーハンドリングパターン** (lines 62-71):
```typescript
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

**D-05 の 23505 ハンドリング追加 — 既存の updateError チェックを拡張:**
```typescript
if (updateError?.code === '23505') {
  // substack_handle unique 違反 (D-05)
  return 'このハンドルはすでに使用されています'
}
if (updateError || !member) {
  console.error('[updateMyProfile] member update:', updateError)
  return '保存に失敗しました。もう一度お試しください'
}
```

**既存の revalidatePath パターン** (line 115):
```typescript
revalidatePath('/my')
return null
```

---

### `src/app/admin/AdminMemberList.tsx` (component client, request-response)

**Analog:** 同ファイル（既存実装を拡張）

**既存の handleUpdate — FormData 自動収集パターン** (lines 18-38):
```typescript
async function handleUpdate(publicationId: string, e: React.MouseEvent<HTMLButtonElement>) {
  const tr = e.currentTarget.closest('tr')
  if (!tr) return
  const formData = new FormData()

  // テキスト入力（name, addedAt）を自動収集 — 新規フィールド追加時も自動で拾われる
  tr.querySelectorAll<HTMLInputElement>('input[name]:not([type="checkbox"])').forEach(
    (input) => formData.append(input.name, input.value)
  )
  // チェックボックス: checked のもののみ
  tr.querySelectorAll<HTMLInputElement>('input[type="checkbox"][name]:checked').forEach(
    (cb) => formData.append(cb.name, cb.value)
  )

  const error = await updateMemberAction(publicationId, formData)
  if (error) {
    setEditError(error)
  } else {
    setEditingId(null)
    setEditError(null)
  }
}
```

**注意:** `querySelectorAll<HTMLInputElement>('input[name]:not([type="checkbox"])')` で tr 内の全 input を自動収集するため、D-04 で追加する `substack_handle` と `publication_id` の input フィールドは **追加するだけで自動的に FormData に含まれる**。handleUpdate の変更は不要。

**既存の編集行テキスト入力パターン** (lines 57-65):
```tsx
<td className="border border-[#ebebeb] px-3 py-2">
  <input
    defaultValue={m.name}
    name="name"
    className="bg-white border border-[#d8d8d8] rounded px-1 w-full text-sm text-[#363737]"
  />
</td>
```

**D-04 追加: substack_handle / publication_id の入力フィールド — 同スタイルで追加:**
```tsx
<td className="border border-[#ebebeb] px-3 py-2">
  <input
    defaultValue={m.substackHandle ?? ''}
    name="substack_handle"
    placeholder="@handle"
    className="bg-white border border-[#d8d8d8] rounded px-1 w-full text-sm text-[#363737]"
  />
</td>
<td className="border border-[#ebebeb] px-3 py-2">
  <input
    defaultValue={m.publicationId}
    name="new_publication_id"
    className="bg-white border border-[#d8d8d8] rounded px-1 w-full text-sm font-mono text-[#363737]"
  />
</td>
```

**注意:** `publication_id` の input は `name="new_publication_id"` とする（`publicationId` は `updateMemberAction` の第一引数として別途渡されるため名前の衝突を避ける）。

**既存のエラー表示パターン** (line 100):
```tsx
{editError && <p className="text-red-500 text-xs mt-1">{editError}</p>}
```

**既存の confirm ダイアログパターン** (lines 13-15):
```typescript
async function handleDelete(publicationId: string) {
  if (!window.confirm(`"${publicationId}" を削除しますか？`)) return
```

**D-04 の publication_id 変更確認ダイアログ（Claude's Discretion — 推奨）— handleUpdate 内に追加:**
```typescript
const newPublicationId = (tr.querySelector<HTMLInputElement>('input[name="new_publication_id"]'))?.value
if (newPublicationId && newPublicationId !== publicationId) {
  if (!window.confirm(`publication_id を "${publicationId}" から "${newPublicationId}" に変更します。関連する articles も更新されます。続けますか？`)) return
}
```

---

### `src/app/admin/actions.ts` (server action, CRUD)

**Analog:** 同ファイル（既存実装を拡張）

**既存の requireAdmin ガードパターン** (lines 9-15, 63):
```typescript
async function requireAdmin(): Promise<void> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.role !== 'admin') {
    throw new Error('Unauthorized')
  }
}

// 各アクションの先頭:
try { await requireAdmin() } catch { return '権限がありません' }
```

**既存の updateMemberAction — FormData 読み取り + updateMember 呼び出しパターン** (lines 59-85):
```typescript
export async function updateMemberAction(
  publicationId: string,
  formData: FormData
): Promise<string | null> {
  try { await requireAdmin() } catch { return '権限がありません' }

  const name = formData.get('name') as string
  const teamNames = formData.getAll('teamNames') as string[]
  const addedAt = formData.get('addedAt') as string

  if (!name) return 'name は必須です'
  if (!addedAt || new Date(addedAt).toString() === 'Invalid Date') {
    return 'addedAt は有効なISO日付文字列を入力してください'
  }

  try {
    await updateMember(publicationId, {
      name,
      teams: teamNames.map((teamName) => ({ name: teamName, status: 'public' })),
      addedAt,
    })
    revalidatePath('/admin')
    return null
  } catch (e) {
    return e instanceof Error ? e.message : '更新に失敗しました'
  }
}
```

**D-04 追加: substack_handle / publication_id フィールドの読み取りと updateMember への渡し方:**
```typescript
const substackHandleRaw = (formData.get('substack_handle') as string | null)?.trim() ?? ''
const substack_handle: string | null = substackHandleRaw === '' ? null
  : substackHandleRaw.startsWith('@') ? substackHandleRaw : '@' + substackHandleRaw

const new_publication_id = (formData.get('new_publication_id') as string | null)?.trim() || null

// updateMember に渡す（lib/members.ts 側で 23505 / articles 更新を処理）
await updateMember(publicationId, {
  name,
  teams: teamNames.map((teamName) => ({ name: teamName, status: 'public' })),
  addedAt,
  substackHandle: substack_handle,
  ...(new_publication_id ? { publicationId: new_publication_id } : {}),
})
```

**D-05 の 23505 エラー処理 — catch ブロック内で:**
```typescript
} catch (e) {
  if (e instanceof Error && e.message.includes('23505')) {
    return 'このハンドルはすでに使用されています'
  }
  return e instanceof Error ? e.message : '更新に失敗しました'
}
```

**注意:** `lib/members.ts` の `updateMember` が PostgrestError をそのまま throw する場合、`error.code === '23505'` は action 層には届かず `e.message` に変換される。`updateMember` 内で 23505 を検出してカスタム Error を throw するか、admin action で Supabase client を直接使うか、どちらかを planner が選択する。

---

### `src/lib/members.ts` (service/repository, CRUD)

**Analog:** 同ファイル（既存実装を拡張）

**既存の updateMember — 動的フィールド UPDATE パターン** (lines 82-128):
```typescript
export async function updateMember(
  publicationId: string,
  updates: Partial<Omit<Member, 'publicationId'>>
): Promise<void> {
  // ...
  const memberUpdate: Record<string, unknown> = {}
  if (updates.name !== undefined) memberUpdate.name = updates.name
  if (updates.addedAt !== undefined) memberUpdate.added_at = updates.addedAt
  // D-04 追加: substackHandle / publicationId の動的追加をここで行う
  if (Object.keys(memberUpdate).length > 0) {
    const { error: updateError } = await supabase
      .from('members')
      .update(memberUpdate)
      .eq('publication_id', publicationId)
    if (updateError) throw updateError
  }
```

**D-04 追加: substackHandle / publicationId サポートと articles 連動 UPDATE:**
```typescript
if (updates.substackHandle !== undefined) memberUpdate.substack_handle = updates.substackHandle
if (updates.publicationId !== undefined) memberUpdate.publication_id = updates.publicationId

// publication_id 変更時: articles テーブルも手動 UPDATE (ON UPDATE CASCADE なし)
if (updates.publicationId !== undefined && updates.publicationId !== publicationId) {
  const { error: articlesUpdateError } = await supabase
    .from('articles')
    .update({ publication_id: updates.publicationId })
    .eq('publication_id', publicationId)
  if (articlesUpdateError) throw articlesUpdateError
}
```

**型シグネチャ変更 — Member 型の publicationId を Partial に含めるため:**
```typescript
// 現在: Partial<Omit<Member, 'publicationId'>>
// 変更後: publicationId も変更可能にする
export async function updateMember(
  currentPublicationId: string,
  updates: Partial<Omit<Member, 'id'>>  // publicationId を含む Partial
): Promise<void>
```

---

### `supabase/migrations/20260605000000_add_substack_handle_unique.sql` (migration, batch)

**Analog:** `supabase/migrations/20260602000000_add_substack_handle.sql`

**アナログの構造** (既存 migration):
```sql
BEGIN;

-- Phase 27: add substack_handle for Substack profile link
ALTER TABLE members ADD COLUMN IF NOT EXISTS substack_handle TEXT;

COMMIT;
```

**新規 migration — 同構造でコピー:**
```sql
BEGIN;

-- Phase 31: add UNIQUE constraint to members.substack_handle
-- IF NOT EXISTS で live DB に既に制約が存在する場合も安全に実行できる
ALTER TABLE members
  ADD CONSTRAINT IF NOT EXISTS members_substack_handle_key UNIQUE (substack_handle);

COMMIT;
```

**schema.sql への追記も必要 — 既存の substack_handle 列定義に UNIQUE を追加:**
```sql
-- 変更前 (schema.sql line 16):
substack_handle TEXT
-- 変更後:
substack_handle TEXT UNIQUE
```

---

## Shared Patterns

### 認証ガード (admin アクション全体)

**Source:** `src/app/admin/actions.ts` lines 9-15
**Apply to:** `src/app/admin/actions.ts` の全 export 関数
```typescript
async function requireAdmin(): Promise<void> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.role !== 'admin') {
    throw new Error('Unauthorized')
  }
}
// 各アクション先頭:
try { await requireAdmin() } catch { return '権限がありません' }
```

### Supabase admin client 使用パターン

**Source:** `src/app/my/actions.ts` lines 4-5, 59
**Apply to:** callback route, my/actions.ts, admin/actions.ts, lib/members.ts
```typescript
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
// ...
const admin = createSupabaseAdminClient()
// RLS をバイパスして members テーブルに直接アクセス
```

### unique violation (23505) エラーハンドリング

**Source:** RESEARCH.md Pattern 2 (コードベースに既存の 23505 ハンドリングはまだ存在しない)
**Apply to:** `src/app/auth/callback/route.ts`, `src/app/my/actions.ts`, `src/app/admin/actions.ts`
```typescript
// Supabase PostgrestError の code フィールドで判定
if (error?.code === '23505') {
  // callback での新規 member 作成時: substack_handle=null でサイレントフォールバック
  // actions での UPDATE 時: 'このハンドルはすでに使用されています' を返す
}
```

### Server Action の return 型パターン

**Source:** `src/app/my/actions.ts` 全般, `src/app/admin/actions.ts` 全般
**Apply to:** Phase 31 で修正する全 Server Action
```typescript
// null = 成功, string = エラーメッセージ
export async function someAction(
  prevState: string | null,
  formData: FormData
): Promise<string | null>

// 成功時: return null
// エラー時: return 'エラーメッセージ（日本語）'
```

### FormData 正規化パターン

**Source:** `src/app/my/actions.ts` lines 50-51
**Apply to:** `src/app/admin/actions.ts` の substack_handle 読み取り
```typescript
// @ プレフィックス自動付与 + trim + 空文字列 → null
const rawHandle = (formData.get('substack_handle') as string | null)?.trim() ?? ''
const substack_handle: string | null = rawHandle === ''
  ? null
  : rawHandle.startsWith('@') ? rawHandle : '@' + rawHandle
```

### テストモック構造パターン

**Source:** `src/app/auth/__tests__/callback.test.ts` lines 1-35
**Apply to:** Wave 0 の新規テストファイル (`sendMagicLinkAction.test.ts`, `updateMemberAction.test.ts`)
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockExchangeCode = vi.fn()
const mockGetUser = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: {
      exchangeCodeForSession: mockExchangeCode,
      getUser: mockGetUser,
    },
  })),
}))

const mockAdminFrom = vi.fn()
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: vi.fn(() => ({
    from: mockAdminFrom,
  })),
}))
```

---

## No Analog Found

アナログが存在しないファイルはなし。すべてのファイルに最近傍アナログが存在する。

| ファイル | 理由 |
|---------|------|
| (なし) | — |

---

## Metadata

**アナログ検索スコープ:** `src/app/auth/`, `src/app/login-51cf21389c56/`, `src/app/my/`, `src/app/admin/`, `src/lib/`, `supabase/migrations/`
**スキャンファイル数:** 11ファイル（route.ts, actions.ts x2, Form コンポーネント x2, page.tsx, members.ts, types.ts, テスト x2, migration x1）
**パターン抽出日:** 2026-06-05
