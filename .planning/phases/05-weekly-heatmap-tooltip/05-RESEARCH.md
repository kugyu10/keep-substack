# Phase 5: WeeklyHeatmap + リッチTooltip - Research

**Researched:** 2026-05-09
**Domain:** Next.js App Router / React / Tailwind CSS 4 / rss-parser / ヒートマップUI
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** 投稿数で6段階の濃淡を使用する — 現`MiniCalendar`の`bg-green-100/200/300/500/700`パターンを踏襲。記事なし=`bg-gray-100`
- **D-02:** 直近7日 = 今日（当日）から遡って6日前まで（今日含む7日間）。未来の日付は表示しない
- **D-03:** 記事なしセル = `bg-gray-100`（現MiniCalendarと同じグレー）
- **D-04:** レイアウト: サムネイル上・タイトル下の縦積み
- **D-05:** タイトルは全文表示（REQUIREMENTS.md TIP-01の「20文字」は変更）。`max-w-xs`（約160px）内で`break-words`折り返し
- **D-06:** サムネイルなし時はサムネイル領域を省略し、タイトルのみ上に詰めて表示（プレースホルダーなし）
- **D-07:** デスクトップ=ホバーで表示、モバイル=タップでトグル（既存`ArticleTooltip`と同じ挙動パターン）
- **D-08:** Tooltip最大幅 `max-w-xs`（160px相当）
- **D-09:** ページ内縦スクロール（全員を1ページに表示。スティッキーヘッダーなし）
- **D-10:** メンバー名列（左端）= `w-32`（8rem）固定幅、長い名前は`truncate`で省略
- **D-11:** ヒートマップ専用の新コンポーネントを作成する（`WeeklyHeatmapGrid.tsx` + `HeatmapRow.tsx`）。既存`MiniCalendar`は改造しない
- **D-12:** 既存`MiniCalendar`は `/member/{substackId}` ページで引き続き使用。Phase 5では削除・変更しない
- **D-13:** 日付ヘッダー（上端行）あり。形式は `MM/DD`（例: `5/3`、`5/4`...）

### Claude's Discretion

- サムネイル画像のサイズ（CSS）はコンパクトに収まるよう実装時に決定
- `FeedItem`型への`contentEncoded`フィールド追加と`rss-parser`のカスタムフィールド設定はClaude判断で実装
- セルサイズ（正方形の具体的なpx/rem）はレイアウト全体のバランスでClaude判断

### Deferred Ideas (OUT OF SCOPE)

- スティッキーヘッダー（メンバー名列と日付列を固定）
- team-idフィルター（Phase 6 HEAT-04）
- 年間ヒートマップ（GitHub草型）
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HEAT-01 | トップページに直近7日間 × 全メンバーのヒートマップを表示できる | WeeklyHeatmapGrid + HeatmapRow コンポーネント群。getRecentDays()ユーティリティで7日配列生成 |
| HEAT-02 | ヒートマップ左端列にメンバー名を表示し、クリックで `/member/{substackId}` へ遷移できる | HeatmapRow内で `<Link href="/member/{substackId}">` + `w-32 truncate` |
| HEAT-03 | ヒートマップは 7日間投稿量降順・同数の場合は addedAt 昇順でソートされる | page.tsx Server Componentでsort処理。`buildArticleMap`活用 |
| TIP-01 | ヒートマップの記事ありセルにTooltipを表示できる（タイトル全文・サムネイル）| HeatmapTooltip.tsx（新規）。D-05によりタイトルは全文表示 |
| TIP-02 | Tooltipクリックで記事ページへ遷移できる | `target="_blank" rel="noopener noreferrer"` + UTM付与（ArticleTooltip.tsxパターン継承） |
| TIP-03 | サムネイルはRSS `content:encoded`から取得し、未取得時はサムネイル領域省略 | `rss-parser` customFields設定 + regex抽出。D-06: プレースホルダーなし |
| UX-01 | ビジュアル・レイアウトを50人規模対応にリファクタリングする | 縦スクロール設計。メンバー名 `w-32 truncate`。グリッドレイアウトで崩れない設計 |
</phase_requirements>

