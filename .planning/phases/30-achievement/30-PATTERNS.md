# Phase 30: アチーブメント（👑 / 🔥） - Pattern Map

**Mapped:** 2026-06-05
**Files analyzed:** 5（修正対象 3 + 新規テスト 2）
**Analogs found:** 5 / 5

---

## File Classification

| 新規/修正対象ファイル | Role | Data Flow | Closest Analog | Match Quality |
|----------------------|------|-----------|----------------|---------------|
| `src/lib/commitUtils.ts`（`isCurrentWeekComplete` / `consecutiveWeekStreak` / `sortMembersForCommitView` D-10完全版） | utility | transform | `src/lib/commitUtils.ts`（既存 `matchArticleToSlot`） | exact |
| `src/components/CommitGoalRow.tsx`（`streak` prop 追加 + Column 3 差し替え） | component | request-response | `src/components/CommitGoalRow.tsx`（既存 Column 3 プレースホルダー） | exact |
| `src/components/CommitGoalView.tsx`（streak 計算呼び出し + ヘッダー幅同期） | component | request-response | `src/components/CommitGoalView.tsx`（既存 `sortMembersForCommitView` 呼び出し） | exact |
| `src/lib/__tests__/commitUtils.test.ts`（既存ファイル拡張） | test | — | `src/lib/__tests__/commitUtils.test.ts`（既存テストパターン） | exact |
| `src/components/__tests__/CommitGoalRow.test.tsx`（新規作成） | test | — | `src/components/__tests__/CommitGrid.test.tsx`（element-tree ヘルパー） | role-match |

---

## Pattern Assignments

### `src/lib/commitUtils.ts` — 新規関数追加（utility, transform）

**Analog:** `src/lib/commitUtils.ts`（既存 `matchArticleToSlot` / `sortMembersForCommitView`）

**Imports pattern（lines 1–2）:**
```typescript
import { isoToJSTDateKey } from './calendarUtils'
import type { CommitSlot, FeedItem, MemberFeedResult } from './types'
```

**既存関数の核心パターン — `matchArticleToSlot`（lines 41–51）:**
```typescript
export function matchArticleToSlot(
  slot: CommitSlot,
  weekDates: string[],
  articleDateMap: Map<string, FeedItem[]>
): FeedItem | undefined {
  // day_of_week is 1-indexed (1=Mon), weekDates is 0-indexed (0=Mon)
  const dateKey = weekDates[slot.day_of_week - 1]
  if (!dateKey) return undefined
  const articles = articleDateMap.get(dateKey)
  return articles && articles.length > 0 ? articles[0] : undefined
}
```
→ `isCurrentWeekComplete` は `matchArticleToSlot` の代わりに同じ `dateKey` 取得ロジックを使い、`every()` で全スロット判定に転用する。

**内部ヘルパー構築パターン（lines 79–86 — `countArticlesInDateSet` を参考）:**
```typescript
// 非エクスポートの内部ヘルパーパターン
function countArticlesInDateSet(items: FeedItem[], dateSet: Set<string>): number {
  return items.filter((item) => {
    if (!item.isoDate) return false
    const key = isoToJSTDateKey(item.isoDate)
    return key !== null && dateSet.has(key)
  }).length
}
```
→ `buildArticleDateMap(items)` を同じ非エクスポートヘルパーとして切り出す。`consecutiveWeekStreak` のループ外で一度だけ呼ぶ。

**新規関数 `isCurrentWeekComplete` の実装パターン:**
```typescript
/**
 * 指定した週（weekDates）において、全スロットに記事が1件以上あれば true。
 * スロットが0件の場合は false（vacuous truth 防止）。
 */
export function isCurrentWeekComplete(
  slots: CommitSlot[],
  weekDates: string[],
  articleDateMap: Map<string, FeedItem[]>
): boolean {
  if (slots.length === 0) return false  // Pitfall 2: vacuous truth 防止
  return slots.every((slot) => {
    const dateKey = weekDates[slot.day_of_week - 1]
    if (!dateKey) return false
    const articles = articleDateMap.get(dateKey)
    return articles !== undefined && articles.length > 0
  })
}
```

