# Phase 9: 管理画面メンバー編集 - Research

**Researched:** 2026-05-11
**Domain:** Next.js Server Actions / React Client Component インライン編集 / KV（Upstash Redis）
**Confidence:** HIGH（全対象ファイルをコードベースから直接確認済み）

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 「編集」ボタン→同行のtdがinputに切り替わるインライン編集。保存・キャンセルボタンも行内。モーダル・別ページなし。`editingId` stateで管理。
- **D-02:** `substackId` は変更禁止。編集モード中も読み取り専用テキスト表示。
- **D-03:** `addedAt` は `<input type="text">` でISO文字列直接入力。サーバー側で `new Date(addedAt).toString() !== 'Invalid Date'` チェック。
- **D-04:** `teamId` → `teamName` を全ファイルでリネーム（types.ts / kvMembers.ts / actions.ts / AdminMemberList.tsx / AdminAddForm.tsx / member/[substackId]/page.tsx / page.tsx）。
- **D-05（データ移行）:** `getMembers()` で `teamName: m.teamName ?? (m as any).teamId ?? ''` の後方互換読み込みを追加。
- **D-06:** バリデーションはサーバーサイドのみ。`name` 空 + `addedAt` 無効日付をエラーとして返却。エラーは行内に赤字表示。
- **D-07:** `updateMemberAction(substackId: string, formData: FormData): Promise<string | null>` を `actions.ts` に追加。`revalidatePath('/admin')` で更新。

### Claude's Discretion
- インライン編集フォームのスタイリング（input幅、ボタン配置）
- キャンセル時のstate初期化方法（`setEditingId(null)` 等）
- 「保存」「キャンセル」ボタンのテキスト・色

### Deferred Ideas (OUT OF SCOPE)
- なし（スコープはPhase 9内に収まっている）
</user_constraints>

---

## Summary

Phase 9は既存の管理画面に「インライン編集」機能を追加するフェーズ。変更点は2つのまとまりに分類できる。

**まとまり①: `teamId` → `teamName` リネーム（全7ファイル）**
型定義から始まり、KV関数・Server Action・全コンポーネントを波及的に変更する。既存KVデータとの後方互換を `getMembers()` の読み込み時フォールバックで担保する。

**まとまり②: インライン編集UI + updateMember実装**
`AdminMemberList.tsx` に `editingId` stateを追加して行単位の編集モードを制御する。バックエンドは `updateMember` KV関数と `updateMemberAction` Server Actionを追加する。既存の `deleteMemberAction` パターン（Server Action）と `handleDelete` パターン（Client Component）をそのまま踏襲する。

**Primary recommendation:** リネームを先に完了させてからインライン編集UIを追加する順序で実装する。リネームが未完だと編集フォームのフィールド名が型エラーを起こすため。

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| フィールド編集UI（編集/保存/キャンセル） | Frontend (Client Component) | — | `useState` でeditingId管理。AdminMemberListは既に `'use client'` |
| 入力バリデーション | API / Server Action | — | D-06でサーバーサイドのみ |
| KVデータ更新 | Database / Storage（via Server Action） | — | `updateMember` → `redis.set` |
| teamIdフォールバック読み込み | Database / Storage（via getMembers） | — | KV読み込み時に後方互換変換 |
| revalidatePath（キャッシュ破棄） | API / Backend（Server Action） | — | 既存パターンと同様 |

---

## teamId 全参照箇所リスト（リネーム影響範囲）

以下は `grep teamId src/**` で確認した全参照箇所。[VERIFIED: codebase grep]

### `src/lib/types.ts` — 型定義
```typescript
// 変更前（line 13）
teamId: string

// 変更後
teamName: string
```

### `src/lib/kvMembers.ts` — KV操作関数
現在は `teamId` への直接参照なし（Member型経由で暗黙参照）。ただし `getMembers` にフォールバック追加が必要。

```typescript
// 変更前（line 6-9）
export async function getMembers(): Promise<Member[]> {
  const members = await redis.get<Member[]>('members')
  return members ?? []
}

// 変更後
export async function getMembers(): Promise<Member[]> {
  const members = await redis.get<any[]>('members')
  if (!members) return []
  return members.map((m) => ({
    ...m,
    teamName: m.teamName ?? m.teamId ?? '',
  }))
}
```

### `src/app/admin/actions.ts` — Server Action
```typescript
// 変更前（line 12, 19）
const teamId = formData.get('teamId') as string
await addMember({ name, substackId, teamId: teamId ?? '' })

// 変更後
const teamName = formData.get('teamName') as string
await addMember({ name, substackId, teamName: teamName ?? '' })
```

