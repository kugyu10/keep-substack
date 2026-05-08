---
phase: 02-calendar-ui
plan: 02
subsystem: ui
tags: [nextjs, react, tailwindcss, tooltip, client-component]

# Dependency graph
requires:
  - phase: 02-calendar-ui/01
    provides: CalendarGrid（月ナビゲーション付き7列グリッド）、calendarUtils（parseIsoDate・buildDayGrid・buildArticleMap）
provides:
  - ArticleTooltip.tsx — hover+click両対応ツールチップ（外クリック検知・×ボタン・全記事リスト表示）
  - CalendarGrid.tsx — ArticleTooltip を統合した完全版カレンダーグリッド
affects: [03-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Client Component内での useEffect cleanup による mousedown リスナー積み重なり防止（T-02-06 mitigate）
    - ツールチップは absolute + bottom-full でセル上方向表示（D-03）
    - onMouseEnter/Leave をツールチップ本体にも付与してカーソルがツールチップ内に入っても閉じないパターン

key-files:
  created:
    - src/components/ArticleTooltip.tsx
  modified:
    - src/components/CalendarGrid.tsx

key-decisions:
  - "ArticleTooltip は独立した Client Component として実装し、CalendarGrid は ArticleTooltip をインポートするだけにした（ツールチップ状態を ArticleTooltip 内に閉じる設計）"
  - "ツールチップの onMouseLeave は relatedTarget チェックで、セル→ツールチップ移動時に意図せず閉じないよう実装"

patterns-established:
  - "ArticleTooltip pattern: 'use client'付き単独コンポーネントで hover+click 両対応、useEffect で外クリック検知、cleanup で removeEventListener"
  - "External link security pattern: target=_blank のリンクは必ず rel='noopener noreferrer' を付与（T-02-04 mitigate）"

requirements-completed: [CAL-03, CAL-01, CAL-02]

# Metrics
duration: 20min
completed: 2026-05-08
---

# Phase 2 Plan 02: ツールチップ統合 Summary

**hover+click両対応の ArticleTooltip（外クリック・×ボタンで閉じる、全記事リスト表示）を新規実装し CalendarGrid に統合。Phase 2 の Success Criteria 全3項目を達成**

## Performance

- **Duration:** 20 min
- **Started:** 2026-05-08T00:15:00Z
- **Completed:** 2026-05-08T00:35:00Z
- **Tasks:** 3（Task 1: ArticleTooltip.tsx作成、Task 2: CalendarGrid統合、Task 3: ブラウザ確認）
- **Files modified:** 2（新規1、更新1）

## Accomplishments
- ArticleTooltip.tsx を新規作成。ホバー+クリック両対応、セル上方向（`bottom-full`）にツールチップ表示（D-01, D-03）
- 1日複数記事の場合も全件タイトル+リンクをリスト表示（D-02）
- useEffect + mousedown リスナーで外クリック検知、cleanup で removeEventListener（T-02-06 mitigate）
- CalendarGrid.tsx を更新し、記事ありセルで ArticleTooltip を使用するよう統合
- ブラウザ確認（hover表示・外クリック閉じ・月ナビゲーション）をユーザーが承認

## Phase 2 Success Criteria 達成状況

| # | Success Criteria | 状態 |
|---|-----------------|------|
| 1 | 月別カレンダーグリッドに記事公開日が色付きセルで表示される | 達成（02-01） |
| 2 | 色付きセルにホバーすると記事タイトルと元記事へのリンクが表示される | 達成（02-02） |
| 3 | 前月/次月ボタンで過去の活動月に遷移できる | 達成（02-01） |

## Task Commits

各タスクをアトミックにコミット:

1. **Task 1+2: ArticleTooltip実装・CalendarGrid統合** - `d48f854` (feat)

**Plan metadata:** (docs commit: 本SUMMARYと状態ファイル)

## Files Created/Modified
- `src/components/ArticleTooltip.tsx` - 新規。'use client'付きホバー+クリック両対応ツールチップ
- `src/components/CalendarGrid.tsx` - 記事ありセルで ArticleTooltip を使用するよう更新

## Decisions Made
- ArticleTooltip を CalendarGrid から分離した独立コンポーネントとして実装。ツールチップの open 状態管理を ArticleTooltip 内で完結させることで CalendarGrid の複雑度を上げない（KISS原則）
- onMouseLeave の relatedTarget チェック: ボタンからツールチップ本体へカーソルを移動した際に意図せず閉じないよう実装

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Known Stubs
None — 全記事データは fetchAllFeedsCached 経由の実データを使用。ハードコードや placeholder なし。

## Next Phase Readiness
- Phase 2 の全 Success Criteria を達成。カレンダーUIは完成状態
- Phase 3（ダッシュボードとUX仕上げ）の実装準備が整っている
- 現在 page.tsx で全メンバーのカレンダーを縦並びで表示中。Phase 3でミニカレンダーダッシュボードへの切り替えが必要

---
*Phase: 02-calendar-ui*
*Completed: 2026-05-08*