**新規関数 `consecutiveWeekStreak` の実装パターン:**
```typescript
/**
 * 今週 (offset=0) から最大3週さかのぼって連続達成週数を返す。
 * articleDateMap を一度だけ構築してループ外で保持する（Pitfall 1 対策）。
 */
export function consecutiveWeekStreak(
  slots: CommitSlot[],
  items: FeedItem[]
): number {
  const articleDateMap = buildArticleDateMap(items)  // ループ外で一度だけ構築
  let streak = 0
  for (let offset = 0; offset >= -2; offset--) {
    const weekDates = getWeekDates(offset)
    if (isCurrentWeekComplete(slots, weekDates, articleDateMap)) {
      streak++
    } else {
      break  // 連続が途切れたら終了
    }
  }
  return streak
}
```

**D-10完全版 `sortMembersForCommitView` の実装パターン（既存 lines 60–75 を置き換え）:**
```typescript
// 現行（Phase 29 暫定）: _slots パラメーター未使用
export function sortMembersForCommitView(
  results: MemberFeedResult[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _slots: CommitSlot[]
): MemberFeedResult[]

// ↓ Phase 30 完全版: eslint-disable と _ プレフィックスを削除し実ロジックに切り替え
export function sortMembersForCommitView(
  results: MemberFeedResult[],
  slots: CommitSlot[]
): MemberFeedResult[] {
  const thisWeekDates = getWeekDates(0)

  return [...results].sort((a, b) => {
    // Pitfall 4: per-member でフィルタしてから計算する
    const aSlots = slots.filter((s) => s.member_id === a.member.id)
    const bSlots = slots.filter((s) => s.member_id === b.member.id)

    // ①今週の実績率（達成スロット / 全スロット）降順
    const aMap = buildArticleDateMap(a.items)
    const bMap = buildArticleDateMap(b.items)
    const aRate = achievementRate(aSlots, thisWeekDates, aMap)
    const bRate = achievementRate(bSlots, thisWeekDates, bMap)
    if (bRate !== aRate) return bRate - aRate

    // ②ストリーク降順
    const aStreak = consecutiveWeekStreak(aSlots, a.items)
    const bStreak = consecutiveWeekStreak(bSlots, b.items)
    if (bStreak !== aStreak) return bStreak - aStreak

    // ③登録順昇順（既存パターン踏襲: lines 73）
    return a.member.addedAt.localeCompare(b.member.addedAt)
  })
}
```

---

### `src/components/CommitGoalRow.tsx` — props 追加 + Column 3 差し替え（component, request-response）

**Analog:** `src/components/CommitGoalRow.tsx`（既存 lines 1–53）

**Server Component 宣言パターン（line 1）:**
```typescript
// Server Component — do NOT add 'use client'
```

**Imports パターン（lines 2–4）:**
```typescript
import Link from 'next/link'
import type { Member, FeedItem, CommitSlot } from '@/lib/types'
import CommitGrid from './CommitGrid'
```

**Props 型拡張パターン（lines 6–11、`streak: number` を追加）:**
```typescript
// 現行
type CommitGoalRowProps = {
  member: Member
  items: FeedItem[]
  slots: CommitSlot[]
  imageUrl?: string
}

// ↓ 変更後
type CommitGoalRowProps = {
  member: Member
  items: FeedItem[]
  slots: CommitSlot[]
  imageUrl?: string
  streak: number  // 追加: 0=なし / 1=👑 / ≥2=👑🔥
}
```

