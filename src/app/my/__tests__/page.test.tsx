import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ReactElement } from 'react'

// --- Module mocks (mirror updateMyProfileAction.test.ts module-stub style) ---

// next/navigation redirect → throws (mirrors real Next redirect control-flow:
// redirect() throws a special error so execution short-circuits). This lets us
// assert it was called AND that nothing runs after it.
const REDIRECT_SIGNAL = 'NEXT_REDIRECT'
const { mockRedirect } = vi.hoisted(() => ({
  mockRedirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  }),
}))
vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}))

// Supabase server client (anon, cookie-based) → only used for auth.getUser()
const mockGetUser = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}))

// LogoutButton is a client component rendered in the page chrome but not under
// test. Stub it so vitest doesn't have to resolve the @/ alias for a real module.
vi.mock('@/components/LogoutButton', () => ({
  default: () => null,
}))

// Supabase admin client (service role) → table reads
const mockAdminFrom = vi.fn()
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: vi.fn(() => ({
    from: mockAdminFrom,
  })),
}))

import MyPage from '../page'
import MyProfileForm from '../MyProfileForm'
import LinkMemberForm from '../LinkMemberForm'

// --- Element-tree helpers (no jsdom: inspect the React element object tree) ---

type AnyEl = ReactElement<Record<string, unknown>> & { type: unknown }

function isElement(node: unknown): node is AnyEl {
  return (
    typeof node === 'object' &&
    node !== null &&
    'type' in (node as object) &&
    'props' in (node as object)
  )
}

/** Depth-first walk over the returned element tree to find an element by component type. */
function findByType(node: unknown, target: unknown): AnyEl | null {
  if (!isElement(node)) return null
  if (node.type === target) return node
  const children = (node.props as { children?: unknown }).children
  const list = Array.isArray(children) ? children : [children]
  for (const child of list) {
    const found = findByType(child, target)
    if (found) return found
  }
  return null
}

// --- Chainable admin mock, per-table (members / teams) ---

const USER_ID = 'user-123'

type MemberTeamsJoin = { teams: { name: string; status: string } | null }[]

function setupAdminMock(opts: {
  member?: {
    id?: string
    name: string
    publication_id: string
    substack_handle?: string | null
    member_teams: MemberTeamsJoin
  } | null
  publicTeams?: { id: string; name: string }[]
}) {
  // members: .select(...).eq('user_id', id).maybeSingle()
  const membersEqSpy = vi.fn(() => ({
    maybeSingle: async () => ({
      data: opts.member ?? null,
      error: null,
    }),
  }))
  const membersSelectSpy = vi.fn(() => ({ eq: membersEqSpy }))

  // teams: .select('id, name').eq('status','public').order('name')
  const teamsEqSpy = vi.fn(() => ({
    order: async () => ({
      data: opts.publicTeams ?? [],
      error: null,
    }),
  }))
  const teamsSelectSpy = vi.fn(() => ({ eq: teamsEqSpy }))

  // member_commit_slots: .select(...).eq('member_id', id).order('day_of_week')
  const commitSlotsOrderSpy = vi.fn(async () => ({ data: [], error: null }))
  const commitSlotsEqSpy = vi.fn(() => ({ order: commitSlotsOrderSpy }))
  const commitSlotsSelectSpy = vi.fn(() => ({ eq: commitSlotsEqSpy }))

  mockAdminFrom.mockImplementation((table: string) => {
    if (table === 'members') return { select: membersSelectSpy }
    if (table === 'teams') return { select: teamsSelectSpy }
    if (table === 'member_commit_slots') return { select: commitSlotsSelectSpy }
    throw new Error(`unexpected table: ${table}`)
  })

  return { membersSelectSpy, membersEqSpy, teamsSelectSpy, teamsEqSpy, commitSlotsSelectSpy, commitSlotsEqSpy }
}

