import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ReactElement } from 'react'

// --- Module mocks ---

const { mockCreateSupabaseServerClient, mockCreateSupabaseAdminClient } = vi.hoisted(() => ({
  mockCreateSupabaseServerClient: vi.fn(),
  mockCreateSupabaseAdminClient: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mockCreateSupabaseServerClient,
}))

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: mockCreateSupabaseAdminClient,
}))

vi.mock('next/link', () => ({
  default: ({ href, className, children }: { href: string; className?: string; children: unknown }) => ({
    type: 'a',
    props: { href, className, children },
  }),
}))

import Footer from '../Footer'

// --- Element-tree helpers (no jsdom) ---

type AnyEl = ReactElement<Record<string, unknown>> & { type: unknown }

function isElement(node: unknown): node is AnyEl {
  return (
    typeof node === 'object' &&
    node !== null &&
    'type' in (node as object) &&
    'props' in (node as object)
  )
}

function flattenChildren(children: unknown): unknown[] {
  if (Array.isArray(children)) return children.flatMap(flattenChildren)
  return [children]
}

/** Recursively collect all string text content */
function collectText(node: unknown): string[] {
  const out: string[] = []
  function walk(n: unknown) {
    if (typeof n === 'string') {
      out.push(n)
      return
    }
    if (!isElement(n)) return
    const children = (n.props as { children?: unknown }).children
    for (const child of flattenChildren(children)) walk(child)
  }
  walk(node)
  return out
}

/** Find all anchor-like elements (a tags or Link mocks) and their hrefs */
function collectLinks(node: unknown): { href: string; text: string }[] {
  const out: { href: string; text: string }[] = []
  function walk(n: unknown) {
    if (!isElement(n)) return
    // Match native 'a' tags and next/link mock (which renders as type='a' in mock)
    const props = n.props as { href?: string; children?: unknown }
    if ((n.type === 'a' || n.type === 'Link') && props.href !== undefined) {
      const href = props.href ?? ''
      const text = collectText(n).join('')
      out.push({ href, text })
    } else if (typeof props.href === 'string') {
      // Catch any element with an href prop (e.g. Link mock)
      const href = props.href
      const text = collectText(n).join('')
      out.push({ href, text })
    }
    const children = props.children
    for (const child of flattenChildren(children)) walk(child)
  }
  walk(node)
  return out
}

// --- Helper to create Supabase mock ---

function makeSupabaseMock(user: { id: string } | null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
  }
}

function makeAdminMock(publicationId: string | null) {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: publicationId !== null ? { publication_id: publicationId } : null,
          }),
        })),
      })),
    })),
  }
}

describe('Footer — unauthenticated (user is null)', () => {
  beforeEach(() => {
    mockCreateSupabaseServerClient.mockResolvedValue(makeSupabaseMock(null))
    mockCreateSupabaseAdminClient.mockReturnValue(makeAdminMock(null))
  })

  it('renders unauthenticated copy with external link to participation page', async () => {
    const el = await Footer()
    const text = collectText(el).join('')
    expect(text).toContain('このSubstack継続可視化ツールに参加したい方は')
    expect(text).toContain('コチラ')
  })

  it('external link points to https://uojun.substack.com/p/8cd', async () => {
    const el = await Footer()
    const links = collectLinks(el)
    const externalLink = links.find((l) => l.href.includes('uojun.substack.com'))
    expect(externalLink).toBeDefined()
    expect(externalLink?.href).toBe('https://uojun.substack.com/p/8cd')
  })

  it('does NOT render 個人ビュー or 参加登録 copy', async () => {
    const el = await Footer()
    const text = collectText(el).join('')
    expect(text).not.toContain('あなたの個人ビューは')
    expect(text).not.toContain('参加登録は')
  })
})

describe('Footer — authenticated + member with publicationId', () => {
  const TEST_PUB_ID = 'my-publication-id'

  beforeEach(() => {
    mockCreateSupabaseServerClient.mockResolvedValue(makeSupabaseMock({ id: 'user-123' }))
    mockCreateSupabaseAdminClient.mockReturnValue(makeAdminMock(TEST_PUB_ID))
  })

  it('renders individual view copy', async () => {
    const el = await Footer()
    const text = collectText(el).join('')
    expect(text).toContain('あなたの個人ビューは')
    expect(text).toContain('コチラ')
  })

  it('link points to /member/{publicationId}', async () => {
    const el = await Footer()
    const links = collectLinks(el)
    const memberLink = links.find((l) => l.href.includes('/member/'))
    expect(memberLink).toBeDefined()
    expect(memberLink?.href).toBe(`/member/${TEST_PUB_ID}`)
  })

  it('does NOT render unauthenticated copy or 参加登録 copy', async () => {
    const el = await Footer()
    const text = collectText(el).join('')
    expect(text).not.toContain('このSubstack継続可視化ツールに参加したい方は')
    expect(text).not.toContain('参加登録は')
  })
})

describe('Footer — authenticated + member with no publicationId', () => {
  beforeEach(() => {
    mockCreateSupabaseServerClient.mockResolvedValue(makeSupabaseMock({ id: 'user-456' }))
    mockCreateSupabaseAdminClient.mockReturnValue(makeAdminMock(null))
  })

  it('renders 参加登録 copy', async () => {
    const el = await Footer()
    const text = collectText(el).join('')
    expect(text).toContain('参加登録は')
    expect(text).toContain('コチラ')
  })

  it('link points to /my', async () => {
    const el = await Footer()
    const links = collectLinks(el)
    const myLink = links.find((l) => l.href === '/my')
    expect(myLink).toBeDefined()
  })

  it('does NOT render unauthenticated copy or 個人ビュー copy', async () => {
    const el = await Footer()
    const text = collectText(el).join('')
    expect(text).not.toContain('このSubstack継続可視化ツールに参加したい方は')
    expect(text).not.toContain('あなたの個人ビューは')
  })
})
