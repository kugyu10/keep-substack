# Phase 34: UI Polish バッチ - Research

**Researched:** 2026-06-08
**Domain:** Next.js App Router layout architecture, Supabase Server Components, React client/server component composition, sort algorithm refactoring
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**UI-01: ログイン・サインインページのレイアウト分離**
- D-01: Next.js App Router の Route Groups を使用。`src/app/(auth)/` グループを作成し `login/` と `signin-51cf21389c56/` を移動。URL は変わらない。
- D-02: `(auth)/layout.tsx` を新規作成。ヘッダー・フッターを含まず、Keep Substack ロゴ（UI-02）のみ配置する専用レイアウト。
- D-03: 既存の `src/app/layout.tsx`（ルートレイアウト）は変更なし。Header と footer はそのまま残す。

**UI-02: Keep Substack ロゴ**
- D-04: ロゴは `(auth)/layout.tsx` ではなく、各ページコンポーネント内のフォームの直上に配置する（login/page.tsx, signin-51cf21389c56/page.tsx それぞれに追加）。
- D-05: スタイル: ヘッダーと同じ Georgia serif + font-black。サイズはヘッダー（text-lg）より大きく（例: text-2xl 程度）。中央配置。
- D-06: ロゴは Link でなく単純なテキスト（クリック不可）。

**UI-02 追記: ログイン注記**
- D-07: `/login` ページのみ、フォームの下に注記テキストを追加:「サブスタ継続可視化ツールKeep Substackは現在完全招待制です。招待されている方のみログインできます」
- D-08: スタイル: `text-xs text-gray-400 text-center` でフォーム直下。
- D-09: `/signin-51cf21389c56` には注記を追加しない。

**UI-03: フッター文言（ログイン状態別）**
- D-10: フッターを Server Component 化（`Footer.tsx` として `src/components/` に切り出し）。Supabase でユーザー取得 + member クエリで publicationId を取得。
- D-11: 文言3パターン: 未ログイン → 参加案内リンク / ログイン済み+member有 → 個人ビューリンク / ログイン済み+member無 → /my リンク
- D-12: member 取得クエリ: `admin.from('members').select('publication_id').eq('user_id', user.id).maybeSingle()`

**UI-04: Commit & Goal View ソート順変更**
- D-13: ソート優先順位（全5キー）: 今週達成率降順 → ストリーク降順 → 先週達成率降順 → 先々週達成率降順 → 登録日昇順
- D-14: グループ分け: Group A（hasUser + slots > 0）→ Group B（hasUser + slots = 0）→ Group C（!hasUser）
- D-15: `Member` 型に `hasUser: boolean` フラグを追加。
- D-16: `page.tsx` の members クエリに `user_id` を追加し `user_id IS NOT NULL` で `hasUser` を判定。
- D-17: `sortMembersForCommitView` と `achievementRate` を week offset 対応に更新。
- D-18: `consecutiveWeekStreak` の定義変更なし。

**UI-05: /my ページでのヘッダー「マイページ」ボタン制御**
- D-19: `Header.tsx` の「マイページ」/「ログイン」ボタン部分のみを `HeaderNav.tsx`（Client Component）として切り出し。
- D-20: `HeaderNav.tsx` で `usePathname()` を使い、`pathname === '/my'` のとき「マイページ」リンクを非表示にする。
- D-21: `Header.tsx`（Server Component）はユーザー情報を取得し `<HeaderNav user={user} />` に props として渡す。

### Claude's Discretion

None specified (all implementation decisions are locked).

### Deferred Ideas (OUT OF SCOPE)

- Grid サムネイル優先ロジック: 該当日に複数記事があったときどれを表示するかの優先ロジック — 新機能、将来フェーズで対応
- `/my` ページ以外の認証ガード
- 個人ビューURL変更（publicationId のまま）
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UI-01 | ログイン・サインインページ（/login, /signin-51cf21389c56）にフッターを表示しない | Route Groups で (auth)/ layout を分離することで RootLayout の Header/Footer から切り離す |
| UI-02 | ログイン・サインインページに Keep Substack ロゴを表示する（サイトヘッダーなし、ロゴのみ） | 各ページの h1 直上に div/p 要素でロゴテキストを追加。Georgia serif + font-black を流用 |
| UI-03 | フッターのログイン状態によって表示文言が変わる（ログイン中は適切な文言に） | Footer.tsx を Server Component として新規作成。createSupabaseServerClient + admin client で3パターン分岐 |
| UI-04 | Commit & Goal View のメンバーソート順を変更する | sortMembersForCommitView を拡張。achievementRate を export + week offset 対応。Member 型に hasUser フラグ追加 |
| UI-05 | /my ページ表示中はヘッダーの「マイページ」ボタンを非表示にする | HeaderNav.tsx（Client Component）を新規作成。usePathname() でパス検出 |
</phase_requirements>

