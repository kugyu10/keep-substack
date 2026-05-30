# Phase 22: チームステータス管理 - Pattern Map

**Mapped:** 2026-05-19
**Files analyzed:** 10
**Analogs found:** 10 / 10

---

## File Classification

| 新規/変更ファイル | Role | Data Flow | 最近傍アナログ | マッチ品質 |
|-----------------|------|-----------|---------------|-----------|
| `supabase/migrations/20260517_add_team_status.sql` | migration | batch | `supabase/migrations/20260516_rename_substack_id_to_publication_id.sql` | exact |
| `supabase/schema.sql` | config | — | `supabase/schema.sql`（既存更新） | exact |
| `src/lib/types.ts` | model | — | `src/lib/types.ts`（既存更新） | exact |
| `src/lib/members.ts` | service | CRUD | `src/lib/members.ts`（既存更新） | exact |
| `src/app/page.tsx` | component | request-response | `src/app/page.tsx`（既存更新） | exact |
| `src/app/admin/teams/page.tsx` | component | request-response | `src/app/admin/page.tsx` | role-match |
| `src/app/admin/teams/actions.ts` | service | request-response | `src/app/admin/actions.ts` | exact |
| `src/app/admin/page.tsx` | component | request-response | `src/app/admin/page.tsx`（既存更新） | exact |
| `src/app/admin/AdminAddForm.tsx` | component | request-response | `src/app/admin/AdminAddForm.tsx`（既存更新） | exact |
| `src/app/admin/AdminMemberList.tsx` | component | request-response | `src/app/admin/AdminMemberList.tsx`（既存更新） | exact |

---

## Pattern Assignments

### `supabase/migrations/20260517_add_team_status.sql` (migration, batch)

**Analog:** `supabase/migrations/20260516_rename_substack_id_to_publication_id.sql`

**マイグレーション全体パターン** (lines 1-23):
```sql
-- Run this in Supabase SQL Editor BEFORE deploying the code changes

BEGIN;

-- 1. Drop dependent constraints/indexes first
ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_substack_id_fkey;

-- 2. Rename column in members
ALTER TABLE members RENAME COLUMN substack_id TO publication_id;
-- ...

COMMIT;
```

**新規ファイルに適用するパターン:**
```sql
-- Add status column to teams table and migrate chameleon → hidden
-- Run this in Supabase SQL Editor BEFORE deploying the code changes

BEGIN;

ALTER TABLE teams ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'public';
UPDATE teams SET status = 'hidden' WHERE name = 'chameleon';

COMMIT;
```

---

### `src/lib/types.ts` (model, —)

**Analog:** `src/lib/types.ts` (既存ファイルを更新)

**現行の型定義** (lines 10-15):
```typescript
export type Member = {
  name: string
  publicationId: string
  teamNames: string[]  // teamName: string から変更（Phase 11 D-01）
  addedAt: string  // ISO 8601
}
```

**変更後の型定義:**
- `teamNames: string[]` を `teams: {name: string, status: string}[]` に置き換える
- 27行目の `export const HIDDEN_TEAM = 'chameleon'` を削除する

**変更箇所 (lines 10-27):**
```typescript
// 変更前
export type Member = {
  name: string
  publicationId: string
  teamNames: string[]
  addedAt: string
}
export const HIDDEN_TEAM = 'chameleon'

// 変更後
export type Member = {
  name: string
  publicationId: string
  teams: { name: string; status: string }[]
  addedAt: string
}
// HIDDEN_TEAM定数は削除（teams.status='hidden'で代替）
```

---

### `src/lib/members.ts` (service, CRUD)

**Analog:** `src/lib/members.ts` (既存ファイルを更新)

**現行のインポートパターン** (lines 1-2):
```typescript
import { createSupabaseAdminClient } from './supabase/admin'
import type { Member } from './types'
```

**現行の getMembers() クエリパターン** (lines 4-26):
```typescript
export async function getMembers(): Promise<Member[]> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('members')
    .select(`
      name,
      publication_id,
      added_at,
      member_teams (
        teams (name)
      )
    `)
  if (error) throw error
  if (!data) return []
  return data.map((m: any) => ({
    name: m.name,
    publicationId: m.publication_id,
    teamNames: (m.member_teams as any[])
      .map((mt: any) => mt.teams?.name)
      .filter((n: unknown): n is string => typeof n === 'string'),
    addedAt: m.added_at,
  }))
}
```

