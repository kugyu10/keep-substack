# Phase 29: Commit & Goal View — 新トップページ - Research

**Researched:** 2026-06-04
**Domain:** Next.js App Router (Server Components) + Tailwind CSS v4 + Supabase (RLS/data)
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** セル幅統一: 固定グリッドで全メンバーの CommitGrid 総横幅を同一にする。週N回 × 3週 = N×3 セルで、LCM=12 ベースの 36列グリッド [col-span-12/6/4/3] またはプランナーが最適解を決定
- **D-02:** 週の区切りに細い縦線 (`border-l border-gray-200`) を入れる
- **D-03:** 未投稿スロットの曜日名: 日本語2文字（月/火/水/木/金/土/日）、ISO 8601 day_of_week マッピング（1=月〜7=日）
- **D-04:** 3週分の記事データは `fetchAllFeedsCached` を流用（21日フィルタ）
- **D-05:** `member_commit_slots` は `src/app/page.tsx` (Server Component) で全メンバー分まとめて Supabase SELECT、props として `CommitGoalView` に渡す
- **D-06:** `member_commit_slots` に `anon` SELECT policy 追加（公開読み取り OK）→ `schema.sql` + 新規 migration ← **注意: 既に Phase 28 migration で実施済み（下記「重要な発見」参照）**
- **D-07:** CSS-only スマホ縮退（JS viewport 検知不要）
- **D-08:** 縮退時は最新週のみ表示
- **D-09:** Phase 29 では Achievement 列スペース確保のみ（`w-8` の空 div）
- **D-10:** 並び順: ①今週実績率降順 → ②ストリーク週数降順 → ③登録順（id 昇順）— 仮実装

### Claude's Discretion

- `/weekly-stamp` 移行: 既存 `src/app/page.tsx` のロジックを `src/app/weekly-stamp/page.tsx` としてコピー、`src/app/page.tsx` を新規 CommitGoalView に差し替え
- 固定グリッドの具体的列数実装（36列 or 他アプローチ）: 均一性を保てる方法をプランナーが選択
- `member_commit_slots` の Supabase クライアント種別: 公開ページのため `server` クライアント（`getUser()` 不要）で OK
- `revalidate` 値: 既存の `300`（5分）を踏襲

### Deferred Ideas (OUT OF SCOPE)

- メンバー並び順の最終確定 — 今週の実績率 → ストリーク → 登録順は仮。運用後に調整予定
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VIEW-01 | Current home page (weekly heatmap) is accessible at `/weekly-stamp` | `src/app/page.tsx` をコピーして `src/app/weekly-stamp/page.tsx` を作成。既存ロジック・imports 完全移行 |
| VIEW-02 | New home page (`/`) displays Commit & Goal View with one row per member | 新規 `src/app/page.tsx` で Server Component として `CommitGoalView` をレンダリング |
| VIEW-03 | Each row layout: `| avatar + name | Commit Grid | Achievement icons |` | `HeatmapRow` の flex 構造（`w-16 sm:w-52` + `flex-1` + `w-8`）を踏襲 |
| VIEW-04 | Commit Grid spans 3 weeks horizontally; total width same for 1–4 weekly commits | 36列グリッド（`col-span-12/6/4/3`）or シンプルな 3/6/9/12 列グリッドで対応 |
| VIEW-05 | Posted cells show thumbnail; unposted cells show day name | `FeedItem.thumbnail` + `FeedItem.isoDate` でスロットマッチング |
| VIEW-06 | Members with no commit setup show grey `| 未コミット |` cell | `member_commit_slots` が 0 件のメンバー分岐 |
| VIEW-07 | On narrow mobile viewports, Grid collapses to 1-week display | `hidden sm:flex` + `flex` CSS-only 縮退（D-07/D-08） |
</phase_requirements>

---

## Summary

Phase 29 は既存のヒートマップビューを `/weekly-stamp` に移動し、新しい Commit & Goal View を `/` として実装する。主要な作業は 2 つのグループに分かれる。(1) ルート移行と `member_commit_slots` データ取得ロジックの構築、(2) `CommitGoalView` / `CommitGrid` コンポーネントの実装。

スタックは確立済み：Next.js 16 (App Router) + Tailwind v4 + Supabase + Vitest。新しい外部パッケージは不要。既存コードパターン（Server Component → Client Component props 渡し、`fetchAllFeedsCached`、`HeatmapRow` レイアウト、ISR `revalidate=300`）を最大限流用できる。

