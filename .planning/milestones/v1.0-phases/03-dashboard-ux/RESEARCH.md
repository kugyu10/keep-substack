# Phase 3: ダッシュボードとUX仕上げ - Research

**Researched:** 2026-05-08
**Domain:** Next.js 16 App Router / Dynamic Routes / Tailwind CSS Responsive Grid
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 個人詳細は別ページ遷移。URL は `/member/[substackId]` 形式
- **D-02:** `substackId` は `feedUrl` のサブドメインから自動抽出する（`https://uojun.substack.com/feed` → `uojun`）。`members.json` への項目追加は不要
- **D-03:** 個人詳細ページの内容はフルサイズ CalendarGrid（月ナビ付き）をそのまま再利用する
- **D-04:** 個人詳細ページには「← ダッシュボードに戻る」リンクを表示する

### Claude's Discretion
- ミニカレンダーの定義（DASH-01）: CalendarGridの縮小版（月ナビなし、今月のみ表示）が適切と思われるが、実装方法は研究・判断に委ねる
- ダッシュボードレイアウト（DASH-01/DASH-03）: グリッド列数とレスポンシブ設計はClaude判断
- 静的生成方式（DASH-02）: `/member/[substackId]` の静的生成 vs ISR の選択はClaude判断（force-static維持観点から検討）

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DASH-01 | メンバー全員のカレンダーを一覧表示するダッシュボードがある | ミニカレンダーコンポーネント設計、Tailwindグリッドレイアウト |
| DASH-02 | メンバーをクリックして個人詳細ビューに切り替えられる | generateStaticParams + force-static パターン、Link コンポーネント |
| DASH-03 | モバイルでも見やすいレスポンシブデザインで表示される | Tailwind レスポンシブブレークポイント設計 |
</phase_requirements>

---

## Summary

Phase 3では、既存の `CalendarGrid` コンポーネントを活用して2つの画面を実装する。①ダッシュボード（`/`）は全メンバーのミニカレンダーをグリッド表示、②個人詳細ページ（`/member/[substackId]`）はフルサイズCalendarGridを再利用する。

技術的な核心は `generateStaticParams` と `export const dynamic = 'force-static'` の組み合わせ。`members.json`（現在2件）からsubstackIdを抽出してビルド時に全個人詳細ページを静的生成できる。Next.js 16でもCache Componentsフラグを有効にしていない限り、この従来パターンは引き続き動作する。

ミニカレンダーは既存 `CalendarGrid` を流用せず、専用の `MiniCalendar` コンポーネントとして別ファイルに切り出す（月ナビなし・今月固定のシンプルなClient Component）。CalendarGridにpropを追加してミニモードを制御する方法も検討したが、コンポーネントの責務が曖昧になるためKISSの原則から新規コンポーネントが適切。

**Primary recommendation:** `generateStaticParams` で全メンバーのパスをビルド時生成 + `export const dynamic = 'force-static'` で `unstable_cache` によるISRを維持する。ダッシュボードはTailwindの `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` でレスポンシブ対応する。

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| ダッシュボード（全メンバーグリッド表示） | Frontend Server (SSR/SSG) | — | Server Componentでフィードデータ取得後、HTMLとしてレンダリング |
| ミニカレンダー表示 | Browser / Client | Frontend Server | MiniCalendarは'use client'だが、データはサーバー側で取得してpropsとして渡す |
| 個人詳細ページ（/member/[substackId]） | Frontend Server (SSR/SSG) | — | generateStaticParamsでビルド時静的生成 |
| CalendarGrid（月ナビ付き） | Browser / Client | — | 既存のuseStateを使う月ナビはClient Componentのまま維持 |
| substackId抽出ロジック | Frontend Server (SSR/SSG) | — | ビルド時にfeedUrlから文字列処理するだけ。クライアント不要 |
| メンバーへのクリックナビゲーション | Browser / Client | — | next/link または通常のaタグ。ミニカレンダーカードにラップ |

---

## Standard Stack

### Core（確立済みスタック）
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.2.6 | App Router, generateStaticParams, force-static | プロジェクト確立済み |
| React | 19.2.4 | Server/Client Component分割 | プロジェクト確立済み |
| TypeScript | ^5 | 型安全性 | プロジェクト確立済み |
| Tailwind CSS | ^4 | レスポンシブグリッド、ユーティリティクラス | プロジェクト確立済み |