**変更箇所 — SELECT拡張とマッピング変更:**
```typescript
// teams (name) → teams (name, status) に変更
.select(`
  name,
  publication_id,
  added_at,
  member_teams (
    teams (name, status)
  )
`)

// マッピングを teamNames: string[] → teams: {name, status}[] に変更
return data.map((m: any) => ({
  name: m.name,
  publicationId: m.publication_id,
  teams: (m.member_teams as any[])
    .map((mt: any) => mt.teams)
    .filter((t: unknown): t is { name: string; status: string } =>
      t !== null && typeof t === 'object' && 'name' in (t as object)
    ),
  addedAt: m.added_at,
}))
```

**現行の updateMember() 内の teamNames 参照** (lines 101-121):
```typescript
if (updates.teamNames !== undefined) {
  // ... member_teams削除・再挿入 ...
  for (const teamName of updates.teamNames) {
    // ...
  }
}
```

**updateMember() の変更方針（KISS原則準拠）:**
- `updateMember()` の引数型 `Partial<Omit<Member, 'publicationId'>>` は維持する
- `updates.teamNames` の参照を `updates.teams` に変更し、内部でチーム名文字列を `.map(t => t.name)` で取り出す
- 呼び出し元 `actions.ts` の `updateMemberAction` で `teamNames` を `teams` に変換する

---

### `src/app/page.tsx` (component, request-response)

**Analog:** `src/app/page.tsx` (既存ファイルを更新)

**現行のインポートパターン** (lines 1-5):
```typescript
import { getMembers } from '@/lib/members'
import { fetchAllFeedsCached } from '@/lib/fetchFeed'
import { HIDDEN_TEAM } from '@/lib/types'
import WeeklyHeatmapGrid from '@/components/WeeklyHeatmapGrid'
import PrBanner from '@/components/PrBanner'
```

**変更後のインポート — HIDDEN_TEAM削除:**
```typescript
import { getMembers } from '@/lib/members'
import { fetchAllFeedsCached } from '@/lib/fetchFeed'
// HIDDEN_TEAM インポートを削除
import WeeklyHeatmapGrid from '@/components/WeeklyHeatmapGrid'
import PrBanner from '@/components/PrBanner'
```

**現行のフィルタリングロジック** (lines 17-22):
```typescript
const teams = [...new Set(allMembers.flatMap((m) => m.teamNames).filter(Boolean))].filter(
  (t) => t !== HIDDEN_TEAM
)
const filteredMembers = team
  ? allMembers.filter((m) => m.teamNames.includes(team))
  : allMembers.filter((m) => !m.teamNames.includes(HIDDEN_TEAM))
```

**変更後のフィルタリングロジック（D-08準拠）:**
```typescript
// タブ一覧: publicチームのみ、重複排除
const teams = [
  ...new Set(
    allMembers
      .flatMap((m) => m.teams.filter((t) => t.status === 'public').map((t) => t.name))
      .filter(Boolean)
  ),
]
// Allビュー: hiddenチームメンバーを完全除外
// teamフィルタ時: status問わずteam名で絞る（D-08）
const filteredMembers = team
  ? allMembers.filter((m) => m.teams.some((t) => t.name === team))
  : allMembers.filter((m) => m.teams.every((t) => t.status !== 'hidden'))
```

---

### `src/app/admin/teams/page.tsx` (component, request-response) — 新規作成

**Analog:** `src/app/admin/page.tsx`

**アナログのRSCページパターン** (lines 1-26):
```typescript
import { getMembers } from '@/lib/members'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import AdminAddForm from './AdminAddForm'
import AdminMemberList from './AdminMemberList'
import LogoutButton from '@/components/LogoutButton'

export default async function AdminPage() {
  const supabase = createSupabaseAdminClient()
  const [members, teamsResult] = await Promise.all([
    getMembers(),
    supabase.from('teams').select('name').order('name'),
  ])
  const teams = (teamsResult.data ?? []).map((t) => t.name)

  return (
    <main className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">管理画面</h1>
        <LogoutButton />
      </div>
      <p className="text-sm text-gray-600 mb-4">メンバー数：{members.length}</p>
      <AdminAddForm teams={teams} />
      <AdminMemberList members={members} teams={teams} />
    </main>
  )
}
```

