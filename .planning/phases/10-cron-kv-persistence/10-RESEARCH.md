# Phase 10: Cron + KV記事永続化 - Research

**Researched:** 2026-05-11
**Domain:** Vercel Cron / Upstash Redis KV / Next.js App Router API Routes
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 記事キー = `articles:{substackId}` → `FeedItem[]` をJSONで保存
- **D-02:** KVに完全移行、ISR（unstable_cache）は廃止。KVが空のメンバーは空配列を返す（フォールバックなし）
- **D-03:** `addMemberAction` 内で同期実行（await）。登録 → フィード取得 → KV保存 → revalidatePath の順
- **D-04:** `CRON_SECRET` 環境変数で Bearer トークン認証
- **D-05:** `article.link` URLでdedupe（既存KVに同じlinkがあればスキップ）
- **D-06:** KVサイズ上限対策は今は何もしない（YAGNI）

### Claude's Discretion
- Cron APIルートの型付けはClaude判断
- `saveArticlesToKV`/`getArticlesFromKV` の関数名はClaude判断
- Cronの実行時間（例: 毎日午前5時 JST = UTC 20:00）はClaude判断

### Deferred Ideas (OUT OF SCOPE)
- KVサイズ上限（最大件数制限）— 将来問題が起きたら対処
- Cron実行の監視・アラート — 将来的な運用改善
- 複数回Cron失敗時のリカバリー — スコープ外

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PERSIST-01 | Vercel Cron（1日1回）でRSSフィードを取得しKVに記事データを累積保存できる | Vercel Cron Hobbyプランは1日1回まで。`vercel.json` + APIルートで実装。Bearer認証パターン確認済み |
| PERSIST-02 | メンバー登録時に初回フィード取得を実行してKVに保存する | `addMemberAction`内でawait。fetchWithRetry（タイムアウト5秒+1回リトライ）を再利用可能 |
| PERSIST-03 | 累積済み記事データをカレンダービュー・ヒートマップで使用できる | `fetchAllFeedsCached` の呼び出し2箇所をKV読み込みに置き換え。呼び出し元page.tsx/member/[substackId]/page.tsxは変更不要 |

</phase_requirements>

---

## Summary

本フェーズはVercel Cronによる定期RSS取得とUpstash KVへの累積保存を実装する。既存の`unstable_cache`（ISRキャッシュ）を完全廃止し、KV永続化データに移行する。新規ファイルは`src/app/api/cron/route.ts`（Cronエンドポイント）と`src/lib/kvArticles.ts`（記事KV操作）の2つのみ。既存コードの変更は`fetchFeed.ts`（KV読み込みに差し替え）と`admin/actions.ts`（初回取得追加）の2ファイル。バックエンドのみの変更でUIコンポーネントは無変更。

Vercel Hobbyプランではcronは**1日1回**が上限で、それ以上の頻度はデプロイ失敗する。Upstash Redisの無料プランはリクエストサイズ最大10MB、月間50万コマンドが上限。現状のメンバー数では問題ない。

**Primary recommendation:** `fetchWithRetry` を `fetchFeed.ts` からエクスポートしてCronとaddMemberAction両方で再利用する。`fetchAllFeedsCached` はシグネチャを維持しつつ実装をKV読み込みに差し替え、呼び出し元の変更をゼロにする。

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| RSS定期取得 | API (Cron) | — | サーバーサイドの定期ジョブ |
| 記事KV保存 | API (Cron) | API (Server Action) | 書き込みはサーバーサイドのみ |
| 記事KV読み込み | Frontend Server (SSR) | — | page.tsxのgetStaticProps相当、SSR時にKVから取得 |
| 認証（CRON_SECRET） | API (Cron) | — | Vercelが自動付与するBearerヘッダーで検証 |
| メンバー登録時初回取得 | API (Server Action) | — | addMemberAction内で同期実行 |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@upstash/redis` | ^1.38.0 | KV操作（get/set） | 既にプロジェクトで使用中 [VERIFIED: package.json] |
| `next` | 16.2.6 | App Router APIルート | 既にプロジェクトで使用中 [VERIFIED: package.json] |
| `rss-parser` | ^3.13.0 | RSS取得 | 既にプロジェクトで使用中 [VERIFIED: package.json] |

新規パッケージの追加は**不要**。既存スタックのみで実装完結。

---

## Architecture Patterns

### System Architecture Diagram

```
[Vercel Cron (毎日UTC 20:00)]
    → GET /api/cron
        → Authorization: Bearer $CRON_SECRET 検証
        → getMembers() (KV 'members')
        → Promise.allSettled(members.map(m => fetchAndSave(m.substackId)))
            → fetchWithRetry(url)   ← fetchFeed.ts から再利用
            → saveArticles(substackId, newItems)  ← kvArticles.ts
                → getArticles(substackId) (KV 'articles:{id}')
                → dedupe by article.link
                → redis.set('articles:{id}', merged)
        → Response.json({ ok: true, count: N })

