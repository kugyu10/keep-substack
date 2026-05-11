# Phase 9: 管理画面メンバー編集 - Pattern Map

**Mapped:** 2026-05-11
**Files analyzed:** 8
**Analogs found:** 8 / 8

## File Classification

| 新規/変更ファイル | Role | Data Flow | Closest Analog | Match Quality |
|------------------|------|-----------|----------------|---------------|
| `src/lib/types.ts` | model | transform | self (リネームのみ) | exact |
| `src/lib/kvMembers.ts` | service | CRUD | self (updateMember追加) | exact |
| `src/app/admin/actions.ts` | controller | request-response | `addMemberAction` / `deleteMemberAction` in self | exact |
| `src/app/admin/AdminMemberList.tsx` | component | request-response | self の `handleDelete` | exact |
| `src/app/admin/AdminAddForm.tsx` | component | request-response | self (teamName入力名変更のみ) | exact |
| `src/app/admin/page.tsx` | component | request-response | self (確認のみ・変更なし) | exact |
| `src/app/member/[substackId]/page.tsx` | component | request-response | self (teamId→teamName参照変更) | exact |
| `src/app/page.tsx` | component | request-response | self (teamId→teamName参照変更) | exact |

---

## Pattern Assignments

### `src/lib/types.ts` (model, transform)

**Analog:** self

**変更内容:** `Member.teamId` → `Member.teamName` のフィールドリネームのみ

**現在の型定義** (lines 10-15):
```typescript
export type Member = {
  name: string
  substackId: string
  teamId: string    // ← teamName にリネーム
  addedAt: string  // ISO 8601
}
```

**変更後パターン:**
```typescript
export type Member = {
  name: string
  substackId: string
  teamName: string  // リネーム後
  addedAt: string  // ISO 8601
}
```

---

### `src/lib/kvMembers.ts` (service, CRUD)

**Analog:** self の `deleteMember` パターン + CONTEXT.md のイメージコード

**既存 deleteMember パターン** (lines 23-27):
```typescript
export async function deleteMember(substackId: string): Promise<void> {
  const members = await getMembers()
  const updated = members.filter((m) => m.substackId !== substackId)
  await redis.set('members', updated)
}
```

**追加する updateMember パターン** (CONTEXT.md §specifics より):
```typescript
export async function updateMember(
  substackId: string,
  updates: Partial<Omit<Member, 'substackId'>>
): Promise<void> {
  const members = await getMembers()
  const idx = members.findIndex((m) => m.substackId === substackId)
  if (idx === -1) throw new Error(`メンバーが見つかりません: ${substackId}`)
  members[idx] = { ...members[idx], ...updates }
  await redis.set('members', members)
}
```

**getMembers 後方互換パターン** (CONTEXT.md §specifics より):
- `redis.get<any[]>('members')` で読み込み、`teamName ?? teamId ?? ''` のフォールバックでマッピング

```typescript
export async function getMembers(): Promise<Member[]> {
  const members = await redis.get<any[]>('members')
  if (!members) return []
  return members.map((m) => ({
    ...m,
    teamName: m.teamName ?? m.teamId ?? '',
  }))
}
```

---

### `src/app/admin/actions.ts` (controller, request-response)

**Analog:** 同ファイルの `addMemberAction` (lines 6-25) と `deleteMemberAction` (lines 27-30)

**addMemberAction パターン** (lines 6-25):
```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { addMember, deleteMember } from '@/lib/kvMembers'

export async function addMemberAction(
  prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const name = formData.get('name') as string
  const substackId = formData.get('substackId') as string
  const teamId = formData.get('teamId') as string

  if (!name || !substackId) {
    return 'name と substackId は必須です'
  }

  try {
    await addMember({ name, substackId, teamId: teamId ?? '' })
    revalidatePath('/admin')
    return null
  } catch (e) {
    return e instanceof Error ? e.message : '追加に失敗しました'
  }
}
```

**deleteMemberAction パターン** (lines 27-30):
```typescript
export async function deleteMemberAction(substackId: string): Promise<void> {
  await deleteMember(substackId)
  revalidatePath('/admin')
}
```

**追加する updateMemberAction パターン** (D-07 より):
- シグネチャ: `updateMemberAction(substackId: string, formData: FormData): Promise<string | null>`
- `substackId` は引数で受け取り（フォームデータからは受け取らない）
- バリデーション: `name` 空チェック + `addedAt` 日付チェック（`new Date(addedAt).toString() !== 'Invalid Date'`）
- 成功時: `revalidatePath('/admin')` して `null` 返却
- 失敗時: エラーメッセージ文字列を返却

```typescript
export async function updateMemberAction(
  substackId: string,
  formData: FormData
): Promise<string | null> {
  const name = formData.get('name') as string
  const teamName = formData.get('teamName') as string
  const addedAt = formData.get('addedAt') as string

  if (!name) return 'name は必須です'
  if (new Date(addedAt).toString() === 'Invalid Date') return '無効な日付形式です'

  try {
    await updateMember(substackId, { name, teamName, addedAt })
    revalidatePath('/admin')
    return null
  } catch (e) {
    return e instanceof Error ? e.message : '更新に失敗しました'
  }
}
```

---

### `src/app/admin/AdminMemberList.tsx` (component, request-response)

**Analog:** self の `handleDelete` パターン (lines 9-12)

