# Phase 27: Substack Handle — DB + プロフィールリンク - Research

**Researched:** 2026-06-02
**Domain:** Next.js 16 App Router / Supabase / React Server Components — incremental DB migration + Server Action extension + Client Component prop addition
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**@handle 入力 UI（PROF-01）**
- D-01: `MyProfileForm.tsx` 内の `name` フィールドの下に @handle 入力欄を追加する（専用セクションや別フォームは不要）
- D-02: `substack_handle` は DB に `@` 込みで保存する（例: `@hoge`）。保存前に `trim()` + 先頭 `@` が付いていなければ自動付与する。空文字列は `null` として保存（handle 未設定 = リンクなし）
- D-03: name + teams + handle を既存の `updateMyProfileAction` で一括保存する。専用アクションは不要

**?handle= pre-fill（PROF-03）**
- D-04: `auth/callback/route.ts` が `?handle=hoge` クエリパラムを受け取り、redirect 先を `/my?handle=hoge` にする（既存の `?pid=` パターンと同様に実装）
- D-05: `/my/page.tsx` が `searchParams` から `handle` を読み取り、`MyProfileForm` に初期値として渡す
- D-06: DB に `substack_handle` が存在する場合は DB 値を優先して表示する。DB が空（null）の場合のみ `searchParams` の `handle` 値を `defaultValue` として使う

**handle バリデーション**
- D-07: Server Action（`updateMyProfileAction`）内でのみバリデーションを行う。クライアントサイドバリデーションは追加しない
- D-08: バリデーションルール: `trim()` → 空文字なら `null` 保存 → 非空なら先頭 `@` を付与して保存。文字種の正規表現制約は設けない（最低限のみ）
- D-09: `substack_handle` カラムは `TEXT NULL` — 未設定メンバーのリンクは表示しない（CalendarGrid がフォールバックを処理）

### Claude's Discretion

- **PROF-02 の CalendarGrid 実装:** `CalendarGrid.tsx` の avatar+name ヘッダー（行 44-57）を、`substack_handle` が存在する場合は `<a href="https://substack.com/{handle}" target="_blank" rel="noopener noreferrer">` で囲む。`substackHandle?: string` を新しい prop として追加。`null` または未定義の場合は現状の静的表示を維持
- **URL 生成:** DB に `@hoge` で保存されているため URL は `https://substack.com/${handle}` で正しく `https://substack.com/@hoge` になる（`@` 重複なし）
- **`getMembers()` の拡張:** `src/lib/members.ts` の SELECT に `substack_handle` を追加し、`Member` 型にも追加する。`member/[publicationId]/page.tsx` がこの値を取得して `CalendarGrid` に渡す

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PROF-01 | User can register and update Substack @handle from /my page | D-01~D-03, D-07, D-08: MyProfileForm + updateMyProfileAction 拡張パターン確立済み |
| PROF-02 | User can click name/icon on personal monthly view to open `https://substack.com/@{handle}` in a new tab | D-09 + Claude's Discretion: CalendarGrid に `substackHandle?` prop を追加し、条件付きリンク wrap |
| PROF-03 | Login URL accepts `?handle=hoge` query param; after Magic Link login, /my page pre-fills the @handle input | D-04~D-06: `?pid=` パターンが完全な参照実装として既存 |

</phase_requirements>

---

## Summary

Phase 27 は既存の Next.js 16 App Router + Supabase パターンを純粋に拡張するフェーズであり、新規ライブラリは一切不要。変更点は明確に 3 つの関心事に分かれる：(1) DB migration (`members` テーブルへの `substack_handle TEXT NULL` カラム追加)、(2) Server Action + RSC 側の `substack_handle` 読み書きロジック拡張、(3) `CalendarGrid` Client Component への `substackHandle?` prop 追加とリンク化。

すべての実装パターンは既存コードベースに参照例が存在する。`?pid=` フローは `?handle=` フローの直接テンプレートとなり、`updateMyProfileAction` の `name` 処理は `substack_handle` 正規化ロジックのひな型となる。DB migration は Phase 26 が確立した「`schema.sql` + `migrations/` 両方に追加」パターンに従う。

この phase に技術的な未知領域はない。研究作業の大部分は既存コードのパターン確認に費やされ、その結果すべてクリアである。

