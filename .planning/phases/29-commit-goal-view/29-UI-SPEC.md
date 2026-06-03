---
phase: 29
slug: commit-goal-view
status: draft
shadcn_initialized: false
preset: none
created: 2026-06-03
---

# Phase 29 — UI デザインコントラクト: Commit & Goal View

> このフェーズで必要なビジュアル・インタラクションコントラクト。
> gsd-ui-researcher が生成し、gsd-ui-checker が検証する。

---

## デザインシステム

| プロパティ | 値 |
|-----------|-----|
| Tool | none（shadcn 未導入） |
| Preset | 該当なし |
| Component library | なし（Tailwind CSS v4 + カスタムコンポーネント） |
| Icon library | なし（Unicode 絵文字 👑 🔥 を直接使用、Phase 30 スコープ） |
| Font | Lora（Google Fonts、globals.css で宣言済み）フォールバック: Georgia, serif |

ソース: `src/app/globals.css`

---

## スペーシングスケール

8-point グリッドを基準とする。既存コンポーネントの実測値から抽出。

| トークン | 値 | Tailwind クラス | 用途 |
|---------|-----|----------------|------|
| xs | 4px | `p-1` / `gap-1` | セル内パディング、グリッドギャップ |
| sm | 8px | `p-2` / `gap-2` | 行内要素間隔、インラインパディング |
| md | 16px | `px-4` / `py-4` | ページ横パディング（`px-3` 例外あり） |
| lg | 24px | `mb-6` | セクション間隔 |
| xl | 32px | `mb-8` | ページタイトル下余白 |
| 2xl | 48px | — | 主要セクション区切り（今フェーズ非使用） |
| 3xl | 64px | — | ページレベル余白（今フェーズ非使用） |

例外:
- ページコンテナ横パディング: `px-3`（12px）— 既存 `page.tsx` から踏襲
- 行の縦パディング: `py-1`（4px）— `HeatmapRow` 踏襲
- アイコン画像サイズ: `w-10 h-10`（40px）— タッチターゲットとして 44px 相当に丸め（`rounded-full`）

ソース: `src/components/HeatmapRow.tsx`, `src/app/page.tsx`

---

## タイポグラフィ

| 役割 | サイズ | Tailwind | ウェイト | Tailwind | 行高 |
|------|--------|---------|---------|---------|------|
| ページ見出し | 24px | `text-2xl` | 900（bold） | `font-black` | 1.2（`leading-tight`） |
| メンバー名 | 12px | `text-xs` | 600（semibold） | `font-semibold` | 1.4（`leading-snug`） |
| セル曜日ラベル | 12px | `text-xs` | 400（regular） | `font-normal` | 1.0（`leading-none`） |
| 補助テキスト（未コミット等） | 14px | `text-sm` | 400（regular） | `font-normal` | 1.0（`leading-none`） |

宣言値:
- サイズ: 12px, 14px, 24px（3サイズ）
- ウェイト: 400（regular）, 600（semibold）の2種類

ソース: `src/components/HeatmapRow.tsx`（`text-xs font-semibold`）, `src/app/page.tsx`（`text-2xl`）, `29-CONTEXT.md` §specifics

---

## カラーコントラクト

| 役割 | 値 | Tailwind / CSS 変数 | 用途 |
|------|-----|---------------------|------|
| Dominant (60%) | `#fafafa` | `bg-background` / `--background` | ページ背景、サーフェス全体 |
| Secondary (30%) | `#ebebeb` | `border-[#ebebeb]` / `--color-contrast-1` | 行区切りボーダー、ホバー背景 |
| Accent (10%) | `#FF6719` | `bg-primary` / `--color-primary` | アクティブなチームタブのみ |
| Destructive | — | — | このフェーズで破壊的操作なし |

アクセント予約要素（明示的リスト）:
1. アクティブなチームフィルタータブの背景（`bg-primary text-white`）のみ
2. それ以外のインタラクティブ要素へのアクセント使用は禁止

サブセット色トークン（既存コードから抽出）:

| 用途 | Tailwind クラス | 実値 |
|------|----------------|------|
| 未投稿スロット曜日ラベル | `text-gray-400` | #9ca3af |
| 未コミットメンバーテキスト | `text-gray-400` | #9ca3af |
| 週区切り縦線 | `border-l border-gray-200` | #e5e7eb |
| 補助テキスト（カウント等） | `text-gray-500` | #6b7280 |
| 本文テキスト | `text-foreground` / `#363737` | —  |
| 投稿済みセル（サムネイル） | 画像表示のため背景なし | — |