[VERIFIED: npm view, package.json]

### 新規追加ライブラリ
**なし** — Phase 3は既存スタックのみで実装可能。新規パッケージ不要。

[VERIFIED: リサーチにより確認]

---

## Architecture Patterns

### System Architecture Diagram

```
members.json
     |
     v
generateStaticParams() -----> /member/uojun (静的生成)
     |                  ----> /member/careerkoumei (静的生成)
     |
     v
page.tsx (Server Component, force-static)
     |
     |-- fetchAllFeedsCached(members) [unstable_cache, 300s TTL]
     |         |
     |         v
     |   MemberFeedResult[]
     |         |
     |         v
     |   buildArticleMap(items) --> [string, Article[]][]
     |         |
     |         v
     +-- ダッシュボード: MiniCalendar × N (Client Component)
     |       グリッドレイアウト (grid-cols-1 sm:grid-cols-2 lg:grid-cols-3)
     |       クリック → /member/[substackId] (next/link)
     |
member/[substackId]/page.tsx (Server Component, force-static)
     |
     |-- fetchAllFeedsCached(members) [キャッシュヒット, 同一TTL]
     |         |
     |         v
     |   対象メンバーをfilter → buildArticleMap
     |         |
     |         v
     +-- CalendarGrid (既存, 月ナビ付き, 'use client')
          「← ダッシュボードに戻る」link
```

### Recommended Project Structure
```
src/
├── app/
│   ├── page.tsx                      # ダッシュボード（変更）
│   ├── layout.tsx                    # 変更なし
│   └── member/
│       └── [substackId]/
│           └── page.tsx              # 個人詳細ページ（新規）
├── components/
│   ├── CalendarGrid.tsx              # 変更なし（再利用）
│   ├── ArticleTooltip.tsx            # 変更なし
│   └── MiniCalendar.tsx              # 新規作成
├── lib/
│   ├── calendarUtils.ts              # extractSubstackId関数を追加
│   ├── fetchFeed.ts                  # 変更なし
│   └── types.ts                     # 変更なし
└── data/
    └── members.json                  # 変更なし
```

### Pattern 1: generateStaticParams でローカルJSONからパス生成

**What:** ビルド時にローカルの `members.json` を読み込み、全メンバーの `/member/[substackId]` ページを静的生成する。
**When to use:** データソースがローカルファイル（外部API不要）で、全件をビルド時に確定できる場合。
**Example:**
```typescript
// Source: https://nextjs.org/docs/app/api-reference/functions/generate-static-params
// src/app/member/[substackId]/page.tsx

import members from '@/data/members.json'
import type { Member } from '@/lib/types'
import { extractSubstackId } from '@/lib/calendarUtils'

export const dynamic = 'force-static'
export const dynamicParams = false // members.json 以外の substackId は 404

export function generateStaticParams() {
  return (members as Member[])
    .map((m) => extractSubstackId(m.feedUrl))
    .filter((id): id is string => id !== null)
    .map((substackId) => ({ substackId }))
}

export default async function MemberPage({
  params,
}: {
  params: Promise<{ substackId: string }>
}) {
  const { substackId } = await params
  // ...
}
```

[VERIFIED: nextjs.org/docs/app/api-reference/functions/generate-static-params]

**重要:** Next.js 15+ では `params` は `Promise` 型。`await params` が必須。

[VERIFIED: nextjs.org/docs/app/api-reference/functions/generate-static-params]

### Pattern 2: force-static + unstable_cache の組み合わせ

**What:** `export const dynamic = 'force-static'` は、`unstable_cache` によるISRとの共存が可能。ページレベルでの静的ロックと、データレベルでのrevalidateを独立して管理できる。
**When to use:** 個人詳細ページのようにURLは静的だが、データ（フィード）は定期更新したい場合。

```typescript
// Source: https://nextjs.org/docs/app/guides/caching-without-cache-components
// force-static は "force prerendering and cache the data" を意味する
// unstable_cache の revalidate が効いてISRとして動作する

export const dynamic = 'force-static'  // ページを静的にロック
// fetchAllFeedsCached は unstable_cache({ revalidate: 300 }) でISR対応済み
const results = await fetchAllFeedsCached(members as Member[])
```

[VERIFIED: nextjs.org/docs/app/guides/caching-without-cache-components]