---

## Summary

Phase 34 は4つの独立した UI 改善領域にまたがる変更バッチである。各領域は技術的に独立しており、実装順序への制約は少ない。

**UI-01/02**（Route Groups + ログイン画面整備）は Next.js App Router のファイルシステムルーティング機能を活用する。`(auth)/` グループを作成しページファイルを移動するだけで URL は変わらず、グループ専用レイアウトを持てる。重要な注意点は、ページファイルを移動するだけでなく、同じディレクトリにある `LoginForm.tsx`、`actions.ts`、`__tests__/` なども一緒に移動する必要がある点である。

**UI-03**（Footer Server Component）はパターンとして `Header.tsx` と完全に類似する。`createSupabaseServerClient()` で auth を取得し `createSupabaseAdminClient()` で members テーブルを検索する2ステップ構成になる。Footer は `RootLayout` の inline JSX から切り出されるため、`layout.tsx` の変更は単純な置き換えで済む。

**UI-04**（ソート変更）は既存 `commitUtils.ts` の拡張で対応する。現在の `achievementRate` は private 関数であり export が必要。また `Member` 型への `hasUser` 追加は `getMembers()` を使う全コードに型エラーを波及させる可能性があるため、型変更を先に行い、既存のテストフィクスチャ（`member()` helper）のアップデートも必要。`page.tsx` で `getMembers()` は使わず直接クエリを組む（user_id の取得のため）ことが CONTEXT.md で決定されている。

**UI-05**（HeaderNav 分離）は Server/Client Component の境界を新規に作る典型パターン。Server Component の `Header.tsx` が user を取得し、Client Component の `HeaderNav.tsx` に user を props で渡す。`usePathname()` は必ず Client Component 内でのみ使える。

**Primary recommendation:** UI-04 の `Member` 型変更（`hasUser: boolean` 追加）を最初に実装する。これは後続のすべての型チェックに影響するため、型定義を先に確定させてから他の変更を進めると型エラーの伝播が最小化される。

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Auth-only layout（ヘッダー・フッター除去） | Frontend Server (SSR) | — | Next.js Route Groups はビルド時のファイルシステム機能。レンダリングはサーバー側 |
| フッター認証状態取得 | API / Backend | Frontend Server (SSR) | Supabase auth は Server Component 内で実行、UI 決定はサーバーレンダリング |
| ヘッダーナビ パス検出 | Browser / Client | Frontend Server (SSR) | `usePathname()` は Client Component 必須。ただし user props は Server Component から渡す |
| メンバーソート（commitUtils） | API / Backend | — | Server Component の page.tsx 内で実行される純粋関数ロジック |
| hasUser 判定 | API / Backend | — | page.tsx（Server Component）での DB クエリ結果判定 |

---

## Standard Stack

このフェーズは新規パッケージを一切インストールしない。既存スタックのみを使用する。

### Core（既存、変更なし）

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.2.6 | App Router, Route Groups, RSC | プロジェクト標準フレームワーク |
| React | 19.2.4 | Component model | プロジェクト標準 |
| @supabase/ssr | (既存) | Server Component での auth | プロジェクト標準 Supabase パターン |
| Tailwind CSS v4 | (既存) | スタイリング | プロジェクト標準 |

[ASSUMED] バージョンは package.json から確認済み（next: 16.2.6, react: 19.2.4）

**新規インストール:** なし

---

## Package Legitimacy Audit

新規パッケージインストールなし。このセクションは該当なし。

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| (なし) | — | — | — | — | — | — |

---

## Architecture Patterns

### System Architecture Diagram

