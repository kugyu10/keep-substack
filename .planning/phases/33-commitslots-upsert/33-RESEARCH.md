# Phase 33: バグ修正 + commitSlots upsert化 - Research

**Researched:** 2026-06-08
**Domain:** Next.js middleware auth guard / Supabase Magic Link redirect / Supabase RPC atomic write
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**BUG-01: RSS取得バグ**
- D-01: `addMemberAction` は既に `fetchWithRetry → saveArticles` を実装済み。BUG-01 は解決済みとして本フェーズではスキップする
- D-02 (defer): RSS 取得失敗時にサムネが空で上書きされる問題は、スクレイピング修正が必要なため将来フェーズへ defer

**BUG-02: 認証フロー修正**
- D-03: `middleware.ts` を `src/middleware.ts` として新規作成。Matcher: `/my` と `/my/:path*` のみ。`/admin`、`/signin-*` は含めない
- D-04: 非ログイン時のリダイレクト先: `/login?next=<currentPath>`。Open Redirect 防止: `next` は `/` 始まり、`//` 非始まりのみ許可
- D-05: `next` パラメータ end-to-end フロー:
  1. `middleware.ts` → `/login?next=/my`
  2. `/login/page.tsx` が `searchParams.next` を読み取り hidden input で保持
  3. `sendMagicLinkAction` が `callbackUrl = ${origin}/auth/callback?next=${next}` を構築
  4. `/auth/callback/route.ts` の `next` 変数を `NextResponse.redirect(new URL(next, origin))` に使用（現在ハードコード `/my` → 修正）
- D-06: ログアウト後リダイレクト先は `/` のまま変更なし

**DB-01: commitSlots アトミック保存**
- D-07: Supabase RPC 関数 `replace_member_commit_slots(p_member_id UUID, p_slots JSONB)` を作成。SQL トランザクション内で `DELETE` → `INSERT`
- D-08: 関数定義を `supabase/schema.sql` + 新規 migration ファイルの両方に追加
- D-09: `updateCommitSlotsAction` を `admin.rpc('replace_member_commit_slots', {...})` 呼び出しに変更。既存バリデーション・auth チェックは維持

### Claude's Discretion
- なし（すべての実装方針は D-01 〜 D-09 で確定）

### Deferred Ideas (OUT OF SCOPE)
- RSS サムネ空上書き問題（将来フェーズ）
- 追加の protected pages（middleware.ts の matcher 追加のみで対応可能）
- ログアウト後リダイレクト先変更（/ のまま）
- `/admin`, `/signin-*` の middleware 保護
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BUG-01 | 新規メンバー追加時に Substack RSS フィードが即時取得される | **スキップ**: `addMemberAction` は既に実装済みと確認（D-01）。コード変更不要 |
| BUG-02 | Magic Link 認証後、ユーザーが元々リクエストしたページにリダイレクトされる | `src/middleware.ts` 新規作成 + `/login/page.tsx` searchParams 対応 + `sendMagicLinkAction` callbackUrl 修正 + `auth/callback/route.ts` redirect 修正（D-03〜D-05） |
| DB-01 | commitSlots の保存・更新がアトミックになる | Supabase RPC 関数 `replace_member_commit_slots` を新規作成し `updateCommitSlotsAction` から呼び出す（D-07〜D-09）|
</phase_requirements>

---

## Summary

Phase 33 は 3 件の独立したバグ修正から構成される。BUG-01（RSS 取得）は実装済みのためスキップ。BUG-02（Magic Link リダイレクト）は `src/middleware.ts` の新規作成と 3 ファイルの修正が必要で、`next` クエリパラメータを auth フロー全体で伝搬させる。DB-01（commitSlots アトミック保存）は Supabase のデータベース関数（RPC）を介してトランザクション内で DELETE+INSERT を行うことで解決する。

