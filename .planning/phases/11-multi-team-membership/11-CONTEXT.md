# Phase 11: チーム多対多所属 - Context

**Gathered:** 2026-05-11
**Status:** Ready for planning

<domain>
## Phase Boundary

`Member.teamName: string` を `Member.teamNames: string[]` に変更し、1人が複数チームに所属できるようにする。
KVの既存データは後方互換フォールバックで自動移行する。

変更対象:
- `src/lib/types.ts` — `teamName` → `teamNames: string[]`
- `src/lib/kvMembers.ts` — 後方互換フォールバック + `addMember`/`updateMember` の型更新
- `src/app/page.tsx` — teams生成・フィルタリングロジック変更
- `src/app/admin/AdminMemberList.tsx` — teamNames をカンマ区切りで表示・編集
- `src/app/admin/actions.ts` — カンマ区切り文字列→string[]変換
- `src/app/member/[substackId]/page.tsx` — 戻りリンク（複数リンク）

UIコンポーネントの構造変更は最小限。バックエンドのみデータ構造が変わる。

</domain>

<decisions>
## Implementation Decisions

### 型変更（D-01）
- **D-01:** `Member.teamName: string` → `Member.teamNames: string[]`
- KVの後方互換フォールバック: `teamNames: m.teamNames ?? (m.teamName ? [m.teamName] : [])`
- Phase 9の `teamId→teamName` と同じフォールバックパターンを踏襲

### チームタブの重複除去（D-02）
- **D-02:** `Set` で重複除去
- 変更後: `[...new Set(allMembers.flatMap((m) => m.teamNames).filter(Boolean))]`
- 複数メンバーが同じチームに所属していても、タブは一意に表示される

### チームフィルタリング（D-03）
- **D-03:** `m.teamNames.includes(team)` に変更
- 変更前: `m.teamName === team`
- 変更後: `m.teamNames.includes(team)`
- 複数チーム所属メンバーがどのチームフィルターでも表示される

### 管理画面のカンマ区切り入力（D-04）
- **D-04:** カンマ区切りテキスト入力。サーバー側で `string[]` に変換
- 表示時: `teamNames.join(', ')` でカンマ区切りに結合
- 保存時: `formData.get('teamNames').split(',').map(s => s.trim()).filter(Boolean)`
- 単一チームでも配列として保存（例: `['TeamA']`）

### メンバー詳細ページの戻りリンク（D-05）
- **D-05:** 複数チームに所属している場合は複数リンクを並べる
- `teamNames` が1件: `← メンバー一覧`（現在と同じ、チームビューへ）
- `teamNames` が複数件: `← TeamA | ← TeamB` のように各チームへのリンクを並べる
- `teamNames` が空: `← メンバー一覧`（`/` に戻る）

### Claude's Discretion
- 複数リンクのセパレーター（`|` vs スペース）はClaude判断
- teamNamesの並び順は保存順そのまま

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 変更対象ファイル（全件）
- `src/lib/types.ts` — Member型定義（teamName→teamNames対象）
- `src/lib/kvMembers.ts` — KV操作関数（後方互換フォールバック追加）
- `src/app/page.tsx` — teams生成・フィルタリングロジック
- `src/app/admin/AdminMemberList.tsx` — 編集UIのteamNames表示・入力
- `src/app/admin/actions.ts` — addMemberAction/updateMemberAction（string[]変換）
- `src/app/member/[substackId]/page.tsx` — 戻りリンク（複数リンク）

### 要件定義
- `.planning/REQUIREMENTS.md` — TEAM-01, TEAM-02, TEAM-03
- `.planning/ROADMAP.md` — Phase 11のSuccess Criteria

### 参照パターン
- Phase 9の `teamId→teamName` フォールバックパターン（kvMembers.tsの現在のgetMembers実装）

</canonical_refs>

<code_context>
## Existing Code Insights

### 現在の実装（変更前）
```typescript
// types.ts
teamName: string

// page.tsx
const teams = [...new Set(allMembers.map((m) => m.teamName).filter(Boolean))]
const filteredMembers = team ? allMembers.filter((m) => m.teamName === team) : allMembers

// AdminMemberList.tsx（編集モード）
<input defaultValue={m.teamName} name="teamName" />

// actions.ts
const teamName = formData.get('teamName') as string
await addMember({ ..., teamName: teamName ?? '' })

// member/[substackId]/page.tsx
href={memberResult.member.teamName ? `/?team=${memberResult.member.teamName}` : '/'}
```

### Established Patterns
- KV後方互換フォールバック: `getMembers()` で読み込み時に変換（Phase 9パターン）
- Server Actions: `'use server'` + `revalidatePath`
- Tailwind CSS: 全スタイリング

</code_context>

<specifics>
## Specific Ideas

### types.ts 変更
```typescript
export type Member = {
  name: string
  substackId: string
  teamNames: string[]  // teamName: string から変更
  addedAt: string
}
```

### kvMembers.ts 後方互換フォールバック
```typescript
return members.map((m: any) => ({
  ...m,
  teamNames: m.teamNames ?? (m.teamName ? [m.teamName] : []),
}))
```

### page.tsx 変更
```typescript
const teams = [...new Set(allMembers.flatMap((m) => m.teamNames).filter(Boolean))]
const filteredMembers = team ? allMembers.filter((m) => m.teamNames.includes(team)) : allMembers
```

### admin 入力・表示
```tsx
// 表示モード
<td>{m.teamNames.join(', ')}</td>

// 編集モード
<input defaultValue={m.teamNames.join(', ')} name="teamNames" />
```

### 戻りリンク（複数チーム）
```tsx
{memberResult.member.teamNames.length > 0 ? (
  memberResult.member.teamNames.map((t) => (
    <Link key={t} href={`/?team=${t}`} className="...">← {t}</Link>
  ))
) : (
  <Link href="/" className="...">← メンバー一覧</Link>
)}
```

</specifics>

<deferred>
## Deferred Ideas

None — 議論はPhase 11のスコープ内に収まった。

</deferred>

---

*Phase: 11-multi-team-membership*
*Context gathered: 2026-05-11*
