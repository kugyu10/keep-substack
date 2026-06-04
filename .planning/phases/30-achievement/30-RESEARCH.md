# Phase 30: アチーブメント（👑 / 🔥） - Research

**Researched:** 2026-06-05
**Domain:** TypeScript pure-logic (commitUtils.ts) + React Server Component props wiring
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** `consecutiveWeekStreak` は今週（進行中）を含める。今週の全スロットに投稿があれば streak = 1、先週も全達成なら streak = 2 → 🔥 表示。🔥 が点灯するとき常に今週も達成済み（👑 の条件も満たす）。
- **D-02:** 両条件を満たすとき（streak ≥ 2）は 👑🔥 を並べて表示。列幅は `w-8`（32px）を streak ≥ 2 時に `w-10`（40px）に拡張してよい。ヘッダー行スペーサーも同幅に揃える。
  - streak = 0: アイコンなし
  - streak = 1（今週のみ達成）: 👑 のみ
  - streak ≥ 2（今週 + 先週以上）: 👑🔥 並列
- **D-03:** `sortMembersForCommitView` を Phase 30 で完全版に更新。優先順位: ①今週の実績率（達成スロット / 全スロット）降順 → ②ストリーク週数（`consecutiveWeekStreak`）降順 → ③`member.addedAt` 昇順。

### Claude's Discretion

- 計算関数のシグネチャと配置: `commitUtils.ts` に `isCurrentWeekComplete(slots, items)` と `consecutiveWeekStreak(slots, items)` を追加。Server Component で計算し結果を `CommitGoalRow` の props（`streak: number`）に渡す形が自然。
- 21日データで計算できるストリーク上限（3週）で十分。既存の `cutoff` フィルタを変更しない。
- アイコンのフォントサイズ: `text-sm`（14px）。

### Deferred Ideas (OUT OF SCOPE)

- ストリーク週数のバッジ化（例: 🔥×4 など連続週数を数字で表示）
- 未コミットメンバーをリスト下部に移動するソート変更
- マジックリンクの ?handle= 伝搬バグ（auth 問題、スコープ外）
- 1人が複数チームに所属できる多対多

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ACHIEV-01 | 👑 icon is shown when all commit slots for the current week have at least one article posted | `isCurrentWeekComplete(slots, items)` を `commitUtils.ts` に実装し、`CommitGoalRow` に `streak` prop で渡す |
| ACHIEV-02 | 🔥 icon is shown when the member has achieved full-slot completion in 2 or more consecutive weeks | `consecutiveWeekStreak(slots, items)` が ≥ 2 のとき 🔥 を表示。既存 `getWeekDates` / `matchArticleToSlot` で実装可能 |

</phase_requirements>

---

## Summary

Phase 30 は外部パッケージを一切追加しない純粋なロジック実装フェーズ。`commitUtils.ts` に2つの計算関数を追加し、既存の Server Component データフロー（`page.tsx` → `CommitGoalView` → `CommitGoalRow`）に streak 数値を流すだけで完結する。

既存コードは既に基盤を整備済み: `getWeekDates(mondayOffsetWeeks)` でどの週の日付配列も取得でき、`matchArticleToSlot(slot, weekDates, articleDateMap)` でスロット×記事マッチングが行える。`isCurrentWeekComplete` はこれら2関数を組み合わせて「全スロットに記事があるか」を判定するだけ。`consecutiveWeekStreak` は `mondayOffsetWeeks = 0, -1, -2` を順番に確認し、連続する達成週数を返す。

UI 側は `CommitGoalRow.tsx` の Column 3 プレースホルダー `<div className="w-8 shrink-0" aria-hidden="true" />` を streak 値に応じた条件分岐（streak=0: 空 div / streak=1: 👑 / streak≥2: 👑🔥）に差し替えるだけ。`CommitGoalView.tsx` ではヘッダースペーサーの幅同期と streak 計算の呼び出しを追加する。

**Primary recommendation:** `commitUtils.ts` にロジックを集中させ、`CommitGoalView` で per-member streak を計算してから `CommitGoalRow` に `streak: number` prop として渡す。

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| isCurrentWeekComplete ロジック | Library (`commitUtils.ts`) | — | ピュア計算、テスト可能に分離 |
| consecutiveWeekStreak ロジック | Library (`commitUtils.ts`) | — | 同上 |
| sortMembersForCommitView (D-10完全版) | Library (`commitUtils.ts`) | — | ソートもピュア関数として維持 |
| streak 計算の呼び出し | Frontend Server (`CommitGoalView`) | — | 既存データ（slots, items）がここに集まっている |
| 👑🔥 アイコン表示 | Frontend Server (`CommitGoalRow`) | — | streak prop を受け取るだけ、表示ロジック最小化 |

