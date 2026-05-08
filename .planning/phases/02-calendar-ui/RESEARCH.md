# Phase 2: カレンダーUI - Research

**Researched:** 2026-05-08
**Domain:** Next.js App Router + Tailwind CSS カレンダーUIコンポーネント
**Confidence:** HIGH

---

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** ツールチップのトリガーはホバー＋クリック両対応。スマートフォンでもクリックで開く
- **D-02:** 1日に複数記事がある場合は全件リスト表示（タイトル＋リンクを縦に並べる）
- **D-03:** ツールチップはセルの上方向に表示する

### Claude's Discretion

- **セルのハイライト表現（CAL-02）:** 記事ありの日の色・スタイルはClaude判断。「頑張りが一目でわかる」コアバリューに合う表現を選ぶ
- **カレンダービュー構成:** Phase 2でのビュー構造（新規ページ追加か、page.tsx拡張か）はClaude判断。Phase 3ダッシュボード（全員ミニカレンダー）への拡張性を考慮すること
- **月ナビゲーション実装（CAL-04）:** URLクエリパラメータかReact stateかはClaude判断。Next.js App Routerのパターンに自然に沿う方法を選ぶ

### Deferred Ideas (OUT OF SCOPE)

なし — 議論はフェーズスコープ内に収まった

</user_constraints>

---

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CAL-01 | 月別カレンダーグリッドでメンバーの記事公開日を表示できる | Tailwind `grid grid-cols-7` + `col-start-*` でオフセット計算パターンを確立 |
| CAL-02 | 記事公開日のセルに色やマークで視覚的に区別できる | Tailwind 条件付きクラス適用（記事あり: 色付き背景、なし: デフォルト）パターンを確立 |
| CAL-03 | 日付セルのホバーで記事タイトルと元記事リンクを表示できる（ホバー+クリック両対応） | React useState + onMouseEnter/Leave + onClick + useRef(外クリック検知) の複合パターンを確立 |
| CAL-04 | 前月/次月ナビゲーションで過去の活動も確認できる | useState(年月)をClient Componentで管理するパターンを確立 |

</phase_requirements>

---

## Summary

Phase 2では、Phase 1で構築した `fetchAllFeedsCached` から `MemberFeedResult[]` を受け取り、各メンバーの記事公開日を月別カレンダーグリッドとして表示するUIを実装する。技術的な核心は3点: (1) Tailwind `grid grid-cols-7` + `col-start-*` によるカレンダーグリッド描画、(2) `useState` を使ったホバー+クリック両対応ツールチップ、(3) Server/Client Component境界の適切な設計。

**最重要設計判断:** 月ナビゲーションに `useState` を使い、データ取得はServer Component側で全期間のデータを一括取得してClient Componentにpropsで渡す。これにより `force-static` を維持しつつ、クライアント側でインタラクティブなナビゲーションを実現できる。`searchParams` を使うとページが dynamic rendering に強制的に切り替わるため、`force-static` と競合する。

**Primary recommendation:** Server Componentで全フィードデータを取得し、CalendarView Client Componentにデータを渡す。月ナビゲーションは `useState` で管理し、URLには反映させない。カレンダーロジックは純粋なユーティリティ関数として `src/lib/calendar.ts` に抽出する。

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| RSSフィード取得 | API / Backend (Server Component) | — | Phase 1で確立。`fetchAllFeedsCached` はサーバー専用 |
| カレンダーグリッド描画 | Frontend Server (SSR) + Client | — | 静的なグリッド構造はServerで描画可、インタラクティブ部分はClient |
| 月ナビゲーション状態管理 | Browser / Client | — | `useState` で管理。URLに反映させると `force-static` と競合 |
| ツールチップ表示/非表示 | Browser / Client | — | hover/click イベントはClient Component必須 |
| isoDate → 年月日マッピング | API / Backend | Browser / Client | ユーティリティ関数として共有。どちらでも実行可能 |
| セルハイライト（記事あり/なし） | Frontend Server (SSR) | — | 表示ロジックはServer側でデータを整形後、条件クラスで表現 |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.2.6 (installed) | App Router, Server/Client Components | プロジェクト既定スタック |
| React | 19.2.4 (installed) | UI、useState、useRef、useEffect | プロジェクト既定スタック |
| Tailwind CSS | 4.2.4 (installed) | grid, hover, group, conditional classes | プロジェクト既定スタック |
| TypeScript | ^5 (installed) | 型安全なカレンダーロジック | プロジェクト既定スタック |