**Column 3 差し替えパターン（lines 49–50、プレースホルダーを条件分岐に置き換え）:**
```typescript
// 現行（Phase 29 プレースホルダー）:
<div className="w-8 shrink-0" aria-hidden="true" />

// ↓ 変更後（streak に応じた3状態）:
{streak === 0 ? (
  <div className="w-8 shrink-0" aria-hidden="true" />
) : streak === 1 ? (
  <div className="w-8 shrink-0 flex items-center justify-center">
    <span role="img" aria-label="今週達成" className="text-sm leading-none">👑</span>
  </div>
) : (
  <div className="w-10 shrink-0 flex items-center justify-center gap-1">
    <span role="img" aria-label="連続達成" className="text-sm leading-none">👑🔥</span>
  </div>
)}
```

**Column 構造の全体パターン（lines 15–52）:**
既存の `flex items-center border-b border-[#ebebeb] py-1` ラッパー内の Column 1（Avatar+Name）・Column 2（CommitGrid）・Column 3（achievement）の3列構成をそのまま踏襲する。

---

### `src/components/CommitGoalView.tsx` — streak 計算 + ヘッダー幅同期（component, request-response）

**Analog:** `src/components/CommitGoalView.tsx`（既存 lines 1–51）

**Imports パターン（lines 1–4）— `consecutiveWeekStreak` を追加インポート:**
```typescript
// Server Component — do NOT add 'use client'
import type { MemberFeedResult, CommitSlot } from '@/lib/types'
import { sortMembersForCommitView, consecutiveWeekStreak } from '@/lib/commitUtils'
import CommitGoalRow from './CommitGoalRow'
```

**streak 計算と CommitGoalRow への props 渡しパターン（lines 37–48）— 既存ループを拡張:**
```typescript
// 現行
{sorted.map(({ member, items, imageUrl }) => {
  const memberSlots = slots.filter((s) => s.member_id === member.id)
  return (
    <CommitGoalRow
      key={member.publicationId}
      member={member}
      items={items}
      slots={memberSlots}
      imageUrl={imageUrl}
    />
  )
})}

// ↓ 変更後（streak 計算を CommitGoalView 内で行い props に渡す — Pitfall 5 対策）
{sorted.map(({ member, items, imageUrl }) => {
  const memberSlots = slots.filter((s) => s.member_id === member.id)
  const streak = consecutiveWeekStreak(memberSlots, items)
  return (
    <CommitGoalRow
      key={member.publicationId}
      member={member}
      items={items}
      slots={memberSlots}
      imageUrl={imageUrl}
      streak={streak}
    />
  )
})}
```

**ヘッダースペーサー幅同期パターン（line 35）— Pitfall 3 対策:**
```typescript
// 現行（CommitGoalRow の Column 3 が w-8 のとき）
<div className="w-8 shrink-0" />

// ↓ 変更後: streak≥2 のメンバーがいる場合、Column 3 が w-10 に広がるため
//    ヘッダースペーサーも同幅に統一する（最大幅 w-10 に固定）
<div className="w-10 shrink-0" />
```

---

### `src/lib/__tests__/commitUtils.test.ts` — 既存ファイル拡張（test）

**Analog:** `src/lib/__tests__/commitUtils.test.ts`（既存 lines 1–208）

**テストファイル構造パターン（lines 1–25）— フィクスチャヘルパー:**
```typescript
import { describe, it, expect } from 'vitest'
import { getWeekDates, matchArticleToSlot, sortMembersForCommitView } from '../commitUtils'
import type { CommitSlot, FeedItem, Member, MemberFeedResult } from '../types'

// Helper: build a minimal Member fixture
function member(name: string, addedAt = '2026-01-01T00:00:00.000Z'): Member { ... }

// Helper: build a FeedItem with a given ISO date
function feedItem(isoDate: string): FeedItem { ... }
```
→ 同じパターンで `isCurrentWeekComplete` / `consecutiveWeekStreak` をインポートに追加し、同じヘルパーを流用する。