---

## Summary

Phase 5はトップページ（`src/app/page.tsx`）を、現在のメンバーカード一覧から週間ヒートマップビューへ全面刷新するフェーズである。変更の核心は3点：(1) 表示データの再構成（月カレンダーから直近7日間グリッドへ）、(2) `rss-parser`のカスタムフィールド設定による`content:encoded`取得とサムネイル抽出、(3) サムネイル付きTooltipコンポーネントの新設。

既存の実装基盤は十分に整っており、`calendarUtils.ts`の`parseIsoDate`・`buildArticleMap`は再利用可能。`ArticleTooltip.tsx`のhover/tapトグルパターンも継承する。`rss-parser`はすでに`^3.13.0`が導入済みで、`customFields`オプションによる`content:encoded`取得は公式機能として利用可能。Tailwind CSS 4系でスタイリングし、外部UIライブラリは一切使用しない。

Phase 4でのKV基盤確立により`getMembers()`と`fetchAllFeedsCached(members)`が整備済みであるため、page.tsxへの変更は「Grid表示→ヒートマップ表示へのUI置換」と「ソートロジック追加」が主体となる。

**Primary recommendation:** Server ComponentのPage.tsxでソート・データ整理を行い、WeeklyHeatmapGrid（新規）にpropsを渡す。セルのTooltipはClient Component（HeatmapTooltip.tsx）として分離する。

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| データ取得（メンバー・フィード） | API / Backend (Server Component) | — | getMembers() + fetchAllFeedsCached()はすでにServer側で動作 |
| ヒートマップソートロジック | API / Backend (Server Component) | — | 純粋なデータ変換。UI描画前に完了するのが適切 |
| 7日間グリッドレイアウト | Frontend Server (Server Component) | — | インタラクションなし。Server Componentで静的レンダリング可 |
| Tooltipインタラクション | Browser / Client | — | hover/tap状態管理はクライアント状態が必要（useState/useRef） |
| サムネイル抽出（regex） | API / Backend (Server Component) | — | content:encodedはServer側で取得・加工してからpropsで渡す |
| メンバー名リンク遷移 | Frontend Server (Server Component) | — | Next.js `<Link>`コンポーネント。インタラクション不要 |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.2.6 | App Router, Server Components | 既存プロジェクト確定済み [VERIFIED: package.json] |
| React | 19.2.4 | UIコンポーネント | 既存プロジェクト確定済み [VERIFIED: package.json] |
| Tailwind CSS | ^4 | スタイリング | UI-SPEC.mdで明示。外部UIライブラリなし [VERIFIED: package.json] |
| rss-parser | ^3.13.0 | RSSフィード取得・パース | 既存導入済み。customFieldsでcontent:encoded取得 [VERIFIED: package.json] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @upstash/redis | ^1.38.0 | KVからメンバーデータ取得 | getMembers()経由で間接使用（Phase 4確立済み） [VERIFIED: package.json] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| カスタムrss-parser設定 | 別途OGPフェッチ | OGPフェッチは帯域・遅延コスト大。REQUIREMENTS.md Out of Scopeに明記 |
| 純Tailwindセル | shadcn UIコンポーネント | UI-SPEC.mdがshadcn未使用を明示 |

**新規インストール不要:** Phase 5では追加パッケージのインストールは不要。

---

## Architecture Patterns

### System Architecture Diagram

