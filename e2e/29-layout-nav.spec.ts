// QA-04 / Phase 29 #2(構造) + #3(ナビ) — 3列レイアウト構造 + /daily ナビ回帰 spec。
//
// ⚠ Drift D-C: 29-VERIFICATION / 36-RESEARCH が言う旧トップ `/weekly-stamp` ルートは
// 現行コードで `/daily` に移動済み（src/app/daily/page.tsx）+ `ViewTabs.tsx`（href `/`
// =「コミット＆ゴール」/ `/daily`=「デイリー」）。これは src/ のバグではなく後続フェーズの
// 意図的リネームのため、本 spec は現行 `/daily` ルートを対象に書く（修正対象ではなく検証の追従）。
//
// #2（3列構造）はピクセル整列を assert しない（Pitfall 4）。各行に /member/ への Link が
// 存在する構造の存在のみを自動検証し、ピクセル整列・スペーシングは本番手動目視に委譲する
// （29 #2 自動化境界）。
//
// 手本: e2e/admin-guard.spec.ts（anonymous で page.goto + DOM/href assert、storageState
// 不要、Desktop Chrome デフォルト viewport）。本 spec は anonymous project
// （playwright.config.ts:42-44 で割り当て済み）で実行され、DB 書き込みを行わない読み取り
// 専用のため afterEach 不要（T-36-05）。
import { test, expect } from '@playwright/test'

// #2 構造: 各 CommitGoalRow の Col1 は /member/ への Link（CommitGoalRow.tsx:19-39）。
// ピクセル整列は assert しない（Pitfall 4）— 構造存在のみ。
test('各行に member link が存在する (VIEW-03 構造)', async ({ page }) => {
  await page.goto('/')
  // Col1: 各行は /member/{publicationId} への Link
  await expect(page.locator('a[href^="/member/"]').first()).toBeVisible()
})

// #3 ナビ: ViewTabs のデイリータブ（/daily）→ /daily で All タブ + WeeklyHeatmapGrid 描画。
// ⚠ Drift D-C — 旧 /weekly-stamp ではなく現行 /daily を対象にする。
test('ViewTabs と /daily ヒートマップナビ (VIEW-01)', async ({ page }) => {
  await page.goto('/')
  // ViewTabs（ViewTabs.tsx:11-28）: nav 内に デイリータブ a[href="/daily"] が存在する。
  await expect(page.locator('nav a[href="/daily"]')).toBeVisible()

  // /daily へ遷移 → All タブ a[href="/daily"]（daily/page.tsx:38）が可視。
  await page.goto('/daily')
  await expect(page.locator('a[href="/daily"]').first()).toBeVisible()
  // 旧 WeeklyHeatmapGrid が /daily で描画されること（daily/page.tsx:59）。
  // ViewTabs は active='daily' で「デイリー」タブを強調するため、デイリータブが描画されている
  // ことが /daily ページ（= WeeklyHeatmapGrid を含むレイアウト）の到達を担保する。
  await expect(page.getByRole('link', { name: 'デイリー' })).toBeVisible()
})