**重要な発見（プランナーへ）:** CONTEXT.md D-06 では「`anon` SELECT policy を追加する migration が必要」とあるが、**Phase 28 の migration `20260602000001_add_member_commit_slots.sql` ですでに `"public select member_commit_slots"` policy が作成されている。** この policy は `USING (true)` で anon/authenticated 両ロール対応済み。`schema.sql` にも同ポリシーが存在する。よって D-06 の migration タスクは**不要**（または「確認のみ」に格下げ）。

**Primary recommendation:** Plan 01 をルート移行 + データ層（型定義 + Supabase SELECT + `fetchAllFeedsCached` フィルタリング）に集中させ、Plan 02 を UI コンポーネント（`CommitGoalView` + `CommitGrid` + レスポンシブ縮退）に集中させる。

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| ルート移行 (`/` → `/weekly-stamp`) | Frontend Server (Next.js App Router) | — | ファイルシステムベースルーティング。`src/app/weekly-stamp/page.tsx` 作成のみ |
| `member_commit_slots` 全件 SELECT | API / Backend (Server Component) | Database | `page.tsx` (Server Component) でまとめて取得、props 渡し (D-05) |
| 3週分記事データ取得 | API / Backend (Server Component) | CDN/KV cache | `fetchAllFeedsCached` 流用、ISR revalidate=300 |
| CommitGrid レンダリング | Frontend Server (SSR) → Client | — | CommitGoalView は 'use client' または Server Component。インタラクションなしなら Server でよい |
| レスポンシブ縮退 | Browser / Client | — | CSS-only (`hidden sm:flex`)、JS不要 (D-07) |
| RLS / データ公開制御 | Database (Supabase RLS) | — | Phase 28 migration で実施済み |
| Achievement スペース確保 | Frontend Server (SSR) | — | 空 `div w-8`、Phase 30 が後続実装 |

---

## Standard Stack

### Core（新規パッケージなし）

| Library | Verified Version | Purpose | Why Standard |
|---------|-----------------|---------|--------------|
| next | 16.2.6 | App Router / RSC / ISR | プロジェクト確定スタック |
| react | 19.2.4 | UI コンポーネント | プロジェクト確定スタック |
| tailwindcss | ^4 | ユーティリティ CSS | プロジェクト確定スタック |
| @supabase/supabase-js | ^2.105.4 | DB クライアント | プロジェクト確定スタック |
| @supabase/ssr | ^0.10.3 | Server Component 対応 cookie | プロジェクト確定スタック |

[VERIFIED: package.json] — すべて既存 `package.json` に記載済み。新規インストール不要。

### Supporting（流用）

| Asset | Path | Purpose |
|-------|------|---------|
| `fetchAllFeedsCached` | `src/lib/fetchFeed.ts` | 全メンバーの記事を KV + ライブで取得、21日フィルタに使用 |
| `HeatmapRow` レイアウト | `src/components/HeatmapRow.tsx` | 行レイアウト参照（flex 構造・widths・レスポンシブ） |
| `isoToJSTDateKey` | `src/lib/calendarUtils.ts` | ISO 日付 → JST 日付キー変換 |
| `getRecentDays` | `src/lib/heatmapUtils.ts` | 週ごとの日付配列生成パターン参照 |
| `createSupabaseAdminClient` | `src/lib/supabase/admin.ts` | Supabase admin client（`member_commit_slots` SELECT に使用） |

[VERIFIED: codebase] — すべて実装済みで動作確認可能。

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| 36列 CSS Grid | flexbox + percentage widths | Grid のほうが `col-span-N` でセル幅統一が直感的 |
| Server Component (CommitGoalView) | 'use client' | インタラクションなし (Phase 29 スコープ) ならサーバーで十分。週切替ボタンが不要なため WeeklyHeatmapGrid と異なりサーバー化可能 |
| admin client for `member_commit_slots` SELECT | server (anon) client | 公開ページなので anon client でも動作するが、admin client は確実に RLS をバイパスする。どちらでも可（D-05 は server client を推奨） |

**Installation:** 新規インストール不要。

---

## Package Legitimacy Audit

このフェーズで新規外部パッケージのインストールはない。

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
[Browser Request /]
       |
       v
