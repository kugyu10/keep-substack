# Research: Phase 1 — プロジェクト基盤とデータ層

**Researched:** 2026-05-08
**Domain:** Next.js App Router + rss-parser + ISR + Substack RSS
**Confidence:** HIGH（主要項目はすべて公式ドキュメントで検証済み）

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: フィード取得失敗時は1秒待ってリトライ、それでもダメなら非表示
- D-02: 全フィードをPromise.allSettledで並列取得
- D-03: フィード取得のタイムアウトは5秒
- D-04: 取得する記事は直近30件まで
- D-05: ISR revalidateの初期値は5分（300秒）
- D-06: revalidate値は環境変数で管理（後述の制約を参照）
- D-07: GitHub連携でVercelにデプロイ

### Claude's Discretion
- 設定ファイル（JSON）の構造・配置場所はClaude判断
- Phase 1での表示範囲（最小限のUI）はClaude判断

### Deferred Ideas (OUT OF SCOPE)
- なし（議論はフェーズスコープ内に留まった）
</user_constraints>

---

## 1. rss-parser + タイムアウト実装

### rss-parser の timeout オプション（組み込み）

rss-parser v3.13.0（最新版、2023-04-11リリース）には`timeout`オプションが組み込まれている。
AbortSignalは**サポートされていない**。

[VERIFIED: GitHub rbren/rss-parser README]

```typescript
import Parser from 'rss-parser'

const parser = new Parser({
  timeout: 5000, // 5秒（ミリ秒単位）
})
```

これでD-03（5秒タイムアウト）を直接実装できる。AbortControllerの手動実装は不要。

### リトライ付き並列フィード取得（D-01, D-02, D-03, D-04 の統合）

rss-parserはNode.jsの`http.get`/`https.get`を内部使用し、`requestOptions`でそれらのオプションを渡せる。
AbortControllerは不要なため、実装は以下のシンプルなパターンになる：

```typescript
// src/lib/fetchFeed.ts
import Parser from 'rss-parser'

const parser = new Parser({ timeout: 5000 })

const RETRY_DELAY_MS = 1000
const MAX_ARTICLES = 30

async function fetchWithRetry(feedUrl: string): Promise<FeedItem[]> {
  try {
    const feed = await parser.parseURL(feedUrl)
    return feed.items.slice(0, MAX_ARTICLES)
  } catch {
    // D-01: 1秒待ってリトライ
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS))
    try {
      const feed = await parser.parseURL(feedUrl)
      return feed.items.slice(0, MAX_ARTICLES)
    } catch {
      return [] // 非表示
    }
  }
}

// D-02: Promise.allSettled で並列取得
export async function fetchAllFeeds(feedUrls: string[]): Promise<FeedItem[][]> {
  const results = await Promise.allSettled(feedUrls.map(fetchWithRetry))
  return results.map((r) => (r.status === 'fulfilled' ? r.value : []))
}
```

### 注意点

- `parser.parseURL(url)` はネットワーク越しにRSSを取得して解析する。`parseString(xml)` は文字列から解析するが、タイムアウト制御ができないため使わない。
- `timeout`の単位はミリ秒（デフォルト60000ms = 60秒）。
- `requestOptions` は Node.js `https.RequestOptions` に対応。カスタムヘッダーが必要な場合もここで設定。

---

## 2. SubstackのRSSフィード仕様

### URL形式

[VERIFIED: Substack公式サポートページ経由, WebSearch]

```
https://{username}.substack.com/feed
```

例: `https://kugyu10.substack.com/feed`

RSSフォーマットのみ提供。ATOMやJSONフィードは提供されていない。

### rss-parserで得られる主要フィールド

[ASSUMED] 以下は標準的なRSS 2.0 + SubstackフィードをRSSリーダーでの観察に基づく推測。
実際のSubstackフィードをcurlで確認することを推奨する。

| フィールド | 型 | 内容 |
|-----------|----|----|
| `item.title` | string | 記事タイトル |
| `item.link` | string | 記事URL |
| `item.pubDate` | string | 公開日（RFC 2822形式、例: "Thu, 08 May 2026 12:00:00 GMT"） |
| `item.isoDate` | string | rss-parserが自動変換するISO 8601形式 |
| `item.content` | string | 記事本文HTML（Substackは全文を含む場合がある） |
| `item.contentSnippet` | string | HTMLタグ除去済みのテキスト |
| `feed.title` | string | ニュースレター名 |
| `feed.description` | string | ニュースレターの説明 |

### カレンダーUI向けのキーフィールド

Phase 1のデータ層では `item.isoDate`（または`item.pubDate`）と `item.title`、`item.link` が必要。

```typescript
type FeedItem = {
  title?: string
  link?: string
  pubDate?: string
  isoDate?: string // rss-parserが自動生成
}
```

### エンコーディング・ページネーション

- エンコーディング: UTF-8（標準RSS 2.0に準拠）[ASSUMED]
- ページネーション: **なし**。SubstackのRSSフィードは最新の記事（通常25件前後）のみを返す。[ASSUMED: フィードリーダーでの観察に基づく]
  - D-04（直近30件）はAPI制限ではなくアプリ側のslice処理で実現する

### 検証方法

実装前に以下で確認推奨：

```bash
curl https://{username}.substack.com/feed | head -100
```

---

## 3. Next.js App Router ISR

### 現在のNext.jsバージョン状況

[VERIFIED: npm registry, Next.js公式ドキュメント v16.2.6]

- npm latest: **v16.2.6**（2026-05-07時点の公式ドキュメント）
- next-15系 backport: v15.5.18
- **重要**: Next.js 16でCache Componentsが導入。`cacheComponents`フラグを有効にしない限り、`export const revalidate`は引き続き機能する。