```
Browser Request
      │
      ▼
┌─────────────────────────────────────────────────────┐
│  Next.js App Router (File-System Based Routing)     │
│                                                     │
│  src/app/layout.tsx ──────────────────────────────┐│
│  (RootLayout: Header + Footer + children)          ││
│       │                                            ││
│       ├── src/app/(auth)/layout.tsx ←── [NEW]     ││
│       │   (no Header, no Footer, centers content)  ││
│       │        │                                   ││
│       │        ├── (auth)/login/page.tsx           ││
│       │        │     + logo div + LoginForm        ││
│       │        │     + invitation note             ││
│       │        │                                   ││
│       │        └── (auth)/signin-51cf.../page.tsx  ││
│       │              + logo div + LoginForm        ││
│       │                                            ││
│       ├── src/app/page.tsx (Home)                  ││
│       │   ├── getMembers() + user_id [MODIFIED]    ││
│       │   └── sortMembersForCommitView() [MODIFIED]││
│       │                                            ││
│       └── src/components/                          ││
│           ├── Header.tsx (SC) ─► HeaderNav.tsx(CC) ││
│           │   [passes user prop]  [usePathname()]  ││
│           └── Footer.tsx (SC) [NEW]               ││
│               ├── createSupabaseServerClient()     ││
│               └── createSupabaseAdminClient()      ││
└─────────────────────────────────────────────────────┘

SC = Server Component, CC = Client Component ('use client')

Data Flow for Footer.tsx:
  Supabase Auth ──► user? ──► No → unauthenticated copy
                          ──► Yes → admin.members query ──► pub_id? ──► Yes → member link
                                                                    ──► No  → /my link
```

### Recommended Project Structure (changes only)

```
src/
├── app/
│   ├── (auth)/                          # NEW Route Group
│   │   ├── layout.tsx                   # NEW: no Header/Footer
│   │   ├── login/                       # MOVED from app/login/
│   │   │   ├── page.tsx                 # MODIFIED: + logo, + note
│   │   │   ├── LoginForm.tsx            # MOVED (unchanged)
│   │   │   ├── actions.ts               # MOVED (unchanged)
│   │   │   └── __tests__/              # MOVED (unchanged)
│   │   └── signin-51cf21389c56/         # MOVED from app/signin-*/
│   │       ├── page.tsx                 # MODIFIED: + logo
│   │       ├── LoginForm.tsx            # MOVED (unchanged)
│   │       ├── actions.ts               # MOVED (unchanged)
│   │       └── __tests__/              # MOVED (unchanged)
│   ├── layout.tsx                       # MODIFIED: inline footer → <Footer />
│   └── page.tsx                         # MODIFIED: + user_id in query, + hasUser
├── components/
│   ├── Header.tsx                       # MODIFIED: delegates nav to HeaderNav
│   ├── HeaderNav.tsx                    # NEW: 'use client', usePathname()
│   └── Footer.tsx                       # NEW: Server Component, 3-state copy
└── lib/
    ├── types.ts                         # MODIFIED: Member + hasUser: boolean
    └── commitUtils.ts                   # MODIFIED: achievementRate export + offset, sortMembers + groups
```

### Pattern 1: Route Groups — URL を変えずにレイアウトを分離

**What:** `(auth)/` のようなカッコ付きフォルダは URL セグメントに含まれない。そのフォルダ内の `layout.tsx` は子ページにのみ適用され、親レイアウト（RootLayout）を置き換える。

**When to use:** 同一ドメイン内でページグループごとに異なるレイアウトが必要なとき（認証ページ、マーケティングページなど）。

**Key insight:** Route Group を使うと、子ページは RootLayout の `<Header />` と `<Footer />` をレンダリングしなくなる — RootLayout に書かれた JSX はルートセグメントのみに適用される。

[ASSUMED] Next.js 公式ドキュメントの Route Groups の動作。Next.js 13+ で安定した機能。

```tsx
// Source: Next.js App Router conventions [ASSUMED]
// src/app/(auth)/layout.tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      {children}
    </div>
  )
}
```

**重要:** `(auth)/layout.tsx` には `<html>` と `<body>` タグを含めない。それらは `src/app/layout.tsx`（RootLayout）が担う。子 layout は RootLayout の body の中に入る。

### Pattern 2: Server Component から Client Component への Props パス

**What:** Server Component がサーバーサイドデータ（user オブジェクト）を取得し、Client Component に props として渡す。Client Component は `usePathname()` などのブラウザフックを使える。

**When to use:** ページ全体を Client Component にしたくない（SEO、パフォーマンス）が、一部にブラウザ API が必要なとき。

```tsx
// Source: existing codebase pattern (Header.tsx → HeaderNav pattern is new, but approach exists)
// src/components/Header.tsx (Server Component — no 'use client')
import { createSupabaseServerClient } from '@/lib/supabase/server'
import HeaderNav from './HeaderNav'

export default async function Header() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <header>
      <div>
        {/* ...logo link... */}
        <HeaderNav user={user} />  {/* user is serializable: null | User object */}
      </div>
    </header>
  )
}
```

