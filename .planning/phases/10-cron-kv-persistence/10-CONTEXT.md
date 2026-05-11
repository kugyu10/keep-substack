# Phase 10: Cron + KV記事永続化 - Context

**Gathered:** 2026-05-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Vercel Cron（1日1回）でRSSフィードを全メンバー分取得し、記事データをUpstash KVに累積保存する。
既存のISR/unstable_cacheを廃止してKV保存データに完全移行する。

変更対象:
- 新設: `src/app/api/cron/route.ts` — Cron APIエンドポイント
- 新設: `src/lib/kvArticles.ts` — 記事KV操作関数
- 変更: `src/lib/fetchFeed.ts` — KV読み込みに置き換え（ISR廃止）
- 変更: `src/app/admin/actions.ts` — addMemberAction内で初回フィード取得を追加
- 変更: `vercel.json` — Cron設定追加

バックエンドのみの変更。UIコンポーネントに変更なし。

</domain>

<decisions>
## Implementation Decisions

### KVデータ構造（D-01）
- **D-01:** 記事キー = `articles:{substackId}` → `FeedItem[]` をJSONで保存
- 既存の `members` キーと同じパターン。`redis.get`/`redis.set` で読み書き
- KVデータ構造の例: `articles:uojun` → `[{title, link, isoDate, thumbnail}, ...]`

### ISRキャッシュとの共存（D-02）
- **D-02:** KVに完全移行、ISR（unstable_cache）は廃止する
- `fetchAllFeedsCached` → `getArticlesFromKV` に置き換え
- KVデータが存在する場合はそれを使用。KVが空のメンバーはKV経由で空配列を返す（フォールバックなし）
- Cron設置後は新規登録メンバーも初回取得でKVに入るため、空になるケースは排除される

### メンバー登録時の初回取得（D-03）
- **D-03:** `addMemberAction` 内で同期実行（awaait）
- 登録フォーム送信 → フィード取得 → KV保存 → revalidatePath の順で実行
- 多少レスポンスが遅くなるが確実性を優先
- 実装: `addMemberAction` の成功パスで `saveArticlesToKV(substackId)` を呼び出す

### Cronエンドポイントの認証（D-04）
- **D-04:** `CRON_SECRET` 環境変数でBearerトークン認証
- `Authorization: Bearer ${CRON_SECRET}` ヘッダーを検証
- Vercelの `vercel.json` crons設定と組み合わせ
- 環境変数 `CRON_SECRET` をVercelプロジェクトに設定が必要（セットアップ手順をSUMMARYに記載）

### 重複記事の排除（D-05）
- **D-05:** `article.link` URLでdedupe
- 既存KVデータに同じlinkが存在する場合はスキップ（上書きしない）
- 新しい記事のみKVに追記する

### KVサイズ上限対策（D-06）
- **D-06:** 今は何もしない（YAGNI）
- 現状メンバーは少数。将来問題が起きたら最大件数制限を追加する

### Claude's Discretion
- Cron APIルートの型付けはClaude判断
- `saveArticlesToKV`/`getArticlesFromKV` の関数名はClaude判断
- Cronの実行時間（例: 毎日午前5時 JST）はClaude判断

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 変更対象ファイル
- `src/lib/fetchFeed.ts` — フィード取得ロジック（CronとaddMember双方で使用）
- `src/lib/kvMembers.ts` — KV操作パターン（kvArticles.tsの参考）
- `src/app/admin/actions.ts` — addMemberAction（D-03で初回取得を追加）
- `src/lib/types.ts` — FeedItem型（KV保存するデータ構造）

### 要件定義
- `.planning/REQUIREMENTS.md` — PERSIST-01, PERSIST-02, PERSIST-03
- `.planning/ROADMAP.md` — Phase 10のSuccess Criteria

### 参照パターン
- `src/lib/redis.ts` — Redis.fromEnv()シングルトン（kvArticlesでも使用）
- Vercel Cron公式: `vercel.json` の `crons` 設定 + `Authorization` ヘッダー検証パターン

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `fetchWithRetry(url)` in `fetchFeed.ts` — RSS取得ロジック（CronとaddMemberで再利用）
- `redis` singleton in `redis.ts` — `redis.get`/`redis.set` パターン（kvArticlesに踏襲）
- `addMember()` in `kvMembers.ts` — KV操作パターンの参考

### Established Patterns
- KV操作: `redis.get<T>(key)` / `redis.set(key, value)` のシンプルなJSON保存
- Server Actions: `'use server'` + `revalidatePath` パターン
- 環境変数: `process.env.XXX` で参照

### Integration Points
- `addMemberAction` に `saveArticlesToKV(substackId)` の呼び出しを追加
- `fetchAllFeedsCached` → KVから読み込む関数に置き換え（呼び出し側のpage.tsx/member/page.tsxは変更なし）
- `vercel.json` に crons 設定を追加（ファイルが存在しなければ新規作成）

</code_context>

<specifics>
## Specific Ideas

### kvArticles.tsの想定インターフェース
```typescript
// 読み込み
export async function getArticles(substackId: string): Promise<FeedItem[]>

// 保存（追記・dedupe）
export async function saveArticles(substackId: string, newItems: FeedItem[]): Promise<void>
```

### Cron APIルート（src/app/api/cron/route.ts）
```typescript
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  // 全メンバーのフィードを取得してKVに保存
  const members = await getMembers()
  await Promise.allSettled(members.map(m => fetchAndSave(m.substackId)))
  return Response.json({ ok: true, count: members.length })
}
```

### vercel.json
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
（UTC 20:00 = JST 翌5:00）

</specifics>

<deferred>
## Deferred Ideas

- KVサイズ上限（最大件数制限）— 将来問題が起きたら対処
- Cron実行の監視・アラート — 将来的な運用改善
- 複数回Cron失敗時のリカバリー — スコープ外

</deferred>

---

*Phase: 10-cron-kv-persistence*
*Context gathered: 2026-05-11*
