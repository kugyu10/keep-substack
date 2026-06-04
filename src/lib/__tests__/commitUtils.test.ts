import { describe, it, expect } from 'vitest'
import { getWeekDates, matchArticleToSlot, sortMembersForCommitView } from '../commitUtils'
import type { CommitSlot, FeedItem, Member, MemberFeedResult } from '../types'

// Helper: build a minimal Member fixture
// id is required (WR-02): use a deterministic placeholder UUID derived from the name.
function member(name: string, addedAt = '2026-01-01T00:00:00.000Z'): Member {
  return {
    id: `00000000-0000-0000-0000-${name.charCodeAt(0).toString(16).padStart(12, '0')}`,
    name,
    publicationId: `pub-${name}`,
    teams: [],
    addedAt,
  }
}

// Helper: build a minimal MemberFeedResult
function result(m: Member, items: FeedItem[] = []): MemberFeedResult {
  return { member: m, items }
}

// Helper: build a FeedItem with a given ISO date
function feedItem(isoDate: string): FeedItem {
  return { isoDate, title: 'Test Article', link: 'https://example.com' }
}

// ─────────────────────────────────────────────
// getWeekDates
// ─────────────────────────────────────────────
describe('getWeekDates', () => {
  it('returns a 7-element array', () => {
    const dates = getWeekDates(0)
    expect(dates).toHaveLength(7)
  })

  it('all entries match YYYY-MM-DD format', () => {
    const dates = getWeekDates(0)
    const isoPattern = /^\d{4}-\d{2}-\d{2}$/
    for (const d of dates) {
      expect(d).toMatch(isoPattern)
    }
  })

  it('index 0 is a Monday (getUTCDay() === 1) or verifiable by offset', () => {
    // The first element of getWeekDates(0) should be a Monday (UTC weekday 1)
    const dates = getWeekDates(0)
    const monday = new Date(dates[0] + 'T00:00:00.000Z')
    expect(monday.getUTCDay()).toBe(1) // 1 = Monday
  })

  it('getWeekDates(-1)[0] is exactly 7 days before getWeekDates(0)[0]', () => {
    const thisWeek = getWeekDates(0)
    const lastWeek = getWeekDates(-1)
    const thisMonday = new Date(thisWeek[0] + 'T00:00:00.000Z')
    const lastMonday = new Date(lastWeek[0] + 'T00:00:00.000Z')
    const diffMs = thisMonday.getTime() - lastMonday.getTime()
    expect(diffMs).toBe(7 * 24 * 60 * 60 * 1000)
  })

  it('index 6 is 6 days after index 0 (Sunday)', () => {
    const dates = getWeekDates(0)
    const monday = new Date(dates[0] + 'T00:00:00.000Z')
    const sunday = new Date(dates[6] + 'T00:00:00.000Z')
    const diffDays = (sunday.getTime() - monday.getTime()) / (24 * 60 * 60 * 1000)
    expect(diffDays).toBe(6)
  })
})