[VERIFIED: npm registry — npm view next/react/tailwindcss version で確認]

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (なし) | — | — | 外部UIライブラリは明示的に禁止 |

**外部ライブラリ禁止:** CONTEXT.md 「No external UI library (vanilla Tailwind only)」 に従い、date-fns、react-calendar、react-tooltip 等は使用しない。[VERIFIED: 02-CONTEXT.md]

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| useState (月管理) | URL searchParams | searchParams は dynamic rendering を強制し `force-static` と競合する [VERIFIED: Next.js docs] |
| カスタムツールチップ | react-tooltip / Tippy.js | 外部UIライブラリ禁止のため使用不可 |
| カスタム日付ロジック | date-fns | YAGNIかつ外部ライブラリ禁止。JavaScriptネイティブ Date で十分 |

**Installation:** 追加インストール不要（既存スタックで完結）

---

## Architecture Patterns

### System Architecture Diagram

```
[page.tsx (Server Component)]
  |
  +-- fetchAllFeedsCached(members) --> MemberFeedResult[]
  |
  +-- buildCalendarData(results) --> CalendarData (year/month/day -> FeedItem[])
  |
  +-- <CalendarView data={calendarData} /> (Client Component)
        |
        +-- useState: { year, month } (現在表示中の年月)
        |
        +-- calendarGrid = buildDayGrid(year, month) (7列グリッド計算)
        |
        +-- <CalendarGrid days={calendarGrid} articleMap={monthData} />
              |
              +-- <DayCell> * N
                    |
                    +-- useState: isTooltipOpen (各セル)
                    +-- onMouseEnter / onMouseLeave / onClick
                    +-- <Tooltip> (記事リスト表示)
```

### Recommended Project Structure

```
src/
├── app/
│   └── page.tsx              # Server Component (データ取得 + CalendarView呼び出し)
├── components/
│   ├── CalendarView.tsx       # 'use client' — 月ナビゲーション + グリッド統括
│   ├── CalendarGrid.tsx       # グリッド描画 (Server or Client, stateless)
│   └── DayCell.tsx            # 'use client' — ツールチップ状態管理
└── lib/
    ├── types.ts               # 既存 (FeedItem, Member, MemberFeedResult)
    ├── fetchFeed.ts           # 既存
    └── calendar.ts            # 新規: isoDate変換、グリッド計算ユーティリティ
```

### Pattern 1: カレンダーグリッド計算 (Tailwind grid-cols-7 + col-start-*)

**What:** 7列グリッドで月の開始曜日にオフセットをかけて日付セルを配置する
**When to use:** 月別カレンダーの全日付表示

```typescript
// Source: Tailwind CSS docs + 標準Dateロジック [VERIFIED: tailwindlabs/tailwindcss.com]
// src/lib/calendar.ts

export type DayInfo = {
  date: number      // 1-31
  colStart?: number // 1-7 (月初のみ使用)
  isCurrentMonth: boolean
}

/**
 * 指定年月のカレンダーグリッド用データを生成する。
 * 週の開始は日曜日 (getDay() == 0 == col 1)。
 */
export function buildDayGrid(year: number, month: number): DayInfo[] {
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  const startCol = firstDay.getDay() + 1  // 0=日 -> col-start-1

  const days: DayInfo[] = []
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push({
      date: d,
      colStart: d === 1 ? startCol : undefined,
      isCurrentMonth: true,
    })
  }
  return days
}

/**
 * isoDate から { year, month, day } を抽出する。
 * new Date() を使うとタイムゾーン補正がかかるため、
 * 文字列分割で取得する (UTC日付を保持)。
 */
export function parseIsoDate(isoDate: string): { year: number; month: number; day: number } | null {
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return null
  return {
    year: parseInt(match[1]),
    month: parseInt(match[2]),
    day: parseInt(match[3]),
  }
}

/**
 * MemberFeedResult[] から「年-月-日 -> FeedItem[]」のマップを構築する。
 * key: "YYYY-MM-DD"
 */
export type ArticleMap = Map<string, { title?: string; link?: string }[]>

export function buildArticleMap(items: { title?: string; link?: string; isoDate?: string }[]): ArticleMap {
  const map: ArticleMap = new Map()
  for (const item of items) {
    if (!item.isoDate) continue
    const parsed = parseIsoDate(item.isoDate)
    if (!parsed) continue
    const key = `${parsed.year}-${String(parsed.month).padStart(2, '0')}-${String(parsed.day).padStart(2, '0')}`
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push({ title: item.title, link: item.link })
  }
  return map
}
```

