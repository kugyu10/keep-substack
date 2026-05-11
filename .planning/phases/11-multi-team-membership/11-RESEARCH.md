# Phase 11: チーム多対多所属 - Research

**Researched:** 2026-05-11
**Domain:** TypeScript型変更・KVデータ後方互換・Next.js Server Actions・React UI
**Confidence:** HIGH（全ファイル直接確認済み）

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** `Member.teamName: string` → `Member.teamNames: string[]`
  - KVフォールバック: `teamNames: m.teamNames ?? (m.teamName ? [m.teamName] : [])`
  - Phase 9の `teamId→teamName` フォールバックパターンを踏襲

- **D-02:** teams生成で `Set` 重複除去
  - `[...new Set(allMembers.flatMap((m) => m.teamNames).filter(Boolean))]`

- **D-03:** フィルタリングは `m.teamNames.includes(team)`
  - 変更前: `m.teamName === team`

- **D-04:** 管理画面はカンマ区切りテキスト入力、サーバー側で `string[]` 変換
  - 表示: `teamNames.join(', ')`
  - 保存: `split(',').map(s => s.trim()).filter(Boolean)`

- **D-05:** 戻りリンクはteamNamesが複数件なら複数リンクを並べる
  - 1件: `← メンバー一覧`（チームビューへ）
  - 複数件: 各チームへのリンクを並べる
  - 0件: `← メンバー一覧`（`/` へ）

### Claude's Discretion

- 複数リンクのセパレーター（`|` vs スペース）はClaude判断
- teamNamesの並び順は保存順そのまま

### Deferred Ideas (OUT OF SCOPE)

None — 議論はPhase 11のスコープ内に収まった。
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TEAM-01 | 1人のメンバーが複数チームに所属できる（teamNames: string[]） | types.ts変更 + kvMembers.tsフォールバック |
| TEAM-02 | 管理画面でメンバーの所属チームをカンマ区切りで複数設定・更新できる | AdminMemberList.tsx + AdminAddForm.tsx + actions.ts変更 |
| TEAM-03 | チームフィルターで複数チーム所属のメンバーがどのチームでも表示される | page.tsx の flatMap + includes 変更 |
</phase_requirements>

---

## Summary

Phase 11は `Member.teamName: string` を `Member.teamNames: string[]` に変更する、型レベルのリファクタリングフェーズ。影響範囲は7ファイルに及ぶが、各変更は局所的で相互依存が少ない。

KVに保存済みの旧データは `getMembers()` のフォールバック処理で自動移行できる。Phase 9で `teamId → teamName` のフォールバックが同パターンで実装済みであり、同じアプローチで確実に対応できる。

管理画面のUI変更は「input の name 属性変更」と「表示ロジックの変更」のみで、コンポーネント構造そのものは変わらない。

**Primary recommendation:** 型定義を起点に変更を上流（types.ts）から下流（UI）の順に適用し、最後にフォールバック込みの `getMembers()` で既存KVデータの読み込みテストを行う。

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Member型定義 | Backend (lib) | — | 全レイヤーが参照する型の単一源泉 |
| KVフォールバック | Backend (lib) | — | データ移行は読み込み層で完結 |
| teams生成・フィルタリング | Frontend Server (SSR) | — | page.tsx はサーバーコンポーネント |
| 管理画面UI | Browser / Client | Frontend Server | AdminMemberList は 'use client' |
| Server Actions | API / Backend | — | 'use server' + revalidatePath |
| 戻りリンク | Frontend Server (SSR) | — | member/[substackId]/page.tsx はサーバーコンポーネント |

---

## teamName 全参照箇所（変更前）

以下は `grep -rn teamName src/` で確認した全箇所。 [VERIFIED: 直接ファイル読み込み]

### 1. `src/lib/types.ts`（13行目）

```typescript
// 変更前
export type Member = {
  name: string
  substackId: string
  teamName: string      // ← ここを変更
  addedAt: string
}
```

### 2. `src/lib/kvMembers.ts`（11行目）

```typescript
// 変更前 — getMembers()内のフォールバック
return members.map((m) => ({
  ...m,
  teamName: m.teamName ?? m.teamId ?? '',   // ← Phase 9のtermId→teamNameフォールバック
}))
```