---

## Standard Stack

### Core（既存、追加インストール不要）

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.2.6 | App Router / Server Components | プロジェクト標準 [ASSUMED] |
| React | 19.2.4 | JSX レンダリング | プロジェクト標準 [ASSUMED] |
| Tailwind CSS | ^4 | スタイリング | プロジェクト標準 [ASSUMED] |
| TypeScript | ^5 | 型安全 | プロジェクト標準 [ASSUMED] |
| Vitest | ^4.1.6 | 単体テスト | プロジェクト標準 [ASSUMED] |

**新規パッケージなし。** Phase 30 は外部ライブラリを一切追加しない。

---

## Package Legitimacy Audit

> このフェーズは外部パッケージを追加しないため、Package Legitimacy Gate は不適用。

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
page.tsx (Server Component)
  │ filteredMembers, slots (member_commit_slots), results21 (21-day items)
  ▼
CommitGoalView (Server Component)
  │ per member: memberSlots = slots.filter(s => s.member_id === member.id)
  │ per member: streak = consecutiveWeekStreak(memberSlots, items)
  │ sorted = sortMembersForCommitView(results, slots)  ← D-10 完全版
  ▼
CommitGoalRow (Server Component)
  │ props: member, items, slots, imageUrl, streak
  │ Column 3: streak=0→空div / streak=1→👑 / streak≥2→👑🔥
  ▼
[ブラウザ — 静的 HTML]
```

### Recommended Project Structure（変更なし）

```
src/
├── lib/
│   └── commitUtils.ts        # isCurrentWeekComplete, consecutiveWeekStreak 追加
├── components/
│   ├── CommitGoalView.tsx    # streak 計算呼び出し + props 渡し
│   └── CommitGoalRow.tsx     # streak prop 追加, Column 3 差し替え
└── app/
    └── page.tsx              # 変更なし（streak 計算は CommitGoalView 内）
```

### Pattern 1: isCurrentWeekComplete 実装パターン

**What:** 全スロットに今週の投稿があるか判定する純粋関数
**When to use:** `consecutiveWeekStreak` の内部ヘルパーとして、および単体テスト対象として

```typescript
// Source: 既存 matchArticleToSlot + getWeekDates を組み合わせたパターン [ASSUMED]
import { isoToJSTDateKey } from './calendarUtils'
import type { CommitSlot, FeedItem } from './types'

/**
 * 指定した週（weekDates）において、全スロットに記事が1件以上あれば true。
 * スロットが0件の場合は false（未コミットメンバーは達成不可）。
 */
export function isCurrentWeekComplete(
  slots: CommitSlot[],
  weekDates: string[],          // getWeekDates(mondayOffsetWeeks) の返り値
  articleDateMap: Map<string, FeedItem[]>
): boolean {
  if (slots.length === 0) return false
  return slots.every((slot) => {
    const dateKey = weekDates[slot.day_of_week - 1]
    if (!dateKey) return false
    const articles = articleDateMap.get(dateKey)
    return articles !== undefined && articles.length > 0
  })
}
```

### Pattern 2: consecutiveWeekStreak 実装パターン

**What:** 今週から過去に向かって連続達成週数を返す
**When to use:** CommitGoalView で per-member に計算

```typescript
// Source: getWeekDates(-2), getWeekDates(-1), getWeekDates(0) を活用 [ASSUMED]
/**
 * 今週 (offset=0) から最大3週さかのぼって連続達成週数を返す。
 * 今週未達成 → 0
 * 今週のみ達成 → 1
 * 今週+先週達成 → 2
 * 今週+先週+2週前達成 → 3
 */
