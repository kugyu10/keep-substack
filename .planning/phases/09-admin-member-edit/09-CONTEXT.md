# Phase 9: 管理画面メンバー編集 - Context

**Gathered:** 2026-05-11
**Status:** Ready for planning

<domain>
## Phase Boundary

管理画面（`/admin`）で既存メンバーのフィールドを直接編集・保存できる機能を追加する。
変更対象フィールド: `name`, `addedAt`, `teamName`（旧`teamId`からリネーム）。
`substackId` は変更禁止（読み取り専用表示）。

あわせて `teamId` フィールドを `teamName` にリネームする（型定義・KVデータ・全コンポーネント対象）。
KVに保存済みの既存データはリネーム後に移行が必要。

バックエンド: `updateMember` KV関数 + `updateMemberAction` Server Action を追加。
フロントエンド: `AdminMemberList` の各行に「編集」ボタンと行内インラインフォームを追加。

</domain>

<decisions>
## Implementation Decisions

### 編集UIパターン（D-01）
- **D-01:** 「編集」ボタンを押すと同じ行の `td` が `input` に切り替わるインライン編集
- 保存ボタン・キャンセルボタンも行内に表示
- モーダル・サイドパネル・別ページへの遷移はなし
- 既存の `AdminMemberList`（Client Component）に `editingId` state を追加して切り替えを管理

### substackId の扱い（D-02）
- **D-02:** `substackId` は変更禁止 — 編集モード中も読み取り専用テキストで表示
- 変更したい場合は削除→再登録の運用を推奨（実装シンプル化、バグ防止）

### addedAt の入力形式（D-03）
- **D-03:** `<input type="text">` でISO文字列（例: `2026-05-11T00:00:00.000Z`）を直接入力
- バリデーション: サーバー側で `new Date(addedAt).toString() !== 'Invalid Date'` チェック

### teamId → teamName リネーム（D-04）
- **D-04:** `teamId` フィールドを全体で `teamName` にリネーム
  - `src/lib/types.ts`: `Member.teamId` → `Member.teamName`
  - `src/lib/kvMembers.ts`: 全関数の参照を更新
  - `src/app/admin/actions.ts`: FormData取得キーも `teamName` に変更
  - `src/app/admin/AdminMemberList.tsx`: 列表示・編集フォームを更新
  - `src/app/admin/AdminAddForm.tsx`: フォームの `name="teamId"` → `name="teamName"` に変更
  - `src/app/member/[substackId]/page.tsx`: `member.teamId` → `member.teamName`
  - `src/app/page.tsx`: `member.teamId` → `member.teamName`（`/?team=` URL生成部分）
- **D-05（データ移行）:** リネーム後、既存KVデータには `teamId` キーが残る。
  移行戦略: `getMembers()` で読み込み時に `(m as any).teamId` をフォールバックとして読む — または管理画面に「データ移行」ボタンを追加して一括再保存する
  - **採用方針:** 読み込み時フォールバック（KISS）— `getMembers` で `teamName: m.teamName ?? (m as any).teamId ?? ''` のように後方互換読み込みを追加

### バリデーション（D-06）
- **D-06:** サーバーサイドのみ（既存 `addMemberAction` パターンに揃える）
  - `name` が空 → エラーメッセージ返却
  - `addedAt` が無効な日付 → エラーメッセージ返却
  - エラーは行内に表示（インラインフォームの下に赤字）

### Server Action（D-07）
- **D-07:** `updateMemberAction(substackId: string, formData: FormData): Promise<string | null>` を `actions.ts` に追加
  - `substackId` は変更対象の識別子として引数で受け取る（フォームデータからは受け取らない）
  - 保存後 `revalidatePath('/admin')` で一覧を更新

### Claude's Discretion
- インライン編集フォームのスタイリング（input幅、ボタン配置）はClaude判断
- キャンセル時のstate初期化方法（`setEditingId(null)` 等）はClaude判断
- 「保存」「キャンセル」ボタンのテキスト・色はClaude判断

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 変更対象ファイル（全件）
- `src/lib/types.ts` — Member型定義（teamId→teamNameリネーム対象）
- `src/lib/kvMembers.ts` — KV操作関数（updateMember追加、後方互換読み込み）
- `src/app/admin/actions.ts` — Server Actions（updateMemberAction追加）
- `src/app/admin/AdminMemberList.tsx` — 編集UIの主要変更対象
- `src/app/admin/AdminAddForm.tsx` — teamName入力フィールド名変更
- `src/app/admin/page.tsx` — 管理画面ページ（確認のみ）
- `src/app/member/[substackId]/page.tsx` — member.teamName参照変更
- `src/app/page.tsx` — /?team=${member.teamName}参照変更

### 要件定義
- `.planning/REQUIREMENTS.md` — ADMIN-01の詳細
- `.planning/ROADMAP.md` — Phase 9のSuccess Criteria

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `deleteMemberAction(substackId)` in `actions.ts` — 削除のServer Actionパターン。`updateMemberAction` も同じパターンで実装
- `AdminMemberList` の `handleDelete` — `editingId` state管理のパターン参考
- `addMemberAction` の `prevState/formData` パターン — useActionState連携（ただしupdateはuseActionStateではなく直接呼び出しでもよい）

### Integration Points
- `AdminMemberList.tsx`: `editingId: string | null` stateを追加。`editingId === m.substackId` のとき該当行をinput表示に切り替える
- `kvMembers.ts`: `updateMember(substackId, updates)` を新設。既存メンバー配列からsubstackIdで対象を見つけてフィールド更新後、`redis.set('members', updated)` で保存
- `types.ts`: `Member.teamId` → `Member.teamName` のリネームにより連鎖的に全ファイルの参照を更新

### Established Patterns
- **Server Actions** — `'use server'` + `revalidatePath` パターン
- **Client Component** — `AdminMemberList` は `'use client'`。stateとイベントハンドラを使用可能
- **Tailwind CSS** — 全スタイリング

</code_context>

<specifics>
## Specific Ideas

### updateMember KV関数（イメージ）
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

### teamName後方互換読み込み（イメージ）
```typescript
export async function getMembers(): Promise<Member[]> {
  const members = await redis.get<any[]>('members')
  if (!members) return []
  // teamId→teamNameの移行対応
  return members.map((m) => ({
    ...m,
    teamName: m.teamName ?? m.teamId ?? '',
  }))
}
```

### AdminMemberList の編集UI（イメージ）
```tsx
const [editingId, setEditingId] = useState<string | null>(null)

// 行のTD: editingId === m.substackId のとき input 表示
{editingId === m.substackId ? (
  <input defaultValue={m.name} name="name" className="border px-1 w-full" />
) : (
  m.name
)}
```

</specifics>

<deferred>
## Deferred Ideas

None — 議論はPhase 9のスコープ内に収まった。

</deferred>

---

*Phase: 9-admin-member-edit*
*Context gathered: 2026-05-11*
