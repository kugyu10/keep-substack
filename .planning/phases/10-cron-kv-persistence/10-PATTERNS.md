# Phase 10: Cron + KV記事永続化 - Pattern Map

**Mapped:** 2026-05-11
**Files analyzed:** 5 (新設2 + 変更3)
**Analogs found:** 4 / 5

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/app/api/cron/route.ts` | route (API handler) | request-response | なし（既存APIルートなし） | no-analog |
| `src/lib/kvArticles.ts` | service (KV操作) | CRUD | `src/lib/kvMembers.ts` | exact |
| `src/lib/fetchFeed.ts` (変更) | service (data fetch) | request-response | `src/lib/fetchFeed.ts` 自身 | self-reference |
| `src/app/admin/actions.ts` (変更) | server action | request-response | `src/app/admin/actions.ts` 自身 | self-reference |
| `vercel.json` (新設) | config | — | なし | no-analog |

---

## Pattern Assignments

### `src/lib/kvArticles.ts` (service, CRUD)

**Analog:** `src/lib/kvMembers.ts`

**Importsパターン** (kvMembers.ts 1行目):
```typescript
import { redis } from './redis'
import type { FeedItem } from './types'
```

**KV読み込みパターン** (kvMembers.ts 6-13行):
```typescript
export async function getMembers(): Promise<Member[]> {
  const members = await redis.get<any[]>('members')
  if (!members) return []
  return members.map((m) => ({ ...m }))
}
```

`kvArticles.ts` に踏襲する形:
- キー = `articles:{substackId}`（D-01）
- `redis.get<FeedItem[]>('articles:' + substackId)` で取得
- キーが存在しない場合は `[]` を返す

**KV書き込みパターン** (kvMembers.ts 17-24行):
```typescript
export async function addMember(member: Omit<Member, 'addedAt'>): Promise<void> {
  const members = await getMembers()
  // ...重複チェックなど...
  await redis.set('members', [...members, newMember])
}
```

`kvArticles.ts` に踏襲する形（D-05 dedupe付き）:
```typescript
export async function saveArticles(substackId: string, newItems: FeedItem[]): Promise<void> {
  const existing = await getArticles(substackId)
  const existingLinks = new Set(existing.map((a) => a.link))
  const toAdd = newItems.filter((item) => !existingLinks.has(item.link))
  if (toAdd.length === 0) return
  await redis.set('articles:' + substackId, [...existing, ...toAdd])
}
```

**Redisシングルトン** (redis.ts 全体):
```typescript
import { Redis } from '@upstash/redis'
export const redis = Redis.fromEnv()
```
- `Redis.fromEnv()` でインスタンス化（環境変数 `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` を自動参照）
- `redis.get<T>(key)` で型付き取得、`redis.set(key, value)` で保存
- Upstashが自動シリアライズするため `JSON.stringify/parse` は不要

---

### `src/app/api/cron/route.ts` (route, request-response)

**Analog:** なし（プロジェクト内にAPIルートが存在しない）

**CONTEXT.md (specifics) の想定実装パターン** (10-CONTEXT.md 118-130行):
```typescript
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  const members = await getMembers()
  await Promise.allSettled(members.map(m => fetchAndSave(m.substackId)))
  return Response.json({ ok: true, count: members.length })
}
```

補足:
- Vercel Cron は `Authorization: Bearer <CRON_SECRET>` ヘッダーを付与して呼び出す（D-04）
- `Promise.allSettled` は fetchFeed.ts の `fetchAllFeedsCached` と同じパターン（fetchFeed.ts 64行）
- `Response.json(...)` は Next.js App Router のネイティブ Response API

---

### `src/lib/fetchFeed.ts` (変更: unstable_cache廃止)

**現在の呼び出しインターフェース** (page.tsx 18行):
```typescript
const results = await fetchAllFeedsCached(filteredMembers)
```

**変更後も維持すべきインターフェース:**
```typescript
export async function fetchAllFeedsCached(members: Member[]): Promise<MemberFeedResult[]>
```

- `page.tsx` および将来の呼び出し元は変更不要
- 関数名・シグネチャ・戻り値型 `MemberFeedResult[]` を維持する（D-02）

**現在の unstable_cache 使用箇所** (fetchFeed.ts 51-61行 — 廃止対象):
```typescript
// D-06: REVALIDATE_SECONDS 環境変数でrevalidateを管理（unstable_cacheを使用）
const REVALIDATE_SECONDS = parseInt(process.env.REVALIDATE_SECONDS ?? '300')

