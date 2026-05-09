# Phase 4: KVデータ層移行 - Research

**Researched:** 2026-05-09
**Domain:** Upstash Redis (@upstash/redis) / Next.js App Router / TypeScript / データ移行
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### KVキー設計
- **D-01:** `members` という単一キーにMember配列をJSON格納する — `redis.set('members', members)` / `redis.get('members')`
- **D-02:** `@upstash/redis` の自動シリアライズ（set/get）を使用する — `redis.json.*` は使わない
- **D-03:** KVスキーマ: `{ name: string, substackId: string, teamId: string, addedAt: string }` — feedUrlはコードベースに存在しない

#### members.jsonの扱い
- **D-04:** 移行スクリプト成功後に `src/data/members.json` を手動削除する
- **D-05:** members.jsonのimportをコードから取り除く（page.tsxのimport文含む）

#### Phase 4の変更範囲
- **D-06:** データ取得層のみKVに切り替える — `fetchFeed.ts` の関数署名（`fetchAllFeedsCached`）は変更しない
- **D-07:** `src/lib/types.ts` の `Member` 型を新スキーマに更新する（`substackId`, `teamId`, `addedAt` 追加、`feedUrl` 削除）
- **D-08:** `feedUrl` は `https://{substackId}.substack.com/feed` で動的生成 — コードベースにfeedUrlのハードコードは残さない
- **D-09:** 移行スクリプトは `scripts/seed-kv.ts` として作成し、`npx tsx scripts/seed-kv.ts` で実行する（一度だけ実行する前提）
- **D-10:** KVからメンバーを取得する関数 `getMembers(): Promise<Member[]>` を `src/lib/kvMembers.ts` に新設し、page.tsxはそこから取得する

### Claude's Discretion

なし（全実装詳細がD-01〜D-10でロック済み）

### Deferred Ideas (OUT OF SCOPE)

- members.jsonの削除はスクリプト成功確認後に手動で行う（スクリプトによる自動削除はしない）
- KV個別CRUD（add/delete API）はPhase 6（管理画面）で実装
- team-idフィルタリングはPhase 6で実装
- extractSubstackId関数の削除・整理は将来フェーズで検討
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| KV-01 | Memberデータを Upstash Redis で管理できる（`{name, substackId, teamId, addedAt}`）— feedUrl は動的生成 | `@upstash/redis` の set/get + 型定義更新パターンで対応可能 |
| KV-02 | アプリ起動時、members.jsonの既存データをKVにシードできる移行スクリプトがある | `npx tsx scripts/seed-kv.ts` + dotenvパターンで対応可能 |
</phase_requirements>

---

## Summary

Phase 4の目的は、`src/data/members.json` をデータソースとして使っている現状から、Upstash Redis（`@upstash/redis`）をデータソースに切り替えることである。変更範囲はデータ取得層に限定され、`fetchAllFeedsCached` の関数署名は変更しない。

`@upstash/redis` は HTTP/REST ベースのクライアントであり、TCP接続が使えないサーバーレス・エッジ環境に最適化されている。Next.js App Routerのserver componentから `await redis.get<T>(key)` を直接呼び出せる。`Redis.fromEnv()` を使うことで環境変数 `UPSTASH_REDIS_REST_URL` と `UPSTASH_REDIS_REST_TOKEN` から自動的にクライアントが初期化される。

最大の注意点は **Vercel環境変数のBuildスコープ設定**である。Next.js 16のビルド時にKVアクセスが発生する可能性があるため、`UPSTASH_REDIS_REST_URL` と `UPSTASH_REDIS_REST_TOKEN` の両方をVercelダッシュボードで「Build, Function, Preview/Production」すべてのスコープに設定する必要がある。

