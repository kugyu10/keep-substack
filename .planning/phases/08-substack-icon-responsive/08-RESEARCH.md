# Phase 8: Substackアイコン + レスポンシブ対応 - Research

**Researched:** 2026-05-11
**Domain:** Next.js (App Router) / rss-parser / TailwindCSS v4 / Responsive UI
**Confidence:** HIGH

---

## Summary

Phase 8は「Substackアイコン表示」と「スマホレスポンシブ」の2つの機能追加で構成される。既存コードの調査とSubstackフィードへの実際のリクエストにより、主要な技術的不確実性はすべて解消できた。

**rss-parserは`feed.image.url`を標準フィールドとして自動マッピングする**（`customFields`への追加宣言は不要）。実際のSubstack RSSフィードで検証済み。Substackアイコン画像のURLは`substackcdn.com`ドメインに存在する。

実装の核心は（1）`fetchFeed.ts`で`feed.image?.url`を取得して`MemberFeedResult`に追加、（2）`HeatmapRow`と`CalendarGrid`でアイコン表示コンポーネントを追加、（3）`HeatmapRow`にTailwindレスポンシブクラスを追加、の3ステップ。`next.config.ts`の変更は**不要**（通常`<img>`タグを使うため）。

**Primary recommendation:** `<img>`タグ（通常のHTML）でアイコンを実装し、`next/image`は使わない。既存の`HeatmapTooltip.tsx`と同じパターンで、`next.config.ts`変更を省略できる（KISS原則）。

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| RSSフィードのchannel.image取得 | API/Backend (Server) | — | `fetchFeed.ts`はサーバーサイドのみで動作する |
| アイコン画像の表示 | Frontend (Component) | — | `<img>`タグはブラウザがレンダリング |
| レスポンシブ表示切り替え | Browser/CSS | — | TailwindクラスでCSS側が処理 |
| フォールバック（エラー時） | Browser/CSS | Frontend (Component) | CSS非表示またはReact条件レンダリング |

---

## What Already Exists vs What Needs to Be Added

### 既存で使えるもの（変更不要）
- `rss-parser 3.13.0` — `feed.image.url`を自動取得済み。`customFields`追加不要 [VERIFIED: node_modules/rss-parser/lib/parser.js lines 192-197]
- `rss-parser`の型定義 — `Output.image?: { url: string; link?: string; title?: string }` として定義済み [VERIFIED: node_modules/rss-parser/index.d.ts lines 51-55]
- TailwindCSS v4 — `sm:` プレフィックスは標準機能として動作（設定不要） [VERIFIED: globals.css]
- `CalendarGrid.tsx` — `'use client'`指定済みなので`onError`ハンドラーを直接使用可能

### 追加・変更が必要なもの

| ファイル | 変更内容 |
|----------|----------|
| `src/lib/types.ts` | `MemberFeedResult`に`imageUrl?: string`を追加 |
| `src/lib/fetchFeed.ts` | `fetchWithRetry`の戻り値型を変更、`feed.image?.url`を返す |
| `src/components/WeeklyHeatmapGrid.tsx` | `imageUrl`を`HeatmapRow`に渡す |
| `src/components/HeatmapRow.tsx` | アイコン表示追加 + レスポンシブ対応 |
| `src/components/CalendarGrid.tsx` | ヘッダーにアイコン+名前を表示 |
| `src/app/member/[substackId]/page.tsx` | `imageUrl`を`CalendarGrid`に渡す |

`next.config.ts` — **変更不要**（`<img>`タグ使用のため）

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| rss-parser | 3.13.0 | RSSフィード解析 | 既存使用中。`feed.image.url`を自動取得 |
| TailwindCSS | 4.3.0 | レスポンシブCSSクラス | 既存使用中。`sm:hidden`等が設定なしで動作 |
| React (Next.js) | 19.2.4 / 16.2.6 | コンポーネントレンダリング | 既存使用中 |

### 追加不要なもの

| 理由で不採用 | 代替 |
|-------------|------|
| `next/image` | 通常`<img>`タグ。KISSに準拠、`next.config.ts`変更不要 |
| 外部アイコンライブラリ | フォールバックはTailwindのスタイル付き`<span>` |

---

## Architecture Patterns

### System Architecture Diagram

```
Substack RSS Feed
       ↓
fetchWithRetry()
  └─ parser.parseURL(url)
       ├─ feed.items → FeedItem[]
       └─ feed.image?.url → imageUrl?

MemberFeedResult { member, items, imageUrl? }
       ↓
fetchAllFeedsCached() → MemberFeedResult[]
       ↓
page.tsx (Server Component)
  └─ WeeklyHeatmapGrid (results)
       └─ HeatmapRow (member, imageUrl?, dates)
            ├─ <img src={imageUrl}> [スマホ: アイコンのみ]
            └─ <span class="hidden sm:block"> [PC: 名前も表示]

member/[substackId]/page.tsx (Server Component)
  └─ CalendarGrid (memberName, articleMap, imageUrl?)
       └─ <div flex items-center>
            ├─ <img src={imageUrl}>
            └─ <h2>{memberName}</h2>
```

