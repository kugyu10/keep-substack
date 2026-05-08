---
phase: 03-dashboard-ux
plan: "02"
subsystem: ui
tags: [nextjs, react, tailwindcss, server-component, static-generation]

# Dependency graph
requires:
  - phase: 03-01
    provides: extractSubstackId, MiniCalendar, ダッシュボードリンク
  - phase: 02-calendar-ui
    provides: CalendarGrid（月ナビ付きフルカレンダー）
provides:
  - 個人詳細ページ /member/[substackId]（generateStaticParams + force-static）
  - Phase 3 完了 — v1.0 MVP 完成
affects:
  - src/app/member/[substackId]/page.tsx

# Tech tracking
tech-stack:
  added: []
  patterns:
    - generateStaticParams + dynamicParams=false で全パスをビルド時静的生成
    - fetchAllFeedsCached(['all-feeds']) キャッシュキー共有でダッシュボードと個人詳細ページの効率化

key-files:
  created:
    - src/app/member/[substackId]/page.tsx
  modified: []

key-decisions:
  - "dynamicParams=false で未知の substackId は Next.js が自動 404（T-03-03 セキュリティ対応）"
  - "fetchAllFeedsCached 全件取得 → filter パターン（キャッシュキー共有、追加リクエストなし）"
  - "Next.js 15+ の params は Promise 型のため await が必須（Pitfall 1 対応）"
  - "notFound() は memberResult が undefined のときに呼び出し（dynamicParams=false が主防衛、二重安全）"

requirements-completed: [DASH-02]

# Metrics
duration: 10min
completed: 2026-05-08
---

# Phase 3 Plan 02: 個人詳細ページ実装 Summary

**generateStaticParams + force-static + CalendarGrid 再利用で /member/[substackId] 静的個人詳細ページを実装し、Phase 3 全 Success Criteria を達成。v1.0 MVP 完成。**

## Performance

- **Duration:** 10 min
- **Started:** 2026-05-08T11:20:00Z
- **Completed:** 2026-05-08T11:30:00Z
- **Tasks:** 2（+ UX仕上げ改善 3件）
- **Files modified:** 1（新規作成）

## Accomplishments

- `src/app/member/[substackId]/page.tsx` を新規作成（50行）
- generateStaticParams で全メンバーのパスをビルド時静的生成
- dynamicParams=false で未知の substackId を 404 に（セキュリティ T-03-03 対応）
- CalendarGrid を再利用しフルカレンダー（月ナビ付き）を表示
- 「← ダッシュボードに戻る」リンクで UX 完結
- ブラウザ確認完了（approved）

### 追加で実施した UX 仕上げ改善（Plan 03-01 コミット後の追加作業）

| コミット | 内容 |
|---------|------|
| d4cb8c5 | ミニカレンダーに記事数による色濃度を適用（初期実装） |
| 4733e1e | ミニカレンダーの色濃度を6段階に変更（視認性向上） |
| 134b66b | ツールチップとセル間のギャップを透明パディングで修正（ホバー離脱バグ修正） |
| 71477ea | 記事リンクに UTM パラメータ付与（アクセス計測対応） |

## Task Commits

| Task | Commit | 内容 |
|------|--------|------|
| Task 1: 個人詳細ページ作成 | 401bc60 | feat(03-02): 個人詳細ページ /member/[substackId] 実装 |
| 追加: ミニカレンダー色濃度初期 | d4cb8c5 | feat(03-01): ミニカレンダーに記事数による色濃度を適用 |
| 追加: 色濃度6段階 | 4733e1e | feat(03-01): ミニカレンダーの色濃度を6段階に変更 |
| 追加: ツールチップギャップ修正 | 134b66b | fix: ツールチップとセル間のギャップを透明パディングで埋める |
| 追加: UTMパラメータ | 71477ea | feat: 記事リンクにUTMパラメータを付与 |
| Task 2: ブラウザ確認 | - | approved（ユーザー確認済み） |

## Files Created/Modified

- `src/app/member/[substackId]/page.tsx` — 新規作成。generateStaticParams + force-static + CalendarGrid 再利用

## Decisions Made

- `dynamicParams=false` で未知の substackId は Next.js が自動 404（T-03-03 セキュリティ対応）
- `fetchAllFeedsCached` 全件取得 → `filter` パターン（キャッシュキー `['all-feeds']` 共有で追加リクエストなし）
- Next.js 15+ の `params` は `Promise` 型のため `await` が必須
- `notFound()` は memberResult が undefined のときに呼び出し（dynamicParams=false が主防衛、二重安全）

## Phase 3 Success Criteria 達成確認

| # | 基準 | 達成 |
|---|------|------|
| 1 | ダッシュボードで全メンバーのミニカレンダーが一覧表示される | 03-01 で達成済み |
| 2 | メンバーをクリックすると個人詳細ビューに切り替わり、そのメンバーのカレンダーが大きく表示される | 本 Plan で達成 |
| 3 | スマートフォンでもカレンダーとダッシュボードが見やすく表示される | 03-01 のレスポンシブグリッド + MiniCalendar で達成済み |

**Phase 3 全 Success Criteria 達成。v1.0 MVP 完成。**

## Deviations from Plan

None — プラン通りに実行された。追加 UX 改善（色濃度・ツールチップ・UTM）は Plan 外だが、品質向上のため実施。

## Issues Encountered

None

## User Setup Required

None — 外部サービス設定不要。

## Threat Surface Scan

新規エンドポイント `/member/[substackId]` について:
- `dynamicParams=false` により generateStaticParams で生成したパス以外は 404（T-03-03 対応済み）
- `fetchAllFeedsCached` はビルド時のみ実行（静的生成）、実行時の外部リクエストなし
- 追加の脅威面なし

## Self-Check: PASSED

- FOUND: src/app/member/[substackId]/page.tsx
- FOUND: .planning/phases/03-dashboard-ux/03-02-SUMMARY.md
- FOUND: commit 401bc60 (feat(03-02): 個人詳細ページ)

---
*Phase: 03-dashboard-ux*
*Completed: 2026-05-08*
*v1.0 MVP Complete*
