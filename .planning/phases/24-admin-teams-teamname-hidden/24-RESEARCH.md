# Phase 24: /admin/teams/{teamName} hiddenチームビュー - Research

**Researched:** 2026-05-30
**Domain:** Next.js 16 App Router dynamic route (RSC) — admin-protected single-team weekly heatmap view
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** teamName がDBに存在しない場合も、存在するがメンバーが0人の場合も、**200でメッセージを表示する**（`notFound()`/404 にはしない）。メッセージ例: 「該当するチームのメンバーがいません」等
- **D-02:** いずれの場合もページ自体はadmin保護下で正常表示し、ヒートマップ領域の代わりに上記メッセージを出す
- **D-03:** 管理用の**簡素なビュー**にする。構成は チーム名見出し + `/admin` への戻りリンク + `<WeeklyHeatmapGrid>`
- **D-04:** トップページのチームタブ・`PrBanner`（参加案内バナー）は**表示しない**（管理者専用ビューのため不要）
- **D-05:** トップページの最大幅・余白スタイル（`max-w-[600px] mx-auto px-3 py-4`）は踏襲してよい（Claude裁量）
- **D-06:** **任意の teamName を表示できる**（public/private/hidden を問わない）。管理者が全チームをURL直接で確認できるようにする
- **D-07:** メンバーのフィルタは teamName の完全一致: `allMembers.filter(m => m.teams.some(t => t.name === teamName))`（status 条件は付けない）

### Claude's Discretion
- 見出しに status バッジ（hidden/private/public）を併記するかは任意
- teamName のURLデコード（`decodeURIComponent`）の扱い — 日本語・特殊文字チーム名に対応すること（実装詳細）
- `revalidate` の値（トップは300）に合わせるかは任意

### Deferred Ideas (OUT OF SCOPE)
None — 議論はフェーズスコープ内に収まった。E2Eテスト(Phase 26)、member_publicationsスキーマ拡張(Phase 25)、`/admin/teams` status管理テーブル(Phase 22済) は本フェーズ対象外。
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VIEW-01 | /admin/teams/{teamName} でhiddenチームの週次ヒートマップビューが表示される | 新規 `src/app/admin/teams/[teamName]/page.tsx` (RSC)。`getMembers()` → teamName完全一致フィルタ(D-07) → `fetchAllFeedsCached()` → `<WeeklyHeatmapGrid results={...} />`。トップページ `src/app/page.tsx` の流用。全シグネチャ確認済み（下記 Code Examples）。 |
| VIEW-02 | /admin/teams/{teamName} はadminロールのユーザーのみアクセスできる（proxy.tsで制御） | **新規実装不要。** `src/proxy.ts` の `matcher: ['/admin', '/admin/:path*', ...]` が `/admin/teams/{teamName}` を自動カバー。非admin/未認証は `NextResponse.redirect(new URL('/', request.url))` で `/` にリダイレクト（Success Criteria #2 充足）。research で確認済み。 |
</phase_requirements>

## Summary

このフェーズは **新規ファイル1枚** (`src/app/admin/teams/[teamName]/page.tsx`) を追加するだけの、コード流用中心のフェーズ。トップページ (`src/app/page.tsx`) の RSC データ取得パターンをほぼコピーし、単一チーム用に簡素化する。`getMembers()` → teamName完全一致フィルタ → `fetchAllFeedsCached()` → `<WeeklyHeatmapGrid>` のパイプラインは全て既存・無変更で再利用できる。

認証保護 (VIEW-02) は **すでに `src/proxy.ts` がカバーしており、新規コードは一切不要**。重要な発見: このプロジェクトは Next.js **16.2.6** であり、CONTEXT/phase説明にある「Next 15」前提は古い。Next.js 16 では旧 `middleware.ts` 規約が `proxy.ts` にリネームされており、本プロジェクトはすでに移行済み (`src/proxy.ts` に `export async function proxy(...)`)。matcher が `/admin/:path*` を含むため、新ルートは自動で admin ゲート配下に入る。

Next.js 16 の動的ルートでは `params` が **Promise** で、`await` が必須。日本語・特殊文字チーム名のため `decodeURIComponent` が必須（URLパス経由で受け取る teamName はエンコード済み）。

