import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Module mocks (mirror fetchFeed.test.ts module-stub style) ---

// next/cache revalidatePath → no-op
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Supabase server client (anon, cookie-based) → only used for auth.getUser()
const mockGetUser = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}))

// Supabase admin client (service role) → table reads/writes
const mockAdminFrom = vi.fn()
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: vi.fn(() => ({
    from: mockAdminFrom,
  })),
}))

import { updateMyProfileAction } from '../actions'

// --- Test helpers ---

const AUTH_ERROR = 'ログインセッションが切れました。再ログインしてください'
const NAME_REQUIRED = '名前を入力してください'

const MEMBER_ID = 'm1'

type PublicTeam = { id: string; name: string }

/**
 * Build the chainable admin mock for a single action run.
 * - members.update(...).eq(...).select(...).single() resolves the member row
 * - teams.select(...).eq('status','public') resolves the canonical public set
 * - member_teams delete()/insert() capture spies
 */
function setupAdminMock(opts: {
  publicTeams: PublicTeam[]
  member?: { id: string } | null
  memberError?: unknown
  teamsError?: unknown
}) {
  const insertSpy = vi.fn(async () => ({ error: null }))
  const inSpy = vi.fn(async () => ({ error: null }))
  const deleteSpy = vi.fn(() => ({ eq: () => ({ in: inSpy }) }))
  const updateSpy = vi.fn(() => ({
    eq: () => ({
      select: () => ({
        single: async () => ({
          data: opts.member === undefined ? { id: MEMBER_ID } : opts.member,
          error: opts.memberError ?? null,
        }),
      }),
    }),
  }))

  mockAdminFrom.mockImplementation((table: string) => {
    if (table === 'members') {
      return { update: updateSpy }
    }
    if (table === 'teams') {
      return {
        select: () => ({
          eq: async () => ({
            data: opts.teamsError ? null : opts.publicTeams,
            error: opts.teamsError ?? null,
          }),
        }),
      }
    }
    if (table === 'member_teams') {
      return { delete: deleteSpy, insert: insertSpy }
    }
    throw new Error(`unexpected table: ${table}`)
  })

  return { insertSpy, deleteSpy, inSpy, updateSpy }
}

function makeFormData(name: string, teams: string[], substackHandle?: string): FormData {
  const fd = new FormData()
  fd.append('name', name)
  for (const t of teams) fd.append('teams', t)
  if (substackHandle !== undefined) fd.append('substack_handle', substackHandle)
  return fd
}

describe('updateMyProfileAction - substack_handle normalization (Phase 27 D-08)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
  })

  it('empty substack_handle → update called with substack_handle: null', async () => {
    let capturedUpdate: Record<string, unknown> = {}
    const updateSpy = vi.fn((payload: Record<string, unknown>) => {
      capturedUpdate = payload
      return {
        eq: () => ({
          select: () => ({
            single: async () => ({ data: { id: MEMBER_ID }, error: null }),
          }),
        }),
      }
    })
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'members') return { update: updateSpy }
      if (table === 'teams') return {
        select: () => ({ eq: async () => ({ data: [], error: null }) }),
      }
      if (table === 'member_teams') return {
        delete: () => ({ eq: () => ({ in: async () => ({ error: null }) }) }),
        insert: async () => ({ error: null }),
      }
      throw new Error(`unexpected table: ${table}`)
    })

    const result = await updateMyProfileAction(null, makeFormData('Tester', [], ''))
    expect(result).toBeNull()
    expect(capturedUpdate).toMatchObject({ substack_handle: null })
  })

  it('substack_handle without @ → update called with substack_handle: @hoge', async () => {
    let capturedUpdate: Record<string, unknown> = {}
    const updateSpy = vi.fn((payload: Record<string, unknown>) => {
      capturedUpdate = payload
      return {
        eq: () => ({
          select: () => ({
            single: async () => ({ data: { id: MEMBER_ID }, error: null }),
          }),
        }),
      }
    })
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'members') return { update: updateSpy }
      if (table === 'teams') return {
        select: () => ({ eq: async () => ({ data: [], error: null }) }),
      }
      if (table === 'member_teams') return {
        delete: () => ({ eq: () => ({ in: async () => ({ error: null }) }) }),
        insert: async () => ({ error: null }),
      }
      throw new Error(`unexpected table: ${table}`)
    })

    const result = await updateMyProfileAction(null, makeFormData('Tester', [], 'hoge'))
    expect(result).toBeNull()
    expect(capturedUpdate).toMatchObject({ substack_handle: '@hoge' })
  })

  it('substack_handle with @ → update called with substack_handle: @hoge (no double @)', async () => {
    let capturedUpdate: Record<string, unknown> = {}
    const updateSpy = vi.fn((payload: Record<string, unknown>) => {
      capturedUpdate = payload
      return {
        eq: () => ({
          select: () => ({
            single: async () => ({ data: { id: MEMBER_ID }, error: null }),
          }),
        }),
      }
    })
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'members') return { update: updateSpy }
      if (table === 'teams') return {
        select: () => ({ eq: async () => ({ data: [], error: null }) }),
      }
      if (table === 'member_teams') return {
        delete: () => ({ eq: () => ({ in: async () => ({ error: null }) }) }),
        insert: async () => ({ error: null }),
      }
      throw new Error(`unexpected table: ${table}`)
    })

    const result = await updateMyProfileAction(null, makeFormData('Tester', [], '@hoge'))
    expect(result).toBeNull()
    expect(capturedUpdate).toMatchObject({ substack_handle: '@hoge' })
  })

  it('substack_handle with surrounding spaces → update called with substack_handle: @hoge (trimmed)', async () => {
    let capturedUpdate: Record<string, unknown> = {}
    const updateSpy = vi.fn((payload: Record<string, unknown>) => {
      capturedUpdate = payload
      return {
        eq: () => ({
          select: () => ({
            single: async () => ({ data: { id: MEMBER_ID }, error: null }),
          }),
        }),
      }
    })
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'members') return { update: updateSpy }
      if (table === 'teams') return {
        select: () => ({ eq: async () => ({ data: [], error: null }) }),
      }
      if (table === 'member_teams') return {
        delete: () => ({ eq: () => ({ in: async () => ({ error: null }) }) }),
        insert: async () => ({ error: null }),
      }
      throw new Error(`unexpected table: ${table}`)
    })

    const result = await updateMyProfileAction(null, makeFormData('Tester', [], '  @hoge  '))
    expect(result).toBeNull()
    expect(capturedUpdate).toMatchObject({ substack_handle: '@hoge' })
  })
})