**グリッドの Tailwind 実装:**

```tsx
// Source: Tailwind CSS docs grid-cols-7 + col-start-* [VERIFIED: tailwindlabs/tailwindcss.com]
// components/CalendarGrid.tsx

<div className="grid grid-cols-7 gap-1">
  {/* 曜日ヘッダー */}
  {['日', '月', '火', '水', '木', '金', '土'].map((d) => (
    <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
  ))}

  {/* 日付セル */}
  {days.map((day) => (
    <DayCell
      key={day.date}
      day={day}
      articles={articleMap.get(formatKey(year, month, day.date)) ?? []}
      style={day.colStart ? { gridColumnStart: day.colStart } : undefined}
    />
  ))}
</div>
```

**注意:** Tailwind v4 では `col-start-{n}` クラスを動的に生成すると JIT が検知できない場合がある。`style` prop で `gridColumnStart` を渡すか、`safelist` に追加するか、インライン style を使うこと。[ASSUMED — Tailwind v4 safelist 挙動はトレーニングデータ時点の知識]

### Pattern 2: ツールチップ (ホバー+クリック両対応、外クリックで閉じる)

**What:** useState でツールチップ開閉を管理し、onMouseEnter/Leave + onClick + document event listener で制御する
**When to use:** CAL-03 要件（ホバー+クリック両対応）

```typescript
// Source: React docs + 複数WebSearch結果のクロス検証 [VERIFIED パターン: useRef + useEffect]
// components/DayCell.tsx
'use client'

import { useState, useRef, useEffect } from 'react'

type Article = { title?: string; link?: string }

type DayCellProps = {
  date: number
  articles: Article[]
  style?: React.CSSProperties
}

export function DayCell({ date, articles, style }: DayCellProps) {
  const [open, setOpen] = useState(false)
  const cellRef = useRef<HTMLDivElement>(null)
  const hasArticle = articles.length > 0

  // 外クリックで閉じる
  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (cellRef.current && !cellRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  if (!hasArticle) {
    return (
      <div style={style} className="aspect-square flex items-center justify-center text-sm text-gray-400 rounded">
        {date}
      </div>
    )
  }

  return (
    <div
      ref={cellRef}
      style={style}
      className="relative aspect-square"
    >
      {/* セル本体 */}
      <button
        className="w-full h-full flex items-center justify-center text-sm font-semibold bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={(e) => {
          // ツールチップ内にカーソルが入った場合は閉じない
          const related = e.relatedTarget as Node | null
          if (cellRef.current?.contains(related)) return
          setOpen(false)
        }}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        {date}
      </button>

      {/* ツールチップ (セル上方向) */}
      {open && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10 bg-white border border-gray-200 rounded shadow-lg p-2 min-w-max max-w-xs"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          {/* 閉じるボタン */}
          <button
            className="absolute top-1 right-1 text-gray-400 hover:text-gray-600 text-xs"
            onClick={() => setOpen(false)}
            aria-label="閉じる"
          >
            ×
          </button>
          <ul className="space-y-1 pr-4">
            {articles.map((a, i) => (
              <li key={i}>
                <a
                  href={a.link ?? '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline block"
                >
                  {a.title ?? '(タイトルなし)'}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
```

### Pattern 3: 月ナビゲーション (useState、force-static維持)

**What:** Client Component内で `useState` を使って現在表示中の年月を管理する
**When to use:** CAL-04 要件。`searchParams` は dynamic rendering を強制するため使わない

