import { describe, it, expect, vi } from 'vitest'
import type { ReactElement } from 'react'

// CalendarGrid は URL駆動（useState なし）になったため react モックは不要。

// Stub HeatmapTooltip — not under test
vi.mock('@/components/HeatmapTooltip', () => ({
  default: ({ children }: { children: unknown }) => children,
}))

// Stub next/link as a plain <a> so the element tree can be walked.
vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: unknown; href: string }) => ({
    type: 'a',
    props: { href, children, ...rest },
  }),
}))

import CalendarGrid from '../CalendarGrid'

// --- Element-tree helpers (mirrors page.test.tsx pattern) ---

type AnyEl = ReactElement<Record<string, unknown>> & { type: unknown }

function isElement(node: unknown): node is AnyEl {
  return (
    typeof node === 'object' &&
    node !== null &&
    'type' in (node as object) &&
    'props' in (node as object)
  )
}

/** Depth-first walk: find first element with matching tag name. */
function findByTag(node: unknown, tag: string): AnyEl | null {
  if (!isElement(node)) return null
  if (node.type === tag) return node
  const children = (node.props as { children?: unknown }).children
  const list = Array.isArray(children) ? children : [children]
  for (const child of list) {
    const found = findByTag(child, tag)
    if (found) return found
  }
  return null
}

/** Collect all elements with matching tag name. */
function findAllByTag(node: unknown, tag: string): AnyEl[] {
  const results: AnyEl[] = []
  if (!isElement(node)) return results
  if (node.type === tag) results.push(node)
  const children = (node.props as { children?: unknown }).children
  const list = Array.isArray(children) ? children : [children]
  for (const child of list) {
    results.push(...findAllByTag(child, tag))
  }
  return results
}

describe('CalendarGrid — substackHandle profile link (Phase 27 PROF-02)', () => {
  it('renders <a> with href to substack.com when substackHandle is provided', () => {
    const el = CalendarGrid({
      memberName: 'Test Member',
      articleMap: [],
      publicationId: 'test-pub',
      year: 2026,
      month: 6,
      substackHandle: '@hoge',
    })

    const link = findByTag(el, 'a')
    expect(link).not.toBeNull()
    const props = link!.props as { href?: string; target?: string; rel?: string }
    expect(props.href).toBe('https://substack.com/@hoge')
    expect(props.target).toBe('_blank')
    expect(props.rel).toBe('noopener noreferrer')
  })

  it('does NOT render <a> element when substackHandle is undefined', () => {
    const el = CalendarGrid({
      memberName: 'Test Member',
      articleMap: [],
      publicationId: 'test-pub',
      year: 2026,
      month: 6,
    })

    const links = findAllByTag(el, 'a')
    const substackLinks = links.filter((a) => {
      const href = (a.props as { href?: string }).href ?? ''
      return href.includes('substack.com')
    })
    expect(substackLinks).toHaveLength(0)
  })

  it('<a> has className containing "block" when substackHandle is provided', () => {
    const el = CalendarGrid({
      memberName: 'Test Member',
      articleMap: [],
      publicationId: 'test-pub',
      year: 2026,
      month: 6,
      substackHandle: '@hoge',
    })

    const link = findByTag(el, 'a')
    expect(link).not.toBeNull()
    const props = link!.props as { className?: string }
    expect(props.className).toContain('block')
  })
})