describe('updateMyProfileAction - public-team reconcile + security', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // default: authenticated user
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
  })

  it('join: checking a public team inserts that member_teams row', async () => {
    const { insertSpy, inSpy } = setupAdminMock({
      publicTeams: [{ id: 'a', name: 'Alpha' }],
    })

    const result = await updateMyProfileAction(null, makeFormData('Tester', ['Alpha']))

    expect(result).toBeNull()
    // scoped delete still runs (delete-then-insert reconcile)
    expect(inSpy).toHaveBeenCalledWith('team_id', ['a'])
    expect(insertSpy).toHaveBeenCalledWith([{ member_id: MEMBER_ID, team_id: 'a' }])
  })

  it('leave: empty teams deletes scoped public rows and does NOT insert', async () => {
    const { insertSpy, deleteSpy, inSpy } = setupAdminMock({
      publicTeams: [{ id: 'b', name: 'Beta' }],
    })

    const result = await updateMyProfileAction(null, makeFormData('Tester', []))

    expect(result).toBeNull()
    expect(deleteSpy).toHaveBeenCalled()
    expect(inSpy).toHaveBeenCalledWith('team_id', ['b'])
    expect(insertSpy).not.toHaveBeenCalled()
  })

  it('ignore non-public: a name not in the public set causes no insert (no free-creation)', async () => {
    const { insertSpy } = setupAdminMock({
      publicTeams: [{ id: 'a', name: 'Alpha' }],
    })

    const result = await updateMyProfileAction(null, makeFormData('Tester', ['Ghost']))

    expect(result).toBeNull()
    // 'Ghost' is not a public team → allowed=[] → no insert, no upsert anywhere
    expect(insertSpy).not.toHaveBeenCalled()
    // assert no upsert path was ever taken on the teams table
    const teamsCalls = mockAdminFrom.mock.calls.filter((c) => c[0] === 'teams')
    expect(teamsCalls.length).toBeGreaterThan(0) // teams read for validation
    // no insert spy on member_teams means no membership escalation
  })

  it('preserve private: delete is scoped via .in(team_id, publicTeamIds), not a bare member delete', async () => {
    const { deleteSpy, inSpy } = setupAdminMock({
      publicTeams: [
        { id: 'a', name: 'Alpha' },
        { id: 'b', name: 'Beta' },
      ],
    })

    await updateMyProfileAction(null, makeFormData('Tester', ['Alpha']))

    expect(deleteSpy).toHaveBeenCalled()
    // The scoped .in must be invoked with team_id and the public ids only
    expect(inSpy).toHaveBeenCalledWith('team_id', ['a', 'b'])
  })

  it('auth fail: no user returns exact JP auth string and performs zero writes', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const { insertSpy, deleteSpy, updateSpy } = setupAdminMock({
      publicTeams: [{ id: 'a', name: 'Alpha' }],
    })

    const result = await updateMyProfileAction(null, makeFormData('Tester', ['Alpha']))

    expect(result).toBe(AUTH_ERROR)
    expect(updateSpy).not.toHaveBeenCalled()
    expect(insertSpy).not.toHaveBeenCalled()
    expect(deleteSpy).not.toHaveBeenCalled()
  })

  it('name required: whitespace name returns exact JP string with zero writes', async () => {
    const { insertSpy, deleteSpy, updateSpy } = setupAdminMock({
      publicTeams: [{ id: 'a', name: 'Alpha' }],
    })

    const result = await updateMyProfileAction(null, makeFormData('   ', ['Alpha']))

    expect(result).toBe(NAME_REQUIRED)
    expect(updateSpy).not.toHaveBeenCalled()
    expect(insertSpy).not.toHaveBeenCalled()
    expect(deleteSpy).not.toHaveBeenCalled()
  })
})