[src/app/page.tsx (Server Component, revalidate=300)]
       |
       |-- getMembers() ──────────────────> [Supabase: members + teams JOIN]
       |-- admin.from('member_commit_slots').select() -> [Supabase: member_commit_slots]
       |-- fetchAllFeedsCached(members) ----> [KV archive + live RSS feed]
       |       |── 21日フィルタ (isoDate)
       v
[CommitGoalView (Server or 'use client' Component)]
       |
       |-- (per member) member has slots?
       |       YES: CommitGrid(slots, articles21days)
       |           |-- [WeekBlock x3: oldest → newest]
       |           |       |-- (per slot per day) article found?
       |           |               YES: <img thumbnail> (posted cell)
       |           |               NO:  曜日名 (unposted cell)
       |           |-- [Mobile: hidden sm:flex on oldest 2 weeks]
       |       NO:  "未コミット" グレーセル
       |
       |-- Achievement area: empty div w-8 (Phase 30 placeholder)
       v
[Browser renders HTML (ISR cache hit on next request within 300s)]
```

```
[Browser Request /weekly-stamp]
       |
       v
[src/app/weekly-stamp/page.tsx (identical to old page.tsx)]
       → WeeklyHeatmapGrid (unchanged)
```

### Recommended Project Structure

```
src/
├── app/
│   ├── page.tsx                    # 新規: CommitGoalView ページ (Server Component)
│   ├── weekly-stamp/
│   │   └── page.tsx                # 新規: 旧トップページを移行
│   └── ...
├── components/
│   ├── CommitGoalView.tsx           # 新規: メンバーリスト (Server or Client)
│   ├── CommitGoalRow.tsx            # 新規: 1行 (avatar+name | grid | achievement)
│   ├── CommitGrid.tsx               # 新規: 3週グリッド
│   └── ...
└── lib/
    ├── commitUtils.ts               # 新規: スロットマッチング・並び順ロジック
    └── types.ts                     # 既存: CommitSlot 型を追加
```

### Pattern 1: Server Component データ取得 → Client Component props 渡し

**What:** `page.tsx` (Server Component) がデータを全量取得し、UI コンポーネントに props として渡す
**When to use:** ページ全体が ISR で SSR される公開ページ。インタラクションは最小

```tsx
// src/app/page.tsx (Server Component) — 確立済みパターン踏襲
export const revalidate = 300

export default async function Home({ searchParams }: Props) {
  const allMembers = await getMembers()
  const admin = createSupabaseAdminClient()
  
  // 全メンバーのコミットスロットをまとめて取得 (D-05)
  const { data: slotsData } = await admin
    .from('member_commit_slots')
    .select('member_id, day_of_week, hour')
    .in('member_id', allMembers.map(m => m.id)) // member.id が必要 → 型拡張要
  
  // 3週分の記事取得 (D-04)
  const results = await fetchAllFeedsCached(filteredMembers)
  // 21日フィルタはコンポーネント or util で適用
  
  return <CommitGoalView results={results} slots={slotsData ?? []} />
}
```

[VERIFIED: codebase] — `src/app/page.tsx` および `src/app/my/page.tsx` で確立済みパターン

### Pattern 2: 36列 CSS Grid によるセル幅統一

**What:** 週N回 × 3週 = N×3 セルの総幅を全メンバーで統一する
**When to use:** D-01 の「横幅統一」要件

```tsx
// 実装オプション A: grid-cols-{N*3} (シンプル)
// 週1: grid grid-cols-3、週2: grid grid-cols-6 等
// → 各週ブロックの幅は (N / N*3) = 1/3 で統一

// 実装オプション B: 36列グリッド (CONTEXT.md D-01 推奨)
// 週1: col-span-12 (36/3=12)
// 週2: col-span-6  (36/6=6)
// 週3: col-span-4  (36/9=4)
// 週4: col-span-3  (36/12=3)
// → ただし週3は 9セル × col-span-4 = 36列, 週4は 12セル × col-span-3 = 36列 ✓