// ─────────────────────────────────────────────
// matchArticleToSlot
// ─────────────────────────────────────────────
describe('matchArticleToSlot', () => {
  it('returns the FeedItem when an article matches the slot date (Monday)', () => {
    // Use a known Monday: 2026-06-01 is a Monday in JST
    // We'll use a date we control via weekDates
    const weekDates = [
      '2026-06-01', // Monday (day_of_week=1)
      '2026-06-02',
      '2026-06-03',
      '2026-06-04',
      '2026-06-05',
      '2026-06-06',
      '2026-06-07',
    ]

    const slot: CommitSlot = { member_id: 'uuid-123', day_of_week: 1, hour: 10 }
    const article = feedItem('2026-06-01T01:00:00.000Z') // UTC → JST 2026-06-01T10:00:00

    const articleDateMap = new Map<string, FeedItem[]>([
      ['2026-06-01', [article]],
    ])

    const result = matchArticleToSlot(slot, weekDates, articleDateMap)
    expect(result).toBeDefined()
    expect(result!.isoDate).toBe('2026-06-01T01:00:00.000Z')
  })

  it('returns undefined when no article matches the slot date', () => {
    const weekDates = [
      '2026-06-01',
      '2026-06-02',
      '2026-06-03',
      '2026-06-04',
      '2026-06-05',
      '2026-06-06',
      '2026-06-07',
    ]

    const slot: CommitSlot = { member_id: 'uuid-123', day_of_week: 3, hour: 10 } // Wednesday
    const articleDateMap = new Map<string, FeedItem[]>() // empty map

    const result = matchArticleToSlot(slot, weekDates, articleDateMap)
    expect(result).toBeUndefined()
  })

  it('returns the first article when multiple exist on the same date', () => {
    const weekDates = [
      '2026-06-01',
      '2026-06-02',
      '2026-06-03',
      '2026-06-04',
      '2026-06-05',
      '2026-06-06',
      '2026-06-07',
    ]

    const slot: CommitSlot = { member_id: 'uuid-123', day_of_week: 2, hour: 10 } // Tuesday
    const first = feedItem('2026-06-02T01:00:00.000Z')
    const second = feedItem('2026-06-02T05:00:00.000Z')

    const articleDateMap = new Map<string, FeedItem[]>([
      ['2026-06-02', [first, second]],
    ])

    const result = matchArticleToSlot(slot, weekDates, articleDateMap)
    expect(result).toBe(first)
  })

  it('maps day_of_week 7 (Sunday) to weekDates[6]', () => {
    const weekDates = [
      '2026-06-01',
      '2026-06-02',
      '2026-06-03',
      '2026-06-04',
      '2026-06-05',
      '2026-06-06',
      '2026-06-07', // Sunday
    ]

    const slot: CommitSlot = { member_id: 'uuid-123', day_of_week: 7, hour: 10 }
    const article = feedItem('2026-06-07T01:00:00.000Z')

    const articleDateMap = new Map<string, FeedItem[]>([
      ['2026-06-07', [article]],
    ])

    const result = matchArticleToSlot(slot, weekDates, articleDateMap)
    expect(result).toBeDefined()
  })
})

// ─────────────────────────────────────────────
// sortMembersForCommitView
// ─────────────────────────────────────────────
describe('sortMembersForCommitView', () => {
  it('sorts member with more this-week articles first', () => {
    // Use a date from getWeekDates(0) to guarantee "this week"
    const thisWeekDates = getWeekDates(0)
    const mondayIso = thisWeekDates[0] + 'T00:30:00.000Z' // Monday midnight JST = Sunday UTC

    const activeResult = result(
      member('Active'),
      [feedItem(mondayIso), feedItem(mondayIso)]
    )
    const inactiveResult = result(member('Inactive'), [])

    const slots: CommitSlot[] = []
    const sorted = sortMembersForCommitView([inactiveResult, activeResult], slots)

    expect(sorted[0].member.name).toBe('Active')
    expect(sorted[1].member.name).toBe('Inactive')
  })

  it('breaks ties by addedAt ascending', () => {
    const inactiveEarly = result(member('Early', '2026-01-01T00:00:00.000Z'), [])
    const inactiveLate = result(member('Late', '2026-06-01T00:00:00.000Z'), [])

    const slots: CommitSlot[] = []
    const sorted = sortMembersForCommitView([inactiveLate, inactiveEarly], slots)

    expect(sorted[0].member.name).toBe('Early')
    expect(sorted[1].member.name).toBe('Late')
  })

  it('returns empty array when given empty input', () => {
    const sorted = sortMembersForCommitView([], [])
    expect(sorted).toEqual([])
  })

  it('does not mutate the original array', () => {
    const r1 = result(member('A'), [])
    const r2 = result(member('B'), [])
    const original = [r1, r2]
    sortMembersForCommitView(original, [])
    expect(original[0].member.name).toBe('A')
    expect(original[1].member.name).toBe('B')
  })
})