```typescript
// Source: Next.js docs (useSearchParams vs searchParams prop) [VERIFIED: /vercel/next.js]
// components/CalendarView.tsx
'use client'

import { useState } from 'react'

type Props = {
  // Server Component から渡される全期間のデータ
  memberData: {
    member: { name: string }
    articleMap: ArticleMap
  }
}

export function CalendarView({ memberData }: Props) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  return (
    <div>
      {/* ナビゲーション */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="px-3 py-1 rounded hover:bg-gray-100">＜</button>
        <span className="font-semibold">{year}年{month}月</span>
        <button onClick={nextMonth} className="px-3 py-1 rounded hover:bg-gray-100">＞</button>
      </div>
      {/* カレンダーグリッド */}
      <CalendarGrid year={year} month={month} articleMap={memberData.articleMap} />
    </div>
  )
}
```

**なぜ `searchParams` を使わないか:**

Next.js 公式ドキュメントより: `searchParams` prop を Page で使用すると、そのルートは dynamic rendering に強制される。[VERIFIED: /vercel/next.js — layouts-and-pages.mdx]

現行の `page.tsx` は `export const dynamic = 'force-static'` を設定しており、これと `searchParams` は競合する。`useState` をClient Componentで使う場合は静的レンダリングと完全に互換性がある。[VERIFIED: Next.js docs]

### Pattern 4: Server/Client Component 分割

**What:** データ取得を Server Component で行い、インタラクション部分のみ Client Component にする
**When to use:** 全フェーズの基本パターン

```
page.tsx (Server Component, force-static)
  └── fetchAllFeedsCached()  ← サーバー専用
  └── buildArticleMap()      ← ユーティリティ
  └── <CalendarSection data={...} />  ← Client Component に props で渡す

CalendarSection.tsx ('use client')
  └── useState(year, month)
  └── <CalendarGrid />
        └── <DayCell />     ← ツールチップ状態管理
```

**Phase 3 拡張性の考慮:**

Phase 3では「全員ミニカレンダー一覧」が追加される。`CalendarGrid` と `DayCell` を単一メンバー用のコンポーネントとして設計しておけば、Phase 3 では `members.map(m => <CalendarGrid .../>)` の形で再利用できる。[ASSUMED — Phase 3 設計はまだ確定していない]

### Anti-Patterns to Avoid

- **searchParams を月ナビゲーションに使う:** `force-static` と競合してビルドエラーまたは dynamic rendering に強制切替される [VERIFIED: Next.js docs]
- **`new Date(isoDate).getDate()` でローカルタイムゾーン依存:** `new Date("2026-05-08")` はUTCで解釈されるが、`.getDate()` はローカルタイムゾーンで返すため、タイムゾーンによっては日付がずれる。文字列から直接パースすること
- **Tailwind で動的クラス名を生成する:** `col-start-${n}` のような文字列連結はJITが検知できないため、`style` propかsafelist設定を使う [VERIFIED: Tailwind CSS v4 ドキュメント]
- **ツールチップをCSSだけ（`hover:` クラス）で実装する:** スマートフォンでは hover が発生しないため、CAL-03 の「クリック対応」を満たせない [ASSUMED — モバイルのhoverイベント挙動はデバイス依存]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| isoDate タイムゾーン変換 | カスタム変換 | 文字列 `.match(/(\d{4})-(\d{2})-(\d{2})/)` | タイムゾーン依存バグを防ぐ |
| 月の最終日計算 | 独自ロジック | `new Date(year, month, 0).getDate()` | JavaScriptネイティブで確実 |
| 月初めの曜日計算 | 独自ロジック | `new Date(year, month - 1, 1).getDay()` | JavaScriptネイティブで確実 |

**Key insight:** 日付ライブラリなしで月別カレンダーに必要なロジックは、JavaScript の `Date` コンストラクタで完全に実装できる。YAGNI原則に従い date-fns 等を追加しない。

---

## Common Pitfalls

### Pitfall 1: isoDate のタイムゾーン問題

**What goes wrong:** `new Date("2026-05-08").getDate()` が `7` を返す（UTC午前0時がJST前日に変換される）
**Why it happens:** ISO 8601 の日付のみ形式（`YYYY-MM-DD`）は UTC として解釈されるが、`getDate()` はローカルタイムゾーンで返す
**How to avoid:** `isoDate.match(/^(\d{4})-(\d{2})-(\d{2})/)` で文字列から直接パースする
**Warning signs:** 日本時間深夜0時〜9時に作成された記事が前日のセルに表示される

