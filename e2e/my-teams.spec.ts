// E2E-02: a logged-in member joins a public team via the /my form, and the
// join is observable as a member_teams INSERT. Runs under the `logged-in`
// project (storageState attached via playwright.config.ts).
//
// DOM contract (src/app/my/MyProfileForm.tsx:59-87): each public team renders a
// native <input type="checkbox" name="teams" value={t.name}> inside a <label>
// whose text is the team name, plus a <button type="submit">保存する</button>.
// DB contract (src/app/my/actions.ts:89-105): on save, the action deletes this
// member's public-team member_teams rows then inserts the checked ones.
//
// afterEach (Pattern 4 / D-09) deletes ONLY the test member's member_teams rows,
// scoped by member_id — NEVER a broad truncate. service_role bypasses RLS so the
// cleanup succeeds and reruns stay deterministic. Real end-to-end: NO mocking.
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
      `[my-teams] could not resolve test member by publication_id=${TEST.publicationId}: ${error?.message ?? 'not found'}`
    )
  }
  return m.id
}

test.afterEach(async () => {
  // Scoped cleanup: remove only the test member's member_teams rows so each run
  // starts from a clean join state. No truncate, no cross-member impact (D-09).
  const admin = createTestAdmin()
  const memberId = await resolveTestMemberId()
  const { error } = await admin
    .from('member_teams')
    .delete()
    .eq('member_id', memberId)
  if (error) {
    throw new Error(`[my-teams] afterEach cleanup failed: ${error.message}`)
  }
})

test('public チームに参加できる (E2E-02)', async ({ page }) => {
  await page.goto('/my')

  // Check the public-team checkbox by its label text, then save. Auto-waiting
  // (check/click) handles render + submit timing — NO waitForTimeout.
  await page.getByRole('checkbox', { name: TEST.teamName }).check()
  await page.getByRole('button', { name: '保存する' }).click()

  // Assert the DB delta. expect.poll absorbs the server-action latency (the
  // form submit triggers updateMyProfileAction, which writes member_teams).
  const admin = createTestAdmin()
  await expect
    .poll(async () => {
      const { data: m } = await admin
        .from('members')
        .select('id')
        .eq('publication_id', TEST.publicationId)
        .single()
      if (!m) return null
      const { count } = await admin
        .from('member_teams')
        .select('*', { count: 'exact', head: true })
        .eq('member_id', m.id)
      return count
    })
    .toBe(1)
})