**注意:** Next.js 16 で `cacheComponents` フラグが有効な場合、`dynamic`/`revalidate` などのルートセグメント設定は削除される。現プロジェクトは `next.config.ts` に `cacheComponents` 設定なし（デフォルト無効）のため、従来パターン継続使用可能。

[VERIFIED: next.config.ts 読み込みにより確認]

### Pattern 3: Tailwind レスポンシブグリッド

**What:** `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` でモバイル1列・タブレット2列・PC3列のレスポンシブグリッド。
**When to use:** メンバー数が増えても崩れないダッシュボードレイアウト。

```tsx
// Source: Tailwind CSS docs (breakpoints: sm=640px, lg=1024px)
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
  {results.map(({ member, items }) => {
    const substackId = extractSubstackId(member.feedUrl)
    return (
      <Link key={member.feedUrl} href={`/member/${substackId}`}>
        <MiniCalendar memberName={member.name} articleMap={...} />
      </Link>
    )
  })}
</div>
```

[ASSUMED] Tailwind v4のブレークポイント値はv3（sm=640px, lg=1024px）から変更なしと想定。公式ドキュメントで未確認。

### Pattern 4: substackId 抽出

**What:** feedUrlからサブドメインを正規表現で抽出する。URL APIよりシンプルで確実。
**When to use:** Substack形式のURLのみ対象とわかっている場合。

```typescript
// src/lib/calendarUtils.ts に追加
// Source: CONTEXT.md（03-CONTEXT.md D-02）のパターンをそのまま実装
export function extractSubstackId(feedUrl: string): string | null {
  const m = feedUrl.match(/^https?:\/\/([^.]+)\.substack\.com/)
  return m ? m[1] : null
}
```

[VERIFIED: 既存コードbase（03-CONTEXT.mdで既にパターン確定済み）]

**なぜ正規表現か:** URL APIの `new URL(feedUrl).hostname` でも実装できるが、正規表現の方が1行で完結してシンプル（KISS）。`([^.]+)` でサブドメインのみを確実に取得できる。

### Pattern 5: MiniCalendar（新規コンポーネント）設計

**What:** CalendarGridからミニ版を派生させる方法は2通り。どちらが適切か判断した。

| アプローチ | 実装 | 判定 |
|-----------|------|------|
| CalendarGridにmini propを追加 | `<CalendarGrid mini={true} .../>` | NG - 責務の混在、テスト困難 |
| MiniCalendarを新規作成 | `<MiniCalendar memberName articleMap />` | OK - 単一責任、KISS |

**MiniCalendar設計:**
```typescript
// 'use client' (useState不要だが、将来のインタラクション追加を考慮してクライアント側)
// 実際はuseStateなし → Server Componentでも可
// KISS優先でServer Componentとして実装する（'use client'不要）

type Props = {
  memberName: string
  articleMap: [string, Article[]][]  // CalendarGridと同型
}

// 今月のみ表示。月ナビなし。セルサイズ小。
// grid-cols-7 gap-0.5 text-xs などでコンパクト化
```

今月固定で状態管理不要のため、Server Componentとして実装できる。ただし`buildDayGrid`は`new Date()`を内部で使うため、ビルド時の月に固定される点に注意（ISR運用では許容範囲）。

[ASSUMED] MiniCalendarをServer Componentとして実装する場合、`new Date()`がビルド時/ISRキャッシュ生成時の日付で固定される。毎月のISRキャッシュ更新（REVALIDATE_SECONDSで制御）で実運用上は問題ない。

### Pattern 6: 個人詳細ページのデータ取得

**What:** `/member/[substackId]` で特定メンバーのデータを取得する方法。

| アプローチ | 実装 | 判定 |
|-----------|------|------|
| 全員分取得してfilter | `fetchAllFeedsCached(members).find(r => r.member.feedUrl.includes(substackId))` | OK - キャッシュ再利用 |
| 対象メンバーのみ取得 | 別のfetch関数を作る | NG - YAGNI、キャッシュが分散 |

**推奨:** 全員分取得してfilterする。理由は `fetchAllFeedsCached` が `unstable_cache` でキャッシュ済みのため、複数ページで同じキャッシュエントリを再利用できる（キャッシュヒット）。

```typescript
// member/[substackId]/page.tsx
const results = await fetchAllFeedsCached(members as Member[])
const memberResult = results.find(
  (r) => extractSubstackId(r.member.feedUrl) === substackId
)
if (!memberResult) notFound()
```