```
[Upstash Redis KV]
       |
   getMembers()
       |
[page.tsx - Server Component]
       |
   fetchAllFeedsCached(members)
       |
  [RSS Feeds (Substack)]
       |
  results: MemberFeedResult[]  ← content:encoded も含む
       |
  sortByWeeklyCount(results)   ← 7日投稿量降順・addedAt昇順
       |
  getRecentDays()              ← 直近7日の"YYYY-MM-DD"配列
       |
  <WeeklyHeatmapGrid results dates />
       |
  ┌────────────────────────────┐
  │  日付ヘッダー行（Server）  │
  │  ┌──────────────────────┐  │
  │  │ HeatmapRow × N名    │  │
  │  │  ├ <Link> メンバー名 │  │
  │  │  └ HeatmapCell × 7  │  │
  │  │      └ [記事あり]    │  │
  │  │        HeatmapTooltip│  │ ← 'use client'
  │  │        (サムネイル+  │  │
  │  │         タイトル+    │  │
  │  │         記事リンク)  │  │
  │  └──────────────────────┘  │
  └────────────────────────────┘
```

### Recommended Project Structure

```
src/
├── app/
│   └── page.tsx                    # 刷新対象（Serverコンポーネント）
├── components/
│   ├── WeeklyHeatmapGrid.tsx       # 新規: グリッド全体ラッパー
│   ├── HeatmapRow.tsx              # 新規: 1メンバー行
│   ├── HeatmapTooltip.tsx          # 新規: サムネイル付きTooltip（'use client'）
│   ├── MiniCalendar.tsx            # 変更禁止
│   ├── ArticleTooltip.tsx          # 変更禁止（参照元）
│   └── CalendarGrid.tsx            # 変更禁止
└── lib/
    ├── types.ts                    # FeedItemにcontentEncoded?: string追加
    ├── fetchFeed.ts                # rss-parserにcustomFields追加
    ├── calendarUtils.ts            # 再利用（parseIsoDate, buildArticleMap）
    ├── heatmapUtils.ts             # 新規: getRecentDays, sortByWeeklyCount
    └── kvMembers.ts                # 変更なし
```

### Pattern 1: rss-parserカスタムフィールド設定

**What:** `content:encoded`フィールドを`rss-parser`で取得するには`customFields`オプションを指定する
**When to use:** サムネイル抽出のためRSS記事のHTMLコンテンツが必要なとき

```typescript
// Source: CONTEXT.md specifics section + rss-parser公式ドキュメント
// fetchFeed.tsのparserを以下に変更:
const parser = new Parser({
  timeout: 5000,
  customFields: {
    item: [['content:encoded', 'contentEncoded']]
  }
})
```

`FeedItem`型に追加:
```typescript
export type FeedItem = {
  title?: string
  link?: string
  pubDate?: string
  isoDate?: string
  contentEncoded?: string  // 追加: rss-parserのcustomFieldsで取得
}
```

### Pattern 2: サムネイル抽出regex

**What:** `content:encoded`のHTML文字列から最初の`<img src="...">`を抽出
**When to use:** HeatmapTooltipに渡すサムネイルURLを決定するとき

```typescript
// Source: CONTEXT.md specifics section
function extractThumbnail(contentEncoded?: string): string | undefined {
  if (!contentEncoded) return undefined
  const match = contentEncoded.match(/<img[^>]+src=["']([^"']+)["']/)
  return match ? match[1] : undefined
}
```

### Pattern 3: 直近7日配列の生成

**What:** 今日から遡って7日分の`"YYYY-MM-DD"`文字列配列を生成
**When to use:** page.tsxでWeeklyHeatmapGridに渡すdates配列生成

```typescript
// Source: calendarUtils.tsのparseIsoDateパターンを参考に
function getRecentDays(): string[] {
  const days: string[] = []
  const now = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    days.push(`${year}-${month}-${day}`)
  }
  return days  // [today-6, today-5, ..., today]
}
```

### Pattern 4: ヒートマップソートロジック

**What:** 7日間投稿量降順・同数はaddedAt昇順でresultsをソート
**When to use:** page.tsxでWeeklyHeatmapGridにpropsを渡す直前

