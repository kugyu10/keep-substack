---
phase: 07-ui-polish-batch
plan: 01
subsystem: ui
tags: [react, nextjs, tailwindcss, tooltip, navigation, footer]

# Dependency graph
requires:
  - phase: 06-heatmap-tooltip
    provides: HeatmapTooltipコンポーネント（withUtm関数含む）をベースに変更
provides:
  - HeatmapTooltip: 画像+タイトルを一体型<a>ブロックに変更、記事間スペースmb-3
  - member/[substackId]/page: teamId条件分岐の戻りリンク、「← メンバー一覧」ラベル
  - layout.tsx: 全ページ共通フッター（コミュニティに参加するリンク）
affects: [08-future-phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "カード型リンク: <a class='block'>内に<img>と<span>をまとめて一体型クリック領域を作る"
    - "条件分岐URL: teamId存在時は/?team=${teamId}、未設定時は/にフォールバック"
    - "全ページフッター: layout.tsx の{children}直後に<footer>を配置して自動適用"

key-files:
  created: []
  modified:
    - src/components/HeatmapTooltip.tsx
    - src/app/member/[substackId]/page.tsx
    - src/app/layout.tsx

key-decisions:
  - "HeatmapTooltipのタイトル<a>を<span>に変更し親の<a>でリンク構造を一本化（ネストしたaタグを避けるため）"
  - "フッターはlayout.tsxのbody直下に配置し、全ページへ自動適用"
  - "teamIdが空文字・null・undefinedの場合はすべて'/'にフォールバック（三項演算子のみ、追加フェッチ不要）"

patterns-established:
  - "外部リンクには必ずrel='noopener noreferrer'を付与（T-07-01対策、フッター・Tooltip共通）"

requirements-completed: [TOOLTIP-01, TOOLTIP-02, NAV-01, NAV-02, FOOTER-01]

# Metrics
duration: 10min
completed: 2026-05-11
---

# Phase 7 Plan 01: UI小改善バッチ Summary

**HeatmapTooltip一体型カードリンク化・mb-3スペース拡大、メンバー詳細ページのteamId条件戻りリンク、全ページ共通フッター追加の5件UX改善を3ファイルに一括適用**

## Performance

- **Duration:** 10 min
- **Started:** 2026-05-11T00:00:00Z
- **Completed:** 2026-05-11T00:10:00Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- HeatmapTooltipのサムネイル画像をクリック可能なリンク領域に変更（画像クリックで記事遷移）
- Tooltip記事間スペースをmb-1からmb-3に拡大し視認性向上
- メンバー詳細ページの戻りリンクを「← メンバー一覧」に変更し、teamId存在時は`/?team=${teamId}`へ正確に戻る
- layout.tsxにフッターを追加し全ページに「コミュニティに参加する」リンクを自動表示

## Task Commits

全タスクを1つのアトミックコミットにまとめた:

1. **Task 1: HeatmapTooltip一体型カードリンク+mb-3** - `1f62943` (feat)
2. **Task 2: メンバー詳細ページ戻りリンク修正** - `1f62943` (feat)
3. **Task 3: layout.tsx共通フッター追加** - `1f62943` (feat)

## Files Created/Modified
- `src/components/HeatmapTooltip.tsx` - <li>のmb-1→mb-3、<img>と<span>を<a class='block'>内に包んで一体型カードリンク化
- `src/app/member/[substackId]/page.tsx` - 戻りリンクのhrefをteamId条件分岐、ラベルを「← メンバー一覧」に変更
- `src/app/layout.tsx` - {children}直後に<footer>追加（コミュニティに参加するリンク付き）

## Decisions Made
- HeatmapTooltipのタイトル要素を`<a>`から`<span>`に変更: 親`<a>`でリンク構造を一本化し、HTMLのアンカーネスト禁止仕様に準拠
- teamId判定は既存の`memberResult.member.teamId`を使用: 追加フェッチ不要でシンプルな三項演算子のみで実装
- フッターは`layout.tsx`の`<body>`内`{children}`直後に配置: 全ページへの自動適用を最小コストで実現

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- UI小改善バッチPhase 7のPlan 01が完了
- 次のUI改善タスクがあればPhase 7の後続プランとして実施可能
- バックエンド変更なし、デプロイは通常フローで対応可能

---
*Phase: 07-ui-polish-batch*
*Completed: 2026-05-11*