// Tailwind v4 ではカスタム grid-cols を style タグまたは @apply で定義可
// grid-cols-36 は Tailwind v4 コアには存在しないため arbitrary value: grid-cols-[repeat(36,minmax(0,1fr))]
```

[ASSUMED] — Tailwind v4 の `grid-cols-36` 存在有無。arbitrary value `grid-cols-[repeat(36,minmax(0,1fr))]` は全バージョンで動作するが冗長。シンプルな `grid-cols-{N*3}` と週ブロック幅 `flex-1` 組み合わせが実用的。

**プランナーへの推奨:** 36列グリッドより「週ブロックを `flex-1` で均等配置し、ブロック内を `grid grid-cols-N`」のアプローチが Tailwind v4 で最もシンプル。各ブロックが同じ flex-1 幅を取れば視覚的統一達成。

### Pattern 3: CSS-only スマホ縮退

**What:** 古い2週を `hidden sm:flex`、現在週を常時 `flex` 表示
**When to use:** D-07/D-08 の CSS-only レスポンシブ要件

```tsx
// src/components/CommitGrid.tsx — 確立済み Tailwind パターン踏襲
// HeatmapRow の `hidden sm:block` と同じ仕組み

<div className="flex flex-1">
  {/* 最古の週 (week 0): スマホ非表示 */}
  <div className="hidden sm:flex flex-1 gap-1">
    {/* セル */}
  </div>
  {/* 中間の週 (week 1): スマホ非表示 */}
  <div className="hidden sm:flex flex-1 gap-1 border-l border-gray-200">
    {/* セル */}
  </div>
  {/* 現在週 (week 2): 常時表示 */}
  <div className="flex flex-1 gap-1 border-l border-gray-200 sm:border-l-0">
    {/* セル */}
  </div>
</div>
```

[VERIFIED: codebase] — `HeatmapRow.tsx` の `hidden sm:block` パターンが同プロジェクトで確立済み

### Pattern 4: コミットスロット × 記事 マッチングロジック

**What:** `member_commit_slots` の `day_of_week` と週の日付を照合し、投稿済みか否かを判定
**When to use:** VIEW-05 の「投稿済みセル = サムネイル / 未投稿セル = 曜日名」

```typescript
// src/lib/commitUtils.ts (新規)

// JST での週の月曜を起点とした週開始日を計算
function getWeekStartMonday(offsetWeeks: number): Date {
  const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000)
  // 現在の ISO weekday (1=月〜7=日)
  const dow = nowJST.getUTCDay() === 0 ? 7 : nowJST.getUTCDay()
  const monday = new Date(nowJST.getTime() - (dow - 1) * 24 * 60 * 60 * 1000 + offsetWeeks * 7 * 24 * 60 * 60 * 1000)
  return monday
}

// day_of_week (1=月〜7=日) を週開始日からの実際の日付キーに変換
function slotToDateKey(weekStart: Date, dayOfWeek: number): string {
  const d = new Date(weekStart.getTime() + (dayOfWeek - 1) * 24 * 60 * 60 * 1000)
  return `${d.getUTCFullYear()}-${...}-${...}`  // YYYY-MM-DD in JST
}

