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

// WeeklyHeatmapGrid + PrBanner are real 'use client' components. Stub them.
vi.mock('@/components/WeeklyHeatmapGrid', () => ({
  default: () => null,
}))
vi.mock('@/components/PrBanner', () => ({
  default: () => null,
}))
// ShareButton is a 'use client' component; stub it.
vi.mock('@/components/ShareButton', () => ({
  default: () => null,
}))

// Mock Supabase server client — page.tsx calls createSupabaseServerClient() to
// detect the logged-in user for the share button. Return no user (logged out).
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({ data: { user: null }, error: null })),
    },
  })),
}))

// Mock Supabase admin client — page.tsx calls createSupabaseAdminClient() to
// SELECT member_commit_slots (gamification badges). Return a minimal no-op stub.
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({ data: [], error: null })),
    })),
  })),
}))

import Home from '../page'
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

/** Collect all anchor elements from the tree. */
function findAllAnchors(node: unknown): AnyEl[] {
  const anchors: AnyEl[] = []
  function walk(n: unknown) {
    if (!isElement(n)) return
    if (n.type === 'a') anchors.push(n)
    const children = (n.props as { children?: unknown }).children
    for (const child of flattenChildren(children)) walk(child)
  }
  walk(node)
  return anchors
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
    id: `00000000-0000-0000-0000-${name.charCodeAt(0).toString(16).padStart(12, '0')}`,
    name,
    publicationId: `pub-${name}`,
    teams,
    addedAt: '2026-01-01T00:00:00.000Z',
    hasUser: true,
  }
}

describe('/daily page (VIEW-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetMembers.mockResolvedValue([])
    mockFetchAllFeedsCached.mockImplementation(async (members: Member[]) =>
      members.map((m) => ({ member: m, items: [] }))
    )
  })

  it('renders WeeklyHeatmapGrid with member results', async () => {
    mockGetMembers.mockResolvedValue([member('Alice', [])])

    const el = await Home({ searchParams: Promise.resolve({}) })

    const grid = findByType(el, WeeklyHeatmapGrid)
    expect(grid).not.toBeNull()
  })

  it('All link href points to /daily (not /)', async () => {
    mockGetMembers.mockResolvedValue([
      member('Alice', [{ name: 'Team', status: 'public' }]),
    ])

    const el = await Home({ searchParams: Promise.resolve({}) })

    // Find all anchor elements and check the "All" link
    const anchors = findAllAnchors(el)
    const allAnchor = anchors.find((a) => {
      const children = flattenChildren((a.props as { children?: unknown }).children)
      return children.some((c) => typeof c === 'string' && c === 'All')
    })
    expect(allAnchor).toBeDefined()
    const href = (allAnchor!.props as { href?: string }).href
    expect(href).toBe('/daily')
    expect(href).not.toBe('/')
  })

  it('team tab links include /daily base path', async () => {
    mockGetMembers.mockResolvedValue([
      member('Alice', [{ name: 'Alpha', status: 'public' }]),
    ])

    const el = await Home({ searchParams: Promise.resolve({}) })

    const anchors = findAllAnchors(el)
    const teamAnchors = anchors.filter((a) => {
      const href = (a.props as { href?: string }).href ?? ''
      return href.includes('team=')
    })
    expect(teamAnchors.length).toBeGreaterThan(0)
    for (const anchor of teamAnchors) {
      const href = (anchor.props as { href?: string }).href ?? ''
      expect(href).toContain('/daily')
    }
  })

  it('collects tab labels correctly (All + public teams)', async () => {
    mockGetMembers.mockResolvedValue([
      member('Alice', [{ name: 'Alpha', status: 'public' }]),
      member('Bob', [{ name: 'Beta', status: 'public' }]),
    ])

    const el = await Home({ searchParams: Promise.resolve({}) })

    const labels = collectAnchorLabels(el)
    expect(labels).toContain('All')
    expect(labels).toContain('Alpha')
    expect(labels).toContain('Beta')
  })

  // ── TEAM-04 (divergence): /daily excludes hidden members in team-selected view ──
  // This is an INTENTIONAL behavioral divergence from the main page (src/app/page.tsx):
  //   - main page (TEAM-04 b): team-selected view includes hidden-status members
  //   - /daily:          team-selected view excludes hidden-status members
  // This test documents and locks in the /daily behavior to prevent silent drift.
  it('team-selected view: excludes hidden-status members even when they belong to the selected team', async () => {
    mockGetMembers.mockResolvedValue([
      member('Alice', [{ name: 'Alpha', status: 'public' }]),
      member('Bob', [{ name: 'Beta', status: 'public' }]),
      // Carol's Alpha membership is hidden — excluded in /daily team-selected view
      member('Carol', [{ name: 'Alpha', status: 'hidden' }]),
    ])

    const el = await Home({ searchParams: Promise.resolve({ team: 'Alpha' }) })

    const grid = findByType(el, WeeklyHeatmapGrid)
    expect(grid).not.toBeNull()
    const results = (grid!.props as { results: MemberFeedResult[] }).results
    const names = results.map((r) => r.member.name).sort()
    // Alice (Alpha/public) included; Bob (Beta) excluded; Carol (Alpha/hidden) EXCLUDED.
    // NOTE: main page TEAM-04(b) includes Carol — this page intentionally differs.
    expect(names).toEqual(['Alice'])
  })
})