[addMemberAction (Server Action)]
    → addMember(...)  (KV 'members')
    → fetchWithRetry(url) + saveArticles(substackId, items)  ← 初回取得
    → revalidatePath('/admin')

[page.tsx / member/[substackId]/page.tsx]
    → fetchAllFeedsCached(members)   ← シグネチャ維持、内部実装のみ変更
        → 内部: getArticles(substackId) × members.length
        → MemberFeedResult[] を返す（型変更なし）
```

### Recommended Project Structure
```
src/
├── app/
│   ├── api/
│   │   └── cron/
│   │       └── route.ts     # 新設: Cron APIエンドポイント
│   ├── page.tsx             # 変更なし（fetchAllFeedsCached呼び出し維持）
│   └── member/[substackId]/
│       └── page.tsx         # 変更なし（fetchAllFeedsCached呼び出し維持）
└── lib/
    ├── kvArticles.ts         # 新設: 記事KV操作関数
    ├── fetchFeed.ts          # 変更: unstable_cache廃止、KV読み込みに差し替え
    └── kvMembers.ts          # 変更なし（参照パターンのみ）

vercel.json                   # 新設: crons設定
```

### Pattern 1: Vercel Cron APIルート（CRON_SECRET Bearer認証）

**What:** Next.js App RouterのRoute HandlerとしてGETハンドラを実装
**When to use:** サーバーサイドの定期実行タスク

```typescript
// Source: https://vercel.com/docs/cron-jobs/manage-cron-jobs [VERIFIED]
// src/app/api/cron/route.ts
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  // 全メンバーのフィードを取得してKVに保存
  const members = await getMembers()
  await Promise.allSettled(members.map(m => fetchAndSave(m.substackId)))
  return Response.json({ ok: true, count: members.length })
}
```

### Pattern 2: vercel.json crons設定

**What:** `vercel.json` にCronスケジュールを定義
**When to use:** Vercel Cronを使うすべてのプロジェクト

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

[VERIFIED: vercel.com/docs/cron-jobs/quickstart]

UTC 20:00 = JST翌5:00。Hobbyプランでは±59分の精度誤差がある。

### Pattern 3: kvArticles.ts の実装パターン

**What:** `kvMembers.ts` と同じ `redis.get`/`redis.set` パターンで記事を操作

```typescript
// Source: 既存 src/lib/kvMembers.ts を参照 [VERIFIED: codebase]
// src/lib/kvArticles.ts
import { redis } from './redis'
import type { FeedItem } from './types'

export async function getArticles(substackId: string): Promise<FeedItem[]> {
  const articles = await redis.get<FeedItem[]>(`articles:${substackId}`)
  return articles ?? []
}

export async function saveArticles(
  substackId: string,
  newItems: FeedItem[]
): Promise<void> {
  const existing = await getArticles(substackId)
  const existingLinks = new Set(existing.map((a) => a.link))
  const toAdd = newItems.filter((a) => a.link && !existingLinks.has(a.link))
  if (toAdd.length === 0) return
  await redis.set(`articles:${substackId}`, [...existing, ...toAdd])
}
```

### Pattern 4: fetchFeed.ts の変更（ISR廃止 → KV読み込み）

**What:** `fetchAllFeedsCached` のシグネチャを維持したまま内部実装をKV読み込みに差し替え

**変更前（既存）:**
```typescript
// src/lib/fetchFeed.ts の現状 [VERIFIED: codebase]
import { unstable_cache } from 'next/cache'
// ...
async function fetchMemberFeedCached(member: Member): Promise<FeedResult> {
  const cached = unstable_cache(
    () => fetchWithRetry(`https://${member.substackId}.substack.com/feed`),
    [`feed-${member.substackId}`],
    { revalidate: REVALIDATE_SECONDS, tags: ['feeds'] }
  )
  return cached()
}

