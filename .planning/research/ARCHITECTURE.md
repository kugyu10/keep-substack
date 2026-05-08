# Architecture Patterns — v1.1 Dynamic Members + Weekly Heatmap

**Domain:** RSS feed activity visualization — ISR/static app with KV-backed dynamic member management
**Researched:** 2026-05-08
**Confidence:** HIGH (verified against Next.js 16.2.6 docs, Upstash official docs)

---

## Critical Context: Vercel KV is Deprecated

**Vercel KV was discontinued in December 2024.** Existing stores were auto-migrated to
Upstash Redis. For new projects, Upstash Redis via Vercel Marketplace is the replacement.

**Decision: Use Upstash Redis (`@upstash/redis`).**

- Install via Vercel Marketplace (Upstash for Redis integration)
- Environment variables auto-injected: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- HTTP-based client — no persistent TCP connections, works in serverless/Edge/build time
- Free tier: 256MB storage, 500K commands/month, up to 10 databases
- `Redis.fromEnv()` reads env vars automatically

---

## Critical Context: `middleware.ts` Renamed to `proxy.ts` in Next.js 16

Next.js 16.0.0 deprecated `middleware.ts` and renamed it to `proxy.ts`. The function
export also changes from `middleware()` to `proxy()`. The existing project uses Next.js
16.2.6, so use `src/proxy.ts` (not `middleware.ts`).

Migration codemod available: `npx @next/codemod@canary middleware-to-proxy .`

---

## v1.1 Architecture Overview

```
                         ┌─────────────────────────────────────────────────┐
                         │  Upstash Redis (KV store)                       │
                         │  members:{id} → Hash { name, feedUrl, addedAt, │
                         │                         teamId }                │
                         │  member-ids   → Set  { id1, id2, ... }         │
                         └──────────────┬──────────────────────────────────┘
                                        │ HTTP REST (@upstash/redis)
              ┌─────────────────────────┼─────────────────────────────┐
              │                         │                             │
   Build time │                  Runtime (ISR)              Runtime (dynamic)
              │                         │                             │
  generateStaticParams           page.tsx (/)                /admin/*
  /member/[substackId]           /member/[substackId]        API routes
  reads KV via HTTP              fetchAllFeedsCached          Server Actions
```

### v1.0 → v1.1 変更マップ

