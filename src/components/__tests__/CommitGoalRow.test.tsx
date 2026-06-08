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
    hasUser: true,
  }
}

function makeSlot(day_of_week: number): CommitSlot {
  return { member_id: '00000000-0000-0000-0000-000000000001', day_of_week, hour: 10 }
}

// ─────────────────────────────────────────────
// CommitGoalRow streak=0: アイコンなし
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// アイコンなし: 未達成 (crownEarned=false, streak<2)
// ─────────────────────────────────────────────
describe('CommitGoalRow アイコンなし: 未達成', () => {
  it('crownEarned=false + streak=0 のとき 👑 も 🔥 も表示しない', () => {
    const el = CommitGoalRow({
      member: makeMember(),
      items: [],
      slots: [makeSlot(1)],
      streak: 0,
      crownEarned: false,
    })
    const joined = collectText(el).join('')
    expect(joined).not.toContain('👑')
    expect(joined).not.toContain('🔥')
  })
})

// ─────────────────────────────────────────────
// 👑 のみ: 今週達成・連続なし (ACHIEV-01)
// ─────────────────────────────────────────────
describe('CommitGoalRow 👑 のみ: 今週達成・連続なし (ACHIEV-01)', () => {
  it('crownEarned=true + streak=1 のとき 👑 が表示され 🔥 は表示しない', () => {
    const el = CommitGoalRow({
      member: makeMember(),
      items: [],
      slots: [makeSlot(1)],
      streak: 1,
      crownEarned: true,
    })
    const joined = collectText(el).join('')
    expect(joined).toContain('👑')
    expect(joined).not.toContain('🔥')
  })
})

// ─────────────────────────────────────────────
// 👑🔥: 今週達成 + 連続2週以上 (ACHIEV-01 + ACHIEV-02)
// ─────────────────────────────────────────────
describe('CommitGoalRow 👑🔥: 今週達成 + 連続2週以上', () => {
  it('crownEarned=true + streak=2 のとき 👑 と 🔥 の両方が表示される', () => {
    const el = CommitGoalRow({
      member: makeMember(),
      items: [],
      slots: [makeSlot(1)],
      streak: 2,
      crownEarned: true,
    })
    const joined = collectText(el).join('')
    expect(joined).toContain('👑')
    expect(joined).toContain('🔥')
  })
})

// ─────────────────────────────────────────────
// 🔥 のみ: 先週以前連続 + 今週スロット日未到来 (ACHIEV-02)
// ─────────────────────────────────────────────
describe('CommitGoalRow 🔥 のみ: 先週まで連続達成・今週スロット日未到来', () => {
  it('crownEarned=false + streak=2 のとき 🔥 のみ表示、👑 は表示しない', () => {
    const el = CommitGoalRow({
      member: makeMember(),
      items: [],
      slots: [makeSlot(1)],
      streak: 2,
      crownEarned: false,
    })
    const joined = collectText(el).join('')
    expect(joined).not.toContain('👑')
    expect(joined).toContain('🔥')
  })
})

// suppress unused-variable warnings for helpers not used in this test file
void findByType
void findAllByTag
void findAllByClassName
