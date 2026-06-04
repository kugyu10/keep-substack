import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ReactElement } from 'react'
import type { Member, MemberFeedResult } from '@/lib/types'

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

// WeeklyHeatmapGrid is a real 'use client' component. The @/ alias is only
// resolved by the Next build, not by vitest's default resolver, so stub it.
// The page's import resolves to this same stubbed module, so findByType still
// matches the element type by reference.
vi.mock('@/components/WeeklyHeatmapGrid', () => ({
  default: () => null,
}))

import AdminTeamPage from '../[teamName]/page'
import WeeklyHeatmapGrid from '@/components/WeeklyHeatmapGrid'

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

/** Walk the tree collecting text rendered inside <p> elements. */
function collectParagraphText(node: unknown): string[] {
  const out: string[] = []
  function walk(n: unknown) {
    if (!isElement(n)) return
    if (n.type === 'p') {
      const children = (n.props as { children?: unknown }).children
      const flat = Array.isArray(children) ? children : [children]
      for (const c of flat) if (typeof c === 'string') out.push(c)
    }
    const children = (n.props as { children?: unknown }).children
    const list = Array.isArray(children) ? children : [children]
    for (const child of list) walk(child)
  }
  walk(node)
  return out
}

// --- Fixtures ---

function member(name: string, teams: { name: string; status: string }[]): Member {
  return {
    id: `00000000-0000-0000-0000-${name.charCodeAt(0).toString(16).padStart(12, '0')}`,
    name,
    publicationId: `pub-${name}`,
    teams,
    addedAt: '2026-01-01T00:00:00.000Z',
  }
}

describe('AdminTeamPage RSC — single-team view (VIEW-01 / D-01 / D-06 / D-07 / decode)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // default: empty roster (individual tests override)
    mockGetMembers.mockResolvedValue([])
    // map members → results so results.length === filtered member count
    mockFetchAllFeedsCached.mockImplementation(async (members: Member[]) =>
      members.map((m) => ({ member: m, items: [] }))
    )
  })

  it('renders heatmap', async () => {
    mockGetMembers.mockResolvedValue([
      member('Alice', [{ name: 'Alpha', status: 'public' }]),
      member('Bob', [{ name: 'Alpha', status: 'public' }]),
    ])

    const el = await AdminTeamPage({
      params: Promise.resolve({ teamName: 'Alpha' }),
    })

    const grid = findByType(el, WeeklyHeatmapGrid)
    expect(grid).not.toBeNull()
    const results = (grid!.props as { results: MemberFeedResult[] }).results
    expect(results).toHaveLength(2)
  })

  it('filters by exact teamName', async () => {
    mockGetMembers.mockResolvedValue([
      member('Alice', [{ name: 'Alpha', status: 'public' }]),
      member('Bob', [{ name: 'Beta', status: 'public' }]),
      member('Carol', [{ name: 'Alpha', status: 'hidden' }]),
    ])

    const el = await AdminTeamPage({
      params: Promise.resolve({ teamName: 'Alpha' }),
    })

    const grid = findByType(el, WeeklyHeatmapGrid)
    expect(grid).not.toBeNull()
    const results = (grid!.props as { results: MemberFeedResult[] }).results
    // Bob (Beta) excluded; Carol (Alpha/hidden) INCLUDED — status ignored.
    const names = results.map((r) => r.member.name).sort()
    expect(names).toEqual(['Alice', 'Carol'])
  })

  it('decodes encoded teamName', async () => {
    mockGetMembers.mockResolvedValue([
      member('Sato', [{ name: '営業部', status: 'public' }]),
      member('Suzuki', [{ name: '開発部', status: 'public' }]),
    ])

    const el = await AdminTeamPage({
      params: Promise.resolve({ teamName: encodeURIComponent('営業部') }),
    })

    const grid = findByType(el, WeeklyHeatmapGrid)
    expect(grid).not.toBeNull()
    const results = (grid!.props as { results: MemberFeedResult[] }).results
    expect(results.map((r) => r.member.name)).toEqual(['Sato'])
  })

  it('unknown team shows message', async () => {
    mockGetMembers.mockResolvedValue([
      member('Alice', [{ name: 'Alpha', status: 'public' }]),
    ])

    const el = await AdminTeamPage({
      params: Promise.resolve({ teamName: 'NoSuchTeam' }),
    })

    expect(findByType(el, WeeklyHeatmapGrid)).toBeNull()
    expect(collectParagraphText(el).length).toBeGreaterThan(0)
    expect(mockFetchAllFeedsCached).not.toHaveBeenCalled()
  })

  it('empty team shows message', async () => {
    // team exists in name space but no member belongs to it
    mockGetMembers.mockResolvedValue([
      member('Alice', [{ name: 'Alpha', status: 'public' }]),
    ])

    const el = await AdminTeamPage({
      params: Promise.resolve({ teamName: 'Beta' }),
    })

    expect(findByType(el, WeeklyHeatmapGrid)).toBeNull()
    expect(collectParagraphText(el).length).toBeGreaterThan(0)
    expect(mockFetchAllFeedsCached).not.toHaveBeenCalled()
  })
})