### Recommended Project Structure

変更なし。既存構造を維持する。

```
src/
├── lib/
│   ├── types.ts         # MemberFeedResultにimageUrl?を追加
│   └── fetchFeed.ts     # feed.image?.urlを取得して返す
├── components/
│   ├── WeeklyHeatmapGrid.tsx  # imageUrlをHeatmapRowに渡す
│   ├── HeatmapRow.tsx         # アイコン表示+レスポンシブ追加
│   └── CalendarGrid.tsx       # ヘッダーにアイコン追加
└── app/
    └── member/[substackId]/
        └── page.tsx           # imageUrlをCalendarGridに渡す
```

### Pattern 1: fetchFeed.tsでimageUrlを返す

**What:** `fetchWithRetry`の戻り値を`FeedItem[]`から`{ items: FeedItem[], imageUrl?: string }`に変更する
**When to use:** フィード取得時に常に適用

```typescript
// Source: VERIFIED - node_modules/rss-parser/lib/parser.js lines 192-197
// Source: VERIFIED - node_modules/rss-parser/index.d.ts lines 51-55

type FeedResult = { items: FeedItem[]; imageUrl?: string }

async function fetchWithRetry(url: string): Promise<FeedResult> {
  try {
    const feed = await parser.parseURL(url)
    return {
      items: feed.items.slice(0, MAX_ARTICLES) as FeedItem[],
      imageUrl: feed.image?.url,
    }
  } catch {
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS))
    try {
      const feed = await parser.parseURL(url)
      return {
        items: feed.items.slice(0, MAX_ARTICLES) as FeedItem[],
        imageUrl: feed.image?.url,
      }
    } catch {
      return { items: [] }
    }
  }
}
```

`fetchAllFeedsCached`への波及:

```typescript
// fetchMemberFeedCachedの戻り値型もFeedResultに変更が必要
// fetchAllFeedsCachedでの集約:
export async function fetchAllFeedsCached(members: Member[]): Promise<MemberFeedResult[]> {
  const results = await Promise.allSettled(members.map(fetchMemberFeedCached))
  return members.map((member, i) => {
    const value = results[i].status === 'fulfilled' ? results[i].value : { items: [] }
    return { member, ...value }
  })
}
```

### Pattern 2: HeatmapRowのアイコン表示 + レスポンシブ

**What:** アイコン常時表示 + 名前をPC幅のみ表示
**When to use:** ICON-01、ICON-03の実装

```typescript
// Source: CITED - https://tailwindcss.com/docs/responsive-design (mobile-first, sm=640px)
// Source: VERIFIED - HeatmapTooltip.tsxの<img>パターンと統一

type HeatmapRowProps = {
  member: Member
  articlesByDateEntries: [string, HeatmapArticle[]][]
  dates: string[]
  imageUrl?: string  // 追加
}

// メンバー列（w-32 → w-8 sm:w-32 に変更してスマホ幅を縮小）
<Link
  href={`/member/${member.substackId}`}
  className="w-8 sm:w-32 shrink-0 pr-2 hover:underline flex items-center gap-1.5"
>
  {imageUrl ? (
    <img
      src={imageUrl}
      alt=""
      width={20}
      height={20}
      className="w-5 h-5 rounded-full shrink-0 object-cover"
    />
  ) : (
    <span className="w-5 h-5 rounded-full shrink-0 bg-gray-200 inline-block" aria-hidden="true" />
  )}
  <span className="hidden sm:block text-xs font-semibold leading-snug line-clamp-2">
    {member.name}
  </span>
</Link>
```

**重要:** `w-32`は現在のヘッダー行の`<div className="w-32 shrink-0" />`（`WeeklyHeatmapGrid.tsx` line 14）と一致している。スマホ幅を変更する場合はヘッダー行も`w-8 sm:w-32`に合わせる必要がある。

### Pattern 3: CalendarGridのヘッダーにアイコン追加

**What:** `<h2>`の前にアイコンを並べる
**When to use:** ICON-02の実装

```typescript
// CalendarGridはすでに'use client' → onErrorを直接使用可能
// Source: VERIFIED - CalendarGrid.tsx line 1

type Props = {
  memberName: string
  articleMap: [string, HeatmapArticle[]][]
  imageUrl?: string  // 追加
}

// h2の変更（line 44）
<div className="flex items-center gap-2 mb-2">
  {imageUrl ? (
    <img
      src={imageUrl}
      alt=""
      width={32}
      height={32}
      className="w-8 h-8 rounded-full object-cover shrink-0"
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).style.display = 'none'
      }}
    />
  ) : (
    <span className="w-8 h-8 rounded-full bg-gray-200 inline-block shrink-0" aria-hidden="true" />
  )}
  <h2 className="text-lg font-semibold">{memberName}</h2>
</div>
```