**新規ファイルに適用するパターン:**
```typescript
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import TeamStatusList from './TeamStatusList'  // Client Component（新規）

export default async function AdminTeamsPage() {
  const supabase = createSupabaseAdminClient()
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, status')
    .order('name')

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6">チーム設定</h1>
      <TeamStatusList teams={teams ?? []} />
    </main>
  )
}
```

**テーブルUIスタイル（AdminMemberList.tsx lines 42-51 から流用）:**
```tsx
<div className="overflow-x-auto">
  <table className="w-full text-sm border-collapse text-[#363737]">
    <thead>
      <tr className="bg-[#fafafa] text-left">
        <th className="border border-[#ebebeb] px-3 py-2">チーム名</th>
        <th className="border border-[#ebebeb] px-3 py-2">ステータス</th>
        <th className="border border-[#ebebeb] px-3 py-2"></th>
      </tr>
    </thead>
    {/* tbody: 各行に <select> + Save ボタン */}
  </table>
</div>
```

---

### `src/app/admin/teams/actions.ts` (service, request-response) — 新規作成

**Analog:** `src/app/admin/actions.ts`

**requireAdmin() パターン** (lines 9-15):
```typescript
async function requireAdmin(): Promise<void> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') {
    throw new Error('Unauthorized')
  }
}
```

**Server Actionパターン（try-catch + requireAdmin + revalidatePath）** (lines 59-81):
```typescript
export async function updateMemberAction(
  publicationId: string,
  formData: FormData
): Promise<string | null> {
  try { await requireAdmin() } catch { return '権限がありません' }

  // ... 処理 ...

  try {
    await updateMember(publicationId, { name, teamNames, addedAt })
    revalidatePath('/admin')
    return null
  } catch (e) {
    return e instanceof Error ? e.message : '更新に失敗しました'
  }
}
```

**新規ファイルに適用するパターン:**
```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

async function requireAdmin(): Promise<void> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') {
    throw new Error('Unauthorized')
  }
}

export async function updateTeamStatusAction(
  teamId: string,
  status: string
): Promise<string | null> {
  try { await requireAdmin() } catch { return '権限がありません' }

  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from('teams')
    .update({ status })
    .eq('id', teamId)
  if (error) return error.message

  revalidatePath('/admin/teams')
  return null
}
```

---

### `src/app/admin/page.tsx` (component, request-response)

**Analog:** `src/app/admin/page.tsx` (既存ファイルを更新)

**変更箇所 — 「チーム設定」リンク追加（D-03）:**
```tsx
// 既存の return 内 <main> 内に追加
// 既存スタイルの参考: AdminAddForm の "text-blue-600 hover:underline text-sm"
<a href="/admin/teams" className="text-blue-600 hover:underline text-sm">
  チーム設定
</a>
```

**注意:** `teams` の取得クエリ `supabase.from('teams').select('name').order('name')` は変更不要。`AdminAddForm`/`AdminMemberList` の `teams: string[]` Propsも変更不要（D-07の`admin/page.tsx`に関する補足参照）。

---

### `src/app/admin/AdminAddForm.tsx` (component, request-response)

**Analog:** `src/app/admin/AdminAddForm.tsx` (既存ファイルを更新)

**現行の Props と teams 参照** (lines 6-7, 33-34):
```typescript
type Props = { teams: string[] }

// チェックボックス
<input type="checkbox" name="teamNames" value={team} />
```

**変更なし:** `AdminAddForm` の `teams: string[]` Propsは変更不要（`admin/page.tsx` が `teams(name)` でstring[]を渡すため）。`name="teamNames"` も `addMemberAction` が `formData.getAll('teamNames')` で受け取る現行インターフェースに合わせて維持する。

---

### `src/app/admin/AdminMemberList.tsx` (component, request-response)

**Analog:** `src/app/admin/AdminMemberList.tsx` (既存ファイルを更新)

**変更が必要な teamNames 参照箇所（全2箇所）:**

1. **line 73** — チェックボックスの defaultChecked:
```typescript
// 変更前
defaultChecked={m.teamNames.includes(team)}

// 変更後
defaultChecked={m.teams.some((t) => t.name === team)}
```

2. **line 107** — 表示用のjoin:
```typescript
// 変更前
{m.teamNames.join(', ')}

// 変更後
{m.teams.map((t) => t.name).join(', ')}
```