export async function fetchAllFeedsCached(members: Member[]): Promise<MemberFeedResult[]> {
  const results = await Promise.allSettled(members.map(fetchMemberFeedCached))
  return members.map((member, i) => {
    const value = results[i].status === 'fulfilled' ? results[i].value : { items: [] }
    return { member, ...value }
  })
}
```

**変更後（KV移行後）:**
```typescript
// fetchAllFeedsCached のシグネチャは維持、内部のみ変更
// 削除: unstable_cache のimport
// 削除: REVALIDATE_SECONDS の定義
// 削除: fetchMemberFeedCached 関数
// 追加: getArticles import
import { getArticles } from './kvArticles'

// fetchWithRetry はCronとaddMemberAction向けに export 化が必要
export async function fetchWithRetry(url: string): Promise<FeedResult> { ... }

export async function fetchAllFeedsCached(members: Member[]): Promise<MemberFeedResult[]> {
  const results = await Promise.allSettled(
    members.map((m) => getArticles(m.substackId))
  )
  return members.map((member, i) => {
    const items = results[i].status === 'fulfilled' ? results[i].value : []
    return { member, items }
    // imageUrl は KV に保存しないため undefined になる（optional型のため型エラーなし）
  })
}
```

### Pattern 5: addMemberAction への初回取得追加

**変更前（既存）:**
```typescript
// src/app/admin/actions.ts の現状 [VERIFIED: codebase]
try {
  await addMember({ name, substackId, teamName: teamName ?? '' })
  revalidatePath('/admin')
  return null
} catch (e) {
  return e instanceof Error ? e.message : '追加に失敗しました'
}
```

**変更後（初回取得追加）:**
```typescript
import { fetchWithRetry } from '@/lib/fetchFeed'  // export 化が必要
import { saveArticles } from '@/lib/kvArticles'