**Primary recommendation:** `Redis.fromEnv()` でシングルトンを `src/lib/redis.ts` に置き、`getMembers()` で型安全に配列を取得する。移行スクリプトは `dotenv/config` を import して `.env.local` から認証情報を読み込む。

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| メンバーデータ永続化 | Database / Storage (Upstash KV) | — | members.jsonからの移行先。単一キー配列管理 |
| メンバーデータ取得 | API / Backend (src/lib/kvMembers.ts) | — | server componentから呼ばれる非同期関数。KVクライアントをラップ |
| フィードURL生成 | API / Backend (fetchFeed.ts 内) | — | substackIdから動的生成。UIには渡さない |
| ページレンダリング | Frontend Server (Next.js SSR) | — | page.tsxがgetMembers()を呼びfetchAllFeedsCachedに渡す |
| データシード | CLI / Script (scripts/seed-kv.ts) | — | 一度だけ実行する移行スクリプト。本番環境外で実行 |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @upstash/redis | 1.38.0 | HTTP/REST経由でUpstash Redisを操作するTypeScript SDK | サーバーレス環境向けの公式SDKで自動シリアライズ対応。`@vercel/kv` は2024年12月廃止済み |
| tsx | 4.21.0 | TypeScriptファイルをNode.jsで直接実行 | コンパイル不要でシードスクリプトを実行できる |
| dotenv | 17.4.2 | `.env.local` から環境変数を読み込む | シードスクリプトがVercelランタイム外で動くため必要 |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| typescript (既存) | ^5 | 型安全なKVアクセス | Member型の定義とget<T>の型パラメータ |

**Installation:**
```bash
npm install @upstash/redis
npm install --save-dev tsx dotenv
```

**Version verification:** `npm view @upstash/redis version` → `1.38.0` [VERIFIED: npm registry, 2026-05-09]

---

## Architecture Patterns

### System Architecture Diagram

```
[page.tsx (Server Component)]
    |
    | await getMembers()
    v
[src/lib/kvMembers.ts]
    |
    | redis.get<Member[]>('members')
    v
[src/lib/redis.ts] -- Redis.fromEnv() --> [Upstash Redis REST API]
    |
    | members: Member[]
    v
[page.tsx]
    |
    | fetchAllFeedsCached(members)
    v
[src/lib/fetchFeed.ts]
    |
    | member.substackId で feedUrl を動的生成
    | https://${member.substackId}.substack.com/feed
    v
[Substack RSS Feeds]

---

[scripts/seed-kv.ts] (one-shot CLI)
    |
    | import src/data/members.json
    | 旧スキーマ → 新スキーマ変換
    | feedUrlからsubstackIdを抽出
    v
[Upstash Redis REST API]
    | redis.set('members', newMembers)
    v
[Upstash KV]
```

### Recommended Project Structure
```
src/
├── lib/
│   ├── redis.ts          # Redis.fromEnv() シングルトン（新設）
│   ├── kvMembers.ts      # getMembers(): Promise<Member[]>（新設）
│   ├── types.ts          # Member型更新（feedUrl削除、substackId/teamId/addedAt追加）
│   └── fetchFeed.ts      # fetchAllFeedsCached（署名変更なし、内部でfeedUrl生成追加）
├── app/
│   └── page.tsx          # members.json import削除、getMembers()呼び出しに変更
scripts/
└── seed-kv.ts            # 一度だけ実行する移行スクリプト（新設）
```

### Pattern 1: Redis クライアントシングルトン

**What:** `Redis.fromEnv()` でモジュールスコープにシングルトンを作成する
**When to use:** あらゆるKVアクセス箇所から共通利用する

```typescript
// src/lib/redis.ts
// Source: https://github.com/upstash/docs/blob/main/redis/quickstarts/nextjs-app-router.mdx
import { Redis } from '@upstash/redis'

export const redis = Redis.fromEnv()
```

### Pattern 2: 型安全な get でMember配列を取得

**What:** `redis.get<T>(key)` でジェネリクス型を指定する。@upstash/redisは自動デシリアライズするため、JSON.parseは不要。戻り値は `T | null` なので null チェックが必要。

```typescript
// src/lib/kvMembers.ts
// Source: https://github.com/upstash/docs/blob/main/redis/quickstarts/nextjs-app-router.mdx (adapted)
import { redis } from './redis'
import type { Member } from './types'

export async function getMembers(): Promise<Member[]> {
  const members = await redis.get<Member[]>('members')
  return members ?? []
}
```

### Pattern 3: server component からの呼び出し

**What:** Next.js App Routerのserver componentで直接 `await` する
**When to use:** page.tsx などのasync server component

```typescript
// src/app/page.tsx（変更後）
// Source: https://github.com/upstash/docs/blob/main/redis/quickstarts/nextjs-app-router.mdx
import { getMembers } from '@/lib/kvMembers'
import { fetchAllFeedsCached } from '@/lib/fetchFeed'

export default async function Home() {
  const members = await getMembers()
  const results = await fetchAllFeedsCached(members)
  // ...
}
```

### Pattern 4: feedUrl 動的生成（fetchFeed.ts内）

