# Phase 8: Substackアイコン + レスポンシブ対応 - Pattern Map

**Mapped:** 2026-05-11
**Files analyzed:** 7
**Analogs found:** 7 / 7

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/lib/types.ts` | model | transform | `src/lib/types.ts` (self) | exact — 型追加 |
| `src/lib/fetchFeed.ts` | service | request-response | `src/lib/fetchFeed.ts` (self) | exact — channel.image取得追加 |
| `src/components/HeatmapRow.tsx` | component | CRUD | `src/components/HeatmapRow.tsx` (self) | exact — アイコン列追加 |
| `src/components/CalendarGrid.tsx` | component | CRUD | `src/components/CalendarGrid.tsx` (self) | exact — ヘッダーにアイコン追加 |
| `next.config.ts` | config | — | `next.config.ts` (self) | exact — images.remotePatterns追加 |

---

## Pattern Assignments

### `src/lib/types.ts` (model, transform)

**Analog:** `src/lib/types.ts` 全体（1–23行）

**現在のMemberFeedResult型**（lines 20–23）:
```typescript
export type MemberFeedResult = {
  member: Member
  items: FeedItem[]
}
```

**追加すべきフィールド — imageUrl をMemberFeedResultに加える:**
```typescript
export type MemberFeedResult = {
  member: Member
  items: FeedItem[]
  imageUrl?: string   // channel.image.url（取得失敗時 undefined）
}
```

**理由:** rss-parser の `feed.image.url` はチャンネルレベルの情報。`FeedItem`（記事単位）ではなく `MemberFeedResult`（メンバー単位）に追加するのが型レイヤーとして自然。

---

### `src/lib/fetchFeed.ts` (service, request-response)

**Analog:** `src/lib/fetchFeed.ts` 全体

**現在のparser設定**（lines 6–11）:
```typescript
const parser = new Parser({
  timeout: 5000,
  customFields: {
    item: [['content:encoded', 'contentEncoded']]
  }
})
```

**channel.image.urlを取得するには `customFields.feed` に追加する必要はなく**、rss-parserは `feed.image.url` を標準フィールドとして自動マッピングする（`node_modules/rss-parser/lib/parser.js` lines 192–197 参照）。

**fetchWithRetryの現在の戻り値**（lines 17–31）:
```typescript
async function fetchWithRetry(url: string): Promise<FeedItem[]> {
  try {
    const feed = await parser.parseURL(url)
    return feed.items.slice(0, MAX_ARTICLES) as FeedItem[]
  } catch {
    // ...
    return []
  }
}
```

**変更パターン — imageUrl も返す形に変更:**
```typescript
type FeedResult = { items: FeedItem[]; imageUrl?: string }

async function fetchWithRetry(url: string): Promise<FeedResult> {
  try {
    const feed = await parser.parseURL(url)
    return {
      items: feed.items.slice(0, MAX_ARTICLES) as FeedItem[],
      imageUrl: feed.image?.url ?? undefined,
    }
  } catch {
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS))
    try {
      const feed = await parser.parseURL(url)
      return {
        items: feed.items.slice(0, MAX_ARTICLES) as FeedItem[],
        imageUrl: feed.image?.url ?? undefined,
      }
    } catch {
      return { items: [] }
    }
  }
}
```

**fetchAllFeedsCachedの現在のパターン**（lines 61–67）:
```typescript
export async function fetchAllFeedsCached(members: Member[]): Promise<MemberFeedResult[]> {
  const results = await Promise.allSettled(members.map(fetchMemberFeedCached))
  return members.map((member, i) => ({
    member,
    items: results[i].status === 'fulfilled' ? results[i].value : [],
  }))
}
```

**変更後のパターン（imageUrl を spread でマージ）:**
```typescript
export async function fetchAllFeedsCached(members: Member[]): Promise<MemberFeedResult[]> {
  const results = await Promise.allSettled(members.map(fetchMemberFeedCached))
  return members.map((member, i) => {
    const value = results[i].status === 'fulfilled' ? results[i].value : { items: [] }
    return { member, ...value }
  })
}
```

---

### `src/components/HeatmapRow.tsx` (component, CRUD)

**Analog:** `src/components/HeatmapRow.tsx` 全体（1–47行）

**現在のメンバー名リンク列**（lines 20–25）:
```typescript
<Link
  href={`/member/${member.substackId}`}
  className="w-32 shrink-0 text-xs font-semibold pr-2 hover:underline leading-snug line-clamp-2"
>
  {member.name}
</Link>
```

**追加すべきアイコン表示パターン — レスポンシブ切り替え:**

プロジェクトに既存のレスポンシブTailwindクラス使用実績はないが（`sm:`等のプレフィックスはコードベースで未使用）、TailwindのデフォルトBreakpoints（`sm: 640px`）をそのまま使える。

```typescript
// HeatmapRowのProps拡張
type HeatmapRowProps = {
  member: Member
  articlesByDateEntries: [string, HeatmapArticle[]][]
  dates: string[]
  imageUrl?: string   // 追加
}

// メンバー列の変更
<Link
  href={`/member/${member.substackId}`}
  className="w-32 shrink-0 pr-2 hover:underline flex items-center gap-1.5"