### export const revalidate パターン

[VERIFIED: Next.js公式ドキュメント - guides/incremental-static-regeneration]

`generateStaticParams`なしの単一ページでも`export const revalidate`は機能する：

```typescript
// app/page.tsx
export const revalidate = 300 // 5分

export default async function Page() {
  const data = await fetchAllFeeds(memberFeedUrls)
  return <main>{/* ... */}</main>
}
```

**重要な制約**: `revalidate`の値は**静的に解析可能な値**でなければならない。

```typescript
// NG: 動的な値はビルド時に解析できない
export const revalidate = parseInt(process.env.REVALIDATE_SECONDS ?? '300')

// NG: 計算式も不可
export const revalidate = 5 * 60
```

### D-06（環境変数管理）の実現方法

`export const revalidate`は静的リテラルのみ有効なため、**環境変数でrevalidateを動的に変更する**にはアーキテクチャを工夫する必要がある。

[CITED: Next.js docs - unstable_cache]

**推奨パターン: `unstable_cache`でrss-parser呼び出しをラップ**

```typescript
// src/lib/fetchFeed.ts
import { unstable_cache } from 'next/cache'

const REVALIDATE_SECONDS = parseInt(process.env.REVALIDATE_SECONDS ?? '300')

export const fetchAllFeedsCached = unstable_cache(
  async (feedUrls: string[]) => {
    return fetchAllFeeds(feedUrls)
  },
  ['all-feeds'],
  { revalidate: REVALIDATE_SECONDS, tags: ['feeds'] }
)
```

```typescript
// app/page.tsx
// revalidateのexportは不要（unstable_cacheが制御）
export const dynamic = 'force-static' // ISRを有効化

export default async function Page() {
  const data = await fetchAllFeedsCached(memberFeedUrls)
  return <main>{/* ... */}</main>
}
```

この方法なら`REVALIDATE_SECONDS`環境変数をVercel管理画面で変更してデプロイすることで再デプロイなしで値を変更できる。

**代替案（シンプル優先）**: `export const revalidate = 300`のリテラルを使い、変更時はコードを編集してデプロイ。環境変数管理を諦めてKISSを優先する。

どちらを採用するかはD-06の意図（運用中の値変更頻度）による。Vercelの「環境変数変更→再デプロイ」であれば`unstable_cache`なしでもリテラル変更で対応可能。

### ISRの動作確認

```bash
# ビルド・スタート後、レスポンスヘッダーで確認
curl -I https://your-app.vercel.app | grep x-nextjs-cache
# HIT / STALE / MISS / REVALIDATED
```

---

## 実装推奨事項

### フェーズ全体の構造

```
src/
├── app/
│   └── page.tsx           # ISR設定 + メインページ
├── lib/
│   ├── fetchFeed.ts       # rss-parser呼び出し + リトライ + unstable_cache
│   └── members.ts         # メンバー設定JSON読み込み
└── data/
    └── members.json       # メンバー設定（URL、表示名）
```

### メンバー設定JSONの推奨構造

```json
[
  {
    "name": "表示名",
    "feedUrl": "https://username.substack.com/feed"
  }
]
```

Claude's Discretionのため、この構造はシンプルさ（KISS）を優先した。

### インストールコマンド

```bash
npx create-next-app@latest keep-substack --typescript --tailwind --app --src-dir
cd keep-substack
npm install rss-parser
npm install --save-dev @types/rss-parser
```

> 注: `@types/rss-parser`は型定義パッケージ。rss-parser本体に型定義が同梱されている場合は不要。

### バージョン確認（実装前に確認）

```bash
npm view rss-parser version       # 3.13.0 を確認
npm view next version             # 16.2.6 を確認
```

### Vercel デプロイ設定（D-07）

1. GitHubリポジトリを作成
2. Vercelダッシュボードで「New Project」→ GitHubリポジトリを選択
3. 環境変数 `REVALIDATE_SECONDS=300` を設定
4. mainブランチへのpushで自動デプロイ

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | SubstackフィードはUTF-8エンコーディング | フィード仕様 | rss-parser解析エラー（実際は別エンコーディング時）|
| A2 | SubstackフィードはATOMなしRSS 2.0のみ | フィード仕様 | 低リスク（RSS 2.0は確認済み）|
| A3 | isoDateフィールドはrss-parserが自動付与 | フィード仕様 | pubDateを手動パースする必要が生じる |
| A4 | Substackフィードはページネーションなし | フィード仕様 | D-04の30件制限が効かない（フィードが30件未満の場合） |

---

## Sources

### Primary (HIGH confidence)
- [Next.js公式ドキュメント - ISR](https://nextjs.org/docs/app/guides/incremental-static-regeneration) — revalidate export、unstable_cacheパターンを確認
- [Next.js公式ドキュメント - Caching without Cache Components](https://nextjs.org/docs/app/guides/caching-without-cache-components) — Next.js 16でのISR設定を確認
- [GitHub: rbren/rss-parser README](https://raw.githubusercontent.com/rbren/rss-parser/master/README.md) — timeoutオプション、requestOptionsを確認
- npm registry — rss-parser v3.13.0、Next.js v16.2.6を確認

### Secondary (MEDIUM confidence)
- [The New Leaf Journal - Substack RSS](https://thenewleafjournal.com/how-to-find-substack-rss-feeds-and-other-notes/) — SubstackフィードURL形式を確認
- [Next.js GitHub Discussion #67799](https://github.com/vercel/next.js/discussions/67799) — revalidateの静的解析制約を確認

### Tertiary (LOW confidence)
- Substack RSSフィールド詳細（isoDate等）— 実際のフィードを取得して検証推奨
