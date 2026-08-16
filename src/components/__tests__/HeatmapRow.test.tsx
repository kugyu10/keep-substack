import { describe, it, expect } from 'vitest'
import type { ReactElement } from 'react'
import type { Member, MemberGameStats } from '@/lib/types'

// --- Element-tree helpers（CommitGrid.test.tsx と同じ素朴な走査）---

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

/** Recursively collect all string/number text content */
function collectText(node: unknown): string[] {
  const out: string[] = []
  function walk(n: unknown) {
    if (typeof n === 'string' || typeof n === 'number') {
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

/** Recursively collect all elements with role="img" */
function findAllByRoleImg(node: unknown): AnyEl[] {
  const results: AnyEl[] = []
  function walk(n: unknown) {
    if (!isElement(n)) return
    if ((n.props as { role?: unknown }).role === 'img') results.push(n)
    const children = (n.props as { children?: unknown }).children
    for (const child of flattenChildren(children)) walk(child)
  }
  walk(node)
  return results
}

/**
 * Find the ancestor chain (root -> ... -> target) leading to the first element
 * whose collected text includes `needle`. Returns null if not found.
 */
function findAncestorChainContainingText(node: unknown, needle: string): AnyEl[] | null {
  if (!isElement(node)) return null
  if (collectText(node).join('').includes(needle)) {
    const children = (node.props as { children?: unknown }).children
    for (const child of flattenChildren(children)) {
      const childChain = findAncestorChainContainingText(child, needle)
      if (childChain) return [node, ...childChain]
    }
    return [node]
  }
  return null
}

/** True if any element in the chain has a className containing a `hidden` token (e.g. `hidden sm:block`). */
function chainHasHiddenContainer(chain: AnyEl[]): boolean {
  return chain.some((el) => {
    const className = (el.props as { className?: unknown }).className
    if (typeof className !== 'string') return false
    return className.split(/\s+/).includes('hidden')
  })
}

import HeatmapRow from '../HeatmapRow'

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

function makeStats(overrides: Partial<MemberGameStats> = {}): MemberGameStats {
  return {
    memberId: '00000000-0000-0000-0000-000000000001',
    dailyStreak: 3,
    weeklyStreak: 1,
    postCount: 10,
    onTimeCount: 4,
    achievedWeekCount: 1,
    xpBreakdown: { post: 100, onTime: 40, achieved: 30 },
    xp: 170,
    level: 2,
    currentLevelFloor: 50,
    nextLevelXp: 200,
    progressRatio: 0.5,
    ...overrides,
  }
}

const dates = ['2026-06-04', '2026-06-05', '2026-06-06', '2026-06-07', '2026-06-08', '2026-06-09', '2026-06-10']

describe('HeatmapRow gamification badges', () => {
  it('stats なしではバッジ（🔥/Lv）を出さない', () => {
    const el = HeatmapRow({
      member: makeMember(),
      articlesByDateEntries: [],
      dates,
    })
    const joined = collectText(el).join('')
    expect(joined).not.toContain('🔥')
    expect(joined).not.toContain('Lv')
  })

  it('dailyStreak>=1 なら 🔥N と Lv N の両方を表示する', () => {
    const el = HeatmapRow({
      member: makeMember(),
      articlesByDateEntries: [],
      dates,
      stats: makeStats({ dailyStreak: 3, level: 2 }),
    })
    const joined = collectText(el).join('')
    expect(joined).toContain('🔥')
    expect(joined).toContain('3')
    expect(joined).toContain('Lv2')

    const imgs = findAllByRoleImg(el)
    expect(imgs.length).toBe(1)
    expect(imgs[0].props['aria-label']).toBeTruthy()
    expect(collectText(imgs[0])).toEqual(['🔥'])
  })

  it('dailyStreak が 0 のときは 🔥 を出さず Lv だけ表示する', () => {
    const el = HeatmapRow({
      member: makeMember(),
      articlesByDateEntries: [],
      dates,
      stats: makeStats({ dailyStreak: 0, level: 5 }),
    })
    const joined = collectText(el).join('')
    expect(joined).not.toContain('🔥')
    expect(joined).toContain('Lv5')
  })

  it('バッジ（🔥/Lv）は hidden 系クラスのコンテナ配下に無く、モバイル幅でも表示される', () => {
    const el = HeatmapRow({
      member: makeMember(),
      articlesByDateEntries: [],
      dates,
      stats: makeStats({ dailyStreak: 3, level: 2 }),
    })

    const fireChain = findAncestorChainContainingText(el, '🔥')
    expect(fireChain).not.toBeNull()
    expect(chainHasHiddenContainer(fireChain!)).toBe(false)

    const levelChain = findAncestorChainContainingText(el, 'Lv2')
    expect(levelChain).not.toBeNull()
    expect(chainHasHiddenContainer(levelChain!)).toBe(false)
  })
})