### Anti-Patterns to Avoid

- **`next/image`の使用:** `remotePatterns`設定が必要になり変更箇所が増える。既存コードは`<img>`統一のためKISSに反する
- **`onError`をServer Componentで使用:** `HeatmapRow.tsx`はServer Componentなので`onError`を直接書けない。使う場合は`'use client'`の追加またはClient Component分割が必要
- **`customFields.feed`への`image`追加:** rss-parserが既にデフォルトで`feed.image`を解析するため不要。重複設定

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| RSSフィードのimage解析 | XMLパース処理 | rss-parser（既存）| 既に`feed.image.url`を自動取得 |
| レスポンシブ表示切り替え | JS幅検知 | Tailwind`sm:`プレフィックス | CSSのみで完結、JSゼロ |
| 画像CDN最適化 | 独自リサイズ | Substack CDNのURL（そのまま） | Substackが既に最適化済みURL（w_256等）を返す |

**Key insight:** Substackのfeed imageはすでに256px最適化済みURLで返ってくるため、独自の画像変換は不要。

---

## Common Pitfalls

### Pitfall 1: HeatmapRow のメンバー列幅とヘッダー列幅の不一致

**What goes wrong:** `HeatmapRow`のメンバー列幅を`w-32`から変更したのに、`WeeklyHeatmapGrid`のヘッダー行の`<div className="w-32 shrink-0" />`を更新し忘れると列がズレる
**Why it happens:** 両コンポーネントで同じ幅を独立してハードコードしているため
**How to avoid:** `WeeklyHeatmapGrid.tsx` line 14の`w-32`も同様に`w-8 sm:w-32`へ変更する
**Warning signs:** ヒートマップのグリッドが日付ヘッダーとずれて見える

### Pitfall 2: fetchMemberFeedCached の戻り値型変更漏れ

**What goes wrong:** `fetchWithRetry`の戻り値を`FeedResult`に変えたのに、`fetchMemberFeedCached`のラッパーが古い型`FeedItem[]`のままになる
**Why it happens:** `unstable_cache`でラップしているため型推論が複雑
**How to avoid:** `fetchMemberFeedCached`の戻り値型を明示的に`Promise<FeedResult>`に指定する
**Warning signs:** TypeScriptコンパイルエラー `Property 'imageUrl' does not exist on type`

### Pitfall 3: HeatmapRow の onError（Server Componentへの書き込みエラー）

**What goes wrong:** `HeatmapRow.tsx`に`onError`ハンドラーを書こうとしてもNext.jsがエラーを出す（"Event handlers cannot be passed to Client Component props"）
**Why it happens:** `HeatmapRow`は`'use client'`を持たないServer Component
**How to avoid:** `HeatmapRow`に`onError`を使わない設計にする（imageUrlがある場合表示、エラー時は要素が壊れるだけで画面は崩れない）か、`'use client'`を追加する。CalendarGridは既にClient Componentなので問題なし
**Warning signs:** ビルド時にNext.jsのClient/Serverエラー

### Pitfall 4: Substackアイコンがないメンバーのフォールバック不備

**What goes wrong:** `imageUrl`が`undefined`の場合に何も表示しないと、アイコン列のサイズが0になり他のメンバー行と幅が揃わない
**Why it happens:** imgタグが条件付きレンダリングで消えると占有スペースがなくなる
**How to avoid:** `imageUrl`が`undefined`の場合でも同サイズの`<span>`でプレースホルダーを表示する

---

## Code Examples

### rss-parserのfeed.image.url取得（実際のSubstackフィードで確認済み）

```typescript
// Source: VERIFIED - 実際にnewsletter.pragmaticengineer.com/feedをfetchして確認
// feed.image = {
//   link: "https://newsletter.pragmaticengineer.com",
//   url: "https://substackcdn.com/image/fetch/...",
//   title: "The Pragmatic Engineer"
// }

const feed = await parser.parseURL(url)
const imageUrl = feed.image?.url  // undefined if no image
```

### Tailwindレスポンシブ: スマホ非表示・PC表示

```html
<!-- Source: CITED - https://tailwindcss.com/docs/responsive-design -->
<!-- mobile-first: unprefixedはモバイル適用、sm:以上でPCに適用 -->
<!-- sm = 640px以上 -->

<span class="hidden sm:block text-xs font-semibold">
  メンバー名
</span>
```

### 列幅のレスポンシブ（HeatmapRow + WeeklyHeatmapGrid 両方変更）