[VERIFIED: fetchFeed.ts の unstable_cache 実装確認、キャッシュキー `['all-feeds']`]

### Anti-Patterns to Avoid

- **CalendarGridにminiプロップ追加:** `showNav`, `compact`, `mini` などのフラグを追加するとコンポーネントの責務が増え、テスト・メンテが困難になる。新規コンポーネントで対応する。
- **個人詳細ページで独自フィード取得:** `fetchSingleFeed(substackId)` を別途作ると `unstable_cache` のキャッシュが分散し、フィード元への余分なリクエストが発生する。
- **`params` の同期アクセス:** Next.js 15+ では `params` は Promise。`params.substackId` のような同期アクセスはランタイムエラーの原因になる。必ず `const { substackId } = await params` とする。

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ページ間ナビゲーション | `window.location.href` や `router.push` | `next/link` (`<Link>`) | プリフェッチ、SEO最適化、CSR対応が標準で得られる |
| 動的ルーティング | Express風のルーター実装 | Next.js App Router ファイルシステムルーティング | `app/member/[substackId]/page.tsx` を作るだけ |
| URLパラメータ解析 | 手動のURLパース | `params` プロップ（Next.jsが自動注入） | 型安全、ビルド時検証済み |
| 静的パス生成 | ビルドスクリプトでのHTML生成 | `generateStaticParams` | Next.jsビルドパイプラインに統合、ISR対応 |

---

## Common Pitfalls

### Pitfall 1: params の同期アクセス（Next.js 15+の破壊的変更）

**What goes wrong:** `export default async function Page({ params }: ...) { const { substackId } = params }` のように `await` なしで `params` にアクセスするとTypeScriptエラーまたはランタイムエラーが発生する。
**Why it happens:** Next.js 15から `params`（および `searchParams`）は `Promise<{...}>` 型に変更された。
**How to avoid:** `const { substackId } = await params` を使う。
**Warning signs:** TypeScriptが `Property 'substackId' does not exist on type 'Promise<...>'` エラーを出す。

[VERIFIED: nextjs.org/docs/app/api-reference/functions/generate-static-params]

### Pitfall 2: generateStaticParams 未実装でのforce-staticとdynamicParams

**What goes wrong:** `export const dynamic = 'force-static'` だけ設定し `generateStaticParams` がないと、動的ルートが実行時に静的レンダリングされる（ビルド時には何も生成されない）。
**Why it happens:** `force-static` は「静的として扱え」という命令であり、「全パスをビルド時に生成せよ」ではない。
**How to avoid:** 全メンバーのパスをビルド時に確定させるには `generateStaticParams` を実装する。さらに `export const dynamicParams = false` で未知のパスは404にできる。
**Warning signs:** `next build` 出力に `○ (Static)` でなく `λ (Dynamic)` と表示される。

[VERIFIED: nextjs.org/docs/app/api-reference/functions/generate-static-params]

### Pitfall 3: ミニカレンダーの今月表示とISRキャッシュの日付ズレ

**What goes wrong:** MiniCalendarが `new Date()` で今月を計算する場合、ISRキャッシュが月をまたいでも古い月のカレンダーが表示され続ける可能性がある。
**Why it happens:** ISR（unstable_cache）のrevalidateは300秒（デフォルト）。月末の300秒間は前月のカレンダーが表示される可能性がある。
**How to avoid:** REVALIDATE_SECONDS がデフォルト300秒（5分）なので実用上は許容範囲。月次で問題になるなら月初に `revalidatePath('/')` を実行するOn-demand Revalidationを将来検討。
**Warning signs:** 月をまたいだISRキャッシュで前月カレンダーが表示される（最大REVALIDATE_SECONDS秒）。

[ASSUMED]

### Pitfall 4: max-w-2xl はダッシュボードグリッドには狭い

**What goes wrong:** 現在の `page.tsx` は `max-w-2xl mx-auto` でコンテナ幅を制限している。グリッド3列表示には `max-w-5xl` または `max-w-6xl` が必要。
**Why it happens:** Phase 2で1メンバー縦並びの設計（max-w-2xl）をPhase 3のグリッドレイアウトに流用するとレイアウトが崩れる。
**How to avoid:** ダッシュボードの `main` タグのmax幅を `max-w-6xl` 程度に拡大する。
**Warning signs:** 3列グリッドが2xl幅に収まらず強制的に1列になる。