### `src/app/admin/AdminMemberList.tsx` — テーブルヘッダー・セル
```tsx
// 変更前（line 21, 31）
<th className="border px-3 py-2">teamId</th>
<td className="border px-3 py-2">{m.teamId}</td>

// 変更後
<th className="border px-3 py-2">teamName</th>
<td className="border px-3 py-2">{m.teamName}</td>  // 通常表示
<input defaultValue={m.teamName} name="teamName" ... />  // 編集モード
```

### `src/app/admin/AdminAddForm.tsx` — フォームフィールド
```tsx
// 変更前（line 26-27）
name="teamId"
placeholder="teamId (任意)"

// 変更後
name="teamName"
placeholder="teamName (任意)"
```

### `src/app/member/[substackId]/page.tsx` — 戻りリンク
```tsx
// 変更前（line 29）
href={memberResult.member.teamId ? `/?team=${memberResult.member.teamId}` : '/'}

// 変更後
href={memberResult.member.teamName ? `/?team=${memberResult.member.teamName}` : '/'}
```

### `src/app/page.tsx` — チームフィルター
```tsx
// 変更前（line 14-15）
const teams = [...new Set(allMembers.map((m) => m.teamId).filter(Boolean))]
const filteredMembers = team ? allMembers.filter((m) => m.teamId === team) : allMembers

// 変更後
const teams = [...new Set(allMembers.map((m) => m.teamName).filter(Boolean))]
const filteredMembers = team ? allMembers.filter((m) => m.teamName === team) : allMembers
```

---

## Architecture Patterns

### 現在の AdminMemberList 構造

`AdminMemberList.tsx` は `'use client'` のClient Component（line 1）。現在の構成：

- `Props: { members: Member[] }` を受け取る
- `handleDelete(substackId)` — `window.confirm` → `deleteMemberAction` 呼び出し
- `<table>` で全メンバーを行レンダリング
- 列: 名前 / substackId / teamId / addedAt / 操作ボタン（削除のみ）

**追加するstate:**
```tsx
const [editingId, setEditingId] = useState<string | null>(null)
const [editError, setEditError] = useState<string | null>(null)
```

### インライン編集UIパターン

`editingId === m.substackId` を条件に各 `<td>` の内容を切り替える。[ASSUMED: Reactのconditional renderingパターン — このプロジェクトで実績のある標準パターン]

```tsx
// 編集行のレンダリングパターン（イメージ）
<tr key={m.substackId}>
  {editingId === m.substackId ? (
    // 編集モード
    <>
      <td className="border px-3 py-2">
        <input name="name" defaultValue={m.name} className="border rounded px-1 w-full text-sm" />
      </td>
      <td className="border px-3 py-2 text-gray-400">{m.substackId}</td>  {/* 読み取り専用 */}
      <td className="border px-3 py-2">
        <input name="teamName" defaultValue={m.teamName} className="border rounded px-1 w-full text-sm" />
      </td>
      <td className="border px-3 py-2">
        <input name="addedAt" defaultValue={m.addedAt} className="border rounded px-1 w-full text-sm font-mono text-xs" />
      </td>
      <td className="border px-3 py-2">
        <button onClick={handleSave} className="text-blue-600 hover:underline text-xs mr-2">保存</button>
        <button onClick={() => { setEditingId(null); setEditError(null) }} className="text-gray-500 hover:underline text-xs">キャンセル</button>
        {editError && <p className="text-red-600 text-xs mt-1">{editError}</p>}
      </td>
    </>
  ) : (
    // 通常表示モード
    <>
      <td className="border px-3 py-2">{m.name}</td>
      <td className="border px-3 py-2">{m.substackId}</td>
      <td className="border px-3 py-2">{m.teamName}</td>
      <td className="border px-3 py-2 text-xs text-gray-500">
        {new Date(m.addedAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
      </td>
      <td className="border px-3 py-2">
        <button onClick={() => setEditingId(m.substackId)} className="text-blue-600 hover:underline text-xs mr-2">編集</button>
        <button onClick={() => handleDelete(m.substackId)} className="text-red-600 hover:underline text-xs">削除</button>
      </td>
    </>
  )}
</tr>
```

**保存ハンドラのパターン:**
```tsx
async function handleSave(substackId: string, formData: FormData) {
  const error = await updateMemberAction(substackId, formData)
  if (error) {
    setEditError(error)
  } else {
    setEditingId(null)
    setEditError(null)
  }
}
```

ただし `form` タグを使わず `button onClick` から `FormData` を手動収集する場合と、`<form action>` を使う場合の2つのアプローチがある。後者（form action）は `useActionState` との組み合わせが自然。前者の方がフォームを行内に限定しやすい。プランナーはKISS原則に従いシンプルな方を選択すること。