ソース: `src/app/globals.css`, `src/app/page.tsx`, `src/components/HeatmapRow.tsx`, `29-CONTEXT.md` §specifics

---

## コンポーネント仕様

### ページレイアウト: `src/app/page.tsx`（CommitGoalView ページ）

```
<main class="max-w-[600px] mx-auto px-3 py-4">
  <h1>Keep Substack</h1>            ← text-2xl, font-black, Lora/Georgia
  [チームフィルタータブ]              ← 既存 page.tsx 踏襲
  <CommitGoalView results={...} />
  <PrBanner />
</main>
```

### 行レイアウト: `CommitGoalRow`

HeatmapRow の `flex items-center border-b border-[#ebebeb] py-1` 構造を踏襲:

```
┌─────────────────────────────────────────────────────┐
│ [Avatar + Name]  │ [CommitGrid 3週]  │ [Achievement] │
│ w-16 sm:w-52     │ flex-1            │ w-8           │
└─────────────────────────────────────────────────────┘
```

- Avatar + Name エリア: `w-16 sm:w-52 shrink-0 pr-2 flex items-center gap-1 overflow-hidden`
  - Avatar: `w-10 h-10 rounded-full shrink-0 object-cover`
  - フォールバック（imageUrl なし）: `w-10 h-10 rounded-full shrink-0 bg-gray-200 inline-block`
  - Name: `flex-1 min-w-0 text-xs font-semibold leading-snug truncate hidden sm:block`
  - シェブロン: `shrink-0 text-gray-400 text-sm` aria-hidden
- CommitGrid エリア: `flex-1`（内部構造は下記）
- Achievement エリア: `w-8 shrink-0`（Phase 29 では空 div のみ）

ソース: `src/components/HeatmapRow.tsx`（直接踏襲）, `29-CONTEXT.md` D-09

### CommitGrid コンポーネント

**グリッド構造（D-01）:**
- 週1回: 3列（各セルが最大幅）
- 週2回: 6列（各セルが中幅）
- 週3回: 9列（各セルが中幅）
- 週4回: 12列（各セルが最小幅）
- 実装: `grid grid-cols-{N*3}` または `grid grid-cols-12` + `col-span-{12/(N)}` でセル幅統一

**3週ブロック構造:**
- 3つのブロックを横並びで配置
- 週境界: `border-l border-gray-200`（細い縦線、D-02）
- スマホ縮退（D-07/D-08）: 古い2週を `hidden sm:flex`、現在週は常時表示

**セル種別:**

| 状態 | Tailwind クラス | 表示内容 |
|------|----------------|---------|
| 投稿済み | `aspect-square rounded overflow-hidden` | `<img>` サムネイル（FeedItem.thumbnail）`object-cover w-full h-full` |
| 未投稿スロット | `aspect-square flex items-center justify-center rounded border border-dashed border-gray-300` | 曜日名 `text-xs text-gray-400`（例: 月、火） |
| 未コミット | `flex items-center justify-center` | `text-sm text-gray-400`「未コミット」（D-10/VIEW-06） |

**曜日名マッピング（D-03, ISO 8601 day_of_week 1=月〜7=日）:**

| day_of_week | 表示 |
|-------------|------|
| 1 | 月 |
| 2 | 火 |
| 3 | 水 |
| 4 | 木 |
| 5 | 金 |
| 6 | 土 |
| 7 | 日 |

**週ヘッダー（オプション）:**
- 既存 WeeklyHeatmapGrid の日付ヘッダーパターンを参考に、`text-xs text-center text-gray-500` で週番号または日付範囲を表示
- スマホでは現在週の週ラベルのみ表示

### チームフィルタータブ

既存 `page.tsx` 実装をそのまま移行:
- 非アクティブ: `px-3 py-1 rounded text-sm border bg-white text-[#363737] border-[#ebebeb] hover:bg-[#fafafa] hover:border-[#d8d8d8]`
- アクティブ: `px-3 py-1 rounded text-sm border bg-primary text-white border-primary`

ソース: `29-CONTEXT.md` §code_context

---

## レスポンシブコントラクト