**テストブロック構造パターン（lines 29–67 — `getWeekDates` describe ブロックを参考）:**
```typescript
describe('isCurrentWeekComplete', () => {
  it('全スロットに記事があれば true を返す', () => { ... })
  it('スロットが0件なら false を返す（vacuous truth 防止）', () => { ... })
  it('1スロットでも記事が欠ければ false を返す', () => { ... })
})

describe('consecutiveWeekStreak', () => {
  it('今週未達成なら 0 を返す', () => { ... })
  it('今週のみ達成なら 1 を返す', () => { ... })
  it('今週+先週達成なら 2 を返す', () => { ... })
  it('スロット0件なら 0 を返す', () => { ... })
})
```

**日付フィクスチャパターン（lines 76–84 — 既存 `matchArticleToSlot` テストを参考）:**
```typescript
// 制御された日付配列を直接渡す（テスト対象の時刻依存性を排除）
const weekDates = [
  '2026-06-01', // Monday (day_of_week=1)
  '2026-06-02',
  '2026-06-03',
  '2026-06-04',
  '2026-06-05',
  '2026-06-06',
  '2026-06-07',
]
```
→ `isCurrentWeekComplete` テストでは `weekDates` を直接渡す（関数シグネチャがそれを受け取るため、テスト制御が容易）。

**D-10完全版ソートテストの更新パターン（lines 165–208 — 既存 `sortMembersForCommitView` describe を更新）:**
```typescript
// 既存テスト（this-week count ベース）→ 実績率+ストリークベースの期待値に更新
// 既存の「addedAt 昇順 tie-break」テストはそのまま維持
```

---

### `src/components/__tests__/CommitGoalRow.test.tsx` — 新規作成（test）

**Analog:** `src/components/__tests__/CommitGrid.test.tsx`（lines 1–183）

**element-tree ヘルパーパターン（lines 5–75 — そのままコピー）:**
```typescript
import { describe, it, expect } from 'vitest'
import type { ReactElement } from 'react'

type AnyEl = ReactElement<Record<string, unknown>> & { type: unknown }

function isElement(node: unknown): node is AnyEl { ... }
function flattenChildren(children: unknown): unknown[] { ... }
function findByType(node: unknown, target: unknown): AnyEl | null { ... }
function findAllByTag(node: unknown, tag: string): AnyEl[] { ... }
function collectText(node: unknown): string[] { ... }
function findAllByClassName(node: unknown, predicate: (cls: string) => boolean): AnyEl[] { ... }
```
→ jsdom を使わない element-tree 直接検査パターン。`CommitGrid.test.tsx` から一字一句コピーできる。

**フィクスチャパターン（lines 79–93 — CommitGrid.test.tsx の slot / feedItem を参考）:**
```typescript
import CommitGoalRow from '../CommitGoalRow'
import type { Member, CommitSlot, FeedItem } from '@/lib/types'

function makeMember(): Member {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Test User',
    publicationId: 'test-pub',
    teams: [],
    addedAt: '2026-01-01T00:00:00.000Z',
  }
}
```

**streak=0/1/≥2 の3状態テストパターン（ACHIEV-01, ACHIEV-02）:**
```typescript
describe('CommitGoalRow ACHIEV-01: streak=1 で 👑 を表示', () => {
  it('streak=1 のとき 👑 テキストを含む', () => {
    const el = CommitGoalRow({ member: makeMember(), items: [], slots: [], streak: 1 })
    const texts = collectText(el)
    expect(texts.some(t => t.includes('👑'))).toBe(true)
  })
})

describe('CommitGoalRow ACHIEV-02: streak≥2 で 👑🔥 を表示', () => {
  it('streak=2 のとき 👑🔥 テキストを含む', () => {
    const el = CommitGoalRow({ member: makeMember(), items: [], slots: [], streak: 2 })
    const texts = collectText(el)
    expect(texts.some(t => t.includes('👑') && t.includes('🔥'))).toBe(true)
  })
})

describe('CommitGoalRow streak=0 でアイコンなし', () => {
  it('streak=0 のとき aria-hidden div のみ', () => {
    const el = CommitGoalRow({ member: makeMember(), items: [], slots: [], streak: 0 })
    const texts = collectText(el)
    expect(texts.some(t => t.includes('👑'))).toBe(false)
    expect(texts.some(t => t.includes('🔥'))).toBe(false)
  })
})
```