try {
  await addMember({ name, substackId, teamName: teamName ?? '' })
  // 初回フィード取得（失敗しても登録自体は成功扱い）
  const { items } = await fetchWithRetry(
    `https://${substackId}.substack.com/feed`
  )
  await saveArticles(substackId, items)
  revalidatePath('/admin')
  return null
} catch (e) {
  return e instanceof Error ? e.message : '追加に失敗しました'
}
```

> **注意:** `fetchWithRetry` は現在 `fetchFeed.ts` 内の非export関数（行29）。`export` キーワードを追加する必要がある。

### Anti-Patterns to Avoid

- **unstable_cache を残さない:** ISR廃止後に `unstable_cache` のimportが残ると不要な依存になる
- **fetchWithRetry の二重実装:** CronとaddMemberActionで別々にRSS取得ロジックを書かない。`fetchWithRetry` を共有する
- **imageUrl の保存をKVに追加しない（YAGNI）:** 現スコープ外。CalendarGridはimageUrlがundefinedでも動作する（`imageUrl ? ...` で条件分岐済み [VERIFIED: codebase]）

---

## fetchAllFeedsCached の呼び出し箇所（完全リスト）

[VERIFIED: grep 実行済み]

| ファイル | 行番号 | 呼び出しパターン | 引数 | 戻り値の使い方 |
|---------|--------|-----------------|------|--------------|
| `src/lib/fetchFeed.ts` | 63 | 定義 | `members: Member[]` | `MemberFeedResult[]` |
| `src/app/page.tsx` | 18 | `await fetchAllFeedsCached(filteredMembers)` | フィルタ済みメンバー配列 | `sortByWeeklyCount(results, dates)` に渡す |
| `src/app/member/[substackId]/page.tsx` | 16 | `await fetchAllFeedsCached(members)` | 全メンバー配列 | `results.find(r => r.member.substackId === substackId)` で単一メンバーを抽出 |

**影響範囲:** `fetchAllFeedsCached` のシグネチャを維持すれば、`page.tsx` と `member/[substackId]/page.tsx` の変更は**不要**。

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cronスケジューリング | 独自タイマー/setInterval | Vercel Cron (`vercel.json`) | サーバーレスでは永続プロセスが使えない |
| RSS取得のリトライ | 独自リトライロジック | `fetchWithRetry`（既存） | 既にタイムアウト5秒+1回リトライ実装済み [VERIFIED: fetchFeed.ts L29-48] |
| KVシリアライズ | 手動JSON.stringify/parse | `@upstash/redis` の自動シリアライズ | 既存パターン踏襲（redis.ts コメントD-02参照） |
| dedupeアルゴリズム | 複雑な差分処理 | Setによるlinkチェック | シンプルで十分（KISS） |

---

## Common Pitfalls

### Pitfall 1: Hobbyプランでcronを1日複数回設定するとデプロイ失敗

**What goes wrong:** `*/30 * * * *`（30分ごと）などを設定するとデプロイエラーになる
**Why it happens:** Hobbyプランは1日1回が上限 [VERIFIED: vercel.com/docs/cron-jobs/usage-and-pricing]
**How to avoid:** `0 20 * * *`（UTC 20:00）など1日1回のexpression使用
**Warning signs:** デプロイ時に "Hobby accounts are limited to daily cron jobs" エラー

### Pitfall 2: CRON_SECRET が未設定の場合に認証バイパスされる

**What goes wrong:** `process.env.CRON_SECRET` が undefined のとき認証チェックが機能しない
**Why it happens:** `undefined !== 'Bearer undefined'` で意図せず通過してしまう実装になる可能性
**How to avoid:** `if (!cronSecret || authHeader !== ...)` で cronSecret の存在確認を先に行う [VERIFIED: Vercel公式パターン]
**Warning signs:** 401を返すはずのエンドポイントが誰でもアクセスできる

### Pitfall 3: member/[substackId]/page.tsx が全メンバーのKVを読む非効率

**What goes wrong:** 特定メンバーのページなのに全メンバー分のKV読み込みが発生
**Why it happens:** 現実装が `fetchAllFeedsCached(members)` で全取得してfindしている [VERIFIED: codebase L15-17]
**How to avoid:** 今フェーズではシグネチャ維持が優先（D-02）。将来の最適化に委ねる（YAGNI）
**Warning signs:** メンバー数増加に比例してメンバーページの読み込みが遅くなる

### Pitfall 4: Cronエラー時にリトライされない

**What goes wrong:** Cronが失敗してもVercelは再実行しない
**Why it happens:** Vercelの仕様 [VERIFIED: vercel.com/docs/cron-jobs/manage-cron-jobs]
**How to avoid:** `Promise.allSettled` で全メンバーを処理（1件の失敗で全体を止めない）
**Warning signs:** ダッシュボードのCron Jobsログでエラーを確認

### Pitfall 5: imageUrl が undefined になる

**What goes wrong:** `fetchAllFeedsCached` 変更後、`MemberFeedResult.imageUrl` が常に undefined になる
**Why it happens:** KVに `imageUrl` を保存しない設計のため
**How to avoid:** CalendarGrid が `imageUrl ? ...` で条件分岐済みのため型エラーなし [VERIFIED: CalendarGrid.tsx L46]。表示上は画像なしになるが機能的には許容範囲
**Warning signs:** CalendarGridでSubstackロゴ画像が表示されなくなる

---

## Vercel Cron 制限まとめ

| Plan | 1プロジェクトあたりCron数 | 最小間隔 | 精度 |
|------|------------------------|---------|------|
| Hobby | 100 | **1日1回** | ±59分 |
| Pro | 100 | 1分ごと | 1分以内 |

[VERIFIED: vercel.com/docs/cron-jobs/usage-and-pricing, 最終更新 2026-03-04]

**Hobbyプランの重要制約:**
- cron expressionが1日1回より多い頻度になるとデプロイ失敗
- 実行時刻は指定した時間帯の±59分以内（例: `0 20 * * *` は20:00〜20:59の間）

---

## Upstash Redis サイズ制限

[VERIFIED: upstash.com/docs/redis/overall/pricing]

| 制限項目 | 値 | 適用プラン |
|---------|-----|----------|
| 最大リクエストサイズ | 10MB | Free / Pay as You Go |
| 最大レコードサイズ | 100MB | Free / Pay as You Go |
| 月間コマンド数 | 50万 | Free |
| データ総量 | 256MB | Free |

**影響評価:** FeedItem1件あたり約200〜500バイト。メンバー1人あたり記事1000件でも約500KB。10MBのリクエスト上限には当分到達しない。月間50万コマンドはCron1回で全メンバー分×2コマンド（get+set）程度なので十分余裕あり。

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `@upstash/redis` | KV操作 | ✓ | ^1.38.0 | — |
| `UPSTASH_REDIS_REST_URL` | redis.ts | ✓ (本番) | — | ローカルは .env.local |
| `UPSTASH_REDIS_REST_TOKEN` | redis.ts | ✓ (本番) | — | ローカルは .env.local |
| `CRON_SECRET` | APIルート認証 | 要設定 | — | Vercelダッシュボードで設定 |
| `vercel.json` | Cron設定 | ✗ (未存在) | — | 新規作成が必要 |
| `src/app/api/` | APIルート | ✗ (未存在) | — | ディレクトリ作成が必要 |

**Missing dependencies with no fallback:**
- `CRON_SECRET`: Vercelプロジェクト設定 > Environment Variables に追加が必要

**Missing dependencies with fallback:**
- `vercel.json`: プロジェクトルートに新規作成（ブロッカーではない）
- `src/app/api/cron/`: ディレクトリ作成（ブロッカーではない）

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `fetchWithRetry` をexportすれば外部から再利用可能（現在non-export） | Pattern 4/5 | fetchFeed.ts L29に`export`追加のみ。低リスク |
| A3 | addMemberActionのフィード取得失敗時もメンバー登録自体は成功させる（try-catchの範囲設計） | Pattern 5 | CONTEXT.md D-03「多少レスポンスが遅くなるが確実性を優先」から推定。フィード取得失敗時の動作はClaude判断 [ASSUMED] |

**解決済み:**
- A2（CalendarGridのimageUrl=undefined）: `CalendarGrid.tsx L46` で `imageUrl ? ...` の条件分岐済みを確認 [VERIFIED: codebase]

---

## Open Questions

1. **addMemberActionでのフィード取得失敗時の動作方針**
   - What we know: D-03は「同期実行・確実性優先」と記載。`fetchWithRetry` は失敗時に空配列を返す設計
   - What's unclear: フィード取得に失敗した場合、メンバー登録をロールバックすべきか、それとも登録は成功させてKVは空のままにするか
   - Recommendation: `fetchWithRetry` 自体が失敗時に空配列を返す（例外を投げない）設計のため、`saveArticles` には空配列が渡り、KVは空のままになる。メンバー登録はroll-backしない。次のCronで補填される。

---

## Sources

### Primary (HIGH confidence)
- [vercel.com/docs/cron-jobs/manage-cron-jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs) — CRON_SECRET認証パターン、Cronエラーハンドリング、idempotency
- [vercel.com/docs/cron-jobs/usage-and-pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing) — Hobbyプランの制限（1日1回・±59分精度）
- [vercel.com/docs/cron-jobs/quickstart](https://vercel.com/docs/cron-jobs/quickstart) — vercel.json設定例、App RouterルートハンドラGET実装
- [upstash.com/docs/redis/overall/pricing](https://upstash.com/docs/redis/overall/pricing) — 最大リクエストサイズ10MB、月間50万コマンド
- プロジェクト既存コード [VERIFIED] — package.json, fetchFeed.ts, kvMembers.ts, redis.ts, types.ts, actions.ts, page.tsx, member/[substackId]/page.tsx, CalendarGrid.tsx

### Secondary (MEDIUM confidence)
- Context7 `/upstash/docs` — redis.get/setのシリアライズパターン確認

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — 全ライブラリが既存パッケージ。新規追加なし
- Architecture: HIGH — Vercel公式ドキュメントから直接引用したパターン + コードベース実証済み
- Pitfalls: HIGH — Vercel公式の制限事項ドキュメントから導出

**Research date:** 2026-05-11
**Valid until:** 2026-06-11（Vercel/Upstashの料金体系変更がなければ）