**Primary recommendation:** 既存の `?pid=` / `name` フィールドのパターンをそのまま `?handle=` / `substack_handle` に適用する。新しい抽象化・ライブラリ・独自ユーティリティの導入は不要。

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| substack_handle 永続化 | Database (Supabase) | API / Backend (Server Action) | カラム追加 + Server Action での write — DB が owner |
| handle 入力 UI | Frontend Client (Client Component) | Frontend Server (RSC props) | MyProfileForm は `'use client'` — DOM input は client tier |
| handle バリデーション・正規化 | API / Backend (Server Action) | — | D-07: Server Action のみ。クライアント検証なし |
| handle 読み出し・フォーム初期値 | Frontend Server (RSC) | — | `my/page.tsx` は async RSC — DB 読み + searchParams 両方 |
| ?handle= pre-fill フロー | API / Backend (Route Handler) | Frontend Server (RSC) | callback route が redirect、RSC が searchParams を消費 |
| CalendarGrid プロフィールリンク | Frontend Client (Client Component) | — | CalendarGrid は `'use client'` — anchor は client tier で render |
| substack_handle のメンバー型伝搬 | Frontend Server (Data Layer) | — | `getMembers()` + `Member` 型 — server-side data fetch |

---

## Standard Stack

### Core

既存スタックの拡張のみ — 新規パッケージなし。

| Library | Version (installed) | Purpose | Why Standard |
|---------|---------------------|---------|--------------|
| Next.js (App Router) | 16.2.6 | RSC / Server Actions / Route Handlers | プロジェクト既定 [VERIFIED: package.json] |
| @supabase/supabase-js | (インストール済み) | Supabase DB クライアント | プロジェクト既定 [VERIFIED: package.json] |
| @supabase/ssr | ^0.10.3 | Cookie-based auth セッション管理 | プロジェクト既定 [VERIFIED: package.json] |
| React (useActionState) | 19 (Next 16 内蔵) | Server Action 状態管理 | 既存 MyProfileForm で使用済み [VERIFIED: MyProfileForm.tsx] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | ^4.1.6 | Unit テスト | Server Action / RSC テスト追加時 [VERIFIED: package.json] |

### Alternatives Considered

なし — すべての決定は CONTEXT.md で locked。

**Installation:** 新規パッケージなし。

---

## Package Legitimacy Audit

新規パッケージの導入なし。本フェーズは既存依存関係の拡張のみ。

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
[User Browser]
    |
    | (1) GET /login-…/?handle=hoge
    v
[Login Page RSC]
    |  reads searchParams.handle
    |  renders LoginForm with handle as hidden input
    v
[LoginForm Client]
    |  sendMagicLinkAction → builds callbackUrl with ?handle=hoge
    v
[Supabase Auth] ──── sends Magic Link email ────────────>
                                                         |
[User clicks email link]                                 |
    |                                                    |
    | GET /auth/callback?code=…&handle=hoge              |
    v
[auth/callback Route Handler]
    |  exchangeCodeForSession(code)
    |  extract handle param
    |  redirect → /my?handle=hoge
    v
[/my page RSC]
    |  reads searchParams.handle
    |  reads members.substack_handle from DB (via admin client)
    |  DB値優先; DBがnullなら searchParams.handleをdefaultValue
    v
[MyProfileForm Client]
    |  renders @handle input field
    |  submit → updateMyProfileAction(formData)
    v
[updateMyProfileAction Server Action]
    |  trim() → null or @{handle}
    |  admin.from('members').update({name, substack_handle})
    |  revalidatePath('/my')
    v
[Supabase DB: members.substack_handle]

---

[/member/[publicationId] RSC]
    |  getMembers() → Member[] (now includes substack_handle)
    |  fetchAllFeedsCached()
    |  passes substackHandle to CalendarGrid
    v
[CalendarGrid Client Component]
    |  if substackHandle: render <a href="https://substack.com/{handle}">
    |  else: render static img+name (unchanged)
```

### Recommended Project Structure

変更対象ファイル（新規ファイル最小限）:

```
supabase/
├── schema.sql                           # ADD COLUMN IF NOT EXISTS substack_handle
└── migrations/
    └── 20260602000000_add_substack_handle.sql  # 増分 migration (新規作成)

