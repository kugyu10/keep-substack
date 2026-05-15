# Phase 14: ユーザーリスト + チームタブ UI - Context

**Gathered:** 2026-05-15
**Status:** Ready for planning

<domain>
## Phase Boundary

ユーザーリスト行（HeatmapRow）とチームタブ（page.tsx）のUIを改善する。
- 名前を1行truncateに変更してレイアウト崩れを防ぐ
- シェブロン（›）で個人ページへの遷移を明示する
- アクティブタブをSubstackオレンジで明確に区別する

スコープ: `src/components/HeatmapRow.tsx`、`src/components/WeeklyHeatmapGrid.tsx`、`src/app/page.tsx`

</domain>

<decisions>
## Implementation Decisions

### 名前列（LIST-01）
- **D-01:** `hidden sm:block` を削除して全画面サイズで名前を表示する
- **D-02:** `-webkit-line-clamp: 2` を廃止し `truncate` クラスに変更（1行ellipsis）
- **D-03:** 名前列幅を `w-12 sm:w-52` → `w-28 sm:w-52` に変更（モバイルで名前表示領域確保）
- **D-04:** WeeklyHeatmapGrid のヘッダースペーサー `w-12 sm:w-52` も `w-28 sm:w-52` に合わせる

### シェブロン（LIST-02）
- **D-05:** Link の末尾に `›`（右向き単体角括弧）を `shrink-0 text-gray-400 text-xs` で追加
- **D-06:** `aria-hidden="true"` を付与してスクリーンリーダーをスキップ
- **D-07:** モバイル含む全サイズで常に表示する

### アクティブタブ（LIST-03）
- **D-08:** アクティブタブを `bg-gray-800` → `bg-[#FF6719]`（Substackオレンジ）に変更
- **D-09:** 非アクティブタブのボーダーを `border-gray-600` → `border-gray-300` に変更（コントラスト差を明確化）
- **D-10:** All タブとチームタブ両方のアクティブスタイルを変更する

</decisions>

<canonical_refs>
## Canonical References

### 変更対象ファイル
- `src/components/HeatmapRow.tsx` — 名前列・シェブロン変更のメインターゲット
- `src/components/WeeklyHeatmapGrid.tsx` — ヘッダースペーサー幅の同期
- `src/app/page.tsx` — チームタブのアクティブスタイル変更

### 変更しないファイル
- `src/components/HeatmapTooltip.tsx` — ツールチップロジック変更なし
- `src/app/member/[substackId]/page.tsx` — 個人ページ変更なし
- `src/app/admin/` — 管理画面変更なし

### 既存パターン
- Tailwind v4使用。`truncate` クラスが使用可能（`overflow-hidden whitespace-nowrap text-overflow-ellipsis`）
- `bg-[#FF6719]` は Tailwind v4 のarbitrary value記法
- `<img>` タグ直接使用（next/image不採用）パターンを維持

</canonical_refs>

<code_context>
## Existing Code Insights

### HeatmapRow（現状）
- Link幅: `w-12 sm:w-52 shrink-0 pr-2 hover:underline flex items-center gap-1.5 overflow-hidden`
- Avatar: `w-10 h-10 rounded-full shrink-0 object-cover`
- 名前div: `hidden sm:block text-xs font-semibold leading-snug min-w-0 underline` + webkit-line-clamp:2

### WeeklyHeatmapGrid（現状）
- ヘッダースペーサー: `<div className="w-12 sm:w-52 shrink-0" />`

### page.tsx チームタブ（現状）
- アクティブ: `bg-gray-800 text-white border-gray-800`
- 非アクティブ: `text-gray-600 border-gray-600 hover:bg-gray-50`
- Phase 13で `mb-6 → mb-4` 変更済み

</code_context>

<specifics>
## Specific Ideas

- モバイル（375px）で `w-28`（112px）の名前列:
  - Avatar 40px + gap 4px + 名前area ≈50px + chevron 8px + pr-2 8px = 110px ≤ 112px ✓
  - グリッド幅: 351 - 112 - 8 - 40 = 191px → 191/7 ≈ 27px/セル（許容範囲）
- `truncate` はflex内でも正常動作する（`min-w-0` + `flex-1` が必要）

</specifics>

<deferred>
## Deferred Ideas

- モバイルでのアバターサイズ縮小（w-8等）→ Phase 15以降で再検討
- タブのフォントサイズ・パディング調整 → 現状維持

</deferred>

---

*Phase: 14-ユーザーリスト + チームタブ UI*
*Context gathered: 2026-05-15*
