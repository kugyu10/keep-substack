import { describe, it, expect } from 'vitest'
import type { ReactElement } from 'react'
import type { Member, CommitSlot, FeedItem } from '@/lib/types'

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

import CommitGoalRow from '../CommitGoalRow'

// --- Fixtures ---

function makeMember(): Member {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Test User',
    publicationId: 'test-pub',
    teams: [],
    addedAt: '2026-01-01T00:00:00.000Z',
  }
}

function makeSlot(day_of_week: number): CommitSlot {
  return { member_id: '00000000-0000-0000-0000-000000000001', day_of_week, hour: 10 }
}

// ─────────────────────────────────────────────
// CommitGoalRow streak=0: アイコンなし
// ─────────────────────────────────────────────
describe('CommitGoalRow streak=0: アイコンなし', () => {
  it('streak=0 のとき collectText に 👑 が含まれない', () => {
    const el = CommitGoalRow({
      member: makeMember(),
      items: [],
      slots: [makeSlot(1)],
      streak: 0,
    })
    const texts = collectText(el)
    const joined = texts.join('')
    expect(joined).not.toContain('👑')
    expect(joined).not.toContain('🔥')
  })
})

// ─────────────────────────────────────────────
// CommitGoalRow streak=1: 👑 のみ (ACHIEV-01)
// ─────────────────────────────────────────────
describe('CommitGoalRow streak=1: 👑 のみ (ACHIEV-01)', () => {
  it('streak=1 のとき collectText に 👑 が含まれる', () => {
    const el = CommitGoalRow({
      member: makeMember(),
      items: [],
      slots: [makeSlot(1)],
      streak: 1,
    })
    const texts = collectText(el)
    const joined = texts.join('')
    expect(joined).toContain('👑')
  })

  it('streak=1 のとき collectText に 🔥 が含まれない', () => {
    const el = CommitGoalRow({
      member: makeMember(),
      items: [],
      slots: [makeSlot(1)],
      streak: 1,
    })
    const texts = collectText(el)
    const joined = texts.join('')
    expect(joined).not.toContain('🔥')
  })
})

// ─────────────────────────────────────────────
// CommitGoalRow streak=2: 👑🔥 (ACHIEV-02)
// ─────────────────────────────────────────────
describe('CommitGoalRow streak=2: 👑🔥 (ACHIEV-02)', () => {
  it('streak=2 のとき collectText に 👑 と 🔥 の両方が含まれる', () => {
    const el = CommitGoalRow({
      member: makeMember(),
      items: [],
      slots: [makeSlot(1)],
      streak: 2,
    })
    const texts = collectText(el)
    const joined = texts.join('')
    expect(joined).toContain('👑')
    expect(joined).toContain('🔥')
  })
})

// suppress unused-variable warnings for helpers not used in this test file
void findByType
void findAllByTag
void findAllByClassName