src/
├── lib/
│   ├── types.ts                         # Member 型に substackHandle?: string 追加
│   └── members.ts                       # getMembers() SELECT に substack_handle 追加
├── app/
│   ├── my/
│   │   ├── page.tsx                     # searchParams: Promise<{handle?}>, DB優先ロジック
│   │   ├── MyProfileForm.tsx            # substackHandle prop追加, @handle 入力欄
│   │   └── actions.ts                   # updateMyProfileAction に substack_handle 追加
│   ├── auth/callback/route.ts           # ?handle= パラメータ → /my?handle= redirect
│   └── login-51cf21389c56/
│       └── actions.ts                   # callbackUrl に handle も付与（LoginFormから）
└── components/
    └── CalendarGrid.tsx                 # substackHandle?: string prop, 条件付きリンク
```

### Pattern 1: searchParams を Promise として受け取る（Next.js 15+ / 16）

**What:** App Router のページコンポーネントで `searchParams` は `Promise<{...}>` 型。`await` して値を取り出す。

**When to use:** すべての RSC page.tsx で searchParams を読む場合。

**Example:**
```typescript
// Source: src/app/page.tsx (verified in codebase)
// Source: src/app/login-51cf21389c56/page.tsx (verified in codebase)
export default async function MyPage({
  searchParams,
}: {
  searchParams: Promise<{ handle?: string }>
}) {
  const { handle } = await searchParams
  // ...
}
```

**注意:** `my/page.tsx` の現行シグネチャは `searchParams` を受け取っていない（`export default async function MyPage()` — 引数なし）。Phase 27 でシグネチャを追加する必要がある。

### Pattern 2: `?pid=` パターンを `?handle=` に適用する（auth/callback）

**What:** Route Handler で `searchParams` から追加パラメータを取り出し、redirect URL に付与する。

**When to use:** Magic Link 後の URL にクエリパラムを伝搬させる場合。

**Example:**
```typescript
// Source: src/app/auth/callback/route.ts (verified — ?pid= pattern)
const handle = searchParams.get('handle')
// ...
const redirectPath = handle
  ? `/my?handle=${encodeURIComponent(handle)}`
  : next  // fallback to next or '/my'
return NextResponse.redirect(new URL(redirectPath, origin))
```

**注意:** `?pid=` と `?handle=` が同時に来るケースは現フェーズのスコープ外（deferred: none）。ただし `pid` ロジックと `handle` ロジックは独立して動作させる設計にする。

### Pattern 3: Server Action に新フィールドを追加する

**What:** `updateMyProfileAction` の `update({...})` に `substack_handle` を追加し、正規化ロジックを挿入する。

**When to use:** 既存の一括 update action にフィールドを追加する場合。

**Example:**
```typescript
// Source: src/app/my/actions.ts (verified — name フィールドのパターン)
const rawHandle = (formData.get('substack_handle') as string | null)?.trim() ?? ''
const substack_handle = rawHandle === ''
  ? null
  : rawHandle.startsWith('@') ? rawHandle : `@${rawHandle}`

await admin
  .from('members')
  .update({ name, substack_handle })
  .eq('user_id', user.id)
  .select('id')
  .single()
```

### Pattern 4: CalendarGrid に条件付き anchor を追加する

**What:** `substackHandle?: string` prop を追加し、avatar+name ヘッダーブロック（行 44-57）を条件付きで `<a>` で包む。

**When to use:** 外部リンクが optional で、未設定時は静的表示を維持したい場合。

**Example:**
```tsx
// Source: src/components/CalendarGrid.tsx lines 44-57 (verified structure)
const header = (
  <div className="flex items-center gap-2 mb-2">
    {imageUrl ? (
      <img src={imageUrl} alt="" width={32} height={32}
        className="w-8 h-8 rounded-full object-cover shrink-0" />
    ) : (
      <span className="w-8 h-8 rounded-full bg-gray-200 inline-block shrink-0" aria-hidden="true" />
    )}
    <h2 className="text-lg font-semibold">{memberName}</h2>
  </div>
)

