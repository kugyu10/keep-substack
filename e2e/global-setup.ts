// Playwright global-setup: runs ONCE before the suite.
//   1. Idempotently seed the TEST Supabase project (non-admin auth user, public
//      team, user_id-linked member) via the service_role admin client.
//   2. Mint production-identical auth cookies and write the logged-in
//      storageState to e2e/.auth/user.json (gitignored — holds real tokens).
//
// Static fixtures (auth user, team, member) are created here and left in place.
// Mutable member_teams rows are NOT seeded here — they are written by E2E-02 and
// cleaned per-test in afterEach (D-07/D-08/D-09).
import { writeFileSync, mkdirSync } from 'node:fs'
import { createTestAdmin } from './helpers/admin'
import { mintAuthCookies } from './helpers/session'
import { TEST } from './fixtures/test-data'

export default async function globalSetup() {
  // Fail-fast: a missing .env.test must produce a clear error rather than a
  // silent hit against the production Supabase project.
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ] as const
  const missing = required.filter((k) => !process.env[k])
  if (missing.length > 0) {
    throw new Error(
      `[global-setup] Missing required env var(s): ${missing.join(
        ', '
      )}. Copy .env.test.example to .env.test and point it at the TEST Supabase project.`
    )
  }

  // CR-03 guard: fail-fast if the suite is pointed at any non-TEST Supabase
  // project. The biggest data-loss risk is `reuseExistingServer` accidentally
  // attaching to a prod-env dev server (browser → prod, admin → TEST split-brain
  // that overwrites real community handles / commit slots). Reject the known
  // production ref outright, and require the TEST ref to be present, so even a
  // mis-pointed .env.test or stale server is caught BEFORE any write.
  const TEST_PROJECT_REF = 'otydhiumsdsyxepnjqjp'
  const PROD_PROJECT_REF = 'xolhjcngrwwwqtklmoyk'
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  if (supabaseUrl.includes(PROD_PROJECT_REF)) {
    throw new Error(
      `[global-setup] REFUSING TO RUN: NEXT_PUBLIC_SUPABASE_URL points at the PRODUCTION project (${PROD_PROJECT_REF}). ` +
        `E2E tests write/delete data and must target the TEST project (${TEST_PROJECT_REF}). ` +
        `Stop any prod-env dev server on :3000 and verify .env.test.`
    )
  }
  if (!supabaseUrl.includes(TEST_PROJECT_REF)) {
    throw new Error(
      `[global-setup] REFUSING TO RUN: NEXT_PUBLIC_SUPABASE_URL does not point at the expected TEST project (${TEST_PROJECT_REF}). ` +
        `Resolved host: ${supabaseUrl}. Verify .env.test targets the TEST Supabase project.`
    )
  }

  const admin = createTestAdmin()

  // 1. Auth user — intentionally NON-admin (E2E-03 negative case requires a
  //    logged-in non-admin). Do NOT set app_metadata.role='admin'.
  let userId: string | undefined
  const { data: createdUser, error: createErr } =
    await admin.auth.admin.createUser({
      email: TEST.userEmail,
      email_confirm: true,
    })
  if (createErr) {
    // Already registered → look up the existing id and reuse it (idempotent).
    const { data: list, error: listErr } = await admin.auth.admin.listUsers()
    if (listErr) throw listErr
    const existing = list.users.find((u) => u.email === TEST.userEmail)
    if (!existing) throw createErr
    userId = existing.id
  } else {
    userId = createdUser.user?.id
  }
  if (!userId) throw new Error('[global-setup] could not resolve test user id')

  // 2. Public team — MUST be status='public' or no checkbox renders in
  //    MyProfileForm (E2E-02 blocker). Upsert by unique name for idempotency.
  const { error: teamErr } = await admin
    .from('teams')
    .upsert({ name: TEST.teamName, status: 'public' }, { onConflict: 'name' })
  if (teamErr) throw teamErr

  // 3. Member linked to the auth user. Upsert by unique publication_id; the
  //    sync_member_publications trigger fires on INSERT/UPDATE (ON CONFLICT DO
  //    NOTHING) so upsert is safe.
  const { error: memberErr } = await admin.from('members').upsert(
    {
      name: TEST.memberName,
      publication_id: TEST.publicationId,
      user_id: userId,
    },
    { onConflict: 'publication_id' }
  )
  if (memberErr) throw memberErr

  // 4. Mint the logged-in storageState (gitignored — real tokens).
  const cookies = await mintAuthCookies(TEST.userEmail)
  mkdirSync('e2e/.auth', { recursive: true })
  writeFileSync(
    'e2e/.auth/user.json',
    JSON.stringify({ cookies, origins: [] }, null, 2)
  )
}