>
  {/* アイコン: 常に表示 */}
  {imageUrl ? (
    <img
      src={imageUrl}
      alt=""
      className="w-5 h-5 rounded-full shrink-0 object-cover"
    />
  ) : (
    <span className="w-5 h-5 rounded-full shrink-0 bg-gray-200 inline-block" />
  )}
  {/* 名前: スマホ非表示 / PCで表示 */}
  <span className="hidden sm:block text-xs font-semibold leading-snug line-clamp-2">
    {member.name}
  </span>
</Link>
```

**注意:** `w-32` の固定幅はスマホ時にアイコンだけになるため縮小を検討（`w-8 sm:w-32` など）。

---

### `src/components/CalendarGrid.tsx` (component, CRUD)

**Analog:** `src/components/CalendarGrid.tsx` 全体（1–105行）

**現在のメンバー名ヘッダー**（line 44）:
```typescript
<h2 className="text-lg font-semibold mb-2">{memberName}</h2>
```

**追加パターン — アイコン+名前のヘッダー:**
```typescript
type Props = {
  memberName: string
  articleMap: [string, HeatmapArticle[]][]
  imageUrl?: string   // 追加
}

// h2 の変更
<div className="flex items-center gap-2 mb-2">
  {imageUrl ? (
    <img
      src={imageUrl}
      alt=""
      className="w-8 h-8 rounded-full object-cover shrink-0"
    />
  ) : (
    <span className="w-8 h-8 rounded-full bg-gray-200 inline-block shrink-0" />
  )}
  <h2 className="text-lg font-semibold">{memberName}</h2>
</div>
```

---

### `next.config.ts` (config)

**Analog:** `next.config.ts`（現在は空設定）

**現在の設定**（lines 1–7）:
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
```

**追加パターン — Substack画像ドメインを許可:**

HeatmapTooltipでは `<img src={article.thumbnail}>` を使っており `next/image` は使っていない（lines 70–75）。Substackアイコンも同様に通常の `<img>` タグで実装するなら `next.config.ts` の変更は**不要**。

ただし `next/image` を使う場合は以下が必要:
```typescript
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.substack.com',
      },
      {
        protocol: 'https',
        hostname: 'substackcdn.com',
      },
    ],
  },
};
```

**推奨:** 既存の `<img>` パターンに揃えて通常imgタグを使い、`next.config.ts` は変更しない（KISS原則）。

---

## Shared Patterns

### 画像表示パターン（フォールバック付き）

**Source:** `src/components/HeatmapTooltip.tsx` lines 70–75
**Apply to:** HeatmapRow、CalendarGrid の両アイコン表示箇所

```typescript
// 既存のサムネイル表示（条件付きレンダリング＋フォールバックなし）
{article.thumbnail && (
  <img
    src={article.thumbnail}
    alt=""
    className="w-full rounded mb-1 object-cover max-h-24"
  />
)}
```

**Substackアイコン向け拡張パターン（フォールバックあり）:**
```typescript
// imageUrl が undefined または読み込みエラー時はグレー円でフォールバック
{imageUrl ? (
  <img
    src={imageUrl}
    alt=""
    className="w-5 h-5 rounded-full object-cover shrink-0"
    onError={(e) => {
      (e.target as HTMLImageElement).style.display = 'none'
    }}
  />
) : (
  <span className="w-5 h-5 rounded-full bg-gray-200 inline-block shrink-0" />
)}
```

### Propsの下流への受け渡しパターン

**Source:** `src/components/WeeklyHeatmapGrid.tsx` → `src/components/HeatmapRow.tsx`

`MemberFeedResult` を `WeeklyHeatmapGrid` が受け取り、各 `HeatmapRow` に props として渡すパターン（lines 27–34）:
```typescript
{results.map(({ member, items }) => (
  <HeatmapRow
    key={member.substackId}
    member={member}
    articlesByDateEntries={Array.from(buildHeatmapArticleMap(items).entries())}
    dates={dates}
  />
))}
```

**imageUrl 追加後の変更箇所:**
```typescript
{results.map(({ member, items, imageUrl }) => (
  <HeatmapRow
    key={member.substackId}
    member={member}
    articlesByDateEntries={Array.from(buildHeatmapArticleMap(items).entries())}
    dates={dates}
    imageUrl={imageUrl}
  />
))}
```

### MemberPage での imageUrl 受け渡しパターン

**Source:** `src/app/member/[substackId]/page.tsx` lines 16–37

現在 `memberResult.member.name` を CalendarGrid に渡している:
```typescript
<CalendarGrid
  memberName={memberResult.member.name}
  articleMap={articleMapEntries}
/>
```

**追加後:**
```typescript
<CalendarGrid
  memberName={memberResult.member.name}
  articleMap={articleMapEntries}
  imageUrl={memberResult.imageUrl}
/>
```

---

## rss-parser の channel.image 取得仕様

**Source:** `node_modules/rss-parser/lib/parser.js` lines 192–197

rss-parserは `channel.image[0].url` を自動的に `feed.image.url` にマッピングする。`customFields` での追加宣言は不要。

```javascript
// rss-parser内部の処理（参照のみ）
if (channel.image && channel.image[0] && channel.image[0].url) {
  feed.image = {};
  let image = channel.image[0];
  if (image.url) feed.image.url = image.url[0];
}
```

取得方法: `feed.image?.url`

---

## No Analog Found

なし。全ファイルに既存の近似アナログが存在する。

---

## Metadata

**Analog search scope:** `src/components/`, `src/lib/`, `src/app/`, `next.config.ts`, `node_modules/rss-parser/lib/`
**Files scanned:** 11
**Pattern extraction date:** 2026-05-11