```tsx
// src/components/HeaderNav.tsx (Client Component)
'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'

type HeaderNavProps = { user: User | null }

export default function HeaderNav({ user }: HeaderNavProps) {
  const pathname = usePathname()
  if (user) {
    if (pathname === '/my') return null
    return <Link href="/my" className="text-sm border border-gray-300 rounded px-3 py-1 hover:bg-gray-50 transition-colors">マイページ</Link>
  }
  return <Link href="/login" className="text-sm border border-gray-300 rounded px-3 py-1 hover:bg-gray-50 transition-colors">ログイン</Link>
}
```

**Constraint:** Server Component に渡す props は JSON シリアライズ可能でなければならない。`User` オブジェクト（Supabase）は plain object なので問題なし。

### Pattern 3: Footer.tsx — Server Component での3パターン分岐

**What:** Server Component で auth + DB クエリを実行し、結果に基づいて JSX を条件分岐する。

```tsx
// src/components/Footer.tsx
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export default async function Footer() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  let publicationId: string | null = null
  if (user) {
    const admin = createSupabaseAdminClient()
    const { data: member } = await admin
      .from('members')
      .select('publication_id')
      .eq('user_id', user.id)
      .maybeSingle()
    publicationId = member?.publication_id ?? null
  }

  return (
    <footer className="py-4 text-center">
      <span className="text-xs text-gray-400">
        {!user && (
          <>このSubstack継続可視化ツールに参加したい方は{' '}
            <a href="https://uojun.substack.com/p/8cd" target="_blank" rel="noopener noreferrer" className="hover:text-[#FF6719] underline">コチラ</a>
          </>
        )}
        {user && publicationId && (
          <>あなたの個人ビューは{' '}
            <Link href={`/member/${publicationId}`} className="hover:text-[#FF6719] underline">コチラ</Link>
          </>
        )}
        {user && !publicationId && (
          <>参加登録は{' '}
            <Link href="/my" className="hover:text-[#FF6719] underline">コチラ</Link>
          </>
        )}
      </span>
    </footer>
  )
}
```

### Pattern 4: achievementRate の export と week offset 対応

**What:** 現在 `achievementRate` は `commitUtils.ts` 内で private 関数。D-17 では `sortMembersForCommitView` が先週・先々週の達成率もソートキーとして必要とする。内部ロジックは変えずに signature を維持したまま `export` を付けるだけでよい。

**Current signature（既存）:**
```typescript
// 現在 private (非export)
function achievementRate(
  slots: CommitSlot[],
  weekDates: string[],
  articleDateMap: Map<string, FeedItem[]>
): number
```

**Required change:** `export function achievementRate(...)` に変更するだけ。呼び出し側は `getWeekDates(-1)` / `getWeekDates(-2)` を渡すことで先週・先々週の達成率を取得できる。

### Pattern 5: sortMembersForCommitView のグループ分け + 多段ソート

**What:** 既存の単純なソートに、hasUser に基づくグループ分けと 2 つの追加ソートキーを加える。

**グループ分け方針（D-14）:**
```typescript
function getGroup(member: Member, memberSlots: CommitSlot[]): 0 | 1 | 2 {
  if (!member.hasUser) return 2          // Group C: auth user なし
  if (memberSlots.length === 0) return 1  // Group B: スロット未設定
  return 0                                // Group A: スロット設定済み
}
```

**ソートキー拡張（D-13）:**
```typescript
// pre-compute per-member
{
  group: getGroup(member, memberSlots),
  rate0: achievementRate(memberSlots, getWeekDates(0), dateMap),   // 今週
  streak: consecutiveWeekStreak(memberSlots, items),
  rate1: achievementRate(memberSlots, getWeekDates(-1), dateMap),  // 先週
  rate2: achievementRate(memberSlots, getWeekDates(-2), dateMap),  // 先々週
}

// comparator
if (am.group !== bm.group) return am.group - bm.group   // ① group
if (bm.rate0 !== am.rate0) return bm.rate0 - am.rate0   // ② 今週
if (bm.streak !== am.streak) return bm.streak - am.streak // ③ streak
if (bm.rate1 !== am.rate1) return bm.rate1 - am.rate1   // ④ 先週
if (bm.rate2 !== am.rate2) return bm.rate2 - am.rate2   // ⑤ 先々週
return a.member.addedAt.localeCompare(b.member.addedAt)  // ⑥ addedAt
```