**Primary recommendation:** `src/app/page.tsx` をコピーして単一チーム用に削ぎ落とす。`searchParams` の代わりに `params: Promise<{ teamName: string }>` を受け、`await params` → `decodeURIComponent` → teamName完全一致フィルタ (D-07) → 空ならメッセージ (D-01/D-02)、非空なら `<WeeklyHeatmapGrid>`。proxy.ts は触らない。検証は既存の RSC element-tree インスペクションパターン (`src/app/my/__tests__/page.test.tsx`) を流用する。

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| admin ロール認可 (VIEW-02) | Frontend Server (proxy/middleware) | — | `src/proxy.ts` が `/admin/:path*` の全リクエストでセッション検証しリダイレクト。ページ側に認可ロジックを置かない（既存パターン踏襲） |
| メンバー取得 + teamNameフィルタ | API/Backend (RSC server-side) | Database (Supabase) | `getMembers()` が service-role で Supabase から取得、フィルタは in-memory（RSC内）。クライアントに生データを渡さない |
| フィード取得・集約 | API/Backend (RSC server-side) | External (Substack RSS) + Storage (KV/articles) | `fetchAllFeedsCached()` がライブRSS+KV累積をマージ。サーバー側でのみ実行 |
| ヒートマップ描画 + 週送りナビ | Browser/Client | — | `<WeeklyHeatmapGrid>` は `'use client'`。`useState(weekOffset)` でクライアント状態管理。props (`MemberFeedResult[]`) のみ受領 |
| 空/無効チームのメッセージ表示 | API/Backend (RSC server-side) | — | フィルタ結果が空配列かをサーバーで判定し、200でメッセージ分岐（D-01/D-02）。`notFound()` は使わない |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.2.6 | App Router / RSC / 動的ルート / proxy（旧middleware） | プロジェクト既定。新規依存なし |
| react / react-dom | 19.2.4 | RSC + Client Component | プロジェクト既定 |
| @supabase/ssr | ^0.10.3 | proxy.ts のセッション検証（既存・無変更） | 既存認証基盤 |

**新規パッケージのインストールは一切不要。** このフェーズは既存コードの流用＋新規ページ1枚のみ。

### Supporting (全て既存・無変更で再利用)
| Module | Signature | Purpose | When to Use |
|--------|-----------|---------|-------------|
| `@/lib/members` → `getMembers()` | `(): Promise<Member[]>` | 全メンバーを `teams: {name,status}[]` 付きで取得（service-role） | ページ冒頭で全件取得し in-memory フィルタ |
| `@/lib/fetchFeed` → `fetchAllFeedsCached(members)` | `(members: Member[]): Promise<MemberFeedResult[]>` | フィルタ後メンバーのフィード取得（ライブRSS + KV累積マージ） | フィルタ後に呼ぶ |
| `@/components/WeeklyHeatmapGrid` (default) | props: `{ results: MemberFeedResult[] }` | 週送りナビ付き週次ヒートマップ（`'use client'`） | props変更なしで再利用 |
| `@/lib/types` | `Member` (`teams: {name,status}[]`), `MemberFeedResult` (`{member, items, imageUrl?}`) | 型 | import のみ |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| 空チーム時 200+メッセージ (D-01) | `notFound()` (404) | **却下** — D-01 で 200 表示が明示ロック済み。404にしない |
| in-memory teamName フィルタ (D-07) | Supabase クエリで team 絞り込み | 却下 — トップと同じ `getMembers()` 全件取得→in-memoryフィルタを流用する方が一貫性が高くコード差分が最小 |
| ページ内での admin チェック | proxy.ts 任せ | proxy.ts が全 `/admin/*` をカバー済み。ページ内重複チェックは不要（既存トップ admin ページも持たない） |

## Package Legitimacy Audit

このフェーズは外部パッケージを一切インストールしない（既存依存のみ使用）。**Package Legitimacy Gate は適用対象外** — 新規パッケージなし。

| Package | Disposition |
|---------|-------------|
| (none) | N/A — 新規インストールなし |

## Architecture Patterns

### System Architecture Diagram