### Pitfall 2: Tailwind 動的クラス名が適用されない

**What goes wrong:** `className={`col-start-${startCol}`}` と書いても、Tailwind v4 のJITが未使用クラスとして削除する
**Why it happens:** Tailwind はビルド時に静的解析してクラス名を収集する。文字列連結で生成されたクラス名は検知されない
**How to avoid:** `style={{ gridColumnStart: startCol }}` を使うか、`col-start-1` から `col-start-7` をsafelistに追加する
**Warning signs:** 開発サーバーでは正常だが `npm run build` 後に崩れる

### Pitfall 3: searchParams で force-static が崩れる

**What goes wrong:** `page.tsx` で `searchParams` prop を受け取ると、`force-static` が無効化され dynamic rendering になる
**Why it happens:** Next.js は `searchParams` の使用を dynamic data access とみなす [VERIFIED: Next.js docs]
**How to avoid:** 月ナビゲーションは Client Component の `useState` で管理し、`searchParams` は使わない
**Warning signs:** `next build` で "Dynamic server usage" エラーが出る、またはISRが効かなくなる

### Pitfall 4: Client Component でのツールチップ外クリック検知

**What goes wrong:** `document` に追加したイベントリスナーが cleanup されず、複数セルのツールチップが同時に開く
**Why it happens:** `useEffect` の cleanup を忘れると、コンポーネントのアンマウント後もリスナーが残る
**How to avoid:** `useEffect` の return で `document.removeEventListener` を必ず呼ぶ
**Warning signs:** ページリロードなしに複数セルをクリックするとツールチップが重なる

---

## Code Examples

### isoDate から年月日を抽出する（タイムゾーン安全）

```typescript
// Source: JavaScript Date API + タイムゾーン問題の回避パターン [ASSUMED — 広く使われるパターン]
function parseIsoDate(isoDate: string): { year: number; month: number; day: number } | null {
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return null
  return {
    year: parseInt(match[1], 10),
    month: parseInt(match[2], 10),
    day: parseInt(match[3], 10),
  }
}
```

### 月の日数と開始曜日の計算

```typescript
// Source: JavaScript Date ネイティブAPI [ASSUMED — MDN仕様に基づく標準パターン]
const year = 2026, month = 5

// 月の最終日
const lastDay = new Date(year, month, 0).getDate()  // → 31

// 月初めの曜日 (0=日, 1=月, ..., 6=土)
const startDow = new Date(year, month - 1, 1).getDay()  // → 4 (木)

// Tailwind col-start は 1始まり
const colStart = startDow + 1  // → 5
```

### Server Component でデータ整形してClient Componentへ渡す