注意: `addMember`・`updateMember` は型経由で `teamName` を扱うため、型変更に追従するだけでよい。

### 3. `src/app/page.tsx`（15-16行目）

```typescript
// 変更前
const teams = [...new Set(allMembers.map((m) => m.teamName).filter(Boolean))]
const filteredMembers = team ? allMembers.filter((m) => m.teamName === team) : allMembers
```

### 4. `src/app/admin/AdminMemberList.tsx`（40行目・54行目・79行目）

```tsx
// 変更前 — ヘッダー
<th className="border border-gray-600 px-3 py-2">teamName</th>

// 変更前 — 編集モード（54行目）
<input defaultValue={m.teamName} name="teamName" className="..." />

// 変更前 — 表示モード（79行目）
<td className="border border-gray-700 px-3 py-2">{m.teamName}</td>
```

### 5. `src/app/admin/AdminAddForm.tsx`（26-27行目）

```tsx
// 変更前
<input
  name="teamName"
  placeholder="teamName (任意)"
  className="border rounded px-2 py-1 text-sm flex-1"
/>
```

### 6. `src/app/admin/actions.ts`（14行目・21行目・46行目・55行目）

```typescript
// 変更前 — addMemberAction
const teamName = formData.get('teamName') as string
await addMember({ name, substackId, teamName: teamName ?? '' })

// 変更前 — updateMemberAction
const teamName = formData.get('teamName') as string
await updateMember(substackId, { name, teamName: teamName ?? '', addedAt })
```

### 7. `src/app/member/[substackId]/page.tsx`（29行目）

```tsx
// 変更前
<Link
  href={memberResult.member.teamName ? `/?team=${memberResult.member.teamName}` : '/'}
  className="text-sm text-gray-500 hover:text-gray-800 mb-4 inline-block"
>
  ← メンバー一覧
</Link>
```

---

## 変更後コードスニペット

### 1. `src/lib/types.ts`

```typescript
// 変更後
export type Member = {
  name: string
  substackId: string
  teamNames: string[]  // teamName: string から変更
  addedAt: string
}
```

### 2. `src/lib/kvMembers.ts` — `getMembers()`

```typescript
// 変更後 — Phase 9のフォールバックパターンを踏襲
export async function getMembers(): Promise<Member[]> {
  const members = await redis.get<any[]>('members')
  if (!members) return []
  return members.map((m) => ({
    ...m,
    teamNames: m.teamNames ?? (m.teamName ? [m.teamName] : []),
  }))
}
```

`addMember`・`updateMember` は `Member` 型経由で受け取るため型変更の恩恵を受けるだけでよく、関数本体の変更は不要。

### 3. `src/app/page.tsx`

```typescript
// 変更後
const teams = [...new Set(allMembers.flatMap((m) => m.teamNames).filter(Boolean))]
const filteredMembers = team ? allMembers.filter((m) => m.teamNames.includes(team)) : allMembers
```

### 4. `src/app/admin/AdminMemberList.tsx`

```tsx
// 変更後 — ヘッダー
<th className="border border-gray-600 px-3 py-2">チーム</th>

// 変更後 — 編集モード
<input defaultValue={m.teamNames.join(', ')} name="teamNames" className="..." />

// 変更後 — 表示モード
<td className="border border-gray-700 px-3 py-2">{m.teamNames.join(', ')}</td>
```

### 5. `src/app/admin/AdminAddForm.tsx`

```tsx
// 変更後
<input
  name="teamNames"
  placeholder="チーム名（カンマ区切り・任意）"
  className="border rounded px-2 py-1 text-sm flex-1"
/>
```

### 6. `src/app/admin/actions.ts`

```typescript
// 変更後 — addMemberAction
const teamNamesRaw = formData.get('teamNames') as string
const teamNames = teamNamesRaw
  ? teamNamesRaw.split(',').map((s) => s.trim()).filter(Boolean)
  : []
await addMember({ name, substackId, teamNames })

// 変更後 — updateMemberAction
const teamNamesRaw = formData.get('teamNames') as string
const teamNames = teamNamesRaw
  ? teamNamesRaw.split(',').map((s) => s.trim()).filter(Boolean)
  : []
await updateMember(substackId, { name, teamNames, addedAt })
```