既存コードの重要な発見として、`src/proxy.ts` はユニットテスト専用モジュールであり Next.js ミドルウェアとして機能していない。現在の `/my` 認証ガードは `src/app/my/page.tsx` の `if (!user) redirect('/')` で行われている。`src/middleware.ts` を新規作成することでミドルウェア層でのガードが加わり、リダイレクト先が `/login?next=/my` に変わる。

既存の E2E テスト `admin-guard.spec.ts` には "未認証で /my → / にリダイレクト" というアサーションがあり、このフェーズの変更後は `/login?next=...` へのリダイレクトに変わるため、テストの更新が必要になる。

**Primary recommendation:** 変更ファイルごとに 1 タスクを割り当て、最後に E2E テスト更新・スキーマ変更・migration 追加をまとめる。RPC 関数は migration ファイルと schema.sql の両方に記載する（プロジェクト規約）。

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| /my 認証ガード（未認証リダイレクト） | Frontend Server (middleware) | — | Next.js middleware がリクエストをインターセプト。page.tsx の既存ガードはセカンダリとして残る |
| `next` パラメータの伝搬 | Frontend Server (SSR) | — | page.tsx → Server Action → /auth/callback の Server-side フロー全体 |
| Magic Link メール送信 | API / Backend (Server Action) | — | `sendMagicLinkAction` が Supabase Auth を呼び出す |
| commitSlots アトミック保存 | Database (RPC function) | API / Backend (Server Action) | トランザクション保証はDB層。呼び出しはServer Action |
| Open Redirect 防止 | API / Backend (middleware/Server Action) | — | middleware と auth/callback の両方でバリデーション |

---

## Standard Stack

No new packages are required for this phase. All dependencies are already installed.

### Core (existing — confirmed installed) [VERIFIED: npm registry]

| Library | Installed Version | Purpose |
|---------|-----------------|---------|
| `@supabase/ssr` | 0.10.3 (latest) | `createServerClient` for middleware + server-side auth |
| `@supabase/supabase-js` | ^2.105.4 (latest: 2.107.0) | `admin.rpc()` for RPC function call |
| `next` | 16.2.6 (latest: 16.2.7) | App Router, middleware.ts convention |

### No new packages required

This phase modifies existing code only. No `npm install` needed.

---

## Package Legitimacy Audit

No new packages are installed in this phase. Existing packages are already in use in production.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
未認証ブラウザ → GET /my
                    │
                    ▼
              [src/middleware.ts]
              matcher: /my, /my/:path*
                    │
              getUser() via @supabase/ssr
                    │
              user === null?
                    │ YES
                    ▼
        NextResponse.redirect('/login?next=/my')
                    │
                    ▼
              [/login/page.tsx]
              searchParams.next → hidden input
                    │
              [sendMagicLinkAction]
              FormData.get('next') → callbackUrl?next=
                    │
              Supabase sends Magic Link email
              emailRedirectTo: /auth/callback?next=/my
                    │
                    ▼
              User clicks email link
                    │
                    ▼
              [/auth/callback/route.ts]
              exchangeCodeForSession()
              next = searchParams.get('next') ?? '/my'
              validate: startsWith('/') && !startsWith('//')
                    │
                    ▼
        NextResponse.redirect(new URL(next, origin))
                    │
                    ▼
              ブラウザ → /my (元のページ)
```

```
commitSlots 保存フロー:

[/my ページ] → [updateCommitSlotsAction]
                    │
              validate slots (既存)
              auth check (既存)
              member lookup (既存)
                    │
                    ▼
              admin.rpc('replace_member_commit_slots', {
                p_member_id: member.id,
                p_slots: slots  ← JSONB 配列
              })
                    │
                    ▼
              [PostgreSQL RPC function]
              BEGIN;
              DELETE FROM member_commit_slots WHERE member_id = p_member_id;
              INSERT INTO member_commit_slots ...  (p_slots が空でない場合)
              COMMIT;
                    │
              error check → revalidatePath('/my')