**注意:** `buildArticleDateMap` を各週 offset 分3回呼ぶのはコスト。各メンバーで一度 dateMap を構築し、3つの weekDates に対して再利用するのが効率的（既存コードのパターン踏襲）。

### Pattern 6: hasUser の page.tsx での導出

**What:** `page.tsx` の members クエリで `user_id` カラムを追加取得し、`null` かどうかで `hasUser` を判定する。

**重要:** `getMembers()` 関数（`src/lib/members.ts`）は変更しない（D-16 の範囲は page.tsx のみ）。`page.tsx` は独自クエリで member + user_id を取得し、既存の `filteredMembers` の代わりに使う。

**実装選択肢の分析:**

現在 `page.tsx` は `getMembers()` でメンバーを取得し、`fetchAllFeedsCached(filteredMembers)` でフィードを取得している。`MemberFeedResult` の `member` フィールドが `Member` 型であり、`hasUser` を含む必要がある。

最も整合性の高い実装は:
1. `Member` 型に `hasUser: boolean` を追加（types.ts）
2. `page.tsx` で `getMembers()` の代わりに直接クエリして `user_id` を取得し `hasUser` を導出
3. または `getMembers()` に `hasUser` を組み込む

D-16 は「`page.tsx` の members クエリに `user_id` を追加」としており、`getMembers()` 関数は変更しないことが示唆されている。しかし `MemberFeedResult.member` が `Member` 型を参照しているため、`Member` に `hasUser` を追加した場合、`getMembers()` でも `hasUser` を返す必要がある。

**調停:** `Member` 型に `hasUser: boolean` を追加し（必須フィールド）、`getMembers()` も `hasUser: false` または実際の user_id を取得して返すよう修正するか、`page.tsx` でのみ独自クエリを行い `getMembers()` は使わないようにする。最もシンプルなのは `getMembers()` のクエリに `user_id` を追加し `hasUser` を導出すること（`page.tsx` からの自然な拡張）。

**推奨:** `getMembers()` に `user_id` SELECT を追加し `hasUser: !!m.user_id` で導出する。これにより型の整合性が確保される。`page.tsx` の独自クエリは不要になる。

### Anti-Patterns to Avoid

- **`(auth)/layout.tsx` に `<html><body>` を書く:** Route Group の layout は RootLayout の body の中に挿入される。html/body タグを重複させるとエラーまたは不正なHTMLになる。
- **Client Component を不必要に広げる:** `Header.tsx` 全体を `'use client'` にしない。user 取得は Server Component で行い、pathname 検出のみ Client Component に委ねる。
- **`usePathname()` を Server Component で使う:** `usePathname` は `'use client'` を宣言したコンポーネントでのみ動作する。
- **`achievementRate` を各比較ごとに再計算する:** ソートの comparator 内で Map 構築を行うと O(n log n * n) になる。事前計算した meta Map を使う（既存パターン踏襲）。
- **Footer で `createSupabaseServerClient()` を await し忘れる:** `createSupabaseServerClient()` は async 関数（cookies() の await が必要）。`await` を忘れると型エラーまたは runtime エラー。

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| パス検出 | window.location の手動パース | `usePathname()` (next/navigation) | SSR 互換、Next.js 標準 |
| Supabase クライアント（Server Component） | 直接 fetch | `createSupabaseServerClient()` | Cookie ハンドリング、セッション更新が含まれる |
| Supabase クライアント（管理操作） | anon キーで RLS バイパス | `createSupabaseAdminClient()` | service role key を使う確立済みパターン |
| 日付計算 | 手動 ISO 文字列操作 | `getWeekDates(offset)` (既存関数) | JST 考慮済み、テスト済み |

**Key insight:** このフェーズでは外部ライブラリを一切追加しない。すべての問題は既存のプロジェクトユーティリティまたは Next.js/Supabase 標準 API で解決できる。

---

## Common Pitfalls

### Pitfall 1: ページ移動時にサブファイルを忘れる

**What goes wrong:** `login/page.tsx` だけを `(auth)/login/` に移動し、同ディレクトリの `LoginForm.tsx`、`actions.ts`、`__tests__/` を残してしまう。  
**Why it happens:** Route Groups の移動では「ページ」だけでなくディレクトリ全体を移動する必要があることを見落とす。  
**How to avoid:** `src/app/login/` ディレクトリ全体を `src/app/(auth)/login/` に移動する（`mv` コマンド1回で完了）。  
**Warning signs:** TypeScript が `LoginForm` の相対インポートを解決できないエラー。