describe('MyPage RSC — read path (SELF-01 / SELF-03 / T-23-05 / T-23-06)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // default: authenticated user
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } })
  })

  it('auth gate (T-23-05): unauthenticated request redirects to / before any admin read', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    setupAdminMock({ member: null })

    await expect(MyPage()).rejects.toThrow(`${REDIRECT_SIGNAL}:/`)

    expect(mockRedirect).toHaveBeenCalledWith('/')
    // The thrown redirect must short-circuit before any service-role read.
    expect(mockAdminFrom).not.toHaveBeenCalled()
  })

  it('public-only fetch, no leakage (SELF-01, D-01/T-23-06): teams query filters status=public and props drop id', async () => {
    const { teamsEqSpy } = setupAdminMock({
      member: {
        name: 'Tester',
        publication_id: 'pub-1',
        member_teams: [],
      },
      publicTeams: [
        { id: 't-alpha', name: 'Alpha' },
        { id: 't-beta', name: 'Beta' },
      ],
    })

    const el = await MyPage()
    const form = findByType(el, MyProfileForm)
    expect(form).not.toBeNull()

    // The join-able set is filtered to status='public' (private/hidden never queried).
    expect(teamsEqSpy).toHaveBeenCalledWith('status', 'public')

    // publicTeams prop is the mapped { name }[] with id dropped — no leakage of ids.
    const member = (form!.props as { member: { publicTeams: { name: string }[] } }).member
    expect(member.publicTeams).toEqual([{ name: 'Alpha' }, { name: 'Beta' }])
    // assert id really was dropped
    expect(member.publicTeams.some((t) => 'id' in t)).toBe(false)
  })

  it('currentTeams passthrough (SELF-03): private joined team is kept, null join entry filtered out', async () => {
    setupAdminMock({
      member: {
        name: 'Tester',
        publication_id: 'pub-1',
        member_teams: [
          { teams: { name: 'Alpha', status: 'public' } },
          { teams: { name: 'Sec', status: 'private' } },
          { teams: null },
        ],
      },
      publicTeams: [{ id: 't-alpha', name: 'Alpha' }],
    })

    const el = await MyPage()
    const form = findByType(el, MyProfileForm)
    expect(form).not.toBeNull()

    const member = (form!.props as {
      member: { currentTeams: { name: string; status: string }[] }
    }).member

    // null teams entry filtered → length 2
    expect(member.currentTeams).toHaveLength(2)
    // status passthrough: the private team is present with its status intact
    expect(member.currentTeams).toContainEqual({ name: 'Sec', status: 'private' })
    expect(member.currentTeams).toContainEqual({ name: 'Alpha', status: 'public' })
  })

  it('per-user scope (T-23-05 IDOR): member query is scoped to the authenticated user id', async () => {
    const { membersEqSpy } = setupAdminMock({
      member: {
        name: 'Tester',
        publication_id: 'pub-1',
        member_teams: [],
      },
      publicTeams: [],
    })

    await MyPage()

    // The sole authorization gate: .eq('user_id', user.id) — never another user.
    expect(membersEqSpy).toHaveBeenCalledWith('user_id', USER_ID)
  })

  it('no member → LinkMemberForm (regression guard), not MyProfileForm', async () => {
    setupAdminMock({ member: null, publicTeams: [{ id: 't-a', name: 'Alpha' }] })

    const el = await MyPage()

    expect(findByType(el, LinkMemberForm)).not.toBeNull()
    expect(findByType(el, MyProfileForm)).toBeNull()
  })
})

describe('MyPage RSC — substackHandle prop (Phase 31 D-03)', () => {
  // D-03: substackHandleDefault → substackHandle, handle URL param fallback removed
  // callback (D-02) saves substack_handle to DB, so handle= param is no longer needed
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } })
  })

  it('DB value: member has substack_handle → MyProfileForm receives DB value as substackHandle', async () => {
    setupAdminMock({
      member: {
        name: 'Tester',
        publication_id: 'pub-1',
        substack_handle: '@hoge',
        member_teams: [],
      },
      publicTeams: [],
    })

    // D-03: handle URL param is ignored — only DB value used
    const el = await (MyPage as (props: { searchParams: Promise<{ handle?: string }> }) => Promise<unknown>)({
      searchParams: Promise.resolve({ handle: 'other' }),
    })
    const form = findByType(el, MyProfileForm)
    expect(form).not.toBeNull()

    const props = form!.props as { substackHandle?: string | null }
    expect(props.substackHandle).toBe('@hoge')
  })

  it('null DB value: member has substack_handle=null → MyProfileForm receives null (not searchParams fallback)', async () => {
    // D-03: handle URL param fallback is removed; null stays null
    setupAdminMock({
      member: {
        name: 'Tester',
        publication_id: 'pub-1',
        substack_handle: null,
        member_teams: [],
      },
      publicTeams: [],
    })

    const el = await (MyPage as (props: { searchParams: Promise<{ handle?: string }> }) => Promise<unknown>)({
      searchParams: Promise.resolve({ handle: 'hoge' }),
    })
    const form = findByType(el, MyProfileForm)
    expect(form).not.toBeNull()

    const props = form!.props as { substackHandle?: string | null }
    // D-03 change: searchParams handle is no longer used as fallback
    expect(props.substackHandle).toBeNull()
  })

  it('both absent: member has substack_handle=null, no searchParams → MyProfileForm receives null', async () => {
    setupAdminMock({
      member: {
        name: 'Tester',
        publication_id: 'pub-1',
        substack_handle: null,
        member_teams: [],
      },
      publicTeams: [],
    })

    const el = await (MyPage as (props: { searchParams: Promise<{ handle?: string }> }) => Promise<unknown>)({
      searchParams: Promise.resolve({}),
    })
    const form = findByType(el, MyProfileForm)
    expect(form).not.toBeNull()

    const props = form!.props as { substackHandle?: string | null }
    expect(props.substackHandle).toBeNull()
  })
})