---

## updateMemberAction 完全実装案

`src/app/admin/actions.ts` に追加する。[VERIFIED: codebase — 既存 `deleteMemberAction` パターンを踏襲]

```typescript
export async function updateMemberAction(
  substackId: string,
  formData: FormData
): Promise<string | null> {
  const name = formData.get('name') as string
  const teamName = formData.get('teamName') as string
  const addedAt = formData.get('addedAt') as string

  if (!name) return 'name は必須です'
  if (!addedAt || new Date(addedAt).toString() === 'Invalid Date') {
    return 'addedAt は有効なISO日付文字列を入力してください'
  }

  try {
    await updateMember(substackId, { name, teamName: teamName ?? '', addedAt })
    revalidatePath('/admin')
    return null
  } catch (e) {
    return e instanceof Error ? e.message : '更新に失敗しました'
  }
}
```

import に `updateMember` を追加することを忘れないこと：
```typescript
import { addMember, deleteMember, updateMember } from '@/lib/kvMembers'
```

---

## updateMember KV関数 完全実装案

`src/lib/kvMembers.ts` に追加する。[VERIFIED: codebase — `deleteMember` の実装パターンを踏襲]

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

---

## Standard Stack

### Core（このフェーズで使用）
| ライブラリ | バージョン | 用途 | 備考 |
|-----------|-----------|------|------|
| React `useState` | (Next.js同梱) | editingId/editError state管理 | 既存の `'use client'` コンポーネント内 |
| Next.js Server Actions | (プロジェクト既存) | updateMemberAction | `'use server'` + `revalidatePath` パターン |
| Upstash Redis (via `@/lib/redis`) | (プロジェクト既存) | KV操作 | `redis.set('members', ...)` パターン |
| Tailwind CSS | (プロジェクト既存) | スタイリング | 全スタイリング |

---

## Don't Hand-Roll

| 問題 | 作らないもの | 使うもの | 理由 |
|------|------------|---------|------|
| 日付バリデーション | カスタム正規表現 | `new Date(str).toString() !== 'Invalid Date'` | D-03で決定済み |
| KV楽観的ロック | 独自排他制御 | なし（このスケールでは不要） | YAGNI |
| フォームライブラリ | React Hook Form等 | ネイティブ FormData | 既存パターンと一致 |

---

## Common Pitfalls

### Pitfall 1: テーブル行内に `<form>` をネストする
**What goes wrong:** `<table>` > `<tr>` > `<td>` 内に `<form>` を直接置くとHTML仕様違反（`<form>` は `<tr>` の直接子になれない）。ブラウザによっては `<form>` が `<table>` の外に吐き出される。
**How to avoid:** `<form>` を `<td>` の中（インラインコンテンツとして）に置くか、`<form>` を使わず `button onClick` で `FormData` を手動構築する。あるいは `<tr>` に `onSubmit` 相当のハンドラを付与する方法もある。
**Warning signs:** devtoolsのDOM inspectorで `<form>` が `<table>` の外に移動している。

### Pitfall 2: getMembers のキャッシュと後方互換フォールバックの競合
**What goes wrong:** `getMembers` を `any[]` で受けてフォールバックを適用した後、`Member[]` として返す。しかし型キャストが不完全だと `teamName` が `undefined` になる。
**How to avoid:** `const members = await redis.get<any[]>('members')` として受け取り、`map` の中で `teamName: m.teamName ?? m.teamId ?? ''` を必ず設定する。

### Pitfall 3: editingId が残った状態でデータが再取得される
**What goes wrong:** `revalidatePath('/admin')` で Server Component が再レンダリングされ、新しい `members` propsが `AdminMemberList` に渡される。しかしClient Component側の `editingId` stateはリセットされない。保存成功後は `setEditingId(null)` を明示的に呼ぶ必要がある。
**How to avoid:** `handleSave` でエラーなし確認後に必ず `setEditingId(null)` を呼ぶ。

### Pitfall 4: `defaultValue` と `value` の混在
**What goes wrong:** `<input value={m.name}>` （制御コンポーネント）を使うと `onChange` ハンドラが必要になり実装が複雑化する。
**How to avoid:** `<input defaultValue={m.name}>` （非制御コンポーネント）を使い、保存時に `FormData` から値を取得するパターンを維持する。既存の `AdminAddForm` も非制御コンポーネントパターン。

---

## Runtime State Inventory

このフェーズは `teamId` → `teamName` のフィールドリネームを含む。