```
[Browser GET /admin/teams/{teamName}]
        │
        ▼
[Next.js 16 proxy.ts]  ──── user==null OR role!='admin' ───▶ [302 redirect → /]   (VIEW-02 / SC#2)
        │ (admin, session valid)
        ▼
[RSC: app/admin/teams/[teamName]/page.tsx]
        │  await params → teamName(encoded)
        │  decodeURIComponent(teamName)
        ▼
[getMembers()] ──▶ Supabase (members ⋈ member_teams ⋈ teams)
        │  → Member[] (teams: {name,status}[])
        ▼
[in-memory filter: m.teams.some(t => t.name === teamName)]   (D-07, status無視 → D-06)
        │
        ├── filtered.length === 0 ──▶ [200: "該当するチームのメンバーがいません"]  (D-01/D-02)
        │
        ▼ (filtered.length > 0)
[fetchAllFeedsCached(filtered)] ──▶ Substack RSS (live) + KV (getArticles) → merge/dedup/sort
        │  → MemberFeedResult[]
        ▼
[<WeeklyHeatmapGrid results={...} />]  ('use client', useState weekOffset)
        │
        ▼
[200 HTML: チーム名見出し + "← 管理画面へ" リンク + ヒートマップ]  (D-03/D-04)
```

ファイルとコンポーネントのマッピングは Component Responsibilities（上の Responsibility Map）を参照。

### Recommended Project Structure
```
src/app/admin/teams/
├── page.tsx              # 既存: /admin/teams（status管理テーブル）— 触らない
├── actions.ts            # 既存: Server Action — 触らない
├── TeamStatusList.tsx    # 既存 — 触らない
└── [teamName]/
    └── page.tsx          # 新規: /admin/teams/{teamName}（このフェーズの唯一の新規ファイル）
```
**ルート競合なし:** `/admin/teams`（静的セグメント） と `/admin/teams/{name}`（動的セグメント `[teamName]`）は別ルート。Next.js は静的セグメントを動的より優先するため衝突しない。

### Pattern 1: Next.js 16 動的ルート — params は Promise
**What:** Next.js 16 では `params` / `searchParams` が非同期（Promise）。`await` 必須。
**When to use:** `[teamName]/page.tsx` で teamName を取り出すとき。
**Example:**
```tsx
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/dynamic-routes
type Props = {
  params: Promise<{ teamName: string }>
}

export default async function AdminTeamPage({ params }: Props) {
  const { teamName: raw } = await params
  const teamName = decodeURIComponent(raw)   // 日本語/特殊文字対応（必須）
  // ...
}
```

### Pattern 2: トップページ流用 → 単一チーム用に簡素化
**What:** `src/app/page.tsx` の取得パイプラインをコピーし、チームタブ・PrBanner・`team` searchParam を削除、フィルタを teamName 固定にする。
**When to use:** 新規ページ本体。
**Example:** Code Examples §「新規ページ完成形」参照。

### Pattern 3: RSC 内 in-memory フィルタ（D-07 完全一致、status無視 → D-06）
```tsx
const allMembers = await getMembers()
const filtered = allMembers.filter((m) => m.teams.some((t) => t.name === teamName))
// 注: トップは status='hidden' を除外するが、本ページは status 条件を付けない（D-06: 任意チーム表示）
```

### Anti-Patterns to Avoid
- **`notFound()` / 404 を使う:** D-01 違反。存在しない/空チームでも 200+メッセージ。
- **ページ内で admin チェックを再実装:** proxy.ts が担保済み。重複は不要（既存 admin ページも持たない）。
- **`decodeURIComponent` 省略:** 日本語チーム名が `%E3%...` のまま比較され、フィルタが必ず空になる。
- **トップの hidden 除外フィルタ (`m.teams.every(t => t.status !== 'hidden')`) をそのままコピー:** D-06/D-07 違反。本ページは status 無視で teamName 完全一致のみ。
- **チームタブ / PrBanner を残す:** D-04 違反。

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 週次ヒートマップ描画・週送りナビ | 自前グリッド | `<WeeklyHeatmapGrid results={...} />`（既存） | props無変更で完全再利用可。`heatmapUtils` (sortByWeeklyCount, getRecentDays, buildHeatmapArticleMap) も内部で完結 |
| フィード取得・リトライ・KVマージ・dedup | 自前 fetch | `fetchAllFeedsCached()`（既存） | リトライ/タイムアウト/ライブ+KVマージ/重複除去/ソート済み |
| メンバー+チーム取得 | 自前 Supabase クエリ | `getMembers()`（既存） | join とマッピング済み。トップと同一データ源で一貫性 |
| admin 認可 | 自前ガード | `src/proxy.ts`（既存・無変更） | `/admin/:path*` matcher が全カバー。セッション検証は `supabase.auth.getUser()`（サーバー検証） |