**What:** `member.feedUrl` の代わりに `member.substackId` から生成する
**When to use:** `fetchWithRetry` の呼び出し箇所

```typescript
// src/lib/fetchFeed.ts（変更箇所のみ）
// D-08に基づく
members.map((member) =>
  fetchWithRetry(`https://${member.substackId}.substack.com/feed`)
)
```

### Pattern 5: 移行スクリプト（seed-kv.ts）

**What:** `.env.local` を読み込み、旧スキーマを新スキーマに変換してKVにsetする

```typescript
// scripts/seed-kv.ts
// Source: https://github.com/upstash/docs/blob/main/box/guides/code-review-agent.mdx (npx tsx pattern)
import 'dotenv/config'  // .env.local を自動読み込み
import { Redis } from '@upstash/redis'
import membersJson from '../src/data/members.json'

const redis = Redis.fromEnv()

// 旧スキーマ: { name, feedUrl }
// 新スキーマ: { name, substackId, teamId, addedAt }
function migrate(old: { name: string; feedUrl: string }) {
  const m = old.feedUrl.match(/^https?:\/\/([^.]+)\.substack\.com/)
  if (!m) throw new Error(`Invalid feedUrl: ${old.feedUrl}`)
  return {
    name: old.name,
    substackId: m[1],
    teamId: 'default',
    addedAt: new Date().toISOString(),
  }
}

async function main() {
  const members = membersJson.map(migrate)
  await redis.set('members', members)
  console.log(`Seeded ${members.length} members`)
}

main().catch(console.error)
```

**実行コマンド:**
```bash
npx tsx scripts/seed-kv.ts
```

### Pattern 6: `force-static` の削除と dynamic rendering

**What:** `page.tsx` の `export const dynamic = 'force-static'` を削除する
**Why:** KVへのアクセス（`await getMembers()`）はランタイムに行われるため、静的ビルドと相性が悪い。`unstable_cache`（`fetchAllFeedsCached`）がキャッシュを管理するため、`force-static` は不要。

```typescript
// 削除する行
export const dynamic = 'force-static'
// → 削除するだけでよい。デフォルトはNext.js 16の動的レンダリングになる。
// → fetchAllFeedsCached の unstable_cache が引き続きRSSキャッシュを管理する。
```

### Pattern 7: page.tsx の extractSubstackId 参照の置き換え

**What:** `extractSubstackId(member.feedUrl)` を `member.substackId` に置き換える
**Why:** KV移行後は Member 型に `substackId` フィールドが直接ある

```typescript
// 変更前（page.tsx）
const substackId = extractSubstackId(member.feedUrl)
if (!substackId) return null
// ...
<Link key={member.feedUrl} href={`/member/${substackId}`}>

