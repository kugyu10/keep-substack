# Phase 13: ファーストビュー + モバイルレイアウト - Context

**Gathered:** 2026-05-15
**Status:** Ready for planning

<domain>
## Phase Boundary

トップページの視覚的優先順位を変更する。ヒーローバナー画像を完全削除し、コンテナ余白をモバイル向けに縮小することで、スマートフォンで開いた瞬間にヒートマップグリッドがファーストビューに収まるようにする。

スコープ: `src/app/page.tsx` のレイアウト変更のみ。コンポーネントの内部ロジックやデータ取得は変更しない。

</domain>

<decisions>
## Implementation Decisions

### バナー削除
- **D-01:** `top_logo.png` の `<img>` タグを `page.tsx` から完全削除する
- **D-02:** `layout.tsx` の OGP 参照（`images: [topLogo.src]`）はそのまま維持する（SNS 共有カードに影響しないため）
- **D-03:** `top_logo.png` ファイル自体も `import topLogo from '@/data/top_logo.png'` を含め `page.tsx` から削除する

### h1 タイトル
- **D-04:** `h1` "Keep Substack" のフォント・サイズ（`text-2xl`、`fontFamily: Georgia, serif`, `fontWeight: 900`）は現状維持
- **D-05:** `h1` の下マージンを `mb-4` → `mb-2` に縮小してデータ領域を最大化

### モバイル余白
- **D-06:** コンテナクラスを `p-6 pb-64` → `px-3 py-4 pb-16` に変更（左右 24px → 12px、上下 24px → 16px）
- **D-07:** `max-w-[600px] mx-auto` はそのまま維持

### チームタブ
- **D-08:** チームタブの下マージンを `mb-6` → `mb-4` に縮小
- **D-09:** タブ自体のスタイル（`px-3 py-1 rounded text-sm border`）は変更しない（Phase 14 の LIST-03 で対応）

### 名前列・ヒートマップグリッド
- **D-10:** `WeeklyHeatmapGrid` / `HeatmapRow` のコンポーネント内部は変更しない（名前列 `w-12 sm:w-52` を維持）
- **D-11:** ヒートマップセルのタッチターゲットサイズは Phase 15（HEATMAP-01/02）で対応

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 要件定義
- `.planning/REQUIREMENTS.md` §LAYOUT — LAYOUT-01, LAYOUT-02 の受入条件
- `.planning/ROADMAP.md` §Phase 13 — Success Criteria（スクロールなしでヒートマップ表示、375px 横幅フィット、バナー削除/縮小）

### 変更対象ファイル
- `src/app/page.tsx` — ヒーローバナー削除、余白・マージン変更のメインターゲット
- `src/app/layout.tsx` — OGP 参照を維持することを確認済み（変更不要）

### 既存コンポーネント（変更しない）
- `src/components/WeeklyHeatmapGrid.tsx` — 名前列幅 `w-12 sm:w-52` 維持
- `src/components/HeatmapRow.tsx` — 内部ロジック変更なし

### プロジェクト制約
- `.planning/PROJECT.md` §Key Decisions — `<img>` タグ使用（next/image 不採用）、`line-clamp-2` は inline style で実装（Tailwind v4 制約）

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `WeeklyHeatmapGrid` (Client Component): `results` を受け取るだけ。`page.tsx` のレイアウト変更に影響しない
- `HeatmapRow`: `w-12 sm:w-52` の名前列を持つ。Phase 13 では変更しない

### Established Patterns
- Tailwind CSS 4 使用。`p-6`, `mb-4` 等のユーティリティで余白管理
- Server Component (`page.tsx`) + Client Component (`WeeklyHeatmapGrid`) のパターンを維持
- `<img>` タグ直接使用（next/image 不採用）— `top_logo.png` import を削除する際も同パターン踏襲

### Integration Points
- `page.tsx` が唯一の変更対象。`layout.tsx` のフッター・OGP は影響なし
- `top_logo.png` import は `page.tsx` と `layout.tsx` の両方に存在するが、`page.tsx` 側のみ削除

</code_context>

<specifics>
## Specific Ideas

- モバイル（375px）でバナー削除 + `px-3` 化後の利用可能幅: 375 - 24 = 351px
- 名前列 `w-12`(48px) + 計列 `w-10`(40px) = 88px → グリッド幅約 263px → 7 列で 1 セル約 37px
- 「開いた瞬間にデータが見える」= h1(1行) + タブ(1行程度) + ヒートマップヘッダー + 数行のデータがファーストビューに収まること

</specifics>

<deferred>
## Deferred Ideas

- チームタブの視認性改善（アクティブタブのコントラスト）→ Phase 14（LIST-03）
- ヒートマップセルの 44px タッチターゲット化 → Phase 15（HEATMAP-01/02）
- モバイルでの名前列さらなる縮小（w-8 等）→ Phase 14 で再検討可能

</deferred>

---

*Phase: 13-ファーストビュー + モバイルレイアウト*
*Context gathered: 2026-05-15*