return (
  <div>
    {substackHandle ? (
      <a
        href={`https://substack.com/${substackHandle}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block hover:opacity-80"
      >
        {header}
      </a>
    ) : (
      header
    )}
    {/* rest unchanged */}
  </div>
)
```

### Pattern 5: DB migration — schema.sql + migrations/ 両方に追加

**What:** Phase 26 で確立したパターン — `supabase/schema.sql` に `ADD COLUMN IF NOT EXISTS` を追加し、`supabase/migrations/` に増分ファイルも追加する。

**When to use:** すべてのスキーマ変更。

**Example:**
```sql
-- supabase/schema.sql への追加 (schema.sql は fresh DB bootstrap source)
ALTER TABLE members ADD COLUMN IF NOT EXISTS substack_handle TEXT;

-- supabase/migrations/20260602000000_add_substack_handle.sql (新規作成)
-- 形式: Phase 26 の consolidated_schema.sql に倣い BEGIN/COMMIT で囲む
BEGIN;
ALTER TABLE members ADD COLUMN IF NOT EXISTS substack_handle TEXT;
COMMIT;
```

### Pattern 6: DB値優先 / searchParams フォールバック

**What:** RSC 側でDB値と searchParams を比較し、DBが非 null ならDB値を `defaultValue` にセット、DB が null なら searchParams 値を `defaultValue` にセット。

**When to use:** D-06: DB有権者原則（DBが設定済みなら URL パラメータは無視）。

**Example:**
```typescript
// my/page.tsx の MyProfileForm 呼び出し箇所
const handleDefault = member?.substack_handle ?? handle ?? undefined
// → MyProfileForm に props として渡す
```

### Anti-Patterns to Avoid

- **`searchParams` を同期アクセスしてしまう:** Next.js 16 では `searchParams` は `Promise<{...}>` 型。`await` なしでアクセスすると TypeScript エラーまたは実行時 undefined になる。
- **DB に `@` なしで保存してしまう:** D-02 は `@hoge` 形式での保存を定める。URL 生成が `https://substack.com/@hoge` になることを前提にしている。保存前の `startsWith('@')` チェックが必須。
- **`formData.get('substack_handle')` の型アサーションを忘れる:** `as string | null` にしないと `FormDataEntryValue | null` 型になり `.trim()` が呼べない。
- **CalendarGrid の `<a>` を `<div>` の外に出してしまう:** 構造的に `<div>` の中に `<a>` が入れ子になるため、react/jsx の `block` 要素ネスト警告に注意。`className="block"` を `<a>` に付与してブロック表示を維持する。
- **schema.sql と migrations/ の片方だけ更新してしまう:** Phase 26 ルール — 両方を常に同期させる。

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| handle の `@` 正規化 | 複雑な正規表現バリデーター | D-08 の `trim()` + `startsWith('@')` チェックのみ | ユーザーは `hoge` または `@hoge` を入力できればよい。厳密な文字種制約は不要（D-08 locked） |
| URL エンコード | 手動エスケープ | `encodeURIComponent()` 使用（?pid= パターンと同じ） | auth/callback でパラメータを扱う標準的手法 |
| DB migration | 手動 SQL 実行のみ | schema.sql + migrations/ の両方更新 | fresh DB bootstrap と incremental update を両立するため |

**Key insight:** このフェーズは既存パターンの適用のみ。カスタムソリューションを構築する理由はない。

---

## Runtime State Inventory

> このフェーズは既存テーブルへのカラム追加（additive migration）のみ。既存データに破壊的変更なし。

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | members テーブル: 既存行は `substack_handle = NULL` になる | `ADD COLUMN IF NOT EXISTS` は既存行に NULL をセット — 追加マイグレーション不要 |
| Live service config | Supabase prod + TEST プロジェクト (otydhiumsdsyxepnjqjp / xolhjcngrwwwqtklmoyk) | 両プロジェクトに migration を適用する必要あり |
| OS-registered state | なし — verified (rename なし) | none |
| Secrets/env vars | SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL — column 追加のみで key 名変更なし | none |
| Build artifacts | なし — pure TypeScript / SQL 変更 | none |

---

## Common Pitfalls

### Pitfall 1: `my/page.tsx` の関数シグネチャ未更新
**What goes wrong:** 現行の `MyPage()` は `searchParams` を受け取っていない。追加しないと `handle` クエリパラムが読めない。
**Why it happens:** 既存ページに `searchParams` が不要だったため引数省略されていた。
**How to avoid:** Plan 02 タスクで `searchParams: Promise<{ handle?: string }>` をシグネチャに追加する。
**Warning signs:** `handle` が常に `undefined` になる。

### Pitfall 2: `substack_handle` が `my/page.tsx` の SELECT クエリに含まれていない
**What goes wrong:** DB に保存した値が読み出せず、D-06 の「DB値優先」ロジックが常に null を返す。
**Why it happens:** 既存の `.select(...)` は `name, publication_id, member_teams(...)` のみ取得。
**How to avoid:** `.select()` に `substack_handle` を追加する。
**Warning signs:** 保存後に再ロードしてもフォームが空になる。

### Pitfall 3: `getMembers()` の SELECT に `substack_handle` を追加し忘れる
**What goes wrong:** `member/[publicationId]/page.tsx` で `substackHandle` が常に undefined になり、PROF-02 のリンクが表示されない。
**Why it happens:** `members.ts` の `getMembers()` と `Member` 型は独立して更新が必要。
**How to avoid:** Plan 02 の `getMembers()` 拡張タスクで `substack_handle` を SELECT + 型に追加する。
**Warning signs:** CalendarGrid の名前がクリックできない（リンクにならない）。

### Pitfall 4: `?handle=` と `?pid=` が auth/callback で競合する
**What goes wrong:** `pid` ロジックが handle を上書きする、または `next` への redirect が handle パラメータを落とす。
**Why it happens:** `next` パラメータが `/my` にデフォルトされるが、`/my?handle=hoge` ではない。
**How to avoid:** `handle` パラメータを `pid` とは独立して処理し、redirect path 生成時に handle を付与する専用ロジックを入れる。
**Warning signs:** Magic Link 経由でログインしても /my の @handle 欄が空になる。

### Pitfall 5: schema.sql と migration の片方だけ更新してしまう
**What goes wrong:** fresh DB bootstrap (TEST プロジェクト) では schema.sql が使われるため、migrations/ のみ更新した場合 TEST では column が存在しない。逆も同様。
**Why it happens:** Phase 26 で確立したルールを忘れると発生。
**How to avoid:** Plan 01 で schema.sql と migrations/ を同時に更新する。
**Warning signs:** TEST プロジェクトで `column "substack_handle" does not exist` エラー。

### Pitfall 6: CalendarGrid の `<a>` ネストで HTML 警告
**What goes wrong:** `<a>` 内に `<h2>` (block element) をネストすると、React が `validateDOMNesting` 警告を出す場合がある。
**Why it happens:** `<a>` は inline 要素だが `className="block"` で block 表示にする必要がある。
**How to avoid:** `<a>` に `className="block"` を付与し、ネストを `<div>` なしで直接行う。`<h2>` を `<a>` 直下に置くのは HTML5 的に valid。
**Warning signs:** ブラウザコンソールに `<a> cannot appear as a descendant of <a>` 警告（該当しないが確認する）。

---

## Code Examples

Verified patterns from official sources:

### searchParams (Promise型) の読み取り
```typescript
// Source: src/app/login-51cf21389c56/page.tsx (verified)
export default async function MyPage({
  searchParams,
}: {
  searchParams: Promise<{ handle?: string }>
}) {
  const { handle } = await searchParams
  // DB 値優先 (D-06)
  const handleDefault = member?.substack_handle ?? handle ?? undefined
}
```

### auth/callback での handle パラメータ伝搬
```typescript
// Source: src/app/auth/callback/route.ts (verified — pid pattern)
const handle = searchParams.get('handle')
// pid と handle は独立
if (pid) {
  // 既存の pid 自動紐付けロジックは変更しない
}
// redirect 先を決定
const myPath = handle ? `/my?handle=${encodeURIComponent(handle)}` : next
return NextResponse.redirect(new URL(myPath, origin))
```

### Server Action での handle 正規化 (D-08)
```typescript
// Source: D-08 (locked decision), trim pattern mirrors src/app/my/actions.ts
const rawHandle = (formData.get('substack_handle') as string | null)?.trim() ?? ''
const substack_handle: string | null =
  rawHandle === '' ? null : rawHandle.startsWith('@') ? rawHandle : `@${rawHandle}`

await admin
  .from('members')
  .update({ name, substack_handle })
  .eq('user_id', user.id)
  .select('id')
  .single()
```

### DB migration (incremental, idempotent)
```sql
-- Source: supabase/migrations/20260531000000_consolidated_schema.sql (pattern verified)
BEGIN;
ALTER TABLE members ADD COLUMN IF NOT EXISTS substack_handle TEXT;
COMMIT;
```

### CalendarGrid 条件付きリンク (PROF-02)
```tsx
// Source: src/components/CalendarGrid.tsx lines 44-57 (verified structure)
// Props 型に追加:
type Props = {
  memberName: string
  articleMap: [string, HeatmapArticle[]][]
  imageUrl?: string
  substackHandle?: string  // 新規追加
}

// avatar+name ブロックをリンク化:
const avatarName = (
  <div className="flex items-center gap-2 mb-2">
    {/* 既存の avatar + h2 — 変更なし */}
  </div>
)

// render 側:
{substackHandle ? (
  <a
    href={`https://substack.com/${substackHandle}`}
    target="_blank"
    rel="noopener noreferrer"
    className="block hover:opacity-80"
  >
    {avatarName}
  </a>
) : (
  avatarName
)}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `searchParams` を同期オブジェクトとして受け取る | `searchParams: Promise<{...}>` として `await` する | Next.js 15 | page.tsx シグネチャ変更が必須 |
| migrations/ のみで DB 管理 | schema.sql (bootstrap) + migrations/ (incremental) の二重管理 | Phase 26 確立 | fresh DB と既存 DB 両方で冪等な適用が可能 |

**Deprecated/outdated:**
- 同期 searchParams アクセス: Next.js 16 では型エラーになる（`src/app/page.tsx` と `src/app/login-51cf21389c56/page.tsx` で `await searchParams` パターンが採用済み）

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `login-51cf21389c56/actions.ts` は `callbackUrl` に `?handle=` も付与する必要がある（LoginForm が hidden input として handle を持つ場合） | Architecture Patterns | LoginForm を読んでいないため、handle を LoginForm 経由で渡す必要があるかどうか未確認。ただしこれは PROF-03 の実装経路によるため plan 時に要確認 |

**Note on A1:** `?handle=hoge` は Magic Link を送信するページの URL にあらかじめ含まれる（`/login-…/?handle=hoge`）。`LoginForm` が `pid` hidden input と同様に `handle` hidden input を持てば、`sendMagicLinkAction` がこれを拾って callbackUrl に付与できる。LoginForm.tsx は読んでいないが、`?pid=` の実装パターン（`pid` hidden input → action → callbackUrl）が確立されているため、同様の拡張で対応可能と判断。[ASSUMED]

---

## Open Questions

1. **LoginForm.tsx に `handle` hidden input を追加する必要があるか**
   - What we know: `?pid=` は LoginForm に hidden input として存在し、sendMagicLinkAction が読み取る
   - What's unclear: LoginForm.tsx を読んでいないが、パターンは同じはず
   - Recommendation: Plan 02 で LoginForm.tsx を読んで hidden input を確認・追加する

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase CLI (supabase) | migration 適用 | 確認不要 | — | SQL Editor 経由で直接適用（Phase 26 で確立済み） |
| Node.js | Next.js dev/build | ✓ (前提) | — | — |

**Missing dependencies with no fallback:** なし

**Missing dependencies with fallback:**
- Supabase CLI: migration 適用は SQL Editor 経由でも可（Phase 26 Phase 02 の DEVIATION として記録済み）

---

## Validation Architecture

> `nyquist_validation: true` (config.json confirmed)

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest ^4.1.6 |
| Config file | vitest.config.ts (root) |
| Quick run command | `npx vitest run src/app/my/__tests__/` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PROF-01 | `updateMyProfileAction` が `substack_handle` を保存する（null / @付与 / 既存値） | unit | `npx vitest run src/app/my/__tests__/updateMyProfileAction.test.ts` | ✅ (既存ファイル拡張) |
| PROF-01 | `my/page.tsx` が DB の `substack_handle` を `MyProfileForm` に渡す | unit | `npx vitest run src/app/my/__tests__/page.test.tsx` | ✅ (既存ファイル拡張) |
| PROF-02 | CalendarGrid が `substackHandle` prop ありでリンクを render する | unit | `npx vitest run src/components/__tests__/CalendarGrid.test.tsx` | ❌ Wave 0 (新規作成要) |
| PROF-03 | `/my` が DB null + searchParams handle のとき handle を defaultValue にする | unit | `npx vitest run src/app/my/__tests__/page.test.tsx` | ✅ (既存ファイル拡張) |
| PROF-03 | auth/callback が `?handle=` を `/my?handle=` に forward する | unit | `npx vitest run src/app/auth/__tests__/callback.test.ts` | ❌ Wave 0 (新規作成要) |

### Sampling Rate

- **Per task commit:** `npx vitest run src/app/my/__tests__/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/components/__tests__/CalendarGrid.test.tsx` — covers PROF-02 (substackHandle prop → link render, null → no link)
- [ ] `src/app/auth/__tests__/callback.test.ts` — covers PROF-03 (?handle= → /my?handle= redirect)

*(既存の `updateMyProfileAction.test.ts` と `page.test.tsx` は拡張で対応可能 — 新規ファイル不要)*

---

## Security Domain

> `security_enforcement` は config に記載なし → enabled 扱い

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no — 既存 Magic Link auth を変更しない | — |
| V3 Session Management | no — セッション処理に変更なし | — |
| V4 Access Control | yes — `updateMyProfileAction` は `user.id` スコープで update | `.eq('user_id', user.id)` — 既存パターン継続 |
| V5 Input Validation | yes — substack_handle の正規化 | Server Action 内 `trim()` + `startsWith('@')` (D-07, D-08) |
| V6 Cryptography | no — 暗号化不要 | — |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR: 他ユーザーの substack_handle を上書き | Tampering | `.eq('user_id', user.id)` で自分の行のみ更新 — 既存パターン継続 |
| Open Redirect via ?handle= | Tampering | auth/callback は既存の `nextParam.startsWith('/')` ガードで open redirect を防止済み。`/my?handle=hoge` は内部パス — 問題なし |
| XSS via substack_handle in anchor href | Tampering | React JSX は属性値を自動エスケープ。`href={...}` に変数を渡すのは安全 |
| ?handle= の値に悪意ある URL スキーム | Tampering | Substack URL は `https://substack.com/${handle}` にハードコード。handle はパスセグメントとして使うため `javascript:` などの injection は構造上不可能 |

---

## Sources

### Primary (HIGH confidence)

- `src/app/my/MyProfileForm.tsx` — 既存 form structure と useActionState パターン [VERIFIED: ファイル読み取り]
- `src/app/my/actions.ts` — updateMyProfileAction の name/teams 処理パターン [VERIFIED: ファイル読み取り]
- `src/app/my/page.tsx` — RSC の DB 読み取り + MyProfileForm への props 渡しパターン [VERIFIED: ファイル読み取り]
- `src/app/auth/callback/route.ts` — ?pid= パターン [VERIFIED: ファイル読み取り]
- `src/app/login-51cf21389c56/page.tsx` — searchParams: Promise<{pid?}> パターン [VERIFIED: ファイル読み取り]
- `src/app/page.tsx` — searchParams: Promise<{team?}> パターン [VERIFIED: ファイル読み取り]
- `src/components/CalendarGrid.tsx` — avatar+name ヘッダー構造 (行 44-57) [VERIFIED: ファイル読み取り]
- `src/lib/members.ts` — getMembers() SELECT クエリと Member 型 [VERIFIED: ファイル読み取り]
- `src/lib/types.ts` — Member 型定義 [VERIFIED: ファイル読み取り]
- `supabase/schema.sql` — members テーブル定義 [VERIFIED: ファイル読み取り]
- `supabase/migrations/20260531000000_consolidated_schema.sql` — migration 形式 (BEGIN/COMMIT + IF NOT EXISTS) [VERIFIED: ファイル読み取り]
- `src/app/my/__tests__/updateMyProfileAction.test.ts` — 既存テストパターン [VERIFIED: ファイル読み取り]
- `src/app/my/__tests__/page.test.tsx` — 既存テストパターン [VERIFIED: ファイル読み取り]
- `.planning/phases/27-substack-handle-db/27-CONTEXT.md` — Locked decisions D-01~D-09 [VERIFIED: ファイル読み取り]

### Secondary (MEDIUM confidence)

なし — すべての技術的根拠は codebase から直接確認済み。

### Tertiary (LOW confidence)

なし。

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — すべてインストール済みパッケージ（package.json 確認）
- Architecture: HIGH — すべての pattern が codebase 内の既存ファイルで確認済み
- Pitfalls: HIGH — codebase 読み取りと Phase 26 の確立パターンから導出
- Migration pattern: HIGH — consolidated_schema.sql を直接読み取り形式を確認

**Research date:** 2026-06-02
**Valid until:** 2026-07-02 (安定スタック — 30日)