### Pitfall 2: (auth)/layout.tsx に html/body タグを書く

**What goes wrong:** Route Group の layout に `<html lang="ja"><body>...</body></html>` を書くと、RootLayout の html/body と二重になる。  
**Why it happens:** RootLayout と同じ構造を書こうとしてしまう。  
**How to avoid:** `(auth)/layout.tsx` は `children` を受け取る div ラッパーのみ。html/body は書かない。  
**Warning signs:** React が "Did not expect server HTML to contain `<html>`" エラーを出す。

### Pitfall 3: achievementRate を private のまま多段ソートで呼ぶ

**What goes wrong:** `achievementRate` が private のまま `sortMembersForCommitView` 内部でしか使えない。先週・先々週用の計算を関数内にコピーペーストしてしまう。  
**Why it happens:** 関数を export し忘れる。  
**How to avoid:** `function achievementRate` → `export function achievementRate` に変更してから、テストでも直接検証できるようにする。  
**Warning signs:** テストファイルで `achievementRate` をインポートしようとして TS エラー。

### Pitfall 4: Member 型の hasUser を optional にする

**What goes wrong:** `hasUser?: boolean` にすると、既存のテストフィクスチャや他のコードが `undefined` を返す可能性があり、ソートロジックで `!member.hasUser` が意図しない挙動を示す。  
**Why it happens:** 既存フィクスチャへの影響を最小化しようと optional にしてしまう。  
**How to avoid:** `hasUser: boolean`（必須）として定義し、`getMembers()` のマッパーで `hasUser: !!m.user_id` を明示的に設定する。既存テストフィクスチャはすべて `hasUser: true` または `hasUser: false` を追加する。  
**Warning signs:** TypeScript が `Member` 型を使うコード全体にエラーを出す（これは望ましい — 見落とし防止）。

### Pitfall 5: Footer.tsx での二重 await（createSupabaseServerClient）

**What goes wrong:** `const supabase = createSupabaseServerClient()` と書くと（await なし）、Promise オブジェクトが返り auth 取得でエラーになる。  
**Why it happens:** admin client（同期）と server client（非同期）の区別を忘れる。  
**How to avoid:** `const supabase = await createSupabaseServerClient()`（await 必須）。`createSupabaseAdminClient()` は同期なので await 不要。  
**Warning signs:** `supabase.auth.getUser()` を呼ぶと型エラーまたは runtime エラー。

### Pitfall 6: usePathname が SSR でクラッシュする

**What goes wrong:** `usePathname()` を Server Component（`'use client'` なし）のファイルで使うと、ビルドエラーまたは "You're importing a component that needs usePathname" エラーが出る。  
**Why it happens:** `HeaderNav.tsx` に `'use client'` 宣言を書き忘れる。  
**How to avoid:** ファイルの最初の行を `'use client'` にする。  
**Warning signs:** Next.js ビルドエラー、または開発サーバーでの hydration エラー。

---

## Code Examples

Verified patterns from official sources:

### (auth)/layout.tsx — Route Group Layout

```tsx
// src/app/(auth)/layout.tsx
// Source: CONTEXT.md D-02, UI-SPEC.md Auth Layout Contract [ASSUMED: Next.js convention]
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      {children}
    </div>
  )
}
```

### login/page.tsx — ロゴ + 招待制注記追加

```tsx
// src/app/(auth)/login/page.tsx (after move)
// Source: CONTEXT.md D-04, D-05, D-06, D-07, D-08; UI-SPEC.md
// Spacing change: py-16 → py-12 (auth layout provides outer padding; see UI-SPEC spacing note)
return (
  <main className="max-w-sm mx-auto px-4 py-12">
    <p className="text-2xl font-black text-center mb-6" style={{ fontFamily: 'Georgia, serif' }}>
      Keep Substack
    </p>
    <h1 className="text-2xl font-black text-center mb-8">ログイン</h1>
    <LoginForm next={safeNext} />
    <p className="text-xs text-gray-400 text-center mt-6">
      サブスタ継続可視化ツールKeep Substackは現在完全招待制です。招待されている方のみログインできます
    </p>
  </main>
)
```

### Footer.tsx — 3パターン分岐