async function fetchMemberFeedCached(member: Member): Promise<FeedResult> {
  const cached = unstable_cache(
    () => fetchWithRetry(`https://${member.substackId}.substack.com/feed`),
    [`feed-${member.substackId}`],
    { revalidate: REVALIDATE_SECONDS, tags: ['feeds'] }
  )
  return cached()
}
```

**変更後の実装方針:**
- `fetchMemberFeedCached` を KVから読み込む関数に置き換え
- `import { unstable_cache } from 'next/cache'` と `REVALIDATE_SECONDS` 定数を削除
- `fetchWithRetry` は Cron (`route.ts`) 側から呼ぶため残す or `kvArticles.ts` に移動
- `fetchAllFeedsCached` の内部実装を `getArticles(member.substackId)` 呼び出しに変更

```typescript
// 変更後のイメージ（既存シグネチャを維持）
export async function fetchAllFeedsCached(members: Member[]): Promise<MemberFeedResult[]> {
  return Promise.all(members.map(async (member) => {
    const items = await getArticles(member.substackId)
    return { member, items }
  }))
}
```

---

### `src/app/admin/actions.ts` (変更: addMemberActionに初回取得追加)

**現在のaddMemberActionパターン** (actions.ts 6-25行):
```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { addMember, deleteMember, updateMember } from '@/lib/kvMembers'

export async function addMemberAction(
  prevState: string | null,
  formData: FormData
): Promise<string | null> {
  // ...バリデーション...
  try {
    await addMember({ name, substackId, teamName: teamName ?? '' })
    revalidatePath('/admin')
    return null
  } catch (e) {
    return e instanceof Error ? e.message : '追加に失敗しました'
  }
}
```

**変更後の挿入箇所（D-03）:**
- `addMember(...)` の成功後、`revalidatePath` の前に `saveArticles` の呼び出しを追加
- エラーハンドリングは既存の `try/catch` ブロック内で一括処理

```typescript
try {
  await addMember({ name, substackId, teamName: teamName ?? '' })
  // ここに追加: 初回フィード取得 & KV保存
  const { items } = await fetchWithRetry(`https://${substackId}.substack.com/feed`)
  await saveArticles(substackId, items)
  revalidatePath('/admin')
  return null
} catch (e) {
  return e instanceof Error ? e.message : '追加に失敗しました'
}
```

---

### `vercel.json` (新設, config)

**Analog:** なし（既存ファイルなし）

**CONTEXT.md の想定設定** (10-CONTEXT.md 133-143行):
```json
{
  "crons": [
    {
      "path": "/api/cron",
      "schedule": "0 20 * * *"
    }
  ]
}
```
- `0 20 * * *` = UTC 20:00 = JST 翌日5:00
- Vercel Cron は Free プランで1つまで無料

---

## Shared Patterns

### KV操作の基本パターン
**Source:** `src/lib/redis.ts` (全体), `src/lib/kvMembers.ts` (全体)
**Apply to:** `src/lib/kvArticles.ts`
```typescript
// redis.ts
import { Redis } from '@upstash/redis'
export const redis = Redis.fromEnv()

// KV操作の共通パターン
const value = await redis.get<T>(key)   // 取得（存在しない場合 null）
if (!value) return defaultValue
await redis.set(key, newValue)          // 保存（上書き）
```

### Server Actionのエラーハンドリング
**Source:** `src/app/admin/actions.ts` (18-24行)
**Apply to:** `src/app/admin/actions.ts` の変更箇所（既存パターンを維持）
```typescript
try {
  // ...処理...
  return null
} catch (e) {
  return e instanceof Error ? e.message : '追加に失敗しました'
}
```

### Promise.allSettled パターン
**Source:** `src/lib/fetchFeed.ts` (63-68行)
**Apply to:** `src/app/api/cron/route.ts`
```typescript
// 全メンバー処理：一部失敗しても他を止めない
const results = await Promise.allSettled(members.map(fetchMemberFeedCached))
return members.map((member, i) => {
  const value = results[i].status === 'fulfilled' ? results[i].value : { items: [] }
  return { member, ...value }
})
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/app/api/cron/route.ts` | route (API handler) | request-response | プロジェクト内にAPIルートが存在しない |
| `vercel.json` | config | — | 既存ファイルなし。CONTEXT.md specificsの設定例を使用 |

---

## 重要な依存関係メモ

**fetchWithRetry の扱い:**
- 現在 `fetchFeed.ts` のモジュール内プライベート関数
- Cron (`route.ts`) と `addMemberAction` 双方から使う必要がある
- `kvArticles.ts` か `fetchFeed.ts` からエクスポートするか、Cron側は `saveArticlesToKV(substackId)` を呼ぶ形で隠蔽する設計が望ましい

**呼び出し側への影響:**
- `src/app/page.tsx` — `fetchAllFeedsCached(filteredMembers)` の呼び出し: 変更不要
- `src/lib/types.ts` — `FeedItem`, `Member`, `MemberFeedResult` 型: 変更不要

---

## Metadata

**Analog search scope:** `src/lib/`, `src/app/`
**Files scanned:** 7
**Pattern extraction date:** 2026-05-11