// 投稿済みか確認: isoToJSTDateKey(article.isoDate) === slotDateKey
```

[ASSUMED] — 週開始日を月曜とする ISO 8601 週の具体的計算ロジック。既存の `getRecentDays`（日曜起点ではなく JST 今日から7日）とは異なるアプローチが必要。

### Pattern 5: メンバー並び順ロジック (D-10)

**What:** ①今週実績率降順 → ②ストリーク週数降順 → ③登録順
**When to use:** D-10 の仮実装

```typescript
// src/lib/commitUtils.ts に sortMembersForCommitView() を追加
// 今週実績率 = 今週に投稿済みのスロット数 / 全スロット数
// ストリーク = 連続して全スロット達成した週数（Phase 30 ロジックの基礎）
// 仮実装: ストリーク計算が複雑になる場合は今週投稿数 (sortByWeeklyCount 踏襲) で代替可
```

[ASSUMED] — ストリーク計算の具体的アルゴリズム。Phase 30 で完全実装するため Phase 29 では簡略化可。

### Anti-Patterns to Avoid

- **`getUser()` を public ページで呼ぶ:** `page.tsx` は認証不要のページ。`createSupabaseServerClient` + `getUser()` は不要。`createSupabaseAdminClient` で直接クエリ（D-05、`my/page.tsx` とは異なり認証チェック不要）
- **`member_commit_slots` の RLS migration を重複作成:** Phase 28 migration で `"public select member_commit_slots"` policy は既作成。再作成すると `DROP POLICY IF EXISTS` を含まないと `ERROR: policy already exists` になる
- **`WeeklyHeatmapGrid` を 'use client' にした理由を忘れる:** `WeeklyHeatmapGrid` は `useState` (weekOffset) を持つため 'use client'。`CommitGoalView` にインタラクションがない場合、Server Component のままで良い
- **Tailwind v4 の JIT クラス動的生成:** `grid-cols-${n*3}` のような動的クラス名は Tailwind v4 では purge される。静的クラス名 (grid-cols-3, grid-cols-6, grid-cols-9, grid-cols-12) またはインラインスタイルを使用
- **週境界計算での JST ずれ:** `new Date()` はサーバーの UTC で動く。`+9h` 補正なしで週の境界を計算すると JST の月曜が UTC の日曜に見える。`calendarUtils.ts` の `isoToJSTDateKey` / `heatmapUtils.ts` の JST 補正パターンを踏襲

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| RSS + KV記事マージ | カスタムフェッチ | `fetchAllFeedsCached` | 既実装。重複排除・リトライ・KV fallback 込み |
| ISR キャッシュ | 手動キャッシュ | `export const revalidate = 300` | Next.js App Router ISR |
| 日付 JST 変換 | 独自タイムゾーン処理 | `isoToJSTDateKey` (`calendarUtils.ts`) | プロジェクト標準。テスト済み |
| Supabase 型安全クエリ | raw SQL | `.from('member_commit_slots').select(...)` | 既存パターン。型推論あり |
| レスポンシブ | JS resize listener | Tailwind `hidden sm:flex` | 確立済みパターン (HeatmapRow) |

---

## Common Pitfalls

### Pitfall 1: `member_commit_slots` SELECT で `member.id` が必要だが `Member` 型に `id` フィールドがない

**What goes wrong:** 現在の `Member` 型 (`src/lib/types.ts`) には `id: UUID` フィールドが存在しない。`getMembers()` は `publication_id` ベースのオブジェクトを返す。`member_commit_slots.member_id` は UUID FK。

**Why it happens:** `members` テーブルには `id (UUID)` と `publication_id (TEXT)` の2つの識別子があり、外部向けには `publication_id` を使うが、内部 JOIN には `id` が必要。

**How to avoid:** 選択肢が2つある:
- (A) `getMembers()` クエリに `id` を追加し `Member` 型を拡張 → `member_commit_slots` を `publication_id` でなく `member_id` (UUID) で照合
- (B) `member_commit_slots` テーブルに `publication_id` を JOIN して SELECT する（サブクエリ）
- (C) 全スロットを SELECT してから `member.id` で照合（`member.id` を `Member` 型に追加が前提）

**推奨:** オプション (A)。`Member` 型に `id?: string` を追加し、`getMembers()` の SELECT に `id` を追加。最もシンプルで既存パターン踏襲。

**Warning signs:** `members.id` が undefined になる、または `member_commit_slots` の `member_id` フィールドと型が合わない TypeScript エラー。

### Pitfall 2: Tailwind v4 の動的クラス名が purge される

**What goes wrong:** `className={\`grid-cols-${slots.length * 3}\`}` のように動的に生成されたクラス名は Tailwind v4 のビルド時スキャンで検出されず、本番でスタイルが消える。

**Why it happens:** Tailwind v4 は静的解析ベースで未使用クラスを除去する。動的文字列連結は検出不可。

**How to avoid:** 週回数ごとにクラスを静的に分岐:
```tsx
const colsClass = { 1: 'grid-cols-3', 2: 'grid-cols-6', 3: 'grid-cols-9', 4: 'grid-cols-12' }[freq]
```
または `style={{ gridTemplateColumns: \`repeat(${n}, minmax(0, 1fr))\` }}` でインラインスタイル使用。

**Warning signs:** 開発環境（JIT）では表示されるが本番ビルドでレイアウトが崩れる。

### Pitfall 3: 週開始日の計算ロジック (ISO Monday start vs JS Sunday start)

**What goes wrong:** `new Date().getDay()` は 0=日曜 の JS 規則。`member_commit_slots.day_of_week` は 1=月曜 の ISO 8601 規則（Phase 28 D-15）。混用すると曜日がずれた日付に記事をマッチングする。

**Why it happens:** JS の `Date` API が ISO 8601 と異なる day-of-week 規則を使う。

**How to avoid:** 週開始日（月曜）を JST で計算するユーティリティ関数を作成。`isoToJSTDateKey` パターンを踏襲し `new Date()` を UTC + 9h で扱う。

**Warning signs:** 月曜コミットのメンバーの投稿が火曜のセルに表示される、または日曜コミットが土曜に表示されるなど1日ずれ現象。

### Pitfall 4: `page.tsx` テストが `CommitGoalView` を参照する

**What goes wrong:** 既存の `src/app/__tests__/page.test.tsx` は `WeeklyHeatmapGrid` を import して props を検証している。`page.tsx` が `CommitGoalView` に変わるとテストが壊れる。

**Why it happens:** テストが `WeeklyHeatmapGrid` を直接参照する設計になっている。

**How to avoid:** Plan 02 で `page.tsx` の内容を変更する前に、まず `page.test.tsx` を更新する（または `/weekly-stamp/page.tsx` 移行時に `/weekly-stamp/__tests__/` にも対応テストを作成）。新 `page.tsx` 用のテストも同様の RSC props-inspection パターンで追加。

**Warning signs:** `vitest run` で `Cannot find module '@/components/WeeklyHeatmapGrid'` または props 型エラー。

### Pitfall 5: `/weekly-stamp` の team フィルタ href が `/` のまま

**What goes wrong:** `weekly-stamp/page.tsx` の「All」リンクと各チームタブのリンクが `href="/"` や `href={\`/?team=...\`}` のまま移行すると、/weekly-stamp でタブをクリックすると新トップ（CommitGoalView）に飛んでしまう。

**Why it happens:** `page.tsx` のコードをそのままコピーすると href が `/` ベースのまま。

**How to avoid:** `weekly-stamp/page.tsx` にコピーする際に href を `/weekly-stamp` ベースに変更:
- `href="/weekly-stamp"` (All)
- `href={\`/weekly-stamp?team=${...}\`}`

**Warning signs:** /weekly-stamp でチームタブをクリックすると / (CommitGoalView) に遷移する。

---

## Code Examples

### Supabase クライアント選択 (D-05)

```typescript
// src/app/page.tsx — 公開ページは admin client で十分（auth 不要）
// Source: src/app/my/page.tsx のパターン踏襲（admin client での SELECT）
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

const admin = createSupabaseAdminClient()
const { data: slotsData } = await admin
  .from('member_commit_slots')
  .select('member_id, day_of_week, hour')
// 注意: member_id は UUID。Member 型に id フィールドが必要（Pitfall 1 参照）
```

### `fetchAllFeedsCached` の 21日フィルタ (D-04)

```typescript
// 21日前の ISO 文字列を生成
const cutoff = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString()

// fetchAllFeedsCached は全件を返すので呼び出し後にフィルタ
const results = await fetchAllFeedsCached(filteredMembers)
const results21 = results.map(r => ({
  ...r,
  items: r.items.filter(item => item.isoDate && item.isoDate >= cutoff)
}))
// Source: src/lib/fetchFeed.ts + src/lib/types.ts (FeedItem.isoDate)
```

### CommitGrid セルのレンダリング

```tsx
// セルの状態分岐 (VIEW-05)
// Source: 29-UI-SPEC.md § CommitGrid コンポーネント

// 投稿済みセル
<a href={article.link} target="_blank" rel="noreferrer"
   className="aspect-square rounded overflow-hidden">
  <img src={article.thumbnail} alt="" className="object-cover w-full h-full" />
</a>

// 未投稿スロットセル
<div className="aspect-square flex items-center justify-center rounded border border-dashed border-gray-300">
  <span className="text-xs text-gray-400">{DAY_NAMES[slot.day_of_week]}</span>
</div>

// 曜日マッピング (D-03)
const DAY_NAMES: Record<number, string> = { 1:'月', 2:'火', 3:'水', 4:'木', 5:'金', 6:'土', 7:'日' }
```

### 未コミットメンバー (VIEW-06)

```tsx
// コミットスロットが 0 件の場合
{memberSlots.length === 0 && (
  <div className="flex-1 flex items-center justify-center">
    <span className="text-sm text-gray-400">未コミット</span>
  </div>
)}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `/` = WeeklyHeatmapGrid | `/` = CommitGoalView | Phase 29 | 旧トップは `/weekly-stamp` に移動 |
| `member_commit_slots` なし | Phase 28 で作成済み | Phase 28 | Phase 29 はデータ取得のみ実装 |
| `anon` SELECT policy なし | Phase 28 migration で作成済み | Phase 28 | D-06 migration タスク不要 |

**Deprecated/outdated:**
- CONTEXT.md D-06 の「新規 migration 追加が必要」: Phase 28 migration `20260602000001` で `"public select member_commit_slots"` ポリシーが既に `CREATE` されている。`schema.sql` にも同ポリシー記載済み。新規 migration は不要。

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `CommitGoalView` はインタラクション不要なので Server Component にできる（'use client' 不要） | Architecture Patterns | もし Client Component が必要なら import 境界の調整が必要 |
| A2 | 週開始は月曜（ISO 8601）ベースで計算する | Pitfalls + Code Examples | 別の週開始定義（例: 日曜）が使われた場合、スロットマッチングが1日ずれる |
| A3 | `Member` 型への `id: string` 追加が最もシンプルな解決策 | Pitfalls (Pitfall 1) | `getMembers()` を変更できない制約があれば別アプローチが必要 |
| A4 | 週ブロックを `flex-1` で均等配置する実装がプランナーの「最適解」として採用される | Architecture Patterns (Pattern 2) | 36列グリッドを採用する場合、Tailwind の arbitrary value `grid-cols-[repeat(36,minmax(0,1fr))]` または CSS Module が必要 |
| A5 | ストリーク週数の仮実装は「今週投稿数」で代替（`sortByWeeklyCount` 踏襲） | Architecture Patterns (Pattern 5) | 正確なストリーク計算が Phase 29 スコープに含まれる場合、ロジックが複雑化 |

---

## Open Questions

1. **`Member` 型への `id` フィールド追加範囲**
   - What we know: `getMembers()` は現在 `id` を返さない。`member_commit_slots.member_id` は UUID FK
   - What's unclear: `Member` 型を変更することによる既存テストへの影響範囲
   - Recommendation: `getMembers()` の SELECT に `id` を追加し `Member` 型に optional `id?: string` を追加。既存テストの `member()` fixture は `id` を使わないのでデグレなし

2. **CommitGoalView が Server Component か Client Component か**
   - What we know: Phase 29 スコープにインタラクション（ページネーション、モーダル等）なし。`WeeklyHeatmapGrid` は `useState(weekOffset)` のため Client Component
   - What's unclear: `CommitGoalView` をサーバーで完結させることの実装上の利点（パフォーマンス vs コード複雑度）
   - Recommendation: Server Component で実装。必要になったら Client に降格。'use client' を不必要に追加しない

3. **既存 `page.test.tsx` の取り扱い**
   - What we know: 既存テストは `WeeklyHeatmapGrid` を `findByType` で探す設計。`page.tsx` を差し替えると壊れる
   - What's unclear: テストを削除するか `/weekly-stamp` 側に移すか、新 `page.tsx` 用に書き換えるか
   - Recommendation: Plan 02 の一部として `page.test.tsx` を更新（`WeeklyHeatmapGrid` の参照を `CommitGoalView` 参照に変更）+ `/weekly-stamp/__tests__/page.test.tsx` を新規作成して既存ロジックを移管

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js build | ✓ | v22.12.0 | — |
| Supabase (prod DB) | `member_commit_slots` SELECT | ✓ (assumed) | — | — |
| Tailwind v4 | CSS グリッド・レスポンシブ | ✓ | ^4 | — |

[VERIFIED: Bash `node --version`, `package.json`]

Supabase 本番 DB の `member_commit_slots` テーブルと Phase 28 migration の適用状況は確認できないが、Phase 28 が完了済みとマークされているため適用済みと判断。[ASSUMED]

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest ^4.1.6 |
| Config file | `vitest.config.ts` |
| Quick run command | `npm test` (= `vitest run`) |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VIEW-01 | `/weekly-stamp` に旧ヒートマップが表示される | smoke (RSC props inspection) | `npm test -- src/app/weekly-stamp` | ❌ Wave 0 |
| VIEW-02 | 新 `page.tsx` が `CommitGoalView` をレンダリングする | unit (RSC props inspection) | `npm test -- src/app/__tests__/page.test.tsx` | ✅ (要更新) |
| VIEW-03 | 各行に avatar+name / grid / achievement エリアがある | unit (CommitGoalRow) | `npm test -- src/components/__tests__/CommitGoalRow.test.tsx` | ❌ Wave 0 |
| VIEW-04 | 週1〜4で Grid 幅が統一される | unit (CommitGrid) | `npm test -- src/components/__tests__/CommitGrid.test.tsx` | ❌ Wave 0 |
| VIEW-05 | 投稿済み → サムネイル、未投稿 → 曜日名 | unit (CommitGrid) | 上記と同じ | ❌ Wave 0 |
| VIEW-06 | 未コミットメンバーに「未コミット」表示 | unit (CommitGrid/CommitGoalRow) | 上記と同じ | ❌ Wave 0 |
| VIEW-07 | スマホ幅で Grid が1週縮退 (CSS のみ) | manual visual | — | manual |

### Sampling Rate

- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/app/weekly-stamp/__tests__/page.test.tsx` — VIEW-01: `/weekly-stamp` ページが `WeeklyHeatmapGrid` を含む
- [ ] `src/app/__tests__/page.test.tsx` — VIEW-02: 既存テストを CommitGoalView 参照に更新
- [ ] `src/components/__tests__/CommitGrid.test.tsx` — VIEW-04/05/06
- [ ] `src/lib/__tests__/commitUtils.test.ts` — スロットマッチング・並び順ロジックのユニットテスト

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | 公開ページ (anon アクセス) |
| V3 Session Management | no | 公開ページ |
| V4 Access Control | yes | `member_commit_slots` は `anon` SELECT のみ許可。Phase 28 RLS policy 確認済み |
| V5 Input Validation | no | このフェーズで入力フォームなし |
| V6 Cryptography | no | 暗号化処理なし |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| `member_commit_slots` 全件公開 | Information Disclosure | RLS で SELECT USING(true) — 設計上の意図。コミットスケジュールは公開情報 |
| ISR キャッシュに古いデータが残る | — | `revalidate=300` (5分)。コミットスケジュールは低頻度変更なので許容 |

---

## Sources

### Primary (HIGH confidence)
- `src/app/page.tsx` — 既存ルートページの完全実装 [VERIFIED: codebase]
- `src/components/HeatmapRow.tsx` — 行レイアウト・CSS クラス [VERIFIED: codebase]
- `src/lib/fetchFeed.ts` — `fetchAllFeedsCached` の完全実装 [VERIFIED: codebase]
- `src/lib/types.ts` — `Member`, `FeedItem`, `MemberFeedResult` 型定義 [VERIFIED: codebase]
- `src/lib/heatmapUtils.ts` — `getRecentDays`, `sortByWeeklyCount` パターン [VERIFIED: codebase]
- `supabase/schema.sql` — `member_commit_slots` テーブル定義 + RLS policies [VERIFIED: codebase]
- `supabase/migrations/20260602000001_add_member_commit_slots.sql` — Phase 28 migration 内容 [VERIFIED: codebase]
- `src/app/__tests__/page.test.tsx` — 既存テスト実装パターン [VERIFIED: codebase]
- `.planning/phases/29-commit-goal-view/29-CONTEXT.md` — ユーザー決定事項 D-01〜D-10 [VERIFIED: planning artifact]
- `.planning/phases/29-commit-goal-view/29-UI-SPEC.md` — UI デザインコントラクト [VERIFIED: planning artifact]
- `package.json` — 依存パッケージバージョン確認 [VERIFIED: codebase]

### Secondary (MEDIUM confidence)
- Tailwind v4 の動的クラス purge 挙動: 一般的な Tailwind JIT の既知制約に基づく [ASSUMED, multiple source confirmation from training data]

### Tertiary (LOW confidence)
- なし

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — package.json で全依存を確認済み。新規パッケージなし
- Architecture: HIGH — 既存ページ・コンポーネント・パターンを完全読破。データフローは明確
- Pitfalls: HIGH — `Member` 型の `id` 欠如は実際のコード読み取りから発見。Tailwind 動的クラスは確立された制約
- Data layer: HIGH — `member_commit_slots` テーブルとポリシーをスキーマ・migration 両方で確認。D-06 の「migration 不要」発見はプランナーにとって重要

**Research date:** 2026-06-04
**Valid until:** 2026-07-04 (安定スタック、30日間有効)
