import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ReactElement } from 'react'
import type { Member, MemberFeedResult, CommitSlot } from '@/lib/types'

// --- Module mocks: stub the high-level @/lib helpers so no real RSS/DB runs ---

const { mockGetMembers, mockFetchAllFeedsCached } = vi.hoisted(() => ({
  mockGetMembers: vi.fn<() => Promise<Member[]>>(),
  mockFetchAllFeedsCached:
    vi.fn<(members: Member[]) => Promise<MemberFeedResult[]>>(),
}))
vi.mock('@/lib/members', () => ({
  getMembers: mockGetMembers,
}))
vi.mock('@/lib/fetchFeed', () => ({
  fetchAllFeedsCached: mockFetchAllFeedsCached,
}))

// CommitGoalView + PrBanner are stubbed so the page renders without real data.
// The page's import resolves to these same stubbed modules, so findByType still
// matches the element type by reference.
vi.mock('@/components/CommitGoalView', () => ({
  default: () => null,
}))
vi.mock('@/components/PrBanner', () => ({
  default: () => null,
}))

// Mock Supabase admin client — page.tsx calls createSupabaseAdminClient() to
// SELECT member_commit_slots. Return a minimal no-op stub.
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({ data: [], error: null })),
    })),
  })),
}))

import Home from '../page'
import CommitGoalView from '@/components/CommitGoalView'

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

/** Flatten arbitrarily-nested children arrays into a flat list of nodes. */
function flattenChildren(children: unknown): unknown[] {
  if (Array.isArray(children)) return children.flatMap(flattenChildren)
  return [children]
}

/** Depth-first walk over the returned element tree to find an element by component type. */
function findByType(node: unknown, target: unknown): AnyEl | null {
  if (!isElement(node)) return null
  if (node.type === target) return node
  const children = (node.props as { children?: unknown }).children
  for (const child of flattenChildren(children)) {
    const found = findByType(child, target)
    if (found) return found
  }
  return null
}

/** Walk the tree collecting the string text content of every <a> element. */
function collectAnchorLabels(node: unknown): string[] {
  const out: string[] = []
  function walk(n: unknown) {
    if (!isElement(n)) return
    const children = (n.props as { children?: unknown }).children
    const flat = flattenChildren(children)
    if (n.type === 'a') {
      for (const c of flat) if (typeof c === 'string') out.push(c)
    }
    for (const child of flat) walk(child)
  }
  walk(node)
  return out
}

// --- Fixtures ---

function member(name: string, teams: { name: string; status: string }[]): Member {
  return {
    name,
    publicationId: `pub-${name}`,
    teams,
    addedAt: '2026-01-01T00:00:00.000Z',
  }
}

describe('Home RSC — team tabs (TEAM-03) and All/team filtering (TEAM-04)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetMembers.mockResolvedValue([])
    // map members → results so results.length === filtered member count
    mockFetchAllFeedsCached.mockImplementation(async (members: Member[]) =>
      members.map((m) => ({ member: m, items: [] }))
    )
  })

  // ── TEAM-03 ──────────────────────────────────────────────────────────────
  it('shows ONLY public team names as tabs — private/hidden teams absent', async () => {
    mockGetMembers.mockResolvedValue([
      member('Alice', [{ name: 'PublicTeam', status: 'public' }]),
      member('Bob', [{ name: 'PrivateTeam', status: 'private' }]),
      member('Carol', [{ name: 'HiddenTeam', status: 'hidden' }]),
      // member in both a public and a private team — only public name should tab
      member('Dave', [
        { name: 'PublicTeam', status: 'public' },
        { name: 'SecretTeam', status: 'private' },
      ]),
    ])

    const el = await Home({ searchParams: Promise.resolve({}) })

    const labels = collectAnchorLabels(el)
    // 'All' link is always present
    expect(labels).toContain('All')
    expect(labels).toContain('PublicTeam')
    // private / hidden team names must NOT appear as tabs
    expect(labels).not.toContain('PrivateTeam')
    expect(labels).not.toContain('SecretTeam')
    expect(labels).not.toContain('HiddenTeam')
  })

  it('dedupes public team names appearing across multiple members', async () => {
    mockGetMembers.mockResolvedValue([
      member('Alice', [{ name: 'Alpha', status: 'public' }]),
      member('Bob', [{ name: 'Alpha', status: 'public' }]),
      member('Carol', [{ name: 'Beta', status: 'public' }]),
    ])

    const el = await Home({ searchParams: Promise.resolve({}) })

    const labels = collectAnchorLabels(el)
    const tabNames = labels.filter((l) => l !== 'All')
    expect(tabNames.sort()).toEqual(['Alpha', 'Beta'])
    // Alpha appears exactly once (deduped)
    expect(tabNames.filter((n) => n === 'Alpha')).toHaveLength(1)
  })

  // ── TEAM-04 (a): All view excludes members of hidden teams ────────────────
  it('All view: excludes members belonging to any hidden team', async () => {
    mockGetMembers.mockResolvedValue([
      member('Alice', [{ name: 'PublicTeam', status: 'public' }]),
      member('Bob', [{ name: 'PrivateTeam', status: 'private' }]),
      member('Carol', [{ name: 'HiddenTeam', status: 'hidden' }]),
      // belongs to a public AND a hidden team → has a hidden membership → excluded
      member('Dave', [
        { name: 'PublicTeam', status: 'public' },
        { name: 'HiddenTeam', status: 'hidden' },
      ]),
    ])

    const el = await Home({ searchParams: Promise.resolve({}) })

    const grid = findByType(el, CommitGoalView)
    expect(grid).not.toBeNull()
    const results = (grid!.props as { results: MemberFeedResult[]; slots: CommitSlot[] }).results
    const names = results.map((r) => r.member.name).sort()
    // Alice (public) and Bob (private, not hidden) included.
    // Carol (hidden) and Dave (has hidden membership) excluded.
    expect(names).toEqual(['Alice', 'Bob'])
  })

  // ── TEAM-04 (b): team-selected view ignores status ────────────────────────
  it('team-selected view: shows members of selected team REGARDLESS of status', async () => {
    mockGetMembers.mockResolvedValue([
      member('Alice', [{ name: 'Alpha', status: 'public' }]),
      member('Bob', [{ name: 'Beta', status: 'public' }]),
      // Carol's Alpha membership is hidden — must still appear when Alpha selected
      member('Carol', [{ name: 'Alpha', status: 'hidden' }]),
    ])

    const el = await Home({ searchParams: Promise.resolve({ team: 'Alpha' }) })

    const grid = findByType(el, CommitGoalView)
    expect(grid).not.toBeNull()
    const results = (grid!.props as { results: MemberFeedResult[]; slots: CommitSlot[] }).results
    const names = results.map((r) => r.member.name).sort()
    // Bob (Beta) excluded; Carol (Alpha/hidden) INCLUDED — status ignored.
    expect(names).toEqual(['Alice', 'Carol'])
  })
})