**Next.js Link の迂回パターン（CommitGrid.test.tsx 既存アプローチを踏襲）:**
```typescript
// CommitGoalRow に Link が含まれるが、element-tree 検査は Link 要素を
// 文字列型チェック（type === 'a' や type === Link コンポーネント参照）で
// スキップして子要素を再帰探索できるため jsdom 不要。
// findByType / collectText は型を問わず children を再帰するので Link 内のテキストも取得可能。
```

---

## Shared Patterns

### JST日付キー変換
**Source:** `src/lib/calendarUtils.ts`（lines 28–36）
**Apply to:** `commitUtils.ts` の `buildArticleDateMap` 内部ヘルパー
```typescript
export function isoToJSTDateKey(isoDate: string): string | null {
  const ms = Date.parse(isoDate)
  if (isNaN(ms)) return null
  const jst = new Date(ms + 9 * 60 * 60 * 1000)
  const year = jst.getUTCFullYear()
  const month = String(jst.getUTCMonth() + 1).padStart(2, '0')
  const day = String(jst.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
```

### 週日付配列生成
**Source:** `src/lib/commitUtils.ts`（lines 9–33）
**Apply to:** `isCurrentWeekComplete`（引数として受け取る）、`consecutiveWeekStreak`（内部で呼ぶ）、`sortMembersForCommitView`（`getWeekDates(0)` で今週取得）
```typescript
export function getWeekDates(mondayOffsetWeeks: number): string[]
// mondayOffsetWeeks=0 → 今週, =-1 → 先週, =-2 → 2週前
// 返り値 index 0 = Monday, index 6 = Sunday（JST基準）
```

### Server Component アーキテクチャパターン
**Source:** `src/components/CommitGoalView.tsx`（lines 1, 11–14）
**Apply to:** `CommitGoalView.tsx`（変更後も継続）、`CommitGoalRow.tsx`（変更後も継続）
```typescript
// Server Component — do NOT add 'use client'
// 計算は CommitGoalView で実施 → props 経由で CommitGoalRow に渡す
// CommitGoalRow は表示のみ担当（streak 計算は行わない）
```

### element-tree テストヘルパーパターン
**Source:** `src/components/__tests__/CommitGrid.test.tsx`（lines 5–75）
**Apply to:** `src/components/__tests__/CommitGoalRow.test.tsx`（新規ファイルで全ヘルパーをコピー）
```typescript
// jsdom なしで React Server Component を直接テストするパターン
// findAllByClassName / collectText / findByType の3関数セットが核心
```

### Tailwind CSS 幅ユーティリティ（列幅の一貫性）
**Source:** `src/components/CommitGoalRow.tsx`（line 50）、`src/components/CommitGoalView.tsx`（line 35）
**Apply to:** 両ファイルの Column 3 / ヘッダースペーサー（Pitfall 3 対策として原子的に変更）
```typescript
// streak=0 or 1: Column 3 = "w-8 shrink-0"（32px）
// streak≥2:      Column 3 = "w-10 shrink-0"（40px）
// ヘッダースペーサーは最大幅 w-10 に固定して列ずれを防ぐ
```

---

## No Analog Found

このフェーズで analog なしのファイルはなし。全ファイルにコードベース内の直接アナログが存在する。

---

## Metadata

**Analog search scope:** `src/lib/`, `src/components/`, `src/lib/__tests__/`, `src/components/__tests__/`
**Files scanned:** 8
**Pattern extraction date:** 2026-06-05
```

