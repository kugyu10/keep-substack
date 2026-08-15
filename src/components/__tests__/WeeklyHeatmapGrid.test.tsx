import { describe, it, expect, vi } from 'vitest'
import type { ReactElement } from 'react'
import type { Member, MemberFeedResult, MemberGameStats } from '@/lib/types'

// WeeklyHeatmapGrid は useState を使うクライアントコンポーネント。
// このリポジトリの component テストは「コンポーネントを純関数として呼び、返る
// React 要素ツリーを走査する」方式のため、React のフックをスタブして同期的に
// 要素ツリーを得られるようにする（ShareButton.test.tsx と同じ手法）。
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')
  return {
    ...actual,
    useState: (init: unknown) => [init, vi.fn()],
  }
})

import WeeklyHeatmapGrid from '../WeeklyHeatmapGrid'
import HeatmapRow from '../HeatmapRow'

// --- Element-tree helpers ---

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

function findAllByType(node: unknown, target: unknown): AnyEl[] {
  const results: AnyEl[] = []
  function walk(n: unknown) {
    if (!isElement(n)) return
    if (n.type === target) results.push(n)
    const children = (n.props as { children?: unknown }).children
    for (const child of flattenChildren(children)) walk(child)
  }
  walk(node)
  return results
}

// --- Fixtures ---

function makeMember(id: string, publicationId: string): Member {
  return {
    id,
    name: `Member ${publicationId}`,
    publicationId,
    teams: [],
    addedAt: '2026-01-01T00:00:00.000Z',
    hasUser: true,
  }
}

function makeStats(memberId: string, overrides: Partial<MemberGameStats> = {}): MemberGameStats {
  return {
    memberId,
    dailyStreak: 2,
    weeklyStreak: 1,
    postCount: 5,
    achievedWeekCount: 1,
    xp: 60,
    level: 2,
    currentLevelFloor: 50,
    nextLevelXp: 200,
    progressRatio: 0.1,
    ...overrides,
  }
}

function makeResult(member: Member): MemberFeedResult {
  return { member, items: [] }
}

describe('WeeklyHeatmapGrid statsById forwarding', () => {
  it('statsById 未指定なら各 HeatmapRow の stats は undefined', () => {
    const member = makeMember('m1', 'pub-1')
    const el = WeeklyHeatmapGrid({ results: [makeResult(member)] })
    const rows = findAllByType(el, HeatmapRow)
    expect(rows.length).toBe(1)
    expect(rows[0].props.stats).toBeUndefined()
  })

  it('statsById に該当メンバーがいれば HeatmapRow に stats を渡す', () => {
    const member = makeMember('m1', 'pub-1')
    const statsById = { m1: makeStats('m1', { dailyStreak: 4, level: 3 }) }
    const el = WeeklyHeatmapGrid({ results: [makeResult(member)], statsById })
    const rows = findAllByType(el, HeatmapRow)
    expect(rows.length).toBe(1)
    expect(rows[0].props.stats).toEqual(statsById.m1)
  })

  it('statsById に該当メンバーがいなければ stats は undefined（該当メンバー以外に影響しない）', () => {
    const member = makeMember('m1', 'pub-1')
    const statsById = { other: makeStats('other') }
    const el = WeeklyHeatmapGrid({ results: [makeResult(member)], statsById })
    const rows = findAllByType(el, HeatmapRow)
    expect(rows[0].props.stats).toBeUndefined()
  })
})