```

### Recommended Project Structure

```
src/
├── middleware.ts              # NEW: /my 認証ガード (D-03)
├── app/
│   ├── login/
│   │   ├── page.tsx          # MODIFY: searchParams.next 対応 (D-05 step2)
│   │   ├── actions.ts        # MODIFY: callbackUrl に ?next= 付与 (D-05 step3)
│   │   └── LoginForm.tsx     # MODIFY: hidden input next 追加
│   ├── auth/callback/
│   │   └── route.ts          # MODIFY: next を redirect に使用 (D-05 step4)
│   └── my/
│       └── actions.ts        # MODIFY: updateCommitSlotsAction → RPC (D-09)
supabase/
├── schema.sql                # MODIFY: RPC 関数定義追加 (D-08)
└── migrations/
    └── 20260608HHMMSS_add_replace_member_commit_slots_rpc.sql  # NEW (D-08)
e2e/
└── admin-guard.spec.ts       # MODIFY: /my リダイレクト先変更に合わせてアサーション更新
```

### Pattern 1: Next.js Middleware with Supabase SSR (getAll/setAll API)

**What:** `src/middleware.ts` でセッション更新 + 認証ガードを行う標準パターン。`@supabase/ssr` v0.10.x の `getAll`/`setAll` cookie API を使用。
**When to use:** 認証が必要なルートの保護。

`src/proxy.ts` の既存実装を参考に、`getUser()` でセキュアな認証確認を行う。[CITED: supabase/ssr README — getUser() contacts Auth server every call]

```typescript
// Source: supabase/ssr README + src/proxy.ts (established project pattern)
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // CRITICAL: Do not add code between createServerClient and getUser()
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  if (!user) {
    // Open Redirect 防止: next は内部パスのみ許可 (D-04)
    const next = encodeURIComponent(pathname)
    return NextResponse.redirect(new URL(`/login?next=${next}`, request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/my', '/my/:path*'],  // D-03: /my のみ
}
```

**Note on `getClaims()` vs `getUser()`:** 公式の最新サンプル（supabase/supabase リポジトリ）は `getClaims()` を推奨しているが、既存の `src/proxy.ts` は `getUser()` を使っており両方サポートされている。`getUser()` はサーバー検証でセキュア。プロジェクト一貫性のため `getUser()` を使用する。[ASSUMED: getClaims() vs getUser() の選択方針]

### Pattern 2: `next` パラメータの Server Action 伝搬

**What:** `page.tsx` の Server Component が `searchParams` から `next` を読み取り、Client Component（LoginForm）に hidden input として渡し、Server Action がそれを使ってコールバック URL を構築する。

```typescript
// src/app/login/page.tsx — searchParams.next 対応
// Source: established Next.js App Router pattern
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/my')

  const { next } = await searchParams
  // バリデーション: 内部パスのみ許可
  const safeNext = next && next.startsWith('/') && !next.startsWith('//')
    ? next
    : undefined

  return (
    <main className="max-w-sm mx-auto px-4 py-16">
      <h1 className="text-2xl font-semibold mb-8 text-center">ログイン</h1>
      <LoginForm next={safeNext} />
    </main>
  )
}
```

```typescript
// src/app/login/actions.ts — callbackUrl に ?next= を付与
export async function sendMagicLinkAction(
  prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const email = formData.get('email') as string
  if (!email) return 'メールアドレスを入力してください'

  const next = formData.get('next') as string | null
  const headersList = await headers()
  const origin = headersList.get('origin') ?? ''

  // next が有効な内部パスの場合のみ付与（Open Redirect 防止は page.tsx 側で実施済み）
  const callbackUrl = next
    ? `${origin}/auth/callback?next=${encodeURIComponent(next)}`
    : `${origin}/auth/callback`

  // ... 以降は変更なし
}
```

### Pattern 3: Supabase RPC 関数（PostgreSQL トランザクション）

**What:** `supabase-js` の `client.rpc()` で PostgreSQL 関数を呼び出す。JSONB 配列パラメータを渡す。
**When to use:** DELETE + INSERT をアトミックに行う必要があるとき。

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_add_replace_member_commit_slots_rpc.sql
-- Source: D-07 decision, standard PostgreSQL function pattern
CREATE OR REPLACE FUNCTION replace_member_commit_slots(
  p_member_id UUID,
  p_slots     JSONB
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- 既存スロットを全削除
  DELETE FROM member_commit_slots
  WHERE member_id = p_member_id;

  -- 新しいスロットを挿入（空配列の場合はスキップ）
  IF jsonb_array_length(p_slots) > 0 THEN
    INSERT INTO member_commit_slots (member_id, day_of_week, hour)
    SELECT
      p_member_id,
      (elem->>'day_of_week')::INT,
      (elem->>'hour')::INT
    FROM jsonb_array_elements(p_slots) AS elem;
  END IF;
END;
$$;
```

```typescript
// src/app/my/actions.ts — updateCommitSlotsAction の RPC 呼び出し部分
// Source: supabase-js rpc() API [CITED: supabase.com/docs/reference/javascript/rpc]
const { error: rpcError } = await admin.rpc('replace_member_commit_slots', {
  p_member_id: member.id,
  p_slots: slots,  // { day_of_week: number; hour: number }[] → JSONB として渡る
})

if (rpcError) {
  console.error('[updateCommitSlots] rpc failed:', rpcError)
  return '保存に失敗しました。もう一度お試しください'
}
```

### Anti-Patterns to Avoid

- **`getClaims()` なしの createServerClient のみ:** セッション更新のための `getUser()`/`getClaims()` 呼び出しを省略すると、トークンのリフレッシュが行われずユーザーが突然ログアウトされる。middleware と createServerClient の間にコードを入れてはいけない。[CITED: supabase/ssr README — IMPORTANT note]
- **`getSession()` による認証判定:** `getSession()` はサーバー側で検証されない。必ず `getUser()` を使用する。[CITED: supabase/ssr README]
- **Open Redirect の未防止:** `next` パラメータを検証なしに使うと攻撃者が外部 URL へリダイレクトできる。`startsWith('/') && !startsWith('//')` チェック必須（プロジェクト確立パターン）。[VERIFIED: existing code in auth/callback/route.ts line 14]
- **middleware と proxy.ts の重複:** 新しい `src/middleware.ts` は `/my` のみを対象とする。`src/proxy.ts` の `/my` ガードは unit test 専用コードであり削除・変更しない（test が壊れる）。

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| セッションリフレッシュ | 独自 Cookie 更新ロジック | `@supabase/ssr` の `createServerClient` + `getUser()` | トークンの concurrent refresh 競合など複雑な edge case がある |
| アトミック DELETE+INSERT | TypeScript で try/catch による補償トランザクション | Supabase RPC (PostgreSQL トランザクション) | JS レイヤーの補償は不完全。DELETE 後に INSERT が失敗するとデータが消える |
| Open Redirect 防止 | URL パース + 独自ホワイトリスト | `startsWith('/') && !startsWith('//')` のシンプルチェック | プロジェクト既存パターン（auth/callback/route.ts:14）に統一する |

**Key insight:** Supabase の `supabase-js` は TypeScript からデータベーストランザクションを直接開けない。RPC 関数でサーバー側でトランザクションを実行するのが唯一の正しいアプローチ。

---

## Common Pitfalls

### Pitfall 1: middleware.ts と proxy.ts の混乱

**What goes wrong:** `src/proxy.ts` が `/my` ガードをすでに実装しているように見えるが、これは Next.js ミドルウェアとして機能していない（`middleware` ではなく `proxy` という関数名でエクスポートされており、Next.js の middleware 規約に合致しない）。
**Why it happens:** `proxy.ts` はユニットテスト（`proxy.test.ts`）用のテスタブルモジュールとして設計されており、実際のミドルウェアは `src/middleware.ts` の `export function middleware` が担う。
**How to avoid:** `src/middleware.ts` を新規作成し `export function middleware` を定義する。`proxy.ts` には触れない。
**Warning signs:** `/my` に未認証でアクセスしたとき `/login?next=...` ではなく `/` または同じページにとどまる場合。

### Pitfall 2: E2E テストの破壊

**What goes wrong:** `e2e/admin-guard.spec.ts` のテスト "未認証で /my → / にリダイレクト" が、middleware 追加後に `/login?next=/my` へのリダイレクトになって失敗する。
**Why it happens:** middleware が page.tsx より先に実行されるため、リダイレクト先が `/login?next=...` に変わる。
**How to avoid:** `admin-guard.spec.ts` の `/my` リダイレクトアサーションを `/login` または `/login?next=%2Fmy` に更新するタスクを計画に含める。
**Warning signs:** `npm run test:e2e` で admin-guard spec が失敗する。

### Pitfall 3: `next` パラメータの二重エンコード

**What goes wrong:** `encodeURIComponent(pathname)` を middleware でエンコードし、さらに action 側でもエンコードすると二重エンコードになる。
**Why it happens:** `/my` → `%2Fmy` → `%252Fmy` のように連鎖する。
**How to avoid:** middleware は `encodeURIComponent(pathname)` でエンコード。`page.tsx` は `searchParams.next` をそのまま（デコード済み）hidden input に渡す。`actions.ts` は `encodeURIComponent(next)` してから URL に埋め込む。
**Warning signs:** auth/callback で `next` が `/my` ではなく `%2Fmy` のようなパスになり 404 になる。

### Pitfall 4: RPC 関数の migration と schema.sql の不一致

**What goes wrong:** migration ファイルに RPC 関数を追加したが `schema.sql` に追記し忘れると、新規 DB プロビジョニング時（TEST 環境再構築時など）に関数が存在しない。
**Why it happens:** このプロジェクトは `schema.sql` が canonical source で、migration は差分。両方を更新しないと乖離が生じる。[VERIFIED: existing code — State.md "schema.sql が正規ソース"]
**How to avoid:** D-08 の通り schema.sql と migration ファイルの両方に `CREATE OR REPLACE FUNCTION replace_member_commit_slots ...` を追加する。
**Warning signs:** TEST 環境で RPC 呼び出しが "function does not exist" エラーになる。

### Pitfall 5: updateCommitSlotsAction の既存テストが RPC モックに対応していない

**What goes wrong:** `updateCommitSlotsAction.test.ts` は現在 `admin.from('member_commit_slots').delete()` と `.insert()` をモックしている。RPC に変更すると `admin.rpc(...)` のモックが必要になりテストが失敗する。
**Why it happens:** テストのモック構造が実装と密結合している。
**How to avoid:** `setupAdminMock` を更新し、`admin.rpc` を `vi.fn()` でモックする。または `admin` オブジェクトに `rpc` メソッドを追加する。

---

## Code Examples

### middleware.ts 全体の実装パターン

```typescript
// Source: src/proxy.ts (established project pattern) + supabase/ssr README
// src/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const url = request.nextUrl.clone()
    const next = encodeURIComponent(request.nextUrl.pathname)
    url.pathname = '/login'
    url.search = `?next=${next}`
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/my', '/my/:path*'],
}
```

### auth/callback/route.ts の修正箇所

```typescript
// 現在 (line 59):
return NextResponse.redirect(new URL('/my', origin))

// 修正後: next 変数（line 14 で既にバリデーション済み）を使用
return NextResponse.redirect(new URL(next, origin))
// ↑ next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/my'
// nextParam のデフォルトは '/my' (line 10) なので後方互換性あり
```

### RPC 関数呼び出し（TypeScript 側）

```typescript
// Source: supabase.com/docs/reference/javascript/rpc
const { error: rpcError } = await admin.rpc('replace_member_commit_slots', {
  p_member_id: member.id,
  p_slots: slots,
})
```

### テストモック更新パターン（updateCommitSlotsAction）

```typescript
// 既存 setupAdminMock の admin mock に rpc を追加
const mockAdminRpc = vi.fn()
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: vi.fn(() => ({
    from: mockAdminFrom,
    rpc: mockAdminRpc,
  })),
}))

// テスト内でのセットアップ
mockAdminRpc.mockResolvedValue({ error: null })  // 成功ケース
mockAdminRpc.mockResolvedValue({ error: { message: 'db error' } })  // エラーケース
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| delete + insert (非アトミック) | Supabase RPC トランザクション | ネットワーク遅延や再試行時の部分失敗が排除される |
| page.tsx 内の `redirect('/')` | middleware の `redirect('/login?next=...')` | ログイン後に元ページへ戻れる UX が実現 |
| callbackUrl に next なし | callbackUrl に `?next=` 付与 | Magic Link 経由で元ページへの遷移が完成 |

**Deprecated/outdated:**
- `auth/callback/route.ts` line 59 の `return NextResponse.redirect(new URL('/my', origin))`: TODO コメントが既に「復活させること」と明示している。このフェーズで修正。

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `getUser()` を middleware で使用（`getClaims()` ではなく）。プロジェクト既存 proxy.ts パターンと一致するため採用 | Pattern 1 | `getClaims()` の方が高速（JWKS キャッシュ）だが機能的差異なし。変更コストは低い |
| A2 | `encodeURIComponent` で `next` パラメータをエンコードする方針 | Pitfall 3, Code Examples | URL に特殊文字（日本語パス等）が含まれる場合に必要。現状 /my のみなので影響なし |

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed.

---

## Open Questions

1. **middleware.ts の `/my` ガードと page.tsx の既存 `redirect('/')` の共存**
   - What we know: `page.tsx` の `if (!user) redirect('/')` は middleware 追加後も残る
   - What's unclear: 両方残すか page.tsx 側を削除するか
   - Recommendation: page.tsx の redirect は Defense-in-Depth として残す。リダイレクト先が `/` のままでも middleware が先に動作するため実際のユーザーには影響しない

2. **LoginForm.tsx のクライアントコンポーネント対応**
   - What we know: `LoginForm` は `'use client'` コンポーネント。`next` を hidden input として受け取る Props が必要
   - What's unclear: `next` prop を追加するか、form action に URL を変更するか
   - Recommendation: `LoginForm` に `next?: string` prop を追加し、`<input type="hidden" name="next" value={next} />` を form 内に追加する。`sendMagicLinkAction` が `formData.get('next')` で読み取る

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | すべての開発タスク | ✓ | v22.12.0 | — |
| npm | パッケージ管理 | ✓ | 10.9.2 | — |
| Supabase (dev/prod) | DB migration 適用 | ✓ (cloud) | — | SQL Editor 経由で適用 |
| `@supabase/ssr` | middleware.ts | ✓ | 0.10.3 | — |
| `@supabase/supabase-js` | RPC 呼び出し | ✓ | ^2.105.4 | — |

**Missing dependencies:** なし。このフェーズは既存パッケージのみで実装可能。

**Migration 適用方法:** 本番 DB は `supabase/migrations/` を直接適用できないため（schema.sql が bootstrap source）、SQL Editor 経由で migration ファイルの内容を実行する。[VERIFIED: STATE.md — "本番 DB は SQL Editor 経由"]

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.6 |
| Config file | `vitest.config.ts` (src/** のみ対象) |
| Quick run command | `npm test` |
| Full suite command | `npm test` (19 test files, 124 tests) |
| E2E command | `npm run test:e2e` (Playwright) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BUG-01 | addMemberAction RSS 取得（スキップ） | — | — | スキップ |
| BUG-02 | middleware が /my を保護し /login?next= へリダイレクト | unit | `npm test -- src/middleware.test.ts` | ❌ Wave 0 |
| BUG-02 | sendMagicLinkAction が callbackUrl に ?next= を付与 | unit | `npm test -- src/app/login/__tests__/sendMagicLinkAction.test.ts` | ✅ (要更新) |
| BUG-02 | auth/callback が next パラメータを使用してリダイレクト | unit | — | ❌ Wave 0 (オプション) |
| BUG-02 | 未認証 /my → /login リダイレクト (E2E) | e2e | `npm run test:e2e` | ✅ (要更新: e2e/admin-guard.spec.ts) |
| DB-01 | updateCommitSlotsAction が RPC を呼び出す | unit | `npm test -- src/app/my/__tests__/updateCommitSlotsAction.test.ts` | ✅ (要更新) |
| DB-01 | RPC エラー時にエラーメッセージを返す | unit | 同上 | ✅ (要更新) |

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm test && npm run test:e2e`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/middleware.test.ts` — middleware の /my ガード unit test (BUG-02)
- [ ] `src/app/login/__tests__/sendMagicLinkAction.test.ts` 更新 — Test L-2 を `?next=` 付与に対応
- [ ] `src/app/my/__tests__/updateCommitSlotsAction.test.ts` 更新 — `admin.rpc` モック対応
- [ ] `e2e/admin-guard.spec.ts` 更新 — /my リダイレクト先を `/login?next=...` に変更

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase Auth — getUser() でトークン検証 |
| V3 Session Management | yes | @supabase/ssr middleware — トークンリフレッシュ |
| V4 Access Control | yes | middleware.ts — /my は認証必須 |
| V5 Input Validation | yes | `next` パラメータの Open Redirect 防止バリデーション |
| V6 Cryptography | no | Supabase が管理（変更なし） |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Open Redirect | Spoofing | `next.startsWith('/') && !next.startsWith('//')` チェック（プロジェクト確立パターン） |
| Session fixation | Elevation of Privilege | Supabase Auth の `exchangeCodeForSession` が新規セッション発行 |
| CSRF via Server Action | Tampering | Next.js App Router の Server Action は CSRF トークン不要（same-origin 強制） |

---

## Sources

### Primary (HIGH confidence)
- `src/proxy.ts` — プロジェクト内の確立されたミドルウェアパターン（getAll/setAll cookies API, getUser()）[VERIFIED: local codebase]
- `src/app/auth/callback/route.ts` — Open Redirect 防止パターンと next バリデーション [VERIFIED: local codebase]
- `supabase/schema.sql` — テーブル定義、RLS ポリシー、schema.sql が正規ソース [VERIFIED: local codebase]
- `supabase/ssr` README (GitHub) — getUser() vs getClaims() の説明、middleware パターン [CITED: github.com/supabase/ssr]
- `supabase/supabase` examples/user-management/nextjs-user-management/lib/supabase/proxy.ts — 公式サンプルの middleware 実装 [CITED: github.com/supabase/supabase]

### Secondary (MEDIUM confidence)
- Supabase JS rpc() API — named parameters, JSONB array [CITED: supabase.com/docs/reference/javascript/rpc]
- `@supabase/ssr` npm version verification — 0.10.3 が現在最新 [VERIFIED: npm registry]

### Tertiary (LOW confidence)
- `getClaims()` vs `getUser()` の選択 — 公式 README は getClaims() を推奨しているが、getUser() も引き続きサポートされており機能的に同等 [ASSUMED]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — 既存インストール済みパッケージのみ、バージョン確認済み
- Architecture: HIGH — CONTEXT.md で全実装方針が確定済み。既存コードのパターンと一致
- Pitfalls: HIGH — 既存コードの詳細調査とテスト実行から導出

**Research date:** 2026-06-08
**Valid until:** 2026-07-08（Next.js / @supabase/ssr は安定版、30 日間有効）