| 箇所 | v1.0 | v1.1 | 種別 |
|------|------|------|------|
| `src/data/members.json` | メンバー定義ファイル | 廃止 (Upstash KV に移行) | REMOVE |
| `src/lib/types.ts` | `Member { name, feedUrl }` | `Member { id, name, feedUrl, addedAt, teamId }` | MODIFY |
| `src/lib/fetchFeed.ts` | `members.json` を import | `getMembersFromKV()` を呼ぶ | MODIFY |
| `src/app/page.tsx` | MiniCalendar グリッド | WeeklyHeatmap コンポーネント | MODIFY |
| `src/app/member/[substackId]/page.tsx` | `generateStaticParams` が JSON 参照 | KV から取得 | MODIFY |
| `src/lib/kv.ts` | 存在しない | KV 読み書き関数を集約 | NEW |
| `src/app/admin/page.tsx` | 存在しない | Server Component + AdminForm | NEW |
| `src/app/admin/actions.ts` | 存在しない | Server Actions (add/remove member) | NEW |
| `src/app/api/members/route.ts` | 存在しない | GET /api/members | NEW |
| `src/components/WeeklyHeatmap.tsx` | 存在しない | 7日間ヒートマップ Server Component | NEW |
| `src/proxy.ts` | 存在しない | Basic Auth guard (/admin/*) | NEW |

---

## Integration Point 1: `generateStaticParams` + Upstash KV

**問: ビルド時に KV を呼べるか?**

YES — Upstash Redis は HTTP/REST ベースのクライアントのため、Node.js ビルド環境からも
呼び出せる。`generateStaticParams` は async 関数をサポートしており、KV から ID 一覧を
取得してパラメータ配列を返せる。

```typescript
// src/app/member/[substackId]/page.tsx
export const dynamicParams = false  // v1.0 から維持: 未知 ID は 404

export async function generateStaticParams() {
  const { getMemberIds } = await import('@/lib/kv')
  const ids = await getMemberIds()  // Upstash SMEMBERS → string[]
  return ids.map((substackId) => ({ substackId }))
}
```

**注意点:**
- ビルド時に `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` が
  Vercel ビルド環境の env に存在する必要がある (Vercel Marketplace 経由なら自動注入)
- ローカルビルド時は `.env.local` に手動設定が必要
- KV が空 (メンバー 0 人) の状態でビルドすると静的ページが 0 枚生成される
  → `dynamicParams = false` との組み合わせでは KV に最低 1 件必要

---

## Integration Point 2: トップページの動的/静的判定

**現状:** `export const dynamic = 'force-static'` + `unstable_cache`

**v1.1 での選択肢:**

| 方式 | トップページ動作 | メリット | デメリット |
|------|-----------------|---------|-----------|
| force-static 維持 + KV を unstable_cache 内で読む | ビルド時 KV 読み込み、ISR で更新 | パフォーマンス最良 | メンバー追加後、revalidate まで反映されない |
| dynamic = 'force-dynamic' に変更 | 毎リクエスト KV + RSS 取得 | 常に最新メンバーが表示 | 毎リクエスト RSS 取得は重く Vercel 無料枠に厳しい |
| ISR + `revalidateTag('members')` | ISR ベース、管理操作で即時更新 | バランス良い | revalidateTag を Server Action から呼ぶ設計が必要 |

**推奨: ISR + `revalidateTag('members')` 方式**

`unstable_cache` の tag に `'members'` を追加し、管理画面からメンバーを追加/削除した
Server Action 内で `revalidateTag('members')` を呼ぶ。これにより管理操作後に
キャッシュが即時 purge され、次のリクエストで新しいメンバーが反映される。

```typescript
// src/lib/fetchFeed.ts (変更箇所のみ)
export const fetchAllFeedsCached = unstable_cache(
  async () => {
    const members = await getMembersFromKV()  // ← JSON import をこれに置き換え
    return fetchAllFeeds(members)
  },
  ['all-feeds'],
  { revalidate: REVALIDATE_SECONDS, tags: ['feeds', 'members'] }  // ← 'members' タグ追加
)
```

```typescript
// src/app/admin/actions.ts
'use server'
import { revalidateTag } from 'next/cache'
import { addMemberToKV, removeMemberFromKV } from '@/lib/kv'

export async function addMember(formData: FormData) {
  await addMemberToKV({ name: formData.get('name'), feedUrl: formData.get('feedUrl'), ... })
  revalidateTag('members')
}

export async function removeMember(memberId: string) {
  await removeMemberFromKV(memberId)
  revalidateTag('members')
}
```

---

## Integration Point 3: KV データ構造

メンバー 1 件 = Hash, 全メンバー ID = Set とする。シンプルで検索/削除が O(1)。

```
members:{substackId}  →  Hash
  name:      "キャリア孔明"
  feedUrl:   "https://careerkoumei.substack.com/feed"
  addedAt:   "2026-05-08T00:00:00Z"
  teamId:    "default"

member-ids  →  Set
  { "careerkoumei", "uojun", ... }
```

```typescript
// src/lib/kv.ts
import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

export async function getMemberIds(): Promise<string[]> {
  return redis.smembers('member-ids')
}

export async function getMembersFromKV(): Promise<Member[]> {
  const ids = await getMemberIds()
  if (ids.length === 0) return []
  const hashes = await Promise.all(ids.map((id) => redis.hgetall(`members:${id}`)))
  return hashes.filter(Boolean) as Member[]
}

export async function addMemberToKV(member: Omit<Member, 'id'>): Promise<void> {
  const id = extractSubstackId(member.feedUrl)
  if (!id) throw new Error('Invalid feedUrl')
  await redis.hset(`members:${id}`, { ...member, addedAt: new Date().toISOString() })
  await redis.sadd('member-ids', id)
}

export async function removeMemberFromKV(substackId: string): Promise<void> {
  await redis.del(`members:${substackId}`)
  await redis.srem('member-ids', substackId)
}
```

---

## Integration Point 4: Proxy (旧 Middleware) — Basic Auth

Next.js 16 では `src/proxy.ts` を使う。Node.js runtime がデフォルト (v15.5 以降 stable)。
`atob` は Edge/Node 両方で使用可。

```typescript
// src/proxy.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith('/admin')) {
    return NextResponse.next()
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Basic ')) {
    const encoded = authHeader.slice(6)
    const [user, pass] = atob(encoded).split(':')
    if (
      user === process.env.ADMIN_USER &&
      pass === process.env.ADMIN_PASSWORD
    ) {
      return NextResponse.next()
    }
  }

  return new Response('Unauthorized', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Admin"' },
  })
}

export const config = {
  matcher: ['/admin/:path*'],
}
```

**注意点:**
- `ADMIN_USER` / `ADMIN_PASSWORD` を Vercel 環境変数に設定する (コードに直書き不可)
- Basic Auth はブラウザキャッシュされるため、ログアウトには専用エンドポイントか
  ブラウザ再起動が必要 (v1.1 スコープ外)
- Proxy は **静的エクスポート (next export) では動作しない** — ただしこのプロジェクトは
  Vercel にデプロイするため問題なし (`force-static` はページ単位の設定であり
  `next export` コマンドとは別物)

---

## Integration Point 5: API Routes vs Server Actions

**方針: 管理操作は Server Actions、読み取り専用は API Route**

| 操作 | 実装 | 理由 |
|------|------|------|
| メンバー追加 | Server Action (`/admin/actions.ts`) | フォーム送信に自然、revalidateTag 呼び出しが容易 |
| メンバー削除 | Server Action (`/admin/actions.ts`) | 同上 |
| メンバー一覧取得 | Server Action または直接 KV 読み込み | /admin ページは Server Component なので不要 |
| GET /api/members | Route Handler (`/api/members/route.ts`) | 将来的な外部連携の保険として残す (YAGNI 注意: 不要なら削除可) |

**v1.1 判断: GET /api/members は実装しない。** /admin ページが Server Component として
KV を直接読めるため不要。将来必要になった時点で追加 (YAGNI)。

---

## WeeklyHeatmap — ページ構造

```
src/app/page.tsx (ISR, dynamic='force-static')
  └── WeeklyHeatmap (Server Component)
        ├── props: MemberFeedResult[], last7days: string[]
        ├── テーブル構造: 行=メンバー, 列=日付
        ├── ソート: 7日間投稿量降順 → addedAt昇順
        ├── URL param: ?team=xxx → team でフィルタ (Server Component で searchParams 受け取り)
        └── HeatmapCell (Client Component — hover tooltip のみ)
```

**searchParams の取り扱い:**
- `?team=xxx` は `page.tsx` の `searchParams` prop で受け取る
- `force-static` との衝突: searchParams を使うと Next.js は動的レンダリングに切り替わる
- **解決策**: トップページを `force-static` から外し、`unstable_cache` の ISR に委ねる
  (`export const dynamic = 'force-static'` を削除、`revalidate` は unstable_cache が管理)

```typescript
// src/app/page.tsx (v1.1)
// export const dynamic = 'force-static' を削除
// unstable_cache が revalidate を制御するため、ページ自体は dynamic になる
// ただし fetchAllFeedsCached のキャッシュにより RSS は再取得されない

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ team?: string }>
}) {
  const { team } = await searchParams
  const results = await fetchAllFeedsCached()
  return <WeeklyHeatmap results={results} teamFilter={team} />
}
```

---

## ディレクトリ構造 (v1.1 後)

```
src/
  app/
    page.tsx                      MODIFY — WeeklyHeatmap 使用, force-static 削除
    layout.tsx                    (変更なし)
    member/
      [substackId]/
        page.tsx                  MODIFY — generateStaticParams が KV を呼ぶ
    admin/
      page.tsx                    NEW — Server Component + AdminForm
      actions.ts                  NEW — Server Actions (add/remove + revalidateTag)
  components/
    WeeklyHeatmap.tsx             NEW — 7日間ヒートマップ (Server Component)
    HeatmapCell.tsx               NEW — 1セル (Client Component, tooltip)
    MiniCalendar.tsx              (変更なし — /member/[substackId] で引き続き使用)
    CalendarGrid.tsx              (変更なし)
    ArticleTooltip.tsx            MODIFY or REUSE — リッチ Tooltip 対応
  lib/
    kv.ts                         NEW — Upstash Redis CRUD 関数
    fetchFeed.ts                  MODIFY — getMembersFromKV() 呼び出しに変更
    types.ts                      MODIFY — Member 型に id, addedAt, teamId 追加
    calendarUtils.ts              (変更なし)
  proxy.ts                        NEW — Basic Auth guard (/admin/*)
  data/
    members.json                  REMOVE (KV 移行後に削除)
```

---

## 推奨ビルド順序

依存関係を考慮した実装順序:

```
1. lib/types.ts 更新
   - Member 型に id, addedAt, teamId 追加
   - 他の変更の基盤

2. lib/kv.ts 作成
   - getMembersFromKV, addMemberToKV, removeMemberFromKV
   - テスト: Upstash dashboard から手動でデータ投入してデバッグ

3. data/members.json → KV 移行スクリプト (one-shot)
   - 既存メンバーを KV に投入
   - スクリプト実行後 members.json を削除

4. lib/fetchFeed.ts 修正
   - getMembersFromKV() 呼び出しに変更
   - revalidate tag に 'members' 追加

5. app/member/[substackId]/page.tsx 修正
   - generateStaticParams が KV を呼ぶように変更

6. app/page.tsx + WeeklyHeatmap コンポーネント
   - force-static 削除, searchParams 対応
   - WeeklyHeatmap, HeatmapCell 実装

7. app/admin/ + proxy.ts
   - admin/page.tsx, admin/actions.ts
   - src/proxy.ts (Basic Auth)
   - ADMIN_USER, ADMIN_PASSWORD 環境変数設定
```

---

## Vercel 無料枠の制約

| 項目 | 制約 | v1.1 への影響 |
|------|------|--------------|
| Upstash Redis free | 500K コマンド/月, 256MB | 50 メンバー程度なら余裕。ISR キャッシュで RSS 取得はバッファされる |
| Vercel Functions | 100GB-Hrs/月 | 問題なし |
| Vercel Builds | 無制限 | generateStaticParams が KV を呼ぶためビルド時に接続必要 |
| Edge Proxy | 無制限 | proxy.ts は軽量な Basic Auth のみ、問題なし |
| Bandwidth | 100GB/月 | 問題なし |

**KV コマンド数の見積もり:**
- ページビュー毎: `smembers` × 1 + `hgetall` × N (ISR キャッシュが効くため実際は少ない)
- 管理操作: `sadd/srem` + `hset/del` = 数コマンド
- ビルド毎: `smembers` × 1
- 月 500K コマンドは余裕で十分

---

## Anti-Patterns to Avoid (v1.1)

### Anti-Pattern 1: `force-static` と searchParams の共存
**What goes wrong:** `force-static` は searchParams を無視する。team フィルタが効かない。
**Prevention:** トップページから `export const dynamic = 'force-static'` を削除。
ISR は `unstable_cache` 側で管理する (既存設計を踏襲)。

### Anti-Pattern 2: middleware.ts を使う
**What goes wrong:** Next.js 16.2.6 では `middleware.ts` は deprecated。警告が出る。
**Prevention:** `src/proxy.ts` を使い、エクスポート関数名も `proxy` にする。

### Anti-Pattern 3: KV を Server Component の外で使う (Client Component)
**What goes wrong:** `@upstash/redis` はサーバーサイド専用。Client Component から呼ぶと
認証情報が漏れる。
**Prevention:** KV アクセスは必ず `lib/kv.ts` に集約し、Server Component / Server Action
からのみ呼び出す。

### Anti-Pattern 4: generateStaticParams で `dynamicParams = false` を外す
**What goes wrong:** KV に存在しない substackId へのアクセスが 404 にならず、
動的レンダリングが走る (セキュリティリスク + 無駄な処理)。
**Prevention:** `dynamicParams = false` を維持。KV に存在するメンバーのみ静的生成。

### Anti-Pattern 5: members.json を残したまま並行運用
**What goes wrong:** KV と JSON が二重管理になり、どちらが真のデータか不明になる。
**Prevention:** KV 移行スクリプト実行後、即座に members.json を削除する。

---

## Sources

- Vercel Redis docs (2026-01-13): https://vercel.com/docs/redis — Vercel KV 廃止確認
- Upstash Vercel Integration: https://upstash.com/docs/redis/howto/vercelintegration
- Upstash Pricing: https://upstash.com/docs/redis/overall/pricing — 500K cmd/month 無料
- Next.js 16.2.6 proxy.ts docs: https://nextjs.org/docs/app/api-reference/file-conventions/proxy
- Next.js generateStaticParams: https://github.com/vercel/next.js/blob/canary/docs/01-app/03-api-reference/04-functions/generate-static-params.mdx
- Next.js Server Actions mutation: https://github.com/vercel/next.js/blob/canary/docs/01-app/01-getting-started/07-mutating-data.mdx
- Basic Auth in Next.js: https://thomasderleth.de/implementing-basic-authentication-in-next-js-a-step-by-step-guide/