**既存 handleDelete パターン** (lines 1-12):
```typescript
'use client'

import { deleteMemberAction } from './actions'
import type { Member } from '@/lib/types'

type Props = { members: Member[] }

export default function AdminMemberList({ members }: Props) {
  async function handleDelete(substackId: string) {
    if (!window.confirm(`"${substackId}" を削除しますか？`)) return
    await deleteMemberAction(substackId)
  }
```

**追加する editingId state パターン** (CONTEXT.md §specifics より):
```typescript
import { useState } from 'react'

const [editingId, setEditingId] = useState<string | null>(null)
const [editError, setEditError] = useState<string | null>(null)
```

**handleUpdate パターン** (deleteMemberAction と同じ直接呼び出し方式):
```typescript
async function handleUpdate(substackId: string, formData: FormData) {
  const error = await updateMemberAction(substackId, formData)
  if (error) {
    setEditError(error)
    return
  }
  setEditingId(null)
  setEditError(null)
}
```

**インライン編集行パターン** (CONTEXT.md §specifics より):
- `editingId === m.substackId` のとき各 `td` を `input` に切り替える
- `substackId` は読み取り専用表示（D-02）
- 保存ボタン・キャンセルボタンを行内に表示

```tsx
{editingId === m.substackId ? (
  // 編集モード: input 表示
  <input defaultValue={m.name} name="name" className="border px-1 w-full" />
) : (
  // 表示モード: テキスト表示
  m.name
)}
```

**テーブルヘッダー変更** (line 21):
- `teamId` → `teamName` に変更

```tsx
// 変更前
<th className="border px-3 py-2">teamId</th>
// 変更後
<th className="border px-3 py-2">teamName</th>
```

---

### `src/app/admin/AdminAddForm.tsx` (component, request-response)

**Analog:** self (teamName入力フィールド名変更のみ)

**変更箇所** (lines 25-29):
```tsx
// 変更前
<input
  name="teamId"
  placeholder="teamId (任意)"
  ...
/>
// 変更後
<input
  name="teamName"
  placeholder="teamName (任意)"
  ...
/>
```

**useActionState パターン** (lines 7-10) — 変更なし、参考のみ:
```typescript
const [error, formAction] = useActionState(addMemberAction, null)

return (
  <form action={formAction} className="space-y-3 mb-8">
```

---

### `src/app/member/[substackId]/page.tsx` (component, request-response)

**Analog:** self (teamId→teamName参照変更のみ)

**変更箇所** (line 29):
```tsx
// 変更前
href={memberResult.member.teamId ? `/?team=${memberResult.member.teamId}` : '/'}
// 変更後
href={memberResult.member.teamName ? `/?team=${memberResult.member.teamName}` : '/'}
```

---

### `src/app/page.tsx` (component, request-response)

**Analog:** self (teamId→teamName参照変更のみ)

**変更箇所** (lines 14-15):
```typescript
// 変更前
const teams = [...new Set(allMembers.map((m) => m.teamId).filter(Boolean))]
const filteredMembers = team ? allMembers.filter((m) => m.teamId === team) : allMembers
// 変更後
const teams = [...new Set(allMembers.map((m) => m.teamName).filter(Boolean))]
const filteredMembers = team ? allMembers.filter((m) => m.teamName === team) : allMembers
```

---

## Shared Patterns

### Server Action パターン
**Source:** `src/app/admin/actions.ts` (lines 1-30)
**Apply to:** `updateMemberAction` の実装

```typescript
'use server'
// 必須インポート
import { revalidatePath } from 'next/cache'
// シグネチャ: (識別子, FormData) => Promise<string | null>
// 成功: revalidatePath('/admin') して null 返却
// 失敗: エラーメッセージ文字列を返却
// エラーキャッチ: e instanceof Error ? e.message : 'フォールバックメッセージ'
```

### Client Component イベントハンドラパターン
**Source:** `src/app/admin/AdminMemberList.tsx` (lines 1, 9-12)
**Apply to:** `AdminMemberList` の `handleUpdate`

```typescript
'use client'
// async function で直接 Server Action を await 呼び出し
// useActionState は使わず直接呼び出しでエラー戻り値をハンドリング
async function handleDelete(substackId: string) {
  await deleteMemberAction(substackId)
}
```

### KV 操作パターン
**Source:** `src/lib/kvMembers.ts` (lines 23-27)
**Apply to:** `updateMember` の実装

```typescript
// getMembers() で全件取得 → 変換 → redis.set('members', updated) で全件上書き保存
// 配列のfindIndex + スプレッド代入でイミュータブルに更新
```

### Tailwind CSS スタイリング規則
**Source:** `src/app/admin/AdminMemberList.tsx` (lines 36-41)
**Apply to:** 編集ボタン・保存ボタン・キャンセルボタン・インラインinput

```tsx
// 削除ボタン参考
className="text-red-600 hover:underline text-xs"
// input参考 (AdminAddForm.tsx line 13-17)
className="border rounded px-2 py-1 text-sm flex-1"
```

---

## No Analog Found

| ファイル | Role | Data Flow | 理由 |
|----------|------|-----------|------|
| なし | — | — | 全ファイルにコードベース内アナログあり |

---

## Metadata

**Analog search scope:** `src/app/admin/`, `src/lib/`, `src/app/member/`, `src/app/`
**Files scanned:** 8
**Pattern extraction date:** 2026-05-11
