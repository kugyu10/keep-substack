import { describe, it, expect } from 'vitest'
import type { ReactElement } from 'react'
import type { MemberGameStats } from '@/lib/types'

// --- Element-tree helpers (no jsdom: inspect the React element object tree) ---
// Mirrors the pattern used in CommitGrid.test.tsx

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
    if (typeof n === 'number') {
      out.push(String(n))
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

/** Find all elements matching a role predicate */
function findAllByRole(node: unknown, role: string): AnyEl[] {
  const results: AnyEl[] = []
  function walk(n: unknown) {
    if (!isElement(n)) return
    if ((n.props as { role?: unknown }).role === role) results.push(n)
    const children = (n.props as { children?: unknown }).children
    for (const child of flattenChildren(children)) walk(child)
  }
  walk(node)
  return results
}

import GameStatsPanel from '../GameStatsPanel'

// --- Fixtures ---

function stats(overrides: Partial<MemberGameStats> = {}): MemberGameStats {
  return {
    memberId: 'uuid-1',
    dailyStreak: 0,
    weeklyStreak: 0,
    postCount: 0,
    achievedWeekCount: 0,
    xp: 0,
    level: 1,
    currentLevelFloor: 0,
    nextLevelXp: 50,
    progressRatio: 0,
    ...overrides,
  }
}

describe('GameStatsPanel: level and XP display', () => {
  it('renders without throwing', () => {
    expect(() => GameStatsPanel({ stats: stats() })).not.toThrow()
  })

  it('shows the current level and total XP', () => {
    const el = GameStatsPanel({ stats: stats({ level: 3, xp: 210 }) })
    const texts = collectText(el).join('')
    expect(texts).toContain('Lv')
    expect(texts).toContain('3')
    expect(texts).toContain('210')
  })

  it('renders the progress bar width from progressRatio via inline style', () => {
    const el = GameStatsPanel({ stats: stats({ progressRatio: 0.42 }) })
    const bars = findAllByClassName(el, (cls) => cls.includes('bg-primary') && cls.includes('rounded-full'))
    const bar = bars.find((b) => (b.props as { style?: { width?: string } }).style?.width)
    expect(bar).toBeDefined()
    expect((bar!.props as { style?: { width?: string } }).style?.width).toBe('42%')
  })

  it('exposes the progress bar as an accessible progressbar role', () => {
    const el = GameStatsPanel({ stats: stats({ progressRatio: 0.5 }) })
    const bars = findAllByRole(el, 'progressbar')
    expect(bars.length).toBe(1)
    expect((bars[0].props as { 'aria-valuenow'?: number })['aria-valuenow']).toBe(50)
  })
})

describe('GameStatsPanel: XP breakdown', () => {
  it('shows postCount * 10 and achievedWeekCount * 20 breakdown lines', () => {
    const el = GameStatsPanel({ stats: stats({ postCount: 7, achievedWeekCount: 3 }) })
    const texts = collectText(el).join('')
    expect(texts).toContain('7')
    expect(texts).toContain('70')
    expect(texts).toContain('3')
    expect(texts).toContain('60')
  })
})

describe('GameStatsPanel: streaks', () => {
  it('renders dash placeholders when both streaks are 0 (section still shown)', () => {
    const el = GameStatsPanel({ stats: stats({ dailyStreak: 0, weeklyStreak: 0 }) })
    const texts = collectText(el)
    const dashCount = texts.filter((t) => t.includes('—')).length
    expect(dashCount).toBe(2)
  })

  it('renders daily streak count with unit when > 0', () => {
    const el = GameStatsPanel({ stats: stats({ dailyStreak: 5 }) })
    const texts = collectText(el).join('')
    expect(texts).toContain('5日')
  })

  it('renders weekly streak count with unit when > 0', () => {
    const el = GameStatsPanel({ stats: stats({ weeklyStreak: 2 }) })
    const texts = collectText(el).join('')
    expect(texts).toContain('2週')
  })
})