### 7. `src/app/member/[substackId]/page.tsx`

```tsx
// 変更後 — 複数チーム対応（D-05）
{memberResult.member.teamNames.length > 0 ? (
  <div className="flex gap-3 mb-4">
    {memberResult.member.teamNames.map((t) => (
      <Link
        key={t}
        href={`/?team=${encodeURIComponent(t)}`}
        className="text-sm text-gray-500 hover:text-gray-800 inline-block"
      >
        ← {t}
      </Link>
    ))}
  </div>
) : (
  <Link
    href="/"
    className="text-sm text-gray-500 hover:text-gray-800 mb-4 inline-block"
  >
    ← メンバー一覧
  </Link>
)}
```

セパレーターは `|` ではなく `flex gap-3` による横並びを推奨（既存のタブUIと一貫したTailwindパターン）。[ASSUMED]

---

## Architecture Patterns

### フォールバックパターン（Phase 9踏襲）

既存の `getMembers()` はすでに KV の旧スキーマ（`teamId`）を `teamName` に変換するフォールバックを持っている。Phase 11でもこの層（読み込み時）で変換する設計は一貫しており、書き込み側は変更不要。

```
KV旧データ: { teamName: "TeamA" }
  ↓ getMembers() のフォールバック
メモリ上: { teamNames: ["TeamA"] }  ← UI・フィルター・リンクが参照
```

### Server Actionsのstring[]変換

Next.jsの `FormData` は常に `string` を返す。配列型への変換はサーバーアクション内で行い、型安全性をUIに持ち込まない設計が既存パターンと一致する。

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| チーム重複除去 | 手動 filter+indexOf | `[...new Set(...)]` | 既存 page.tsx で使われているパターン |
| 配列→文字列 | 手動 join ループ | `Array.prototype.join` | 標準API |
| 文字列→配列変換 | 手動パース | `split(',').map().filter()` | 既存エコシステムのパターン |

---

## Common Pitfalls

### Pitfall 1: `name="teamName"` の取り残し

**What goes wrong:** AdminMemberList.tsx と AdminAddForm.tsx で `name` 属性が `"teamName"` のまま残る。Server Actions 側は `"teamNames"` で取得するため、値が空配列になる。

**Why it happens:** UI側とServer Actions側で rename を同期させるのを忘れる。

**How to avoid:** `name="teamName"` を含む input を全件リストアップし（5箇所）、一括で `"teamNames"` に変更する。

**Warning signs:** 保存しても teamNames が `[]` になる。

### Pitfall 2: フォールバック後に旧フィールドが残留する

**What goes wrong:** フォールバック処理 `m.teamNames ?? ...` でスプレッド（`...m`）しているため、KV上に `teamName` フィールドが残ったまま `teamNames` も付与される。

**Why it happens:** `...m` でコピーした後 `teamNames` を上書きしているだけで、`teamName` フィールドの削除は行っていない。

**How to avoid:** 旧フィールドが残留してもTypeScript上は `teamNames` しか参照しないため機能的問題はない。ただし KV データが肥大化するのが気になる場合は将来的な cleanup フェーズを検討する。今フェーズでは削除不要（YAGNI）。

**Warning signs:** KVのrawデータを見ると `teamName` と `teamNames` が両方存在する。

### Pitfall 3: `encodeURIComponent` の欠落

**What goes wrong:** チーム名にスペースや日本語が含まれる場合、`href={`/?team=${t}`}` のまま使うと URLが壊れる。

**Why it happens:** 既存の `page.tsx` では `encodeURIComponent(t)` を使っているが、member ページの戻りリンクでは使われていなかった（チーム名が英数字のみと暗黙的に仮定）。

**How to avoid:** `href={`/?team=${encodeURIComponent(t)}`}` を使う。

**Warning signs:** チーム名に日本語やスペースを設定した場合に 404 や空フィルター状態になる。

### Pitfall 4: `teamNames.join(', ')` の表示崩れ

**What goes wrong:** teamNames が空配列（`[]`）の場合、`join(', ')` は空文字列を返す。表示モードのセルが空になるのは想定内だが、編集モードで `defaultValue=""` となるため問題なし。