| カテゴリ | 発見事項 | 必要なアクション |
|---------|---------|----------------|
| 保存データ | KVの `members` キーに `{ teamId: "..." }` フォーマットで既存データが存在する | コードレベル対応: `getMembers()` の後方互換読み込み（D-05） — データ移行は不要 |
| ライブサービス設定 | なし — 管理はコードのみ | なし |
| OS登録状態 | なし | なし |
| シークレット/環境変数 | なし（`teamId` はenv varではない） | なし |
| ビルド成果物 | なし | なし |

**後方互換戦略:** `getMembers()` の読み込み時に `teamName: m.teamName ?? m.teamId ?? ''` を適用することで、既存KVデータの `teamId` キーを `teamName` として透過的に読み込む。新規書き込みは全て `teamName` キーで保存される。[VERIFIED: codebase + CONTEXT.md D-05]

---

## Environment Availability

Step 2.6: SKIPPED（外部ツール依存なし — コード変更のみ）

---

## Validation Architecture

`nyquist_validation: false` のためこのセクションはスキップ。

---

## Security Domain

`security_enforcement` の明示設定なし（デフォルト: 有効と解釈）。

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | 管理画面は既存認証に依存（このフェーズ対象外） |
| V3 Session Management | no | このフェーズ対象外 |
| V4 Access Control | no | このフェーズ対象外 |
| V5 Input Validation | yes | サーバーサイドバリデーション（D-06） |
| V6 Cryptography | no | このフェーズ対象外 |

### Known Threat Patterns for Server Actions

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| 不正な `substackId` でのデータ改ざん | Tampering | `updateMember` で `findIndex === -1` 時にエラーthrow |
| 無効日付文字列の保存 | Tampering | `new Date(addedAt).toString() !== 'Invalid Date'` サーバーバリデーション |
| 空 `name` での保存 | Tampering | `if (!name) return 'name は必須です'` |

---

## Assumptions Log

| # | 主張 | セクション | 誤っていた場合のリスク |
|---|------|-----------|----------------------|
| A1 | `<form>` を `<tr>` 内 `<td>` に置くパターンが本プロジェクトのNext.js/ブラウザ環境で正しく動作する | インライン編集UIパターン | `<form>` がDOMから外れる場合、FormDataが収集できない。フォームなし＋手動FormData構築に切り替えが必要 |

---

## Open Questions

1. **保存時の FormData 収集方法**
   - 何がわかっているか: `<form action={handleSave}>` と `button onClick + new FormData(formRef.current)` の2パターンが存在する
   - 何が不明か: `<tr>` 内の `<form>` がブラウザで正しく動作するか（HTML仕様上 `<form>` は table-flow content ではない）
   - 推奨: `<form>` タグを避け、`<input ref>` を使わず `button onClick` で `new FormData` を構築するか、`<td>` 全体を `<form>` で包まない方法（例: `form` 属性を使ってtable外に `<form id>` を置き、input に `form="id"` を指定）を採用する

---

## Sources

### Primary (HIGH confidence)
- `/Users/kugyu10/work/keep-substack/src/lib/types.ts` — Member型定義を直接確認
- `/Users/kugyu10/work/keep-substack/src/lib/kvMembers.ts` — getMembers/addMember/deleteMember実装を直接確認
- `/Users/kugyu10/work/keep-substack/src/app/admin/actions.ts` — addMemberAction/deleteMemberAction実装を直接確認
- `/Users/kugyu10/work/keep-substack/src/app/admin/AdminMemberList.tsx` — テーブル構造を直接確認
- `/Users/kugyu10/work/keep-substack/src/app/admin/AdminAddForm.tsx` — フォーム構造を直接確認
- `/Users/kugyu10/work/keep-substack/src/app/admin/page.tsx` — 管理画面ページ構成を直接確認
- `/Users/kugyu10/work/keep-substack/src/app/member/[substackId]/page.tsx` — teamId参照箇所を直接確認
- `/Users/kugyu10/work/keep-substack/src/app/page.tsx` — teamId参照箇所を直接確認
- `.planning/phases/09-admin-member-edit/09-CONTEXT.md` — 全決定事項を確認

### Secondary (MEDIUM confidence)
- HTML仕様（table内formネストの制約）— MDN/HTML Living Standardに基づく一般知識 [ASSUMED]

---

## Metadata

**Confidence breakdown:**
- リネーム影響範囲: HIGH — grepで全参照を確認
- updateMember実装: HIGH — 既存deleteMemberパターンから直接導出
- インライン編集UIパターン: HIGH — CONTEXT.mdの具体的なイメージコードと一致
- form-in-table問題: MEDIUM — HTML仕様の一般知識、プロジェクト固有の確認なし

**Research date:** 2026-05-11
**Valid until:** 2026-06-11（安定したNext.js/React APIのため）