// 変更後
<Link key={member.substackId} href={`/member/${member.substackId}`}>
```

`extractSubstackId` の import は削除してよい（Phase 4スコープでは関数自体は残す）。

### Anti-Patterns to Avoid

- **`new Redis({ url, token })` をコンポーネント内で直接書く:** 毎レンダーで新しいインスタンスが生成される。`src/lib/redis.ts` のシングルトンを使う。
- **`redis.json.get/set` を使う:** D-02でロック済み。自動シリアライズの `redis.get/set` を使う。
- **`JSON.parse(result)` する:** @upstash/redis は自動デシリアライズするため二重パースになる。
- **シードスクリプトで `dotenv` を使わず環境変数が未設定のまま実行する:** `Redis.fromEnv()` が `UPSTASH_REDIS_REST_URL` を参照するため、dotenv/configを先頭でimportすること。

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON シリアライズ/デシリアライズ | 手動の JSON.stringify/parse | @upstash/redis の自動シリアライズ | SDK内部で処理済み。二重エンコードのリスクがある |
| HTTP/REST クライアント | fetch + 独自認証ヘッダー | Redis.fromEnv() | 認証・エラーハンドリング・リトライが組み込まれている |
| substackId 抽出（シード時） | 正規表現を別途書く | 既存の `extractSubstackId` 関数を流用 | `src/lib/calendarUtils.ts` に実装済み（ただしシード時のみ使用） |

---

## Common Pitfalls

### Pitfall 1: Vercel環境変数のBuildスコープ未設定

**What goes wrong:** Vercelでのビルドが失敗する、または本番でKVアクセスエラーになる
**Why it happens:** VercelダッシュボードのEnvironment Variablesには「Preview/Production」「Build」「Function」の各スコープがあり、デフォルト設定ではBuildスコープが含まれないことがある
**How to avoid:** `UPSTASH_REDIS_REST_URL` と `UPSTASH_REDIS_REST_TOKEN` を設定する際、「Build, Function, Preview, Production」すべてのチェックを入れる
**Warning signs:** `Error: UPSTASH_REDIS_REST_URL not set` がVercel Buildログに出る

### Pitfall 2: `dotenv` の設定ファイル名不一致

**What goes wrong:** `npx tsx scripts/seed-kv.ts` を実行しても環境変数が読み込まれない
**Why it happens:** `dotenv/config` はデフォルトで `.env` を読む。Next.jsプロジェクトは `.env.local` を使うが、dotenvは `.env.local` を自動認識しない
**How to avoid:** `dotenv/config` のデフォルトパスに合わせるか、明示的に `dotenv.config({ path: '.env.local' })` を指定する
**Warning signs:** `UPSTASH_REDIS_REST_URL is undefined`

```typescript
// 明示的に .env.local を読む場合
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
```

### Pitfall 3: `redis.get<Member[]>('members')` が null を返す

**What goes wrong:** KV未シード状態で `getMembers()` が `null` を返し、`fetchAllFeedsCached(null)` で型エラー
**Why it happens:** KVにkeyが存在しないとき `redis.get` は `null` を返す
**How to avoid:** `getMembers()` 内で `return members ?? []` でフォールバックする（Pattern 2を参照）
**Warning signs:** TypeScriptの `Argument of type 'null' is not assignable` エラー

### Pitfall 4: `force-static` が残ったままKVアクセスする

**What goes wrong:** ビルドエラーまたは `DYNAMIC_SERVER_USAGE` エラーが発生する
**Why it happens:** `force-static` は実行時のI/Oをブロックする。KV呼び出しはランタイムI/Oである
**How to avoid:** `page.tsx` から `export const dynamic = 'force-static'` を削除する
**Warning signs:** ビルド時に `DynamicServerError: Route ... couldn't be rendered statically` が出る

### Pitfall 5: `unstable_cache` へ Member型が不一致で渡される

**What goes wrong:** `fetchAllFeedsCached(members)` がTypeScriptエラー（旧Memberに `feedUrl` がある型定義のまま呼ぶ）
**Why it happens:** `types.ts` の `Member` 型を更新した後、`fetchFeed.ts` 内の `member.feedUrl` 参照を更新し忘れる
**How to avoid:** `types.ts` を先に更新し、TypeScriptコンパイルエラーで全参照箇所を洗い出す
**Warning signs:** `Property 'feedUrl' does not exist on type 'Member'`

### Pitfall 6: `addedAt` の型（ISO 8601文字列）

**What goes wrong:** Date型ではなくstring型にする必要がある（KVでの自動デシリアライズ後にDateインスタンスにならない）
**Why it happens:** JSONシリアライズではDateがstring化される。KVから読み込むとstring型になる
**How to avoid:** D-03の通り `addedAt: string`（ISO 8601形式）で統一する。Date変換が必要な場合はアプリ側で `new Date(member.addedAt)` する

---

## Code Examples

### members.json → 新スキーマ変換

現在の `src/data/members.json`:
```json
[
  { "name": "キャリア孔明", "feedUrl": "https://careerkoumei.substack.com/feed" },
  { "name": "うおじゅん（オタクプロデューサー）", "feedUrl": "https://uojun.substack.com/feed" }
]
```

変換後の新スキーマ（KVに保存する値）:
```json
[
  {
    "name": "キャリア孔明",
    "substackId": "careerkoumei",
    "teamId": "default",
    "addedAt": "2026-05-09T00:00:00.000Z"
  },
  {
    "name": "うおじゅん（オタクプロデューサー）",
    "substackId": "uojun",
    "teamId": "default",
    "addedAt": "2026-05-09T00:00:00.000Z"
  }
]
```

`substackId` は正規表現 `/^https?:\/\/([^.]+)\.substack\.com/` で `feedUrl` から抽出（既存の `extractSubstackId` 関数と同一ロジック）。`teamId` は初期値 `"default"` を使用する。

### 更新後の Member 型（src/lib/types.ts）

```typescript
// D-07, D-03に基づく
export type Member = {
  name: string
  substackId: string
  teamId: string
  addedAt: string  // ISO 8601
}
```

