// QA-03 / Phase 28 #2 — /my スケジュール宣言フルフロー回帰 spec。
//
// このファイルは 2 種類のテストを持つ:
//   (1) `RPC 前提` スモーク — TEST project に replace_member_commit_slots RPC が
//       適用済みかを fail-fast 確認する（28 フルフローの前提条件）。
//   (2) スケジュール宣言フルフロー — モーダル開閉・頻度変更でのスロット増減・
//       重複曜日警告＋ボタン無効化・宣言保存・DB 往復（RPC 経由のブラックボックス）・
//       reload 後サマリー表示を検証する。
//
// 保存は delete+insert ではなく RPC `replace_member_commit_slots`（actions.ts:176、
// Phase 33 アトミック化、Drift Alert D-B）。E2E は内部実装に依存せず
// member_commit_slots の行数のみをブラックボックス往復で検証する。
//
// 共有 TEST member 行に書き込むため afterEach で member_id スコープ delete を行い
// 副作用を残さない（truncate 禁止、他メンバー非汚染 — D-09）。service_role の
// createTestAdmin が RLS をバイパスする。Real end-to-end: NO mocking.
//
// ⚠ `--fail-on-empty` は本リポジトリの Playwright 1.60 では未サポートのため、
// 「≥1 テストが実際に走った」ことの保証は spec 内ガード（ranRpcSmoke フラグ +
// test.afterAll での expect）で行う（acceptance_criteria の等価 fallback）。
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
      `[28-commit-flow] could not resolve test member by publication_id=${TEST.publicationId}: ${error?.message ?? 'not found'}`
    )
  }
  return m.id
}

// fail-fast ガード: `-g "RPC 前提"` が 0 件マッチ（no-tests-run の false green）を
// 検出する。Playwright 1.60 は --fail-on-empty を解さないため、このフラグで
// 「RPC 前提 テストが実際に 1 件以上走った」ことを明示アサートする。
let ranRpcSmoke = false

test.afterEach(async () => {
  // Scoped cleanup: remove only the test member's commit slots so each run starts
  // from a clean state. No truncate, no cross-member impact (D-09).
  const admin = createTestAdmin()
  const memberId = await resolveTestMemberId()
  const { error } = await admin
    .from('member_commit_slots')
    .delete()
    .eq('member_id', memberId)
  if (error) {
    throw new Error(`[28-commit-flow] afterEach cleanup failed: ${error.message}`)
  }
})

test.afterAll(() => {
  // 等価 fail-fast: `RPC 前提` テストが実際に走っていなければ失敗させる。
  expect(ranRpcSmoke).toBe(true)
})

test('RPC 前提: replace_member_commit_slots が TEST project に存在する', async () => {
  ranRpcSmoke = true
  const admin = createTestAdmin()
  const memberId = await resolveTestMemberId()
  // 空配列で 1 度呼ぶ。RPC が存在すれば rpcError===null。未適用なら PostgREST が
  // 'function ... does not exist' を返し fail-fast する。member_commit_slots に
  // 行は残らない（空配列）が、afterEach の member_id スコープ delete でも保証する。
  const { error: rpcError } = await admin.rpc('replace_member_commit_slots', {
    p_member_id: memberId,
    p_slots: [],
  })
  expect(rpcError).toBeNull()
})

// QA-03 / 28 #2 — /my スケジュール宣言フルフロー。
//   モーダル開閉 → 頻度変更でスロット行が増える → 重複曜日で警告＋「宣言する」無効化 →
//   別曜日に直して宣言 → モーダルが閉じる → DB(member_commit_slots) に 2 行（RPC 往復を
//   ブラックボックス検証）→ reload 後サマリー「週2回 —」表示。
// DOM 契約: CommitScheduleModal.tsx（トリガー「投稿スケジュールを宣言する」/ role=dialog /
//   #frequency / #day-{i} / 警告「同じ曜日を複数選択しています」/ 送信「宣言する」、
//   disabled={isPending || showDuplicateWarning}）。waitForTimeout 不使用・expect.poll で
//   server-action レイテンシ吸収（S-5）。
test('スケジュール宣言フルフロー (SCHED-01/02/03)', async ({ page }) => {
  await page.goto('/my')

  // モーダルを開く
  await page.getByRole('button', { name: '投稿スケジュールを宣言する' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()

  // 頻度 2 → スロット行が 2 つ（#day-1 が出現）
  await page.locator('#frequency').selectOption('2')
  await expect(page.locator('#day-1')).toBeVisible()

  // 同じ曜日を 2 つ選ぶ → 重複警告 visible + 「宣言する」disabled
  await page.locator('#day-0').selectOption('1')
  await page.locator('#day-1').selectOption('1')
  await expect(page.getByText('同じ曜日を複数選択しています')).toBeVisible()
  await expect(page.getByRole('button', { name: '宣言する' })).toBeDisabled()

  // 別曜日に直す → 「宣言する」click → モーダルが閉じる
  await page.locator('#day-1').selectOption('3')
  await page.getByRole('button', { name: '宣言する' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()

  // DB 往復（RPC 経由のブラックボックス検証）: member_commit_slots に member_id スコープで 2 行
  const admin = createTestAdmin()
  const memberId = await resolveTestMemberId()
  await expect
    .poll(async () => {
      const { count } = await admin
        .from('member_commit_slots')
        .select('*', { count: 'exact', head: true })
        .eq('member_id', memberId)
      return count
    })
    .toBe(2)

  // reload 後サマリー「週2回 —」が表示される
  await page.reload()
  await expect(page.getByText(/週2回 —/)).toBeVisible()
})
