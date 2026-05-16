# Phase 20: 管理画面チームチェックボックス - Context

**Gathered:** 2026-05-16
**Status:** Ready for planning

<domain>
## Phase Boundary

管理画面のチーム所属入力を、カンマ区切りテキストからチェックボックスUIに変更する。
Supabase `teams` テーブル（Phase 17 構築済み）から既存チーム一覧を取得し、
タイポなしでチームを選択できるようにする。

**このフェーズで変更するもの:**
- `src/app/admin/page.tsx` — teams テーブルから全チーム名を取得し、コンポーネントに props で渡す
- `src/app/admin/AdminAddForm.tsx` — teamNames テキスト入力 → チェックボックス群
- `src/app/admin/AdminMemberList.tsx` — teamNames テキスト入力 → チェックボックス群（既存選択を反映）
- `src/app/admin/actions.ts` — `formData.get('teamNames').split(',')` → `formData.getAll('teamNames')`

**このフェーズで作らないもの:**
- 新規チームの追加UI（チェックボックスに存在しないチームを追加する機能）— 現状テキスト入力で対応
- @upstash/redis の削除 — Phase 21

</domain>

<decisions>
## Implementation Decisions

### チェックボックスデータ取得

- **D-01:** `admin/page.tsx` で `createSupabaseAdminClient().from('teams').select('name').order('name')` を実行し、チーム名一覧（`string[]`）を `AdminAddForm` と `AdminMemberList` に渡す
- **D-02:** teams テーブルが空の場合はチェックボックスなし（フォールバック不要、管理者が直接 DB で追加する）

### AdminMemberList の FormData 収集

- **D-03:** 既存の `handleUpdate` は手動で `input[name]` を走査して FormData を構築している。チェックボックスは「checked のもののみ」を追加するよう変更する
  - `input[name]:not([type="checkbox"])` → `formData.append(input.name, input.value)`
  - `input[type="checkbox"][name]:checked` → `formData.append(cb.name, cb.value)`

### actions.ts の変更

- **D-04:** `addMemberAction` と `updateMemberAction` の `teamNames` 取得を変更:
  - 変更前: `formData.get('teamNames') as string` → `.split(',').map().filter()`
  - 変更後: `formData.getAll('teamNames') as string[]`

</decisions>

<canonical_refs>
## Canonical References

- `src/app/admin/page.tsx` — 現行実装（getMembers のみ）
- `src/app/admin/AdminAddForm.tsx` — テキスト入力フォーム（書き換え対象）
- `src/app/admin/AdminMemberList.tsx` — テキスト入力 + 手動 FormData 収集（書き換え対象）
- `src/app/admin/actions.ts` — Server Actions（teamNames 取得方法を変更）
- `src/lib/supabase/admin.ts` — createSupabaseAdminClient（teams 取得に使用）

</canonical_refs>

<code_context>
## Existing Code Insights

### AdminAddForm.tsx（現行）
- Client Component、useActionState パターン
- teamNames: テキスト input（カンマ区切り）

### AdminMemberList.tsx（現行）
- Client Component、useState で editingId 管理
- 編集時: `tr.querySelectorAll<HTMLInputElement>('input[name]')` で FormData 収集
- teamNames: テキスト input（defaultValue = `m.teamNames.join(', ')`）

### actions.ts（現行）
```typescript
const teamNamesRaw = formData.get('teamNames') as string
const teamNames = teamNamesRaw
  ? teamNamesRaw.split(',').map((s) => s.trim()).filter(Boolean)
  : []
```
→ `formData.getAll('teamNames') as string[]` に変更するだけ

</code_context>

---

*Phase: 20-管理画面チームチェックボックス*
*Context gathered: 2026-05-16*