| ブレークポイント | 挙動 |
|----------------|------|
| `< sm`（< 640px） | CommitGrid: 現在週（最新1週）のみ表示。古い2週は `hidden sm:flex` |
| `>= sm`（>= 640px） | CommitGrid: 3週全表示。メンバー名テキスト表示 |

実装パターン（D-07, D-08）:
```tsx
{/* 古い2週: スマホでは非表示 */}
<div className="hidden sm:flex gap-1">...</div>
<div className="hidden sm:flex gap-1 border-l border-gray-200">...</div>
{/* 現在週: 常時表示 */}
<div className="flex gap-1 border-l border-gray-200 sm:border-l-0">...</div>
```

ソース: `29-CONTEXT.md` D-07/D-08、`src/components/HeatmapRow.tsx`（`hidden sm:block` 確立済みパターン）

---

## インタラクションコントラクト

| インタラクション | 動作 | 実装方法 |
|----------------|------|---------|
| メンバー名/アバタークリック | `/member/{publicationId}` に遷移 | `<Link href="">` — 既存 HeatmapRow パターン踏襲 |
| 投稿済みセルクリック | 記事リンクを新タブで開く（またはポップオーバー） | Phase 29 はシンプルに `<a target="_blank">` のみ。ポップオーバーは Phase 30 以降で検討 |
| チームタブクリック | `/?team=<name>` でフィルタリング | `<a href="">` — 既存 page.tsx 踏襲 |
| ローディング状態 | なし（ISR / Server Component） | `revalidate = 300`、スケルトンなし |

---

## コピーライティングコントラクト

| 要素 | コピー |
|------|--------|
| ページ見出し | Keep Substack |
| 未コミットメンバーのグリッドセル | 未コミット |
| 未投稿スロットの曜日ラベル | 月 / 火 / 水 / 木 / 金 / 土 / 日（2文字） |
| チームフィルタータブ「全員」 | All |
| アバター画像フォールバック | aria-hidden（alt 不要） |
| 破壊的アクション確認 | なし（このフェーズに破壊的操作なし） |
| エラー状態 | Next.js デフォルトエラーハンドリング（このフェーズで専用エラーUIなし） |
| データなし（メンバー 0 人） | 既存 page.tsx 踏襲（何も表示しない — `results.length === 0` の場合） |

ソース: `29-CONTEXT.md` D-03, D-10 §specifics

---

## レジストリセーフティ

| レジストリ | 使用ブロック | セーフティゲート |
|-----------|-------------|----------------|
| shadcn 公式 | なし（shadcn 未導入） | 該当なし |
| サードパーティ | なし | 該当なし |

このフェーズで新規外部コンポーネントライブラリの導入なし。

---

## アーキテクチャ制約

| 制約 | 理由 |
|------|------|
| `revalidate = 300` | 既存トップページから踏襲（ISR 5分） |
| Server Component → Client Component props 渡し | 確立済みパターン（page.tsx → WeeklyHeatmapGrid） |
| Supabase `server` クライアント | 公開ページのため `getUser()` 不要 |
| `anon` ロールの `member_commit_slots` SELECT 許可 | 公開読み取り可（D-06）— migration で対応 |
| CSS-only レスポンシブ | JS viewport 検知不要（D-07） |

---

## 参照済みアップストリームアーティファクト

| ソース | 使用した決定事項数 |
|--------|-----------------|
| `29-CONTEXT.md` | 10（D-01〜D-10 全件） |
| `REQUIREMENTS.md` | 7（VIEW-01〜07） |
| `src/components/HeatmapRow.tsx` | 行レイアウト・スペーシング・タイポグラフィ全パターン |
| `src/components/WeeklyHeatmapGrid.tsx` | Client Component パターン |
| `src/app/page.tsx` | ページコンテナ・タブ・ISR 設定 |
| `src/app/globals.css` | カラートークン・フォント |

---

## チェッカーサインオフ

- [ ] ディメンション 1 コピーライティング: PASS
- [ ] ディメンション 2 ビジュアル: PASS
- [ ] ディメンション 3 カラー: PASS
- [ ] ディメンション 4 タイポグラフィ: PASS
- [ ] ディメンション 5 スペーシング: PASS
- [ ] ディメンション 6 レジストリセーフティ: PASS

**承認:** 保留（2026-06-03 draft）