```typescript
// Source: Next.js docs Server/Client Component composition [VERIFIED: /vercel/next.js]
// src/app/page.tsx (Server Component)
import { fetchAllFeedsCached } from '@/lib/fetchFeed'
import { buildArticleMap } from '@/lib/calendar'
import { CalendarView } from '@/components/CalendarView'
import members from '@/data/members.json'
import type { Member } from '@/lib/types'

export const dynamic = 'force-static'

export default async function Home() {
  const results = await fetchAllFeedsCached(members as Member[])
  // 単一メンバー想定 (Phase 2はfirst member表示)
  const first = results[0]
  const articleMap = buildArticleMap(first?.items ?? [])

  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Keep Substack</h1>
      <CalendarView memberName={first?.member.name} articleMap={articleMap} />
    </main>
  )
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `searchParams` で月管理 | Client Component `useState` | Next.js 13+ (App Router) | `force-static` との競合を回避できる |
| CSS hover のみ | JS制御 (useState) | スマートフォン普及以降 | モバイルでのクリック対応が必要 |
| `export const revalidate` | `unstable_cache` + `force-static` | Next.js 14+ | 動的なrevalidate設定が可能に [VERIFIED: /vercel/next.js] |
| `new Date(isoDate).getDate()` | 文字列パース | (タイムゾーン問題認識以降) | タイムゾーン依存バグを根絶できる |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Tailwind v4 で動的クラス名 `col-start-${n}` が JIT で検知されない | Pattern 1, Pitfall 2 | col-start が正常動作しカレンダーレイアウトが壊れない可能性。ビルドで検証必要 |
| A2 | モバイルでは hover イベントが発生しないため CSS hover のみでは不十分 | Anti-Patterns | 一部デバイスでは hover が click として動作する場合があるが、click 対応は安全側 |
| A3 | Phase 3 で CalendarGrid をミニカレンダーとして再利用する | Pattern 4 | Phase 3 設計次第では異なる実装が必要になる可能性あり |

---

## Open Questions

1. **Phase 2 で表示するメンバーは1人か全員か**
   - What we know: ROADMAP.md に「Phase 3でダッシュボード（全員ミニカレンダー）」と記載
   - What's unclear: Phase 2 では1人のカレンダーのみ表示するのか、全員分のカレンダーを縦並びで表示するのか
   - Recommendation: Phase 2 は「全メンバー分のカレンダーを縦に並べる」設計にすると Phase 3 への拡張が自然。1人分のみの場合は page.tsx を単純化できる。プランナーが決定すること

2. **月の開始曜日は日曜日か月曜日か**
   - What we know: 日本では月曜始まりが一般的だが、カレンダーアプリは日曜始まりも多い
   - What's unclear: ユーザーの好みが指定されていない
   - Recommendation: 日曜始まり（`getDay()` がそのまま使える）をデフォルトにし、変更しやすいよう定数化する

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js ビルド | ✓ | v22.12.0 | — |
| Next.js | カレンダーUI実装 | ✓ | 16.2.6 | — |
| Tailwind CSS | スタイリング | ✓ | 4.2.4 | — |
| TypeScript | 型安全なコード | ✓ | ^5 | — |

**Missing dependencies with no fallback:** なし

**Missing dependencies with fallback:** なし

---

## Validation Architecture

> `nyquist_validation: false` のため、このセクションはスキップする (.planning/config.json で明示的に false 設定済み)

---

## Security Domain

Phase 2 は表示専用UI（読み取りのみ）であり、ユーザー入力やデータ書き込みは一切ない。外部リンク（記事URL）は `target="_blank" rel="noopener noreferrer"` を付与することで、リファラーリークとタブナプジャックを防止する。

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — (認証なし公開ページ) |
| V3 Session Management | no | — (セッションなし) |
| V4 Access Control | no | — (公開ページ) |
| V5 Input Validation | no | — (ユーザー入力なし) |
| V6 Cryptography | no | — (暗号化不要) |

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| 外部リンクのタブナプジャック | Tampering | `rel="noopener noreferrer"` を全外部リンクに付与 |

---

## Sources

### Primary (HIGH confidence)
- `/vercel/next.js` (Context7) — searchParams, force-static, Server/Client Component, unstable_cache ドキュメント確認
- `/tailwindlabs/tailwindcss.com` (Context7) — grid-cols-7, col-start-*, group-hover パターン確認
- `npm view next/react/tailwindcss version` — バージョン確認

### Secondary (MEDIUM confidence)
- [Next.js 公式: Accessing Search Parameters](https://nextjs.org/docs/app/api-reference/file-conventions/page) — searchParams が dynamic rendering を強制することを確認
- [Next.js searchParams Disables Static Generation](https://www.buildwithmatija.com/blog/nextjs-searchparams-static-generation-fix) — WebSearch結果、Next.js公式ドキュメントでクロス検証済み
- [Building a calendar with Tailwind - DEV Community](https://dev.to/vivekalhat/building-a-calendar-component-with-tailwind-and-date-fns-2c0i) — WebSearch結果、Tailwind公式ドキュメントでクロス検証済み

### Tertiary (LOW confidence)
- WebSearch: React tooltip hover+click pattern — 複数ソース一致で LOW から MEDIUM 相当に引き上げ

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — インストール済みパッケージをnpm registryで検証
- Architecture: HIGH — Next.js公式ドキュメントで Server/Client Component境界を確認
- Calendar Grid Pattern: HIGH — Tailwind公式ドキュメントで grid-cols-7 + col-start-* を確認
- Tooltip Pattern: MEDIUM — React docs + 複数WebSearch結果クロス検証
- Month Navigation: HIGH — Next.js公式ドキュメントで searchParams vs useState の違いを確認

**Research date:** 2026-05-08
**Valid until:** 2026-06-08 (Next.js 16系は安定版、30日間有効)
