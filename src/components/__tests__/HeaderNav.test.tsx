import { describe, it, expect, vi } from 'vitest'
import type { ReactElement } from 'react'
import type { User } from '@supabase/supabase-js'

// --- Module mocks ---

// Control usePathname() return value per test
let mockPathnameValue = '/'

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => mockPathnameValue),
}))

vi.mock('next/link', () => ({
  default: ({ href, className, children }: { href: string; className?: string; children: unknown }) => ({
    type: 'a',
    props: { href, className, children },
  }),
}))

import HeaderNav from '../HeaderNav'

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

/** Collect all hrefs from any element with href prop */
function collectHrefs(node: unknown): string[] {
  const out: string[] = []
  function walk(n: unknown) {
    if (!isElement(n)) return
    const props = n.props as { href?: string; children?: unknown }
    if (typeof props.href === 'string') {
      out.push(props.href)
    }
    const children = props.children
    for (const child of flattenChildren(children)) walk(child)
  }
  walk(node)
  return out
}

// --- Fixture ---

function makeUser(): User {
  return {
    id: 'user-123',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2026-01-01T00:00:00.000Z',
  } as User
}

// ─────────────────────────────────────────────
// Case 1: user + pathname '/my' → renders nothing (returns null)
// ─────────────────────────────────────────────
describe('HeaderNav — user + pathname /my', () => {
  it('returns null (マイページ button is hidden on /my)', () => {
    mockPathnameValue = '/my'
    const result = HeaderNav({ user: makeUser() })
    expect(result).toBeNull()
  })

  it('does NOT render マイページ text', () => {
    mockPathnameValue = '/my'
    const result = HeaderNav({ user: makeUser() })
    // null renders nothing — no text
    const text = result ? collectText(result).join('') : ''
    expect(text).not.toContain('マイページ')
  })
})

// ─────────────────────────────────────────────
// Case 2: user + pathname '/' → renders マイページ link to /my
// ─────────────────────────────────────────────
describe('HeaderNav — user + pathname /', () => {
  it('renders マイページ link when not on /my', () => {
    mockPathnameValue = '/'
    const result = HeaderNav({ user: makeUser() })
    expect(result).not.toBeNull()
    const text = collectText(result).join('')
    expect(text).toContain('マイページ')
  })

  it('マイページ link href is /my', () => {
    mockPathnameValue = '/'
    const result = HeaderNav({ user: makeUser() })
    expect(result).not.toBeNull()
    const hrefs = collectHrefs(result)
    expect(hrefs).toContain('/my')
  })

  it('does NOT render ログイン link', () => {
    mockPathnameValue = '/'
    const result = HeaderNav({ user: makeUser() })
    const text = result ? collectText(result).join('') : ''
    expect(text).not.toContain('ログイン')
  })
})

// ─────────────────────────────────────────────
// Case 3: user=null → renders ログイン link to /login
// ─────────────────────────────────────────────
describe('HeaderNav — user is null (unauthenticated)', () => {
  it('renders ログイン link when user is null', () => {
    mockPathnameValue = '/'
    const result = HeaderNav({ user: null })
    expect(result).not.toBeNull()
    const text = collectText(result).join('')
    expect(text).toContain('ログイン')
  })

  it('ログイン link href is /login', () => {
    mockPathnameValue = '/'
    const result = HeaderNav({ user: null })
    expect(result).not.toBeNull()
    const hrefs = collectHrefs(result)
    expect(hrefs).toContain('/login')
  })

  it('does NOT render マイページ link', () => {
    mockPathnameValue = '/'
    const result = HeaderNav({ user: null })
    const text = result ? collectText(result).join('') : ''
    expect(text).not.toContain('マイページ')
  })

  it('returns ログイン even when pathname is /my (unauthenticated)', () => {
    mockPathnameValue = '/my'
    const result = HeaderNav({ user: null })
    expect(result).not.toBeNull()
    const text = collectText(result).join('')
    expect(text).toContain('ログイン')
  })
})