```typescript
// Source: HEAT-03要件 + CONTEXT.md specifics section
function sortByWeeklyCount(
  results: MemberFeedResult[],
  dates: string[]
): MemberFeedResult[] {
  return [...results].sort((a, b) => {
    const aCount = countArticlesInDates(a.items, dates)
    const bCount = countArticlesInDates(b.items, dates)
    if (bCount !== aCount) return bCount - aCount  // 降順
    // 同数の場合はaddedAt昇順
    return a.member.addedAt.localeCompare(b.member.addedAt)
  })
}

function countArticlesInDates(items: FeedItem[], dates: string[]): number {
  const dateSet = new Set(dates)
  return items.filter(item => {
    if (!item.isoDate) return false
    const parsed = parseIsoDate(item.isoDate)
    if (!parsed) return false
    const key = `${parsed.year}-${String(parsed.month).padStart(2, '0')}-${String(parsed.day).padStart(2, '0')}`
    return dateSet.has(key)
  }).length
}
```

### Pattern 5: HeatmapTooltip（ArticleTooltip.tsxパターン継承）

**What:** hover/tapトグルTooltip。`useRef` + `useEffect`でclick outside検知
**When to use:** 記事ありセルの `HeatmapTooltip.tsx`

```typescript
// Source: src/components/ArticleTooltip.tsx（既存パターン継承）
'use client'
import { useState, useRef, useEffect } from 'react'

// デスクトップ: onMouseEnter/onMouseLeaveでopen制御
// モバイル: onClick でトグル
// click outside: useEffect + document.addEventListener('mousedown', ...)
```

UIの配置（UI-SPEC.mdより）:
```tsx
// セルをrelativeにして、Tooltipをabsolute bottom-full で上に出す
<div className="relative">
  {open && (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 pb-2 z-10">
      <div className="bg-white border border-gray-200 rounded shadow-lg p-2 max-w-xs">
        {thumbnail && (
          <img src={thumbnail} alt="" className="w-full rounded mb-1 object-cover max-h-24" />
        )}
        <a
          href={withUtm(link)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:underline break-words block"
        >
          {title ?? '(タイトルなし)'}
        </a>
      </div>
    </div>
  )}
  <button
    onMouseEnter={() => setOpen(true)}
    onMouseLeave={(e) => { /* cellRef外ならclose */ }}
    onClick={() => setOpen(prev => !prev)}
    aria-expanded={open}
    className={`w-full h-full aspect-square rounded-sm ${colorClass}`}
  />
</div>
```

### Pattern 6: セル配色マッピング

**What:** 投稿数から6段階のTailwindクラスを返す
**When to use:** HeatmapRowまたはHeatmapCell内のセル色決定

```typescript
// Source: MiniCalendar.tsx の既存パターン + UI-SPEC.md D-01
function getIntensityClass(count: number): string {
  if (count === 0) return 'bg-gray-100 text-gray-400'
  if (count === 1) return 'bg-green-100 text-green-700'
  if (count === 2) return 'bg-green-200 text-green-800'
  if (count === 3) return 'bg-green-300 text-green-900'
  if (count === 4) return 'bg-green-500 text-white'
  return 'bg-green-700 text-white'
}
```

### Anti-Patterns to Avoid

- **MiniCalendar.tsx を改造する:** D-12で禁止。`/member/`ページが依存している
- **ArticleTooltip.tsx を改造する:** 参照実装として読むだけ
- **OGPフェッチでサムネイル取得:** REQUIREMENTS.md Out of Scope。`content:encoded`のregexで代替
- **Server Componentにhook（useState等）を置く:** TooltipはClient Componentに分離必須
- **Mapをpropsでそのまま渡す:** MapはシリアライズできないためServer→Client間は配列かエントリ形式で渡す（CalendarGrid.tsxのコメントより確認済み）[VERIFIED: codebase]
- **サムネイルなし時のプレースホルダー表示:** D-06でプレースホルダーなしが確定済み

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| RSSパース + content:encoded取得 | 独自XMLパーサー | `rss-parser` の `customFields` | すでに導入済み。`customFields`対応あり |
| タイムゾーン安全な日付パース | `new Date(isoString)` | `calendarUtils.ts:parseIsoDate` | タイムゾーン依存バグを防ぐ既存実装 |
| 日付→記事マップ構築 | 独自ループ | `calendarUtils.ts:buildArticleMap` | 既存実装。再利用可能 |
| click outside 検知 | 独自実装 | `ArticleTooltip.tsx`パターン継承 | `useRef` + `useEffect`で実証済み |

