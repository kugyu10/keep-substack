import { describe, it, expect } from 'vitest'
import type { ReactElement } from 'react'
import type { CommitSlot, FeedItem } from '@/lib/types'

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

function flattenChildren(children: unknown): unknown[] {
  if (Array.isArray(children)) return children.flatMap(flattenChildren)
  return [children]
}

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

/** Recursively collect all elements of a given HTML tag type */
function findAllByTag(node: unknown, tag: string): AnyEl[] {
  const results: AnyEl[] = []
  function walk(n: unknown) {
    if (!isElement(n)) return
    if (n.type === tag) results.push(n)
    const children = (n.props as { children?: unknown }).children
    for (const child of flattenChildren(children)) walk(child)
  }
  walk(node)
  return results
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

/** Find all elements matching a className predicate */
function findAllByClassName(node: unknown, predicate: (cls: string) => boolean): AnyEl[] {
  const results: AnyEl[] = []
  function walk(n: unknown) {
    if (!isElement(n)) return
    const cls = (n.props as { className?: unknown }).className
    if (typeof cls === 'string' && predicate(cls)) results.push(n)
    const children = (n.props as { children?: unknown }).children
    for (const child of flattenChildren(children)) walk(child)
  }
  walk(node)
  return results
}

import CommitGrid from '../CommitGrid'

// --- Fixtures ---

function slot(day_of_week: number): CommitSlot {
  return { member_id: 'uuid-1', day_of_week, hour: 10 }
}

function feedItem(isoDate: string, thumbnail?: string): FeedItem {
  return {
    isoDate,
    title: 'Test Article',
    link: 'https://example.com/post',
    thumbnail: thumbnail ?? 'https://example.com/thumb.jpg',
  }
}

// ─────────────────────────────────────────────
// VIEW-04: Correct cell count per frequency
// ─────────────────────────────────────────────
describe('CommitGrid VIEW-04: cell count per frequency', () => {
  it('with 1 slot: renders 3 weeks × 1 cell = 3 total cells', () => {
    const slots = [slot(1)] // Monday only
    const el = CommitGrid({ slots, items: [] })
    // Unposted cells are identified by border-dashed (unique to unposted state)
    const cells = findAllByClassName(el, (cls) => cls.includes('border-dashed'))
    // 3 weeks × 1 slot = 3 cells total
    expect(cells.length).toBe(3)
  })

  it('with 4 slots: renders 3 weeks × 4 cells = 12 total cells', () => {
    const slots = [slot(1), slot(2), slot(3), slot(4)]
    const el = CommitGrid({ slots, items: [] })
    const cells = findAllByClassName(el, (cls) => cls.includes('border-dashed'))
    // 3 weeks × 4 slots = 12 cells total (no articles → all unposted)
    expect(cells.length).toBe(12)
  })
})

// ─────────────────────────────────────────────
// VIEW-05: Posted cell renders img, unposted cell renders DAY_NAMES text
// ─────────────────────────────────────────────
describe('CommitGrid VIEW-05: posted vs unposted cell rendering', () => {
  it('unposted slot renders DAY_NAMES text (月 for Monday)', () => {
    const slots = [slot(1)] // Monday, no articles
    const el = CommitGrid({ slots, items: [] })
    const texts = collectText(el)
    expect(texts).toContain('月')
  })

  it('unposted slots render correct day names for all days', () => {
    const allSlots = [1, 2, 3, 4, 5, 6, 7].map((d) => slot(d))
    const el = CommitGrid({ slots: allSlots, items: [] })
    const texts = collectText(el)
    // Each day name appears once per week (3 weeks × 7 = 21), but distinct names
    for (const name of ['月', '火', '水', '木', '金', '土', '日']) {
      expect(texts).toContain(name)
    }
  })
})

// ─────────────────────────────────────────────
// VIEW-07: Mobile collapse — week-0 and week-1 hidden on mobile, week-2 always visible
// ─────────────────────────────────────────────
describe('CommitGrid VIEW-07: mobile CSS collapse', () => {
  it('week-0 (oldest) block has className containing "hidden sm:flex"', () => {
    const slots = [slot(1)]
    const el = CommitGrid({ slots, items: [] })
    // The outer wrapper of week-0 should contain 'hidden' class
    const hiddenBlocks = findAllByClassName(el, (cls) => cls.includes('hidden') && cls.includes('sm:flex'))
    // At least 2 blocks (week-0 and week-1) should be hidden on mobile
    expect(hiddenBlocks.length).toBeGreaterThanOrEqual(2)
  })

  it('week-2 (current) block is visible — its className contains "flex" but NOT "hidden"', () => {
    const slots = [slot(1)]
    const el = CommitGrid({ slots, items: [] })
    // The current week block should have flex but not hidden
    const allDivs = findAllByTag(el, 'div')
    const currentWeekBlock = allDivs.find((d) => {
      const cls = (d.props as { className?: string }).className ?? ''
      return cls.includes('flex') && cls.includes('flex-1') && !cls.includes('hidden')
    })
    expect(currentWeekBlock).toBeDefined()
  })
})

// ─────────────────────────────────────────────
// Structural: no 'use client', static grid-cols class map
// ─────────────────────────────────────────────
describe('CommitGrid structural requirements', () => {
  it('renders without throwing', () => {
    expect(() => CommitGrid({ slots: [slot(1)], items: [] })).not.toThrow()
  })

  it('renders the outer flex container', () => {
    const el = CommitGrid({ slots: [slot(1)], items: [] })
    expect(isElement(el)).toBe(true)
    const outerClass = (el as AnyEl).props.className as string
    expect(outerClass).toContain('flex')
  })

  it('renders null or empty content gracefully when no slots', () => {
    // CommitGrid with empty slots — used inside CommitGoalRow's else branch, but should be safe
    expect(() => CommitGrid({ slots: [], items: [] })).not.toThrow()
  })
})