```typescript
// WeeklyHeatmapGrid.tsx line 14 も同じ幅に合わせること
<div className="w-8 sm:w-32 shrink-0" />  // ヘッダー行（WeeklyHeatmapGrid）

// HeatmapRow.tsx
<Link className="w-8 sm:w-32 shrink-0 ...">  // メンバー列（HeatmapRow）
```

### アイコン表示パターン（フォールバック付き）

```typescript
// Source: VERIFIED - HeatmapTooltip.tsxの<img>パターンを踏襲
{imageUrl ? (
  <img
    src={imageUrl}
    alt=""
    width={20}
    height={20}
    className="w-5 h-5 rounded-full shrink-0 object-cover"
  />
) : (
  <span className="w-5 h-5 rounded-full shrink-0 bg-gray-200 inline-block" aria-hidden="true" />
)}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `feed.items`のみ返す | `{ items, imageUrl? }`を返す | Phase 8 | `MemberFeedResult`に`imageUrl`が追加される |
| メンバー名テキストのみ | アイコン+名前（レスポンシブ） | Phase 8 | スマホではアイコンのみ、PCでは両方 |

**Deprecated/outdated:**
- `fetchWithRetry`の戻り値型`FeedItem[]`: Phase 8で`FeedResult`型に変更される

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | すべてのSubstackフィードが`channel.image`を持つ | Standard Stack | imageUrlが`undefined`になるがフォールバックで対応済みのため低リスク |
| A2 | Substackのアイコン画像は常に`substackcdn.com`ドメイン | Architecture Patterns | 別ドメインの場合`next/image`未使用なので問題なし。通常`<img>`使用のため影響なし |
| A3 | `w-8 sm:w-32`のブレークポイント（640px）がプロジェクトの「スマホ/PC」の境界として適切 | Architecture Patterns | ブレークポイントを変更する場合は数値の調整のみ。構造的変更は不要 |

---

## Open Questions

1. **HeatmapRowをClient Componentにするか否か**
   - What we know: `onError`はClient Componentでのみ使用可能。HeatmapRowは現在Server Component
   - What's unclear: フォールバックにonErrorが必要か（imageUrlがある場合のみ表示する条件レンダリングで十分かどうか）
   - Recommendation: **onErrorなしの条件レンダリングで実装する**（HeatmapRowはServer Componentのまま）。CalendarGridのみ`onError`を使う（すでにClient Component）

2. **列幅`w-32`→`w-8 sm:w-32`変更の見た目インパクト**
   - What we know: スマホ幅でアイコンのみ表示になる
   - What's unclear: `w-8`（32px）で列幅が十分かどうか。アイコンサイズ`w-5`（20px）+ パディングの余裕が必要
   - Recommendation: `w-8`で実装して動作確認。必要なら`w-9`や`w-10`に調整

---

## Environment Availability

Step 2.6: 外部依存なし（既存ライブラリとSubstack公開フィードのみ）。インフラ変更なし。

---

## Validation Architecture

`nyquist_validation: false`のため、このセクションをスキップする。

---

## Security Domain

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | yes | imageUrlは文字列として受け取るのみ。直接HTMLに埋め込む前に`undefined`チェック |
| V5 XSS | yes | `<img src={imageUrl}>`の`imageUrl`はServer側で取得したRSSデータ。ユーザー入力ではないが外部URLをsrcに渡す点に注意 |

**脅威パターン:** Substackフィードが悪意のある`image.url`を返す可能性は理論上あるが、`<img src>`として使用する限りXSSリスクはない（JSは実行されない）。`javascript:`プロトコルのURLも`<img src>`では実行されない。

---

## Sources

### Primary (HIGH confidence)
- `node_modules/rss-parser/index.d.ts` — `Output.image`型定義 [VERIFIED]
- `node_modules/rss-parser/lib/parser.js` lines 192-197 — `feed.image.url`の自動マッピング [VERIFIED]
- 実際のSubstack RSSフィード（`newsletter.pragmaticengineer.com/feed`） — `<image><url>`の存在確認 [VERIFIED]
- `src/components/HeatmapTooltip.tsx` — 既存の`<img>`タグパターン [VERIFIED]
- `/vercel/next.js` via Context7 — Image component onError, remotePatterns設定 [CITED]
- `/tailwindlabs/tailwindcss.com` via Context7 — `sm:hidden`/`sm:block`パターン [CITED]

### Secondary (MEDIUM confidence)
- 08-PATTERNS.md（Phase 8 Pattern Map） — 既存の実装パターン分析 [CITED]

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — 全ライブラリのバージョンと動作を実際のフィード取得で確認
- Architecture: HIGH — コードベース全体を直接読んで把握済み
- Pitfalls: HIGH — 型定義と実装コードの直接確認に基づく

**Research date:** 2026-05-11
**Valid until:** 2026-06-11（rss-parser/Next.jsのメジャーバージョン変更がない限り有効）
