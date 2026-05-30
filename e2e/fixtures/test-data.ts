// Static E2E fixture constants. Collision-safe values: every value carries an
// `e2e-` / `playwright-test-` prefix so seeded rows are visually distinguishable
// from real community data in the TEST Supabase project.
//
// Referenced by global-setup (seed + mint) and the specs (assertions/cleanup).
export const TEST = {
  userEmail: 'playwright-test-user@e2e.keep-substack.local',
  teamName: 'e2e-public-team',
  memberName: 'e2e-test-member',
  publicationId: 'e2e-test-publication',
} as const
