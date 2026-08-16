import { describe, it, expect } from 'vitest'
import type { ReactElement } from 'react'
import type { Member, CommitSlot, MemberGameStats } from '@/lib/types'

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

function makeStats(overrides: Partial<MemberGameStats> = {}): MemberGameStats {
  return {
    memberId: '00000000-0000-0000-0000-000000000001',
    dailyStreak: 0,
    weeklyStreak: 0,
    postCount: 0,
    onTimeCount: 0,
    achievedWeekCount: 0,
    xpBreakdown: { post: 0, onTime: 0, achieved: 0 },
    xp: 0,
    level: 1,
    currentLevelFloor: 0,
    nextLevelXp: 50,
    progressRatio: 0,
    ...overrides,
  }
}

// ─────────────────────────────────────────────────────────────
// CommitGoalRow streak=0: アイコンなし
// ─────────────────────────────────────────────────────────────
// アイコンなし: 未達成 (crownEarned=false, streak=0)
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// 👑 のみ: 今週達成・週ストリークなし (ACHIEV-01)
// ─────────────────────────────────────────────────────────────
describe('CommitGoalRow 👑 のみ: 今週達成・週ストリークなし (ACHIEV-01)', () => {
  it('crownEarned=true + streak=0 のとき 👑 が表示され 🔥 は表示しない', () => {
    const el = CommitGoalRow({
      member: makeMember(),
      items: [],
      slots: [makeSlot(1)],
      streak: 0,
      crownEarned: true,
    })
    const joined = collectText(el).join('')
    expect(joined).toContain('👑')
    expect(joined).not.toContain('🔥')
  })
})

// ─────────────────────────────────────────────────────────────
// 🔥N: weeklyStreak >= 1 で数字付きバッジ表示（上限なし）
// ─────────────────────────────────────────────────────────────
describe('CommitGoalRow 🔥N: weeklyStreak >= 1 で数字付きバッジ（上限なし）', () => {
  it('crownEarned=false + streak=1 のとき 🔥1 のみ表示、👑 は表示しない', () => {
    const el = CommitGoalRow({
      member: makeMember(),
      items: [],
      slots: [makeSlot(1)],
      streak: 1,
      crownEarned: false,
    })
    const joined = collectText(el).join('')
    expect(joined).not.toContain('👑')
    expect(joined).toContain('🔥1')
  })

  it('streak=3 (旧上限=3) のとき 🔥3 と表示される', () => {
    const el = CommitGoalRow({
      member: makeMember(),
      items: [],
      slots: [makeSlot(1)],
      streak: 3,
      crownEarned: false,
    })
    const joined = collectText(el).join('')
    expect(joined).toContain('🔥3')
  })

  it('streak=12 (旧上限3週を超える) のとき 🔥12 と数字がそのまま表示される（上限なし）', () => {
    const el = CommitGoalRow({
      member: makeMember(),
      items: [],
      slots: [makeSlot(1)],
      streak: 12,
      crownEarned: false,
    })
    const joined = collectText(el).join('')
    expect(joined).toContain('🔥12')
    expect(joined).not.toContain('🔥1週') // 桁の取り違えがないことの簡易確認
  })
})

// ─────────────────────────────────────────────────────────────
// 👑🔥N: 今週達成 + 週ストリーク併存 (ACHIEV-01 + ACHIEV-02)
// ─────────────────────────────────────────────────────────────
describe('CommitGoalRow 👑🔥N: 今週達成 + 週ストリーク併存', () => {
  it('crownEarned=true + streak=2 のとき 👑 と 🔥2 の両方が表示される', () => {
    const el = CommitGoalRow({
      member: makeMember(),
      items: [],
      slots: [makeSlot(1)],
      streak: 2,
      crownEarned: true,
    })
    const joined = collectText(el).join('')
    expect(joined).toContain('👑')
    expect(joined).toContain('🔥2')
  })
})

// ─────────────────────────────────────────────────────────────
// Lv バッジ: stats 有無で表示が分かれる
// ─────────────────────────────────────────────────────────────
describe('CommitGoalRow Lv バッジ: stats 有無で表示が分かれる', () => {
  it('stats が渡されないとき Lv バッジは表示されない（後方互換）', () => {
    const el = CommitGoalRow({
      member: makeMember(),
      items: [],
      slots: [makeSlot(1)],
      streak: 1,
      crownEarned: false,
    })
    const joined = collectText(el).join('')
    expect(joined).not.toMatch(/Lv\d/)
  })

  it('stats が渡されるとき Lv{level} バッジが表示される', () => {
    const el = CommitGoalRow({
      member: makeMember(),
      items: [],
      slots: [makeSlot(1)],
      streak: 1,
      crownEarned: false,
      stats: makeStats({ level: 7 }),
    })
    const joined = collectText(el).join('')
    expect(joined).toContain('Lv7')
  })

  it('streak=0 かつ crownEarned=false でも stats があれば Lv バッジは表示される', () => {
    const el = CommitGoalRow({
      member: makeMember(),
      items: [],
      slots: [makeSlot(1)],
      streak: 0,
      crownEarned: false,
      stats: makeStats({ level: 2 }),
    })
    const joined = collectText(el).join('')
    expect(joined).not.toContain('🔥')
    expect(joined).not.toContain('👑')
    expect(joined).toContain('Lv2')
  })
})

// ─────────────────────────────────────────────────────────────
// スロット未設定: 未登録 / 未コミットメント の表示分離
// ─────────────────────────────────────────────────────────────
describe('CommitGoalRow スロット未設定の表示分離', () => {
  it('hasUser=false + slots なし のとき「未登録」を表示する', () => {
    const el = CommitGoalRow({
      member: { ...makeMember(), hasUser: false },
      items: [],
      slots: [],
      streak: 0,
      crownEarned: false,
    })
    const joined = collectText(el).join('')
    expect(joined).toContain('未登録')
    expect(joined).not.toContain('未コミットメント')
  })

  it('hasUser=false のとき行を淡色（opacity）で控えめに表示する', () => {
    const el = CommitGoalRow({
      member: { ...makeMember(), hasUser: false },
      items: [],
      slots: [],
      streak: 0,
      crownEarned: false,
    })
    const dimmed = findAllByClassName(el, (cls) => cls.includes('opacity-60'))
    expect(dimmed.length).toBeGreaterThan(0)
  })

  it('hasUser=true + slots なし のとき「未コミットメント」を表示する', () => {
    const el = CommitGoalRow({
      member: makeMember(),
      items: [],
      slots: [],
      streak: 0,
      crownEarned: false,
    })
    const joined = collectText(el).join('')
    expect(joined).toContain('未コミットメント')
    expect(joined).not.toContain('未登録')
  })

  it('hasUser=true + slots なし のとき行は淡色にしない', () => {
    const el = CommitGoalRow({
      member: makeMember(),
      items: [],
      slots: [],
      streak: 0,
      crownEarned: false,
    })
    const dimmed = findAllByClassName(el, (cls) => cls.includes('opacity-60'))
    expect(dimmed.length).toBe(0)
  })
})

// suppress unused-variable warnings for helpers not used in this test file
void findByType
void findAllByTag