`feedUrl` フィールドは削除する。`MemberFeedResult` は `Member` を参照しているため、自動的に新スキーマが伝播する。

### 環境変数設定（.env.local への追加）

```env
# 既存
REVALIDATE_SECONDS=300

# 追加（Upstash Redisダッシュボードから取得）
UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@vercel/kv` | `@upstash/redis` 直接使用 | 2024年12月廃止 | `@vercel/kv` は使えない。`@upstash/redis` を使う |
| `redis.json.*` | `redis.get/set` の自動シリアライズ | — | D-02でロック済み。JSONモジュールは不要 |

**Deprecated/outdated:**
- `@vercel/kv`: 2024年12月廃止。`@upstash/redis` に移行済み [CITED: STATE.md Accumulated Context]

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `teamId` の初期値を `"default"` とする | Code Examples | Phase 6の管理画面でteam-idフィルタが不整合になる可能性。ただしPhase 4の要件(KV-01, KV-02)には影響なし |
| A2 | dotenvのデフォルトパス `.env` ではなく `.env.local` を明示指定する必要がある | Pitfall 2 | dotenvバージョンによっては `.env.local` を自動認識する場合もある。テスト実行時に確認すること |

---

## Open Questions

1. **`teamId: "default"` の初期値**
   - What we know: D-03でKVスキーマに `teamId: string` がある。既存の `members.json` には teamId の情報がない
   - What's unclear: Phase 6のフィルタリングで使うteamIdの値として `"default"` が適切かどうか
   - Recommendation: Phase 4では `"default"` で統一してシードし、Phase 6の設計時に再検討する

2. **`unstable_cache` の Key Stability（`feedUrl` が引数から消えたことの影響）**
   - What we know: `fetchAllFeedsCached` は `['all-feeds']` をキャッシュキーとして使用している
   - What's unclear: Member型が変わった後も `unstable_cache` のキャッシュが既存のデータを返す可能性がある
   - Recommendation: Phase 4デプロイ後に `revalidateTag('feeds')` を一度実行するか、Vercelの Deployments からキャッシュをパージする

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | tsx スクリプト実行 | ✓ | (プロジェクト利用中) | — |
| tsx | seed-kv.ts 実行 | ✗ (未インストール) | 4.21.0 (npm) | `ts-node` も可だが tsx 推奨 |
| dotenv | seed-kv.ts の環境変数読み込み | ✗ (未インストール) | 17.4.2 (npm) | 環境変数を手動でexportする（非推奨） |
| @upstash/redis | KVアクセス全体 | ✗ (未インストール) | 1.38.0 (npm) | なし（必須） |
| Upstash Redis インスタンス | KVアクセス | 未確認 | — | Upstashダッシュボードで無料枠を作成 |

**Missing dependencies with no fallback:**
- `@upstash/redis` — インストール必須。`npm install @upstash/redis`
- Upstash Redis インスタンス — Upstash Console (https://console.upstash.com) でデータベースを作成し、REST URLとトークンを取得する必要がある

**Missing dependencies with fallback:**
- `tsx` — `npm install --save-dev tsx` でインストール。なければ `ts-node` を代替に使えるが、tsx が軽量で推奨
- `dotenv` — `npm install --save-dev dotenv` でインストール。なければ `export UPSTASH_REDIS_REST_URL=...` を手動実行する代替もある

---

## Sources

### Primary (HIGH confidence)
- `/upstash/docs` (Context7) — Redis.fromEnv(), set/get, 自動シリアライズ, Next.js App Router統合パターン
- [VERIFIED: npm registry] — @upstash/redis 1.38.0, tsx 4.21.0, dotenv 17.4.2

### Secondary (MEDIUM confidence)
- [CITED: STATE.md] — `@vercel/kv` が2024年12月廃止、Vercel環境変数BuildスコープのTodo
- [CITED: 04-CONTEXT.md] — D-01〜D-10の全ロック決定事項

### Tertiary (LOW confidence)
- なし

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — npm registryで最新バージョン確認済み、Context7でAPIパターン確認済み
- Architecture: HIGH — D-01〜D-10が全決定済み。実装パターンは公式ドキュメントから取得
- Pitfalls: HIGH (Vercel/dotenvのスコープ問題) / MEDIUM (unstable_cacheのキャッシュパージ)

**Research date:** 2026-05-09
**Valid until:** 2026-06-09（@upstash/redis は安定版。Next.js 16も安定版）