**Why it happens:** 既存メンバーに teamName が設定されていない場合（旧データ）。

**How to avoid:** フォールバックで `[]` が入るため、`join(', ')` の結果が `""` になることを許容する。プレースホルダーで案内すれば十分。

---

## KVデータ移行の判断

**判断: `getMembers()` フォールバックで十分。** [VERIFIED: 直接コード確認]

根拠:
1. 旧データは `{ teamName: "TeamA" }` 形式で KV に保存されている
2. `getMembers()` の `map()` 内で `teamNames: m.teamNames ?? (m.teamName ? [m.teamName] : [])` を適用すれば、読み込み時に自動変換される
3. 次の `updateMember()` 呼び出し時に `teamNames` が KV に書き込まれ、以降は旧フィールドを参照しなくなる
4. Phase 9 で同じパターン（`teamId → teamName`）が既に動作していることを確認済み

データベースマイグレーションスクリプトは不要。

---

## 変更ファイルサマリー（プランナー向け）

| ファイル | 変更の性質 | 変更箇所数 |
|---------|------------|------------|
| `src/lib/types.ts` | 型フィールド変更 | 1行 |
| `src/lib/kvMembers.ts` | フォールバック書き換え | 2行（getMembers内） |
| `src/app/page.tsx` | teams生成・フィルタリング変更 | 2行 |
| `src/app/admin/AdminMemberList.tsx` | 表示・入力・ヘッダー変更 | 3箇所 |
| `src/app/admin/AdminAddForm.tsx` | input name・placeholder変更 | 2行 |
| `src/app/admin/actions.ts` | formData取得・変換ロジック変更 | 各action 3行 |
| `src/app/member/[substackId]/page.tsx` | 戻りリンクUI変更 | JSX全体書き換え |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | 複数リンクは `flex gap-3` による横並びが既存UIと一貫 | 変更後スニペット（member page） | UIが崩れる可能性あるが機能は正常 |

---

## Open Questions

1. **チーム名に日本語・特殊文字を使うユーザーがいるか**
   - What we know: 現在の teamName は英数字が多いと推測されるが確認不可
   - What's unclear: `encodeURIComponent` の有無が実際に問題になるか
   - Recommendation: `encodeURIComponent` を常に付ける（安全側）

2. **AdminAddForm の追加後の input のリセット**
   - What we know: `useActionState` でフォームをリセットする仕組みがない（現状も同様）
   - What's unclear: 追加後も teamNames inputに値が残り続けるかどうか
   - Recommendation: 現状維持（既存の name/substackId inputも同様の挙動のため）

---

## Environment Availability

Step 2.6: SKIPPED（外部ツール・サービス依存なし。コード変更のみのフェーズ）

---

## Validation Architecture

`workflow.nyquist_validation: false` のためこのセクションを省略。

---

## Sources

### Primary (HIGH confidence)
- `src/lib/types.ts` — Member型定義を直接確認
- `src/lib/kvMembers.ts` — getMembers/addMember/updateMember実装を直接確認
- `src/app/page.tsx` — teams生成・フィルタリングロジックを直接確認
- `src/app/admin/AdminMemberList.tsx` — 編集UIを直接確認
- `src/app/admin/AdminAddForm.tsx` — 追加フォームを直接確認
- `src/app/admin/actions.ts` — Server Actionsを直接確認
- `src/app/member/[substackId]/page.tsx` — 戻りリンク実装を直接確認
- `.planning/phases/11-multi-team-membership/11-CONTEXT.md` — 確定決定事項を直接確認

---

## Metadata

**Confidence breakdown:**
- 全参照箇所の特定: HIGH — 全ファイルをgrep + 直接読み込みで確認
- 変更後コードスニペット: HIGH — CONTEXT.mdの確定決定事項に基づく
- KVフォールバック戦略: HIGH — Phase 9の実装パターンが現在のコードに存在することを確認
- 複数リンクUIレイアウト: MEDIUM — Tailwindパターンは確認済みだが最終的なデザインはClaude判断

**Research date:** 2026-05-11
**Valid until:** 2026-06-11（安定したコードベース）