**Key insight:** このフェーズはほぼ完全に既存のユーティリティとパターンを組み合わせる。新規に「アルゴリズム」を発明する必要はない。

---

## Common Pitfalls

### Pitfall 1: MapのServer→Client間シリアライズエラー

**What goes wrong:** `buildArticleMap()`の返り値（`Map`型）をpropsで直接Client Componentに渡すとRSCシリアライズエラーが発生する
**Why it happens:** React Server ComponentはMapをシリアライズできない
**How to avoid:** `Array.from(map.entries())`でエントリ配列に変換してからpropsで渡す（CalendarGrid.tsxの既存パターン確認済み）
**Warning signs:** "Only plain objects, and a few built-ins, can be passed to Client Components from Server Components"エラー

### Pitfall 2: rss-parserのcustomFields未設定でcontent:encodedがundefined

**What goes wrong:** `customFields`なしでパースすると`item.contentEncoded`が`undefined`になりサムネイルが常に表示されない
**Why it happens:** `content:encoded`はデフォルトでパースされない名前空間フィールド
**How to avoid:** `fetchFeed.ts`の`new Parser()`オプションに`customFields: { item: [['content:encoded', 'contentEncoded']] }`を追加する
**Warning signs:** 全セルでサムネイルなし、`item.contentEncoded`が常にundefined

### Pitfall 3: 日付配列の時刻起算点によるズレ

**What goes wrong:** `new Date()`のローカル時刻とISO日付文字列のUTC基準がずれて、日付判定が1日ずれる
**Why it happens:** `new Date()`はローカルタイムゾーンに依存し、サーバー側の実行環境がUTCの場合に日本時間とずれる
**How to avoid:** `getRecentDays()`内では`new Date()`から年月日を個別取得してゼロパディング。`parseIsoDate`は文字列前方マッチで処理するため安全。
**Warning signs:** 今日の日付がヘッダーに表示されない、または7日間の範囲がずれる

### Pitfall 4: Tooltipが画面端でクリップされる

**What goes wrong:** 左端メンバーや右端メンバーのセルでTooltipが画面外にはみ出す
**Why it happens:** `left-1/2 -translate-x-1/2`の中央揃えが端では画面外に出る
**How to avoid:** `max-w-xs`でTooltip幅を制限し、z-indexを適切に設定。必要に応じてセルの`overflow-visible`を確認する
**Warning signs:** Tooltipが見切れる、横スクロールが発生する

### Pitfall 5: 50人規模でのパフォーマンス問題

**What goes wrong:** 50名分のTooltipがすべてClient Componentとしてハイドレーションされ、初期表示が遅くなる
**Why it happens:** HeatmapTooltipを`'use client'`にすると50行×7列=350個のClient Componentが生成される
**How to avoid:** TooltipをHeatmapCell内に閉じ込め、HeatmapRowはServer Componentのままにする。`'use client'`境界はHeatmapTooltip（またはHeatmapCell全体）のみに限定する
**Warning signs:** 初期表示にtime-to-interactiveが長い

### Pitfall 6: rss-parserのMAX_ARTICLES制限でサムネイルが取得できない

**What goes wrong:** `MAX_ARTICLES = 30`で30件しか取得しないため、30件以上前の記事のサムネイルは取得できない
**Why it happens:** 直近30件の制限は既存の設定（fetchFeed.ts L9）
**How to avoid:** Phase 5の範囲は直近7日間のため、普通のメンバーであれば30件以内に収まる。制限変更は不要。
**Warning signs:** なし（スコープ内で問題なし）

---

## Runtime State Inventory

> このフェーズはリネーム/リファクタではなく、新コンポーネント追加 + UI刷新のため、ランタイム状態の移行作業は不要。

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | Upstash KV `members`キー — Phase 4で設定済み。変更なし | none |
| Live service config | Vercel環境変数（UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN）— 変更なし | none |
| OS-registered state | なし — 確認済み | none |
| Secrets/env vars | 既存ENV変数のみ使用。新規ENV変数なし | none |
| Build artifacts | なし — TypeScriptビルドはNext.jsが自動処理 | none |