[VERIFIED: 既存コード `src/app/page.tsx` 読み込みにより確認]

---

## Code Examples

### 個人詳細ページ全体構造

```typescript
// Source: nextjs.org/docs/app/api-reference/functions/generate-static-params
// src/app/member/[substackId]/page.tsx

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fetchAllFeedsCached } from '@/lib/fetchFeed'
import { buildArticleMap, extractSubstackId } from '@/lib/calendarUtils'
import CalendarGrid from '@/components/CalendarGrid'
import members from '@/data/members.json'
import type { Member } from '@/lib/types'

export const dynamic = 'force-static'
export const dynamicParams = false

export function generateStaticParams() {
  return (members as Member[])
    .map((m) => extractSubstackId(m.feedUrl))
    .filter((id): id is string => id !== null)
    .map((substackId) => ({ substackId }))
}

export default async function MemberPage({
  params,
}: {
  params: Promise<{ substackId: string }>
}) {
  const { substackId } = await params

  const results = await fetchAllFeedsCached(members as Member[])
  const memberResult = results.find(
    (r) => extractSubstackId(r.member.feedUrl) === substackId
  )

  if (!memberResult) notFound()

  const map = buildArticleMap(memberResult.items)
  const articleMapEntries = Array.from(map.entries())

  return (
    <main className="max-w-2xl mx-auto p-6">
      <Link href="/" className="text-sm text-gray-500 hover:text-gray-800 mb-4 inline-block">
        ← ダッシュボードに戻る
      </Link>
      <CalendarGrid
        memberName={memberResult.member.name}
        articleMap={articleMapEntries}
      />
    </main>
  )
}
```

### ダッシュボード（page.tsx）の変更点

```typescript
// src/app/page.tsx（変更後の概要）
export const dynamic = 'force-static'

export default async function Home() {
  const results = await fetchAllFeedsCached(members as Member[])

  return (
    <main className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Keep Substack</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {results.map(({ member, items }) => {
          const substackId = extractSubstackId(member.feedUrl)
          if (!substackId) return null
          const map = buildArticleMap(items)
          const articleMapEntries = Array.from(map.entries())
          return (
            <Link key={member.feedUrl} href={`/member/${substackId}`}>
              <MiniCalendar
                memberName={member.name}
                articleMap={articleMapEntries}
              />
            </Link>
          )
        })}
      </div>
    </main>
  )
}
```

### substackId 抽出関数（calendarUtils.ts に追加）

```typescript
// src/lib/calendarUtils.ts に追加
// Source: 03-CONTEXT.md D-02 のパターンを実装
export function extractSubstackId(feedUrl: string): string | null {
  const m = feedUrl.match(/^https?:\/\/([^.]+)\.substack\.com/)
  return m ? m[1] : null
}
```

### MiniCalendar コンポーネント概要