**Key insight:** このフェーズの「実装」はパイプラインの**配線**であって、新ロジックはほぼゼロ。新規コードは「params await + decode」「teamName完全一致フィルタ」「空時のメッセージ分岐」「簡素なレイアウト」の4点のみ。

## Runtime State Inventory

> このフェーズは新規ページ追加であり、rename/refactor/migration ではない。だが「既存のデータ・サービス状態に依存する読み取り専用ビュー」のため、依存先を明示する。

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | Supabase `members` / `member_teams` / `teams` テーブル（既存）。teamName は `teams.name` と完全一致。teams.status は public/private/hidden | なし（読み取りのみ。スキーマ変更なし） |
| Live service config | Substack RSS（`https://{publicationId}.substack.com/feed`）、KV累積記事（`getArticles`） | なし（`fetchAllFeedsCached` 経由で既存どおり） |
| OS-registered state | None — verified（OS登録状態に依存しない純Webルート） |
| Secrets/env vars | `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`（proxy.ts）、service-role key（admin client）。**いずれも既存・変更なし** | なし |
| Build artifacts | None — verified（新規ファイル追加のみ。ビルド成果物の rename なし） |

**重要な依存:** ヒートマップに「データが表示される」(SC#1) には、対象チームメンバーの publicationId が有効で、Substack RSS が到達可能 or KVに記事があることが前提。テスト時はこれらをモックする（実RSSに依存させない）。

## Common Pitfalls

### Pitfall 1: `params` を await し忘れる（Next 16）
**What goes wrong:** `params.teamName` を同期アクセスすると `undefined` / 型エラー / ランタイム警告。
**Why it happens:** Next 15/16 で `params` が Promise 化された（CONTEXT は「Next 15」と書くが実体は 16.2.6）。
**How to avoid:** `const { teamName } = await params`。型は `params: Promise<{ teamName: string }>`。
**Warning signs:** ビルド時 `params should be awaited` 警告、teamName が undefined。

### Pitfall 2: `decodeURIComponent` 漏れ → 日本語チームで必ず空表示
**What goes wrong:** チーム名「営業部」が URL では `%E5%96%B6...` になり、`t.name === teamName` が常に false。常に「メンバーがいません」になる。
**Why it happens:** 動的セグメントの値はURLエンコード済みのまま渡る。
**How to avoid:** `decodeURIComponent(raw)` してから比較。
**Warning signs:** ASCII チームは表示できるが日本語チームだけ空。

### Pitfall 3: トップの hidden 除外フィルタをコピーしてしまう
**What goes wrong:** `m.teams.every(t => t.status !== 'hidden')` を残すと、hidden チーム（本ルートの主用途）のメンバーが除外され常に空。
**Why it happens:** page.tsx の流用時に行 25 をそのまま持ち込む。
**How to avoid:** D-07 のフィルタ `m.teams.some(t => t.name === teamName)` のみ。status 条件は付けない。
**Warning signs:** public チームは出るが hidden チームが空。

### Pitfall 4: proxy.ts を「念のため」編集してしまう
**What goes wrong:** matcher やロジックを触ると既存 `/admin` `/my` 保護に回帰バグ。
**Why it happens:** VIEW-02 を「実装」だと誤認。
**How to avoid:** proxy.ts は **読むだけ・確認のみ**。`matcher: ['/admin', '/admin/:path*', ...]` がすでに新ルートをカバー。差分ゼロ。
**Warning signs:** proxy.ts に diff が出る = スコープ逸脱。

### Pitfall 5: 空判定を「members 0件」と「teamName未存在」で別扱いする
**What goes wrong:** 分岐を2系統に増やすと複雑化。D-01 は両者を同一扱い（200+同一メッセージ）。
**How to avoid:** `filtered.length === 0` の単一判定でメッセージ表示。teamName が DB に無くてもフィルタ結果は空配列になるだけ。
**Warning signs:** `try/catch` や別メッセージ分岐の追加。

## Code Examples

### 新規ページ完成形（実装の出発点 — 検証済みシグネチャに基づく）
```tsx
// src/app/admin/teams/[teamName]/page.tsx
// Source: src/app/page.tsx を流用 + Next 16 dynamic route 規約
//   https://nextjs.org/docs/app/api-reference/file-conventions/dynamic-routes
import { getMembers } from '@/lib/members'
import { fetchAllFeedsCached } from '@/lib/fetchFeed'
import WeeklyHeatmapGrid from '@/components/WeeklyHeatmapGrid'

export const revalidate = 300   // Claude裁量(D-05): トップに合わせる

type Props = {
  params: Promise<{ teamName: string }>
}

export default async function AdminTeamPage({ params }: Props) {
  const { teamName: raw } = await params
  const teamName = decodeURIComponent(raw)        // 日本語/特殊文字対応（Pitfall 2）

  const allMembers = await getMembers()
  // D-07: status 無視・teamName 完全一致（D-06: 任意チーム表示）
  const filtered = allMembers.filter((m) => m.teams.some((t) => t.name === teamName))

  return (
    <main className="max-w-[600px] mx-auto px-3 py-4">   {/* D-05 踏襲 */}
      <a href="/admin" className="text-sm text-blue-600 hover:underline block mb-4">
        ← 管理画面へ
      </a>
      <h1 className="text-2xl mb-4">{teamName}</h1>

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-500">該当するチームのメンバーがいません</p>  // D-01/D-02
      ) : (
        <WeeklyHeatmapGrid results={await fetchAllFeedsCached(filtered)} />
      )}
    </main>
  )
}
```
> 注: 上は出発点。`fetchAllFeedsCached` を JSX 内 await ではなく分岐前に `const results = ...` で取る方がテストしやすい（planner裁量）。status バッジ併記は Claude 裁量。

### VIEW-02 を担保する既存コード（確認のみ・無変更）
```ts
// src/proxy.ts（抜粋・既存）
if (pathname.startsWith('/admin')) {
  if (!user || user.app_metadata?.role !== 'admin') {
    return NextResponse.redirect(new URL('/', request.url))   // SC#2: 非admin → /
  }
}
export const config = { matcher: ['/admin', '/admin/:path*', '/my', '/my/:path*'] }
// '/admin/:path*' が /admin/teams/{teamName} を自動カバー
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `middleware.ts` / `export function middleware` | `proxy.ts` / `export function proxy` | Next.js 16 | 本プロジェクトは既に `src/proxy.ts` に移行済み。認可は proxy で集約 |
| 同期 `params` / `searchParams` | `Promise` 化、`await` 必須 | Next.js 15 → 16 で定着 | `[teamName]/page.tsx` で `await params` 必須 |

**Deprecated/outdated:**
- phase説明・CONTEXT の「Next 15」表記: 実体は **Next.js 16.2.6**。挙動（params Promise）は同じだが、middleware は `proxy.ts` 規約である点に注意。

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Next.js 16 でも `/admin/:path*` matcher が `/admin/teams/{teamName}` の動的セグメントを問題なくマッチする | VIEW-02 | 低 — matcher 構文は path-to-regexp で `:path*` は全サブパスを含む。既存 `/admin/teams`(Phase22) が同 matcher 下で動作している実績あり |
| A2 | `getMembers()` が hidden チームのメンバーも含めて全件返す（status フィルタを内部でしない） | D-06/D-07 | 中→低 — `members.ts` 実装確認済み: status での絞り込みなし。全 member_teams を返す。検証済み |
| A3 | 空配列を `fetchAllFeedsCached([])` に渡さなくてよい（length===0 で分岐するため呼ばない） | Pitfall 5 | 低 — 渡しても `Promise.allSettled([])` で `[]` を返す無害動作。分岐で回避が望ましい |

**確認事項なし（全て低リスク）:** A1〜A3 はいずれもコード/docsで裏付けあり。planner はそのまま進行可。

## Open Questions

1. **status バッジ併記の有無（Claude裁量）**
   - What we know: D-03 は見出し+戻りリンク+グリッドの簡素構成。status バッジは任意。
   - What's unclear: planner が付けるか否か。
   - Recommendation: 付けるなら `getMembers()` 結果から該当 teamName の status を拾える（`filtered[0].teams.find(t=>t.name===teamName)?.status`）。空チーム時は status 不明なので付けない。任意実装。

2. **`fetchAllFeedsCached` を分岐前に一括取得するか JSX 内 await するか**
   - What we know: テスト容易性のため分岐前 `const results` が望ましい。ただし空チーム時に無駄なフェッチを避けるなら分岐内 await が効率的。
   - Recommendation: `filtered.length===0` を先に判定 → 非空なら `await fetchAllFeedsCached(filtered)`。両立する（Code Examples の構造）。

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Next.js | ルート/RSC/proxy | ✓ | 16.2.6 | — |
| React | RSC + client | ✓ | 19.2.4 | — |
| @supabase/ssr | proxy 認証（既存） | ✓ | ^0.10.3 | — |
| vitest | 検証 | ✓ | ^4.1.6 | — |
| Supabase（実行時データ源） | 実ページ表示 | 環境依存（env必要） | — | テストはモック。実RSS/Supabaseに依存させない |

**Missing dependencies with no fallback:** なし — 全て既存。

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^4.1.6 |
| Config file | none（vitest デフォルト設定。`vitest.config.*` 不在を確認） |
| Quick run command | `npx vitest run src/app/admin/teams/__tests__/teamPage.test.tsx` |
| Full suite command | `npm test`（= `vitest run`） |

**確立済みパターン（流用元）:** `src/app/my/__tests__/page.test.tsx` — **jsdom不使用**で RSC が返す React element ツリーを `findByType` で走査し props を検証するスタイル。`next/navigation` の `redirect` は throw でモック、`@/lib/*` は `vi.mock` でスタブ。本フェーズもこのパターンを流用する。

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VIEW-01 | 有効 teamName でフィルタ後メンバーが `<WeeklyHeatmapGrid>` の `results` props に渡る | unit (RSC element-tree) | `npx vitest run src/app/admin/teams/__tests__/teamPage.test.tsx -t "renders heatmap"` | ❌ Wave 0 |
| VIEW-01 | teamName完全一致フィルタ(D-07): 別チームメンバーは除外、status無視で hidden も含む | unit | 同上 `-t "filters by exact teamName"` | ❌ Wave 0 |
| VIEW-01 / D-01 | DB未存在 teamName → 200でメッセージ、`WeeklyHeatmapGrid` 不在 | unit | 同上 `-t "unknown team shows message"` | ❌ Wave 0 |
| VIEW-01 / D-01 | 存在するが0人 → 200でメッセージ | unit | 同上 `-t "empty team shows message"` | ❌ Wave 0 |
| VIEW-01 | 日本語/エンコード teamName が decode されフィルタ一致する | unit | 同上 `-t "decodes encoded teamName"` | ❌ Wave 0 |
| VIEW-02 / SC#2 | proxy.ts: 非admin/未認証 → `/` リダイレクト | unit (proxy 直テスト) | `npx vitest run src/__tests__/proxy.test.ts -t "non-admin redirect"` | ❌ Wave 0（任意。proxyは既存・無変更なので「確認テスト」） |

**観測可能シグナル（admin保護SSRルートゆえの工夫）:**
- ページが返す **React element ツリー**を直接 await して検査（jsdom/レンダリング不要）。`findByType(el, WeeklyHeatmapGrid)` の有無、`.props.results` の中身、メッセージ `<p>` テキストで判定。
- teamName のフィルタ/decode は `getMembers` を `vi.mock` し、固定の `Member[]` を返して検証。`fetchAllFeedsCached` もモックして実RSSに依存させない。
- VIEW-02 は proxy 関数を直接呼び、`NextRequest` をモック → 戻り値が `NextResponse.redirect('/')` かを assert。**proxy.ts は無変更**なので、これは「新ルートが既存ゲート配下に入ることの確認テスト」であり必須ではない（planner判断）。E2Eでの実リダイレクト確認は Phase 26 スコープ。

### Sampling Rate
- **Per task commit:** `npx vitest run src/app/admin/teams/__tests__/teamPage.test.tsx`
- **Per wave merge:** `npm test`（全 vitest スイート）
- **Phase gate:** 全スイート green → `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/app/admin/teams/__tests__/teamPage.test.tsx` — VIEW-01 / D-01 / D-06 / D-07 / decode を網羅。`src/app/my/__tests__/page.test.tsx` の element-tree + vi.mock パターンを流用。
- [ ] (任意) `src/__tests__/proxy.test.ts` — VIEW-02 確認テスト。proxy 無変更のため優先度低。
- [ ] 共有 fixture は不要（各テストで `getMembers`/`fetchAllFeedsCached` を直接モック）。
- [ ] framework install 不要（vitest 導入済み）。

## Security Domain

> `security_enforcement` キーは config に明示されていない（= 有効扱い）。読み取り専用adminビューのため適用範囲は限定的。

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `src/proxy.ts` の `supabase.auth.getUser()`（サーバー側検証。cookie 改ざんに耐性） — 既存・無変更 |
| V3 Session Management | yes | @supabase/ssr の cookie セッション（proxy で refresh） — 既存 |
| V4 Access Control | yes | proxy の `user.app_metadata?.role !== 'admin'` ガード。`/admin/:path*` 全カバー。**ページ内に追加の認可不要** |
| V5 Input Validation | yes | teamName は `decodeURIComponent` 後に `=== `比較するのみ（DBクエリに直接渡さない＝インジェクション面なし）。Supコクエリは `getMembers` 内のパラメータ化済み select |
| V6 Cryptography | no | 暗号処理なし |

### Known Threat Patterns for Next.js 16 admin SSR route
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| 非admin が URL 直打ちで hidden チーム閲覧 (VIEW-02) | Elevation of Privilege / Info Disclosure | proxy.ts の role ゲート（既存）。新ルートは matcher で自動保護 |
| teamName を経由した path/クエリインジェクション | Tampering | teamName は DB クエリに渡さず in-memory `===` 比較のみ。注入面なし |
| hidden チームデータの非認可漏洩 | Information Disclosure | proxy が admin 以外を `/` にリダイレクト。RSC はサーバーでのみデータ取得しクライアントには `MemberFeedResult` のみ渡す（生 Supabase 行は渡さない） |
| 大量 teamName での RSS フェッチ濫用（DoS） | Denial of Service | admin限定なので攻撃面小。`fetchAllFeedsCached` は5秒タイムアウト+リトライ1回（既存）。`revalidate=300` でキャッシュ |

## Sources

### Primary (HIGH confidence)
- 実コード（このセッションで Read 済み）: `src/app/page.tsx`, `src/proxy.ts`, `src/lib/members.ts`, `src/lib/fetchFeed.ts`, `src/lib/types.ts`, `src/components/WeeklyHeatmapGrid.tsx`, `src/app/admin/teams/page.tsx`, `src/app/admin/teams/actions.ts`, `src/app/my/__tests__/page.test.tsx`, `package.json`, `next.config.ts`
- https://nextjs.org/docs/app/api-reference/file-conventions/dynamic-routes — params は Promise / await 必須
- https://nextjs.org/docs/app/api-reference/file-conventions/proxy — Next 16 proxy（旧middleware）規約

### Secondary (MEDIUM confidence)
- https://nextjs.org/docs/messages/middleware-to-proxy — middleware→proxy リネーム（VIEW-02 解釈の裏付け）
- https://nextjs.org/docs/app/guides/upgrading/version-16 — Next 16 移行（params async, proxy）

### Tertiary (LOW confidence)
- なし（全主張をコード or 公式docsで裏付け済み）

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — 新規依存ゼロ、全シグネチャをコードで確認
- Architecture: HIGH — トップページ流用パターンを実コードで確認、Next16規約を公式docsで確認
- Pitfalls: HIGH — params Promise / decode / hidden除外フィルタ流用は全てコード根拠あり
- VIEW-02 (proxy): HIGH — proxy.ts 実コードで matcher と redirect を確認

**Research date:** 2026-05-30
**Valid until:** 2026-06-29（安定。Next.js メジャー更新がなければ有効）
