---
phase: 03-dashboard-ux
plan: "01"
subsystem: ui
tags: [nextjs, react, tailwindcss, server-component]

# Dependency graph
requires:
  - phase: 02-calendar-ui
    provides: buildDayGrid, buildArticleMap, CalendarGrid パターン確立
provides:
  - extractSubstackId 関数（feedUrl → substackId の変換）
  - MiniCalendar Server Component（今月固定・月ナビなし）
  - ダッシュボード グリッドレイアウト（レスポンシブ 1/2/3列）
affects:
  - 03-02-member-page（substackId ルーティングを利用）

# Tech tracking
tech-stack:
  added: []
  patterns:
    - MiniCalendar を CalendarGrid とは別の Server Component として独立させる（KISS）
    - Link コンポーネントで MiniCalendar カードをラップし /member/[substackId] へ遷移
    - extractSubstackId で feedUrl サブドメインから substackId を動的抽出

key-files:
  created:
    - src/components/MiniCalendar.tsx
  modified:
    - src/lib/calendarUtils.ts
    - src/app/page.tsx

key-decisions:
  - "extractSubstackId は Substack 形式でない URL に対して null を返す（フォールバック除外設計）"
  - "MiniCalendar はツールチップなし（クリックで詳細ページへ誘導する設計のため YAGNI）"
  - "page.tsx で substackId が null の場合は null return でスキップ（型安全な除外）"

patterns-established:
  - "MiniCalendar: colStart は style={{ gridColumnStart }} で設定（Tailwind 動的クラス JIT 非検知問題を回避、Phase 2 確立済みパターンを継続）"
  - "ダッシュボード: grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 のブレークポイント構成"

requirements-completed: [DASH-01, DASH-02, DASH-03]

# Metrics
duration: 6min
completed: 2026-05-08
---

# Phase 3 Plan 01: ダッシュボード改修（ミニカレンダーグリッド化） Summary

**全メンバーを俯瞰できるミニカレンダーグリッドダッシュボードを実装し、各カードから /member/[substackId] へのリンクナビゲーションを追加**

## Performance

- **Duration:** 6 min
- **Started:** 2026-05-08T11:12:42Z
- **Completed:** 2026-05-08T11:18:00Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- calendarUtils.ts に extractSubstackId 関数を追加（feedUrl サブドメイン抽出）
- MiniCalendar Server Component を新規作成（今月固定、月ナビなし、記事有無を色で視覚化）
- page.tsx をグリッドダッシュボードに全面刷新（レスポンシブ 1/2/3 列、各カードをリンク化）

## Task Commits

各タスクは独立してコミット済み:

1. **Task 1: extractSubstackId 関数を calendarUtils.ts に追加** - `296e685` (feat)
2. **Task 2: MiniCalendar Server Component を新規作成** - `9bb453a` (feat)
3. **Task 3: page.tsx をミニカレンダーグリッドダッシュボードに更新** - `f7827fe` (feat)

## Files Created/Modified

- `src/lib/calendarUtils.ts` - extractSubstackId 関数を追加（feedUrl → substackId、Substack 以外は null）
- `src/components/MiniCalendar.tsx` - 新規 Server Component（今月固定のミニカレンダー、記事あり日付は bg-green-500）
- `src/app/page.tsx` - グリッドレイアウトのダッシュボードに刷新（CalendarGrid 廃止、MiniCalendar + Link に変更）

## Decisions Made

- extractSubstackId は Substack 形式でない URL に null を返す設計（page.tsx 側で `if (!substackId) return null` で除外）
- MiniCalendar にツールチップは実装しない（クリックで詳細ページへ誘導する設計のため YAGNI）
- MiniCalendar カードの外枠スタイルはコンポーネント内に持たせる（Link はラッパーとしてのみ機能）

## Deviations from Plan

None - プラン通りに実行された。

## Issues Encountered

None

## User Setup Required

None - 外部サービス設定不要。

## Next Phase Readiness

- Plan 03-01 完了。substackId ルーティングが確立し、Plan 03-02（個人詳細ページ /member/[substackId]）の実装が可能
- CalendarGrid は src/components/ に残存するが、ダッシュボードでは使用しない（03-02 で詳細ページに活用予定）

---
*Phase: 03-dashboard-ux*
*Completed: 2026-05-08*