export function consecutiveWeekStreak(
  slots: CommitSlot[],
  items: FeedItem[]
): number {
  // Build articleDateMap from items (同じパターンを CommitGrid も使用)
  const articleDateMap = new Map<string, FeedItem[]>()
  for (const item of items) {
    if (!item.isoDate) continue
    const key = isoToJSTDateKey(item.isoDate)
    if (!key) continue
    const existing = articleDateMap.get(key) ?? []
    existing.push(item)
    articleDateMap.set(key, existing)
  }

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

### Pattern 3: CommitGoalRow の streak prop 追加

**What:** 既存 Column 3 プレースホルダーを streak 値で出し分け
**When to use:** CommitGoalRow が streak prop を受け取るように型拡張

```typescript
// Source: 30-UI-SPEC.md Achievement Icon Display Contract [VERIFIED: codebase]
type CommitGoalRowProps = {
  member: Member
  items: FeedItem[]
  slots: CommitSlot[]
  imageUrl?: string
  streak: number  // 追加
}

// Column 3 の差し替え
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

### Pattern 4: D-10 完全版ソート

**What:** 実績率 → ストリーク → addedAt の3段ソート
**When to use:** `sortMembersForCommitView` の `_slots` 予約パラメーターを実際のロジックに使う

```typescript
// Source: CONTEXT.md D-03 [ASSUMED]
export function sortMembersForCommitView(
  results: MemberFeedResult[],
  slots: CommitSlot[]
): MemberFeedResult[] {
  const thisWeekDates = getWeekDates(0)

  return [...results].sort((a, b) => {
    const aSlots = slots.filter((s) => s.member_id === a.member.id)
    const bSlots = slots.filter((s) => s.member_id === b.member.id)

    // ①今週の実績率（達成スロット / 全スロット）降順
    const aRate = achievementRate(aSlots, thisWeekDates, buildArticleDateMap(a.items))
    const bRate = achievementRate(bSlots, thisWeekDates, buildArticleDateMap(b.items))
    if (bRate !== aRate) return bRate - aRate

    // ②ストリーク降順
    const aStreak = consecutiveWeekStreak(aSlots, a.items)
    const bStreak = consecutiveWeekStreak(bSlots, b.items)
    if (bStreak !== aStreak) return bStreak - aStreak

    // ③登録順昇順
    return a.member.addedAt.localeCompare(b.member.addedAt)
  })
}
```

### Anti-Patterns to Avoid

- **`isCurrentWeekComplete` を CommitGrid 内で実装する:** テスト不可能になる。`commitUtils.ts` に分離すること。
- **`items` から articleDateMap を再構築するロジックを各関数で重複実装する:** 内部ヘルパー `buildArticleDateMap(items)` を切り出して共有する。
- **`streak` の型を `boolean` にする:** `streak=0 / 1 / ≥2` の3状態なので `number` が正しい。
- **`week2Dates` を `CommitGrid` から再計算する:** `getWeekDates(0)` はどこからでも呼べる純粋関数なので `CommitGoalView` で呼べばよい。

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 週の日付配列生成 | 独自の日付計算 | `getWeekDates(mondayOffsetWeeks)` | JST対応済み、テスト済み [VERIFIED: codebase] |
| スロット×記事マッチング | 独自マッチング | `matchArticleToSlot` | day_of_week 1-indexed → weekDates 0-indexed 変換済み [VERIFIED: codebase] |
| JST日付キー変換 | UTC→JST手計算 | `isoToJSTDateKey` from `calendarUtils` | タイムゾーンバグを防ぐ [VERIFIED: codebase] |
| アイコン表示 | カスタムSVG/画像 | Unicode emoji (👑 🔥) | UI-SPEC で確定 [VERIFIED: codebase] |

**Key insight:** 基盤ユーティリティはすでに Phase 29 で実装済み。今フェーズの仕事は組み合わせのみ。

---

## Common Pitfalls

### Pitfall 1: articleDateMap の二重構築

**What goes wrong:** `consecutiveWeekStreak` が3回ループする際、毎回 `items` から `articleDateMap` を再構築するとパフォーマンスが劣化する（items が多い場合）。
**Why it happens:** ループ内で Map 構築処理を入れると O(weeks × items) になる。
**How to avoid:** `articleDateMap` を一度だけ構築し、ループ外で保持する。
**Warning signs:** 関数シグネチャに `items: FeedItem[]` が直接渡っていて、関数内で `isoToJSTDateKey` を呼んでいる箇所が3回ある。

### Pitfall 2: スロット0件メンバーの streak

**What goes wrong:** slots が空の場合、`every()` は空配列に対して `true` を返す（vacuous truth）。
**Why it happens:** `Array.prototype.every([])` は JavaScript の仕様で常に `true`。
**How to avoid:** `if (slots.length === 0) return false` を `isCurrentWeekComplete` の先頭に入れる。
**Warning signs:** 未コミットメンバーに 👑 が付く。

### Pitfall 3: CommitGoalView ヘッダースペーサーの幅漏れ

**What goes wrong:** `CommitGoalRow` の Column 3 を `w-10` にしたのに `CommitGoalView` のヘッダースペーサーが `w-8` のまま → 列ずれ。
**Why it happens:** 2ファイルにまたがる独立した `className` で幅を管理しているため。
**How to avoid:** 両方を同じタスクで原子的に変更する。UI-SPEC が「Header Spacer Sync」として明示。
**Warning signs:** ヘッダーの「今週」ラベルが achievement 列に被る。

### Pitfall 4: D-10ソートで slots を filter し忘れる

**What goes wrong:** `achievementRate` に全 slots を渡してしまい、他メンバーのスロット数が分母に入る。
**Why it happens:** `sortMembersForCommitView` は全メンバーの全スロットを受け取るため。
**How to avoid:** ソート関数内で `const aSlots = slots.filter(s => s.member_id === a.member.id)` を実行する。
**Warning signs:** コミット4スロットのメンバーと2スロットのメンバーの実績率が正しくならない。

### Pitfall 5: streak 計算を CommitGoalRow 内で行う

**What goes wrong:** `CommitGoalRow` が `items` と `slots` から streak を計算すると、Server Component の描画ごとに計算が走り、かつテストしづらい。
**Why it happens:** props に計算済み値を渡すより「全部 Row に渡せばいい」という発想。
**How to avoid:** `CommitGoalView` で計算して `streak: number` を props に渡す。`CommitGoalRow` は表示だけ担当。
**Warning signs:** `CommitGoalRow` が `isoToJSTDateKey` や `getWeekDates` を import している。

---

## Code Examples

### isCurrentWeekComplete の単体テスト例

```typescript
// Source: 既存 commitUtils.test.ts のパターンを踏襲 [VERIFIED: codebase]
import { isCurrentWeekComplete, getWeekDates } from '../commitUtils'

it('全スロットに記事があれば true を返す', () => {
  const slots = [{ member_id: 'uuid-1', day_of_week: 1, hour: 10 }]
  const weekDates = ['2026-06-01', '2026-06-02', ..., '2026-06-07']
  const map = new Map([['2026-06-01', [{ isoDate: '2026-06-01T01:00:00.000Z' }]]])
  expect(isCurrentWeekComplete(slots, weekDates, map)).toBe(true)
})

it('スロットが0件なら false を返す（vacuous truth 防止）', () => {
  expect(isCurrentWeekComplete([], ['2026-06-01', ...], new Map())).toBe(false)
})
```

### consecutiveWeekStreak のテスト観点

```typescript
// 今週達成・先週未達成 → streak = 1 (👑 のみ)
// 今週達成・先週達成・2週前未達成 → streak = 2 (👑🔥)
// 今週未達成 → streak = 0
// スロット0件 → streak = 0
```

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.6 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run src/lib/__tests__/commitUtils.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ACHIEV-01 | `isCurrentWeekComplete` が全スロット達成時 true を返す | unit | `npx vitest run src/lib/__tests__/commitUtils.test.ts` | ❌ Wave 0（関数未実装） |
| ACHIEV-01 | `isCurrentWeekComplete` がスロット0件で false を返す | unit | 同上 | ❌ Wave 0 |
| ACHIEV-01 | `CommitGoalRow` が streak=1 で 👑 を表示する | unit | `npx vitest run src/components/__tests__/CommitGoalRow.test.tsx` | ❌ Wave 0（ファイル未作成） |
| ACHIEV-02 | `consecutiveWeekStreak` が今週のみ達成で 1 を返す | unit | `npx vitest run src/lib/__tests__/commitUtils.test.ts` | ❌ Wave 0（関数未実装） |
| ACHIEV-02 | `consecutiveWeekStreak` が2週連続達成で 2 を返す | unit | 同上 | ❌ Wave 0 |
| ACHIEV-02 | `CommitGoalRow` が streak≥2 で 👑🔥 を表示する | unit | `npx vitest run src/components/__tests__/CommitGoalRow.test.tsx` | ❌ Wave 0 |
| D-10 | `sortMembersForCommitView` が実績率→ストリーク→addedAt で正しくソートする | unit | `npx vitest run src/lib/__tests__/commitUtils.test.ts` | 既存テストあり（更新要）✅ |

### Sampling Rate

- **Per task commit:** `npx vitest run src/lib/__tests__/commitUtils.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green（現在 89 tests passing）before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/lib/__tests__/commitUtils.test.ts` — `isCurrentWeekComplete` / `consecutiveWeekStreak` / D-10 完全版ソートのテストケース追加（既存ファイル拡張）
- [ ] `src/components/__tests__/CommitGoalRow.test.tsx` — streak=0/1/≥2 の3状態表示テスト（新規作成）

---

## Security Domain

> このフェーズは表示ロジックのみ。新規 DB アクセス・認証・ユーザー入力なし。

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | no | items は既存パイプラインで取得済み |
| V6 Cryptography | no | — |

Unicode emoji を JSX に直接書くのは XSS リスクなし（React は文字列をエスケープする）。

---

## Environment Availability

> このフェーズは外部依存なし（コード・設定変更のみ）。Step 2.6 SKIPPED (no external dependencies identified)

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `sortMembersForCommitView` が this-week count のみでソート | 実績率 → ストリーク → addedAt の3段ソート | Phase 30 D-03 | 達成率の高い順・継続者優先の表示 |
| Column 3 が `<div aria-hidden="true" />` のプレースホルダー | streak 値による 👑 / 👑🔥 / 空 の条件分岐 | Phase 30 | ACHIEV-01/02 満足 |

**Deprecated/outdated:**
- `sortMembersForCommitView` の `_slots` 予約パラメーター: Phase 30 で実際のロジックに使用開始。`_` プレフィックスと `// eslint-disable` コメントを削除する。

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Next.js 16.2.6、React 19.2.4、Vitest ^4.1.6 などのバージョン | Standard Stack | ほぼゼロ — package.json から直接取得 |
| A2 | `isCurrentWeekComplete` / `consecutiveWeekStreak` の具体的なシグネチャ（articleDateMap を引数に取る形） | Code Examples | 内部 API のため実装時に調整可。`buildArticleDateMap` ヘルパー抽出が必要になる可能性あり |
| A3 | D-10 ソートで `achievementRate` という内部ヘルパー関数を作る | Architecture Patterns | 実装判断。インライン計算でもよい |

**備考:** 全ての主張はコードベースの直接読み取り（VERIFIED: codebase）または CONTEXT.md / UI-SPEC.md（VERIFIED: planning docs）から導出。外部ライブラリ調査は不要。

---

## Open Questions (RESOLVED)

1. **`buildArticleDateMap` の重複実装をどうするか**
   - What we know: `CommitGrid.tsx` と `consecutiveWeekStreak` で同じ articleDateMap 構築ロジックが必要
   - What's unclear: `commitUtils.ts` にエクスポート関数として切り出すか、private ヘルパーにとどめるか
   - RESOLVED: `commitUtils.ts` に非エクスポートの内部ヘルパーとして実装。`CommitGrid` は現行のインライン実装を維持（変更最小化）

2. **`CommitGoalRow.test.tsx` のテスト手法**
   - What we know: 既存 `CommitGrid.test.tsx` は jsdom を使わずに React element tree を直接検査している
   - What's unclear: `CommitGoalRow` に `Link` コンポーネント（Next.js）が含まれるため、同じ手法が使えるか
   - RESOLVED: `Link` は文字列型チェックで迂回できる（既存パターン踏襲）。`findByType(el, 'div')` / `collectText()` で streak 値ごとの DOM 出力を検証

---

## Sources

### Primary (HIGH confidence)

- `src/lib/commitUtils.ts` — 既存関数 `getWeekDates`, `matchArticleToSlot`, `sortMembersForCommitView` の実装を直接確認 [VERIFIED: codebase]
- `src/components/CommitGoalRow.tsx` — Column 3 プレースホルダー（line 49–50）を直接確認 [VERIFIED: codebase]
- `src/components/CommitGoalView.tsx` — ヘッダースペーサー（line 35）を直接確認 [VERIFIED: codebase]
- `src/lib/calendarUtils.ts` — `isoToJSTDateKey` 実装を直接確認 [VERIFIED: codebase]
- `src/lib/__tests__/commitUtils.test.ts` — テストパターンを直接確認 [VERIFIED: codebase]
- `.planning/phases/30-achievement/30-CONTEXT.md` — ロック決定 D-01, D-02, D-03 [VERIFIED: planning docs]
- `.planning/phases/30-achievement/30-UI-SPEC.md` — Achievement Icon Display Contract [VERIFIED: planning docs]
- `package.json` — バージョン確認 [VERIFIED: codebase]
- `npx vitest run` — 89 tests passing 確認 [VERIFIED: runtime]

### Secondary (MEDIUM confidence)

なし（全ての主張はコードベースから直接確認済み）

### Tertiary (LOW confidence)

なし

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — package.json から直接確認
- Architecture: HIGH — コードベース全体を読んで確認
- Pitfalls: HIGH — 既存コードのパターンと JavaScript 仕様から導出

**Research date:** 2026-06-05
**Valid until:** フェーズ実装完了まで（コードベース変更が少ないため安定）