**RESEARCH.md Pitfall 2:** 上記2箇所を必ず両方修正すること。片方だけでは実行時エラーになる。

---

## Shared Patterns

### Admin認証 (requireAdmin)

**Source:** `src/app/admin/actions.ts` (lines 9-15)
**Apply to:** `src/app/admin/teams/actions.ts`

```typescript
async function requireAdmin(): Promise<void> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') {
    throw new Error('Unauthorized')
  }
}
```

### Server Action エラーハンドリング

**Source:** `src/app/admin/actions.ts` (lines 21, 63)
**Apply to:** `src/app/admin/teams/actions.ts`

```typescript
// 認証失敗は早期リターン
try { await requireAdmin() } catch { return '権限がありません' }

// DB操作失敗は error.message を返す
if (error) return error.message

// 成功時は null を返す
return null
```

### Supabase Admin Client (service_role)

**Source:** `src/lib/members.ts` (line 1), `src/app/admin/page.tsx` (line 2)
**Apply to:** `src/app/admin/teams/page.tsx`, `src/app/admin/teams/actions.ts`

```typescript
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

// 同期版（RSCページ・一般アクション）
const supabase = createSupabaseAdminClient()

// 非同期版は createSupabaseServerClient（認証チェック用のみ）
```

### テーブル UI スタイル

**Source:** `src/app/admin/AdminMemberList.tsx` (lines 42-51)
**Apply to:** `src/app/admin/teams/` の TeamStatusList Client Component

```tsx
<div className="overflow-x-auto">
  <table className="w-full text-sm border-collapse text-[#363737]">
    <thead>
      <tr className="bg-[#fafafa] text-left">
        <th className="border border-[#ebebeb] px-3 py-2">...</th>
      </tr>
    </thead>
    <tbody>
      <tr className="bg-white hover:bg-[#fafafa]">
        <td className="border border-[#ebebeb] px-3 py-2">...</td>
      </tr>
    </tbody>
  </table>
</div>
```

### revalidatePath によるキャッシュ無効化

**Source:** `src/app/admin/actions.ts` (lines 37, 56, 77)
**Apply to:** `src/app/admin/teams/actions.ts`

```typescript
import { revalidatePath } from 'next/cache'

// Server Action成功後に必ず呼び出す
revalidatePath('/admin/teams')
```

### マイグレーション記述形式

**Source:** `supabase/migrations/20260516_rename_substack_id_to_publication_id.sql` (lines 1-23)
**Apply to:** `supabase/migrations/20260517_add_team_status.sql`

```sql
-- [説明コメント]
-- Run this in Supabase SQL Editor BEFORE deploying the code changes

BEGIN;

-- [変更内容]

COMMIT;
```

---

## No Analog Found

該当なし。全ファイルに対してアナログが見つかった。

---

## 実装上の注意点（Pitfalls）

### Pitfall 1: Member型変更の波及順序

`src/lib/types.ts` の `teamNames → teams` 変更を最初に行い、TypeScriptコンパイルエラーを軸に修正箇所を特定してから各ファイルを修正する。

### Pitfall 2: AdminMemberList.tsx の teamNames 参照は2箇所

- line 73: `m.teamNames.includes(team)` → `m.teams.some((t) => t.name === team)`
- line 107: `m.teamNames.join(', ')` → `m.teams.map((t) => t.name).join(', ')`

### Pitfall 3: updateMember() の引数インターフェース

`members.ts` の `updateMember()` 内 `updates.teamNames` 参照（lines 101, 108）を `updates.teams` に変更。`actions.ts` の `updateMemberAction` では `formData.getAll('teamNames')` で取得した string[] を `teams: teamNames.map(name => ({ name, status: 'public' }))` として渡すか、`updateMember()` 内部で `string[]` を受け取るよう引数型を調整する（KISS: 後者が最小変更）。

### Pitfall 4: admin/page.tsx の teams クエリは変更不要

`supabase.from('teams').select('name').order('name')` で取得する `teams: string[]` は `AdminAddForm`/`AdminMemberList` のチェックボックス用途であり、`Member.teams` 型変更とは独立。変更不要。

---

## Metadata

**Analog search scope:** `src/`, `supabase/migrations/`
**Files scanned:** 10
**Pattern extraction date:** 2026-05-19