```tsx
// src/components/Footer.tsx
// Source: CONTEXT.md D-10, D-11, D-12; UI-SPEC.md UI-03 section
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export default async function Footer() {
  const supabase = await createSupabaseServerClient()  // async — must await
  const { data: { user } } = await supabase.auth.getUser()

  let publicationId: string | null = null
  if (user) {
    const admin = createSupabaseAdminClient()  // sync — no await needed
    const { data: member } = await admin
      .from('members')
      .select('publication_id')
      .eq('user_id', user.id)
      .maybeSingle()
    publicationId = member?.publication_id ?? null
  }

  return (
    <footer className="py-4 text-center">
      <span className="text-xs text-gray-400">
        {!user && (
          <>このSubstack継続可視化ツールに参加したい方は{' '}
            <a href="https://uojun.substack.com/p/8cd" target="_blank" rel="noopener noreferrer" className="hover:text-[#FF6719] underline">コチラ</a>
          </>
        )}
        {user && publicationId && (
          <>あなたの個人ビューは{' '}
            <Link href={`/member/${publicationId}`} className="hover:text-[#FF6719] underline">コチラ</Link>
          </>
        )}
        {user && !publicationId && (
          <>参加登録は{' '}
            <Link href="/my" className="hover:text-[#FF6719] underline">コチラ</Link>
          </>
        )}
      </span>
    </footer>
  )
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| pages/ ルーター | App Router (RSC first) | Next.js 13 | Server Component デフォルト、Client Component 明示 |
| getServerSideProps でユーザー取得 | `createSupabaseServerClient()` in RSC | Supabase SSR パッケージ導入後 | await cookies() パターン必須 |
| Route Group なし（全ページ共通 layout） | Route Groups で layout 分割 | Next.js 13.4+ | URL 変更なしでレイアウト分離可能 |

**Deprecated/outdated:**
- `font-semibold` on page headings: UI-SPEC で `font-black` に統一（`text-2xl font-black text-center mb-8`）。現在の login/page.tsx と signin/page.tsx は `font-semibold` を使っているため変更が必要。

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Next.js 16.x の Route Groups は URL に影響しない（親 layout を Override する） | Architecture Patterns | 低。Next.js 13+ で安定した機能。バージョン固有の変更はない |
| A2 | `(auth)/layout.tsx` に html/body を書くと RootLayout の html/body と衝突する | Common Pitfalls | 低。Next.js ドキュメントに明記されている標準挙動 |
| A3 | `User` オブジェクト（Supabase）は Server → Client Component への props として渡せる | Architecture Patterns | 低。plain object であることはソースコードで確認できる |
| A4 | members テーブルに `user_id` カラムが存在する | Code Examples (Footer, page.tsx) | 中。my/page.tsx のクエリで `.eq('user_id', user.id)` を使っているため存在する [VERIFIED by codebase grep] |
| A5 | `getMembers()` への `user_id` SELECT 追加が型安全に行える | Architecture Patterns Pattern 6 | 低。Supabase の Select クエリに追加カラム名を足すだけ |

**Verified from codebase:**
- `user_id` カラムは `src/app/my/page.tsx` の `.eq('user_id', user.id)` クエリで使用されていることを確認 [VERIFIED: codebase]
- `createSupabaseServerClient()` は async 関数であることを `src/lib/supabase/server.ts` で確認 [VERIFIED: codebase]
- `createSupabaseAdminClient()` は同期関数であることを `src/lib/supabase/admin.ts` で確認 [VERIFIED: codebase]
- `achievementRate` は現在 private 関数（export なし）であることを `src/lib/commitUtils.ts` で確認 [VERIFIED: codebase]
- 既存テストは 128 件全パスを確認（`npm test` 実行済み）[VERIFIED: codebase]

---

## Open Questions (RESOLVED)

1. **`getMembers()` を変更するか、`page.tsx` で独自クエリを組むか**
   - RESOLVED: `getMembers()` を変更する（`src/lib/members.ts` に `user_id` SELECT + `hasUser: !!m.user_id` を追加）。型安全を優先し、型エラーカスケードを利用して全構築箇所を確実に更新する。Plan 01 参照。

2. **`heading font-black` vs 既存の `font-semibold`**
   - RESOLVED: `font-black` に変更する。UI-SPEC（34-UI-SPEC.md）が approved 済みであり、D-04/D-05 の指定通り `text-2xl font-black` を使用する。Plan 02 Task 2 参照。

---

## Environment Availability

Step 2.6: このフェーズは外部サービスへの新規依存なし（新規 npm インストールなし）。Supabase（既存）と Next.js dev server（既存）のみ。

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Dev環境 | ✓ | v22.12.0 | — |
| Next.js | Framework | ✓ | 16.2.6 | — |
| Vitest | Unit tests | ✓ | ^4.1.6 | — |
| Supabase（dev/prod） | Footer auth query | ✓ (既存接続) | — | — |

---

## Validation Architecture

nyquist_validation: true（config.json で enabled）

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.6 |
| Config file | `vitest.config.ts` |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-01 | (auth)/layout.tsx が Header/Footer を含まない | unit (RSC render) | `npm test -- src/app/\(auth\)` | ❌ Wave 0 |
| UI-02 | ロゴ要素と招待制注記が login/page に存在する | unit (element tree) | `npm test -- src/app/\(auth\)/login` | ❌ Wave 0 (移動後に更新) |
| UI-03 | Footer が3パターンの copy を状態別に返す | unit (SC element tree) | `npm test -- Footer` | ❌ Wave 0 |
| UI-04 | sortMembersForCommitView が hasUser グループ + 5キーソートで正しい順序を返す | unit | `npm test -- commitUtils` | ✅ 既存（拡張必要） |
| UI-05 | HeaderNav が /my で マイページボタンを非表示にする | unit | `npm test -- HeaderNav` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm test`（全 128 テスト、3秒）
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/app/(auth)/__tests__/layout.test.tsx` — UI-01: auth layout が children のみレンダリングすることを確認
- [ ] `src/components/__tests__/Footer.test.tsx` — UI-03: 3パターンの出力を確認（Server Component テストパターン: element tree inspection）
- [ ] `src/components/__tests__/HeaderNav.test.tsx` — UI-05: /my パスで非表示、他パスで表示を確認
- [ ] `src/lib/__tests__/commitUtils.test.ts` — UI-04: 既存テストを `hasUser` フィールド対応に更新 + グループ分けテストを追加

**注意:** login/page.tsx と signin/page.tsx の既存 `__tests__/` は移動後にインポートパスが変わる可能性があるので確認が必要。

---

## Security Domain

security_enforcement: 設定なし（デフォルト: enabled）

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | 間接的に適用（login ページの表示） | 既存: Supabase Magic Link。このフェーズで変更なし |
| V3 Session Management | No | auth ロジックは変更なし |
| V4 Access Control | No | 新規エンドポイントなし |
| V5 Input Validation | No | フォームロジックは変更なし |
| V6 Cryptography | No | 新規暗号処理なし |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Footer に publicationId を露出 | 情報漏洩 | 軽微: publicationId はすでに /member/{pid} URL で公開済み。リスクなし |
| (auth) Route Group のバイパス | Spoofing | Next.js middleware（src/middleware.ts）が /my を独立して保護。Route Group 変更は /login には影響なし |
| SSRF（Footer での admin クエリ） | Tampering | createSupabaseAdminClient() は固定の Supabase URL に接続。ユーザー入力をクエリパラメータに使わない |

---

## Sources

### Primary (HIGH confidence)
- `src/app/layout.tsx` — 現在の inline footer 構造を直接確認
- `src/components/Header.tsx` — Georgia serif ロゴスタイル、user 取得パターンを直接確認
- `src/lib/commitUtils.ts` — `achievementRate` の private/public 状態、`sortMembersForCommitView` の現在実装を確認
- `src/lib/types.ts` — `Member` 型の現在定義を確認
- `src/app/login/page.tsx` — 現在の `py-16` spacing、`font-semibold` heading を確認
- `src/app/signin-51cf21389c56/page.tsx` — 同上
- `src/app/my/page.tsx` — `.eq('user_id', user.id)` クエリで user_id カラムの存在を確認
- `src/lib/supabase/server.ts` — async function であることを確認
- `src/lib/supabase/admin.ts` — sync function であることを確認
- `vitest.config.ts` — テスト設定確認
- `.planning/phases/34-ui-polish/34-CONTEXT.md` — ロック済み決定事項
- `.planning/phases/34-ui-polish/34-UI-SPEC.md` — ビジュアル仕様

### Secondary (MEDIUM confidence)
- `src/app/__tests__/page.test.tsx` — Server Component テストパターン（element tree inspection）の参考例として確認

### Tertiary (LOW confidence)
- Next.js Route Groups の URL 非影響動作 [ASSUMED: well-known Next.js 13+ convention]

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — 既存コードを直接読んで確認、新規パッケージなし
- Architecture: HIGH — CONTEXT.md の決定事項に基づき、既存コードと照合済み
- Pitfalls: HIGH — 実際のコード（async/sync 区別等）を確認して導出

**Research date:** 2026-06-08
**Valid until:** 2026-07-08（安定スタック）
