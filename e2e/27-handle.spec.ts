// QA-02 / Phase 27 #2-#5 — @handle 描画 / 保存往復 / プロフィールリンク有無の
// logged-in DB round-trip 回帰 spec。e2e/my-teams.spec.ts の構造を 1:1 で踏襲。
//
// DOM 契約（現行ソース直読）:
//   MyProfileForm.tsx:52-71 — substack_handle が null のときのみ編集可能 input
//     (id=substack_handle, label='Substack ハンドル', placeholder='@yourhandle')。
//     非 null のとき hidden input + read-only <p>（編集不可、Drift Alert D-A）。
//   actions.ts:50-58 — handle は '@' 正規化（"hoge" → "@hoge"）。
//   CalendarGrid.tsx:63-71 — handle set 時 <a href={'https://substack.com/' + handle}
//     target="_blank" rel="noopener noreferrer">、null 時はリンクなし素 div。
//   member/[publicationId]/page.tsx — CalendarGrid の memberName=member.name（<h2>）。
//
// ⚠ Drift Alert D-A / Pitfall 1: @handle は一度設定すると read-only。spec は
// member.substack_handle=NULL 開始を前提とし、afterEach で NULL に復元しないと
// 再実行で input が出ず壊れる。
//
// afterEach（Pattern 4 / D-09）は test member の substack_handle のみ NULL に戻す
// member_id スコープ更新。truncate / 他メンバー汚染なし。service_role が RLS を
// バイパス。Real end-to-end: NO mocking.
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
      `[27-handle] could not resolve test member by publication_id=${TEST.publicationId}: ${error?.message ?? 'not found'}`
    )
  }
  return m.id
}

test.afterEach(async () => {
  // Scoped cleanup: handle は設定後 read-only なので NULL に戻さないと次テストで
  // 編集 input が描画されず spec が壊れる（Pitfall 1）。member_id スコープのみ。
  const admin = createTestAdmin()
  const memberId = await resolveTestMemberId()
  const { error } = await admin
    .from('members')
    .update({ substack_handle: null })
    .eq('id', memberId)
  if (error) {
    throw new Error(`[27-handle] afterEach cleanup failed: ${error.message}`)
  }
})

test('#2 @handle input が NULL 時に描画される (PROF-01)', async ({ page }) => {
  // 前提: seed member.substack_handle は初期 NULL（afterEach が NULL 復元する）。
  await page.goto('/my')
  await expect(page.getByLabel('Substack ハンドル')).toBeVisible()
  await expect(page.locator('#substack_handle')).toHaveAttribute(
    'placeholder',
    '@yourhandle'
  )
})

test('#3 @handle 保存往復で read-only @hoge 表示 (PROF-01)', async ({ page }) => {
  await page.goto('/my')
  // "@" なし入力 → 保存 → updateMyProfileAction が '@' 正規化（actions.ts:50-58）
  await page.locator('#substack_handle').fill('hoge')
  await page.getByRole('button', { name: '保存する' }).click()

  // DB 往復を expect.poll で吸収（waitForTimeout 禁止）
  const admin = createTestAdmin()
  await expect
    .poll(async () => {
      const { data } = await admin
        .from('members')
        .select('substack_handle')
        .eq('publication_id', TEST.publicationId)
        .single()
      return data?.substack_handle
    })
    .toBe('@hoge')

  // 設定後は編集 input ではなく read-only <p> に @hoge（Drift Alert D-A）
  await page.reload()
  await expect(page.locator('#substack_handle')).toHaveCount(0)
  await expect(page.getByText('@hoge', { exact: true })).toBeVisible()
})

test('#4 handle 設定時 /member にプロフィールリンクが出る (PROF-02)', async ({
  page,
}) => {
  const admin = createTestAdmin()
  await admin
    .from('members')
    .update({ substack_handle: '@hoge' })
    .eq('publication_id', TEST.publicationId)

  await page.goto(`/member/${TEST.publicationId}`)
  const link = page.locator(
    'a[href="https://substack.com/@hoge"][target="_blank"]'
  )
  await expect(link).toBeVisible()
})

test('#5 handle null 時はリンクなし (PROF-02 fallback)', async ({ page }) => {
  // afterEach 後 / seed 初期は NULL。明示リセットしてから goto。
  const admin = createTestAdmin()
  await admin
    .from('members')
    .update({ substack_handle: null })
    .eq('publication_id', TEST.publicationId)

  await page.goto(`/member/${TEST.publicationId}`)
  // 名前見出し（<h2> memberName）は存在するが substack.com への <a> は無い
  await expect(
    page.getByRole('heading', { name: TEST.memberName })
  ).toBeVisible()
  await expect(page.locator('a[href^="https://substack.com/"]')).toHaveCount(0)
})
