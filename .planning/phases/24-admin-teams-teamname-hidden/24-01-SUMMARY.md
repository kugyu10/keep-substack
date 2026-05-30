---
phase: 24-admin-teams-teamname-hidden
plan: 01
subsystem: ui
tags: [nextjs, rsc, dynamic-route, heatmap, admin, vitest, tdd]

# Dependency graph
requires:
  - phase: 22-team-status
    provides: teams.status (public/private/hidden) on Member.teams[].status
provides:
  - "/admin/teams/[teamName] 動的 RSC: 指定チームの週次ヒートマップ単一ビュー"
  - "status 非依存・完全一致フィルタ（hidden チームも管理者が URL 直アクセスで確認可能）"
  - "element-tree (no-jsdom) テストハーネスの admin ルートへの適用例"
affects: [24-02-proxy-authz]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Next 16 動的ルート: params は Promise、await + decodeURIComponent で untrusted teamName を処理"
    - "RSC element-tree テスト: vi.hoisted で @/lib ヘルパーをモック、client component は stub して findByType で型一致検査"

key-files:
  created:
    - src/app/admin/teams/[teamName]/page.tsx
    - src/app/admin/teams/__tests__/teamPage.test.tsx
  modified: []

key-decisions:
  - "空判定 (filtered.length === 0) を fetchAllFeedsCached 呼び出し前に行い、DB未存在も0人も同一の 200 メッセージで扱う（notFound 不使用）"
  - "テストハーネスでは WeeklyHeatmapGrid を vi.mock で stub（@/ alias は Next build のみが解決、vitest 既定リゾルバは未対応）"

patterns-established:
  - "admin 単一チームビュー: トップの取得パイプライン (getMembers → filter → fetchAllFeedsCached → WeeklyHeatmapGrid) を流用しつつ status 除外分岐とチームタブ・PrBanner を除去"

requirements-completed: [VIEW-01]

# Metrics
duration: 8min
completed: 2026-05-30
---

# Phase 24 Plan 01: Admin Single-Team Heatmap View Summary

**Next 16 動的 RSC `/admin/teams/[teamName]` を新設し、teamName 完全一致（status 非依存）でメンバーを絞り週次ヒートマップを表示。hidden チームも URL 直アクセスで管理者が確認可能（VIEW-01）。**

## Performance

- **Duration:** ~8 min
- **Completed:** 2026-05-30
- **Tasks:** 2
- **Files modified:** 2 (both created)

## Accomplishments
- `/admin/teams/[teamName]` 動的ルートを新設。`await params` + `decodeURIComponent` で日本語/エンコード teamName に対応
- status 非依存・完全一致フィルタ（`m.teams.some((t) => t.name === teamName)`）で hidden チームを表示。トップの `.status !== 'hidden'` 除外分岐は持ち込まず（D-06/D-07）
- 未存在/0人チームは単一空分岐で 200 メッセージ `<p>` を返す（`notFound()` 不使用、D-01/D-02）
- chrome は戻りリンク + `<h1>` + `<WeeklyHeatmapGrid>` の3要素のみ。PrBanner・チームタブなし（D-03/D-04/D-05）
- 5 ケースの element-tree テストを TDD で先行作成（RED → GREEN）

## Task Commits

1. **Task 1: Wave 0 failing tests (RED)** - `cd46269` (test)
2. **Task 2: implement page.tsx (GREEN) + harness fix** - `634dde5` (feat)

_TDD: RED test commit → GREEN feat commit。REFACTOR は不要（実装が最小で簡潔）。_

## Files Created/Modified
- `src/app/admin/teams/[teamName]/page.tsx` - Next 16 動的 RSC。teamName decode → 完全一致フィルタ → 空ならメッセージ / 非空なら fetchAllFeedsCached + WeeklyHeatmapGrid
- `src/app/admin/teams/__tests__/teamPage.test.tsx` - no-jsdom element-tree テスト 5 ケース（renders heatmap / filters by exact teamName / decodes encoded teamName / unknown team message / empty team message）

## Decisions Made
- 空判定を `fetchAllFeedsCached` 呼び出し前に置き、無駄なフィード取得を回避しつつ DB未存在と0人を同一扱い（Pitfall 5）
- `revalidate = 300` をトップに合わせて設定（D-05, Claude 裁量）

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] テストの vi.mock 巻き上げ順序を vi.hoisted で修正**
- **Found during:** Task 2（GREEN 実行時）
- **Issue:** `const mockGetMembers = vi.fn()` を `vi.mock` ファクトリ内で参照したため "Cannot access 'mockGetMembers' before initialization"（vi.mock がファイル先頭へ巻き上げられる）
- **Fix:** モック関数を `vi.hoisted(() => ({ ... }))` で生成（既存 `my` テストと同パターン）
- **Files modified:** src/app/admin/teams/__tests__/teamPage.test.tsx
- **Verification:** 5 ケース GREEN
- **Committed in:** 634dde5

**2. [Rule 3 - Blocking] WeeklyHeatmapGrid を vi.mock で stub（@/ alias 解決不可）**
- **Found during:** Task 2（GREEN 実行時）
- **Issue:** vitest 既定リゾルバが `@/components/WeeklyHeatmapGrid` を解決できず "Cannot find package"。`@/` alias は Next build のみが解決する
- **Fix:** プランが許容した代替（`vi.mock('@/components/WeeklyHeatmapGrid', () => ({ default: () => null }))`）を適用。page と test が同一 stub モジュールを参照するため `findByType` の型一致は維持
- **Files modified:** src/app/admin/teams/__tests__/teamPage.test.tsx
- **Verification:** "renders heatmap" / "filters" / "decodes" が grid を検出、空ケースは grid 不在を確認
- **Committed in:** 634dde5

---

**Total deviations:** 2 auto-fixed（いずれも Rule 3 blocking、テストハーネスのみ）
**Impact on plan:** 実装ロジックへの影響なし。両方ともプランが明示的に想定済みの代替パス。スコープクリープなし。

## Issues Encountered
- None beyond the two auto-fixed harness issues above.

## TDD Gate Compliance
- RED gate: `cd46269` test commit（5 ケース全 FAIL、page 未実装）
- GREEN gate: `634dde5` feat commit（5 ケース全 PASS）
- REFACTOR: 不要（最小実装）

## Verification Results
- `npx vitest run src/app/admin/teams/__tests__/teamPage.test.tsx`: 5/5 PASS
- `npm run build`: 成功。`/admin/teams/[teamName]` が動的ルートとして登録 (ƒ)
- 全スイート: 31/31 PASS（6 ファイル）
- grep ゲート: `status !== 'hidden'` = 0 / `notFound` = 0 / `PrBanner` = 0
- proxy.ts: 無変更

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- VIEW-01 完了。24-02 で proxy.ts の `/admin/:path*` matcher が `/admin/teams/[teamName]` を保護することを確認するテスト（VIEW-02 / T-24-03）が次の作業
- このプランは proxy.ts を一切変更していない（認可は既存ゲートに委譲）

## Self-Check: PASSED

- FOUND: src/app/admin/teams/[teamName]/page.tsx
- FOUND: src/app/admin/teams/__tests__/teamPage.test.tsx
- FOUND: 24-01-SUMMARY.md
- FOUND commit: cd46269 (RED test)
- FOUND commit: 634dde5 (GREEN feat)

---
*Phase: 24-admin-teams-teamname-hidden*
*Completed: 2026-05-30*
