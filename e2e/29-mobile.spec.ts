// QA-04 / Phase 29 #1 — 375px モバイル1週縮退（VIEW-07）回帰 spec。
//
// CommitGrid.tsx:117-137 は root `div.flex.flex-1.gap-2` の直下に 3 週ブロックを持つ:
//   week-0 (:120) / week-1 (:126) = "hidden sm:flex ..."（< 640px で display:none）
//   week-2 (:132)                 = "flex flex-1 ..."（常時可視）
// この spec は mobile-375 project（viewport 375x800, playwright.config.ts:50-53 で割り当て済み）
// でのみ実行され、Tailwind の `sm:` media query が効かない 375px 幅で week-0/week-1 が
// toBeHidden（親の display:none を Playwright が検出）、week-2 が toBeVisible になることを
// ブラックボックスで検証する（RESEARCH Pattern 3, HIGH 信頼）。
//
// 手本: e2e/admin-guard.spec.ts（anonymous + page.goto、storageState 不要 — `/` はログイン不要）。
//
// ⚠ 「未コミット」行（slots.length===0）には CommitGrid が描画されない
// （CommitGoalRow.tsx:42-50）。`/` 上に CommitGrid を持つ行を確実に出すため、
// beforeAll で seed member（TEST.publicationId）に commit slot を 1 件投入し、
// afterAll で member_id スコープ delete して復元する（truncate 禁止、28 spec と独立 — D-09 / T-36-04）。
// createTestAdmin（service_role）が RLS をバイパスする。
import { test, expect } from '@playwright/test'
import { createTestAdmin } from './helpers/admin'
import { TEST } from './fixtures/test-data'

async function resolveTestMemberId(): Promise<string> {
  const admin = createTestAdmin()
  const { data: m, error } = await admin
    .from('members')
    .select('id')
    .eq('publication_id', TEST.publicationId)
    .single()
  if (error || !m) {
    throw new Error(
      `[29-mobile] could not resolve test member by publication_id=${TEST.publicationId}: ${error?.message ?? 'not found'}`
    )
  }
  return m.id
}

test.beforeAll(async () => {
  // CommitGrid を持つ行を `/` に確実に出すため、seed member に commit slot を 1 件投入する。
  // 28-commit-flow とは独立 seed（member_id スコープ）。RPC ではなく直 insert で十分。
  const admin = createTestAdmin()
  const memberId = await resolveTestMemberId()
  // 既存スロットをクリアしてから 1 件入れる（再実行の冪等性）。
  await admin.from('member_commit_slots').delete().eq('member_id', memberId)
  const { error } = await admin
    .from('member_commit_slots')
    .insert({ member_id: memberId, day_of_week: 1, hour: 9 })
  if (error) {
    throw new Error(`[29-mobile] beforeAll seed failed: ${error.message}`)
  }
})

test.afterAll(async () => {
  // member_id スコープ delete で seed を復元（truncate 無し、他メンバー非汚染 — D-09 / T-36-04）。
  const admin = createTestAdmin()
  const memberId = await resolveTestMemberId()
  const { error } = await admin
    .from('member_commit_slots')
    .delete()
    .eq('member_id', memberId)
  if (error) {
    throw new Error(`[29-mobile] afterAll cleanup failed: ${error.message}`)
  }
})

test('375px で最新週(week-2)のみ可視 (VIEW-07)', async ({ page }) => {
  await page.goto('/')

  // 最初の CommitGrid root（div.flex.flex-1.gap-2）の直下 3 週ブロックを取得。
  // seed により CommitGrid を持つ行が少なくとも 1 つ存在する。
  const firstGrid = page.locator('div.flex.flex-1.gap-2').first()
  await expect(firstGrid).toBeAttached()
  const weekBlocks = firstGrid.locator('> div')

  // 375px（sm breakpoint 640px 未満）では week-0/week-1 の `hidden sm:flex` が display:none。
  await expect(weekBlocks.nth(0)).toBeHidden() // week-0 (hidden sm:flex)
  await expect(weekBlocks.nth(1)).toBeHidden() // week-1 (hidden sm:flex)
  // week-2 は `flex flex-1` で常時可視。
  await expect(weekBlocks.nth(2)).toBeVisible() // week-2 (flex flex-1)
})