---

## Environment Availability

> このフェーズは純粋なコード/設定変更。新規外部依存なし。

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| rss-parser | content:encoded取得 | ✓ | ^3.13.0 | — |
| Next.js | App Router | ✓ | 16.2.6 | — |
| Tailwind CSS | スタイリング | ✓ | ^4 | — |

**Missing dependencies with no fallback:** なし

---

## Code Examples

### 既存buildArticleMapの再利用（calendarUtils.ts）

```typescript
// Source: src/lib/calendarUtils.ts（既存実装）
// FeedItem[]を"YYYY-MM-DD"キーのMapに変換
const articleMap = buildArticleMap(items)
const articlesForDate = articleMap.get('2026-05-09') ?? []
```

**注意:** `buildArticleMap`の現在の戻り値型は`Map<string, { title?: string; link?: string }[]>`。
Phase 5では`contentEncoded`から抽出した`thumbnail`も必要なため、以下の選択肢がある：
- Option A: `buildArticleMap`をそのまま使い、サムネイルはHeatmapRowで別途抽出する
- Option B: Phase 5専用の`buildHeatmapArticleMap`を新設してthumbnailも含める

**推奨:** Option B（KISS原則に従い、calendarUtils.tsの既存関数を汚染しない）

### WeeklyHeatmapGridのprops設計

```typescript
// Server Component（WeeklyHeatmapGrid.tsx）
type HeatmapArticle = {
  title?: string
  link?: string
  thumbnail?: string
}

type HeatmapRowData = {
  member: Member
  articlesByDate: Map<string, HeatmapArticle[]>  // ← Serverで構築してからClientに渡さない
  // 注意: Mapはシリアライズ不可。エントリ形式で渡す
  articlesByDateEntries: [string, HeatmapArticle[]][]
}
```

### UTM付与パターン（ArticleTooltip.tsxより）