```typescript
// src/components/MiniCalendar.tsx
// Server Component（useStateなし、月固定）

import { buildDayGrid } from '@/lib/calendarUtils'

type Article = { title?: string; link?: string }
type Props = {
  memberName: string
  articleMap: [string, Article[]][]
}

export default function MiniCalendar({ memberName, articleMap }: Props) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const days = buildDayGrid(year, month)
  const map = new Map(articleMap)

  return (
    <div className="border rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer">
      <p className="text-sm font-semibold mb-2 truncate">{memberName}</p>
      <div className="grid grid-cols-7 gap-0.5">
        {/* 曜日ヘッダー（省略可） */}
        {days.map((day) => {
          const key = `${year}-${String(month).padStart(2, '0')}-${String(day.date).padStart(2, '0')}`
          const hasArticle = (map.get(key) ?? []).length > 0
          return (
            <div
              key={day.date}
              style={day.colStart ? { gridColumnStart: day.colStart } : undefined}
              className={`aspect-square rounded-sm text-xs flex items-center justify-center ${
                hasArticle ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'
              }`}
            >
              {day.date}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `params.slug`（同期アクセス） | `const { slug } = await params`（非同期） | Next.js 15 | 個人詳細ページで必須対応 |
| `getStaticProps` + `getStaticPaths` | `generateStaticParams` + Server Component | Next.js 13+ | App Routerでの標準パターン |
| CSS Grid 手動実装 | Tailwind `grid-cols-*` ユーティリティ | Tailwind v1+ | 1クラスでレスポンシブグリッド |

**Deprecated/outdated:**
- `getStaticPaths`: Pages Routerのみ。App Routerでは `generateStaticParams` を使う。
- `export const revalidate` をリテラル値で使う方法: 現プロジェクトでは `unstable_cache` の `revalidate` オプションで代替済み（環境変数対応のため）。

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Tailwind v4のブレークポイント値（sm=640px, lg=1024px）はv3から変更なし | Architecture Patterns Pattern 3 | レイアウトの崩れ。Tailwind v4 docsで確認推奨 |
| A2 | MiniCalendarをServer Componentとして実装した場合、ISRキャッシュ更新タイミングで今月表示が更新される | Common Pitfalls Pitfall 3 | 月末のキャッシュで前月カレンダーが表示される（最大REVALIDATE_SECONDS秒）。実用上許容範囲 |
| A3 | `cacheComponents` が無効（デフォルト）のため、`export const dynamic = 'force-static'` は Next.js 16 でも動作する | Architecture Patterns Pattern 2 | force-staticが動作しなくなる。next.config.tsを確認済み（cacheComponents設定なし）でリスク低 |

---

## Open Questions

1. **Tailwind v4のブレークポイント変更有無**
   - What we know: Tailwind v3ではsm=640px, md=768px, lg=1024px
   - What's unclear: v4（インストール済み）でブレークポイント値が変わっているか
   - Recommendation: `npx tailwindcss --help` または公式docsで確認。変わっていても `sm:`, `lg:` クラス名は同じ

2. **MiniCalendarへのツールチップ（ArticleTooltip）組み込み**
   - What we know: ミニカレンダーは「クリックで個人詳細へ」がメインアクション
   - What's unclear: ミニカレンダーのセルにツールチップも欲しいかどうかはユーザー判断が必要
   - Recommendation: Phase 3スコープ外。ミニカレンダーは記事の有無（色分け）のみ表示し、詳細はクリックで詳細ページへ誘導するシンプルな設計を維持する

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js ビルド | 確認済み（開発中） | — | — |
| next/link | クライアントナビゲーション | ✓ | Next.js 16.2.6に同梱 | — |
| next/navigation (notFound) | 未知substackIdの404 | ✓ | Next.js 16.2.6に同梱 | — |

**外部サービス依存なし** — Phase 3はコード・設定変更のみ。新規外部ツール不要。

---

## Security Domain

Phase 3は認証なしの公開ページ。セキュリティ上の新規リスクは最小限。

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | 認証なし（設計通り） |
| V3 Session Management | no | セッションなし |
| V4 Access Control | no | 全ページ公開 |
| V5 Input Validation | yes（低リスク） | substackIdはURLパスパラメータ。generateStaticParamsで事前に有効なIDを確定、dynamicParams=falseで不正なIDを404に |
| V6 Cryptography | no | 暗号処理なし |

**substackId の安全性:**
`dynamicParams = false` を設定することで、`generateStaticParams` で事前生成したパス以外は全て404になる。任意の文字列をsubstackIdとして注入されても、静的ファイルが存在しないため情報漏洩リスクはない。

---

## Sources

### Primary (HIGH confidence)
- [/vercel/next.js (Context7)] — generateStaticParams, params Promise型, force-static
- [nextjs.org/docs/app/api-reference/functions/generate-static-params] — generateStaticParams完全リファレンス（version 16.2.6, 2026-05-07更新）
- [nextjs.org/docs/app/guides/caching-without-cache-components] — force-static, unstable_cache（version 16.2.6, 2026-05-07更新）
- [nextjs.org/docs/app/api-reference/file-conventions/route-segment-config] — dynamicParams, dynamic（version 16.2.6）

### Secondary (MEDIUM confidence)
- 既存コードベース（src/app/page.tsx, src/lib/fetchFeed.ts, src/components/CalendarGrid.tsx）— 確立済みパターンの把握

### Tertiary (LOW confidence)
- Tailwind v4ブレークポイント値（WebSearch未実施、トレーニングデータから推定）

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — インストール済みパッケージをnpmで確認
- Architecture (generateStaticParams): HIGH — 公式docs（Next.js 16.2.6）で確認
- Architecture (Tailwind responsive grid): MEDIUM — ブレークポイント値がv4で変わっていないか未確認
- Pitfalls: HIGH — 公式docsと既存コードから導出

**Research date:** 2026-05-08
**Valid until:** 2026-06-08（Next.jsのリリースサイクルを考慮）