```typescript
// Source: src/components/ArticleTooltip.tsx L7-11
function withUtm(url: string): string {
  if (!url || url === '#') return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}utm_source=keep-substack&utm_medium=referral`
}
```

### page.tsxの変更差分イメージ

```typescript
// 変更前: MiniCalendarカード一覧
// 変更後:
export default async function Home() {
  const members = await getMembers()
  const results = await fetchAllFeedsCached(members)
  const dates = getRecentDays()  // 新規ユーティリティ
  const sorted = sortByWeeklyCount(results, dates)  // 新規ユーティリティ

  return (
    <main className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6">Keep Substack</h1>
      <WeeklyHeatmapGrid results={sorted} dates={dates} />
    </main>
  )
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| グリッドカード表示（月カレンダー） | 週間ヒートマップ行一覧 | Phase 5 | 50人規模で1ページに全員表示可能 |
| サムネイルなしTooltip | content:encodedからサムネイル抽出 | Phase 5 | 視覚的リッチさ向上 |
| `@vercel/kv` | `@upstash/redis` | Phase 4 | @vercel/kvは2024年12月廃止 |

**Deprecated/outdated:**
- `@vercel/kv`: Phase 4で廃止対応済み。`@upstash/redis`を使用する

---

## Open Questions

1. **セルの具体的なpx/rem（Claude裁量）**
   - What we know: `aspect-square`を使い正方形セル。`grid-cols-7`で7列。メンバー名列は`w-32`固定
   - What's unclear: セル1辺の具体的なサイズ。50人表示時の行高さ
   - Recommendation: `w-8`（32px）程度からスタートし、モバイルの44pxタッチターゲットも考慮して`min-w-[44px]`または`sm:w-8`でレスポンシブ調整

2. **buildArticleMapの拡張vs新設（Claude裁量）**
   - What we know: 既存`buildArticleMap`は`{ title, link }`のみ。thumbnailは含まない
   - What's unclear: calendarUtils.tsを汚染せずにthumbnailを含む型で処理するか
   - Recommendation: `heatmapUtils.ts`に`buildHeatmapArticleMap`を新設し、calendarUtils.tsはそのまま保持（DRY vs. KISS のトレードオフ — KISSを優先してutil分離）

3. **日付列の順序（Claude裁量、UI-SPEC.mdより）**
   - What we know: UI-SPEC.md「左: 6日前 → 右: 今日」または「左: 今日 → 右: 6日前」はClaude裁量
   - Recommendation: 「左: 6日前 → 右: 今日」が時系列として自然

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | rss-parserのcustomFieldsオプションでcontent:encodedが取得できる | Standard Stack / Code Examples | サムネイル取得不可（別アプローチが必要） |
| A2 | 50人規模でgetMembers()とfetchAllFeedsCached()が現行タイムアウト設定内で完了する | Architecture Patterns | ページタイムアウト発生 |
| A3 | Substackのcontent:encodedには必ずimg要素が含まれる記事とそうでない記事がある | Common Pitfalls | 問題なし（D-06でサムネイルなし時は省略確定） |

---

## Validation Architecture

> config.jsonで`workflow.nyquist_validation: false`のため、このセクションはスキップ。

---

## Security Domain

> このフェーズはUI表示の変更のみ。新規認証・セッション・入力フォームなし。

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | limited | サムネイルURLはRSS由来。img src属性にそのまま渡す — XSSリスクは低い（外部URLのimg srcは画像読み込みのみ） |
| V6 Cryptography | no | — |

**外部URLのimg src:** サムネイルURLはSubstack RSSから取得。`<img src={thumbnail}>`はXSSにはならない（スクリプト実行なし）。ただし悪意あるRSSがJavaScript URLを返す可能性は理論的に存在するが、SubstackのRSSは信頼できるソース。

---

## Sources

### Primary (HIGH confidence)
- `src/components/ArticleTooltip.tsx` — Tooltipのhover/tapトグルパターン [VERIFIED: codebase]
- `src/components/MiniCalendar.tsx` — 6段階濃淡Tailwindクラスパターン [VERIFIED: codebase]
- `src/lib/calendarUtils.ts` — parseIsoDate, buildArticleMap実装 [VERIFIED: codebase]
- `src/lib/fetchFeed.ts` — rss-parser設定・fetchAllFeedsCached署名 [VERIFIED: codebase]
- `src/lib/types.ts` — FeedItem, Member, MemberFeedResult型 [VERIFIED: codebase]
- `src/app/page.tsx` — 現在のページ構造 [VERIFIED: codebase]
- `package.json` — 依存パッケージバージョン [VERIFIED: codebase]
- `.planning/phases/05-weekly-heatmap-tooltip/05-CONTEXT.md` — ロック済み決定事項 [VERIFIED: file]
- `.planning/phases/05-weekly-heatmap-tooltip/05-UI-SPEC.md` — UIデザイン仕様 [VERIFIED: file]
- `.planning/config.json` — nyquist_validation: false確認 [VERIFIED: file]

### Secondary (MEDIUM confidence)
- `src/components/CalendarGrid.tsx` — MapのServer→Client変換パターン（エントリ配列） [VERIFIED: codebase]

### Tertiary (LOW confidence)
- rss-parserの`customFields`によるcontent:encoded取得 — CONTEXT.md specificsに記載されているが、このセッションでは直接ドキュメント確認していない [ASSUMED]

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — package.jsonで全パッケージ確認済み
- Architecture: HIGH — 既存コードベースを直接読んだ。パターンが明確
- Pitfalls: HIGH — 既存コンポーネント（CalendarGrid.tsxのMapシリアライズコメントなど）から直接確認
- rss-parser customFields: MEDIUM — CONTEXT.md specificsに記載あり、ドキュメント未確認

**Research date:** 2026-05-09
**Valid until:** 2026-06-08（30日。Next.js/Tailwind安定版のため）
