import { isoToJSTDateKey } from './calendarUtils'
import type { CommitSlot, FeedItem, MemberFeedResult } from './types'

/**
 * Returns an array of 7 date strings ['YYYY-MM-DD', ...] for the Monday-start week
 * in JST. index 0 = Monday, index 6 = Sunday.
 * mondayOffsetWeeks=0 → current week, =-1 → last week, =-2 → two weeks ago.
 */
export function getWeekDates(mondayOffsetWeeks: number): string[] {
  // JST: UTC+9
  const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000)

  // ISO 8601 weekday: 1=Mon ... 6=Sat, 0=Sun → treat 0 as 7
  const utcDay = nowJST.getUTCDay()
  const isoDow = utcDay === 0 ? 7 : utcDay

  // Offset to get the Monday of the current week (in ms)
  const msToMonday = (isoDow - 1) * 24 * 60 * 60 * 1000
  const weekOffsetMs = mondayOffsetWeeks * 7 * 24 * 60 * 60 * 1000

  // Monday of the target week (as JST timestamp)
  const mondayJST = new Date(nowJST.getTime() - msToMonday + weekOffsetMs)

  const dates: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(mondayJST.getTime() + i * 24 * 60 * 60 * 1000)
    const year = d.getUTCFullYear()
    const month = String(d.getUTCMonth() + 1).padStart(2, '0')
    const day = String(d.getUTCDate()).padStart(2, '0')
    dates.push(`${year}-${month}-${day}`)
  }
  return dates
}

/**
 * Given a commit slot and the 7-element week date array from getWeekDates(),
 * looks up whether an article was published on that slot's day.
 * slot.day_of_week: 1=Mon → weekDates[0], 7=Sun → weekDates[6].
 * Returns the first FeedItem found for that date, or undefined.
 */
export function matchArticleToSlot(
  slot: CommitSlot,
  weekDates: string[],
  articleDateMap: Map<string, FeedItem[]>
): FeedItem | undefined {
  // day_of_week is 1-indexed (1=Mon), weekDates is 0-indexed (0=Mon)
  const dateKey = weekDates[slot.day_of_week - 1]
  if (!dateKey) return undefined
  const articles = articleDateMap.get(dateKey)
  return articles && articles.length > 0 ? articles[0] : undefined
}

/**
 * Sorts members for CommitGoalView (D-10 simplified implementation).
 * Primary: this-week article count descending.
 * Secondary: addedAt ascending (earlier registered members first).
 *
 * Phase 30 will refine this to use achievement rate + streak weeks.
 */
export function sortMembersForCommitView(
  results: MemberFeedResult[],
  // slots parameter is reserved for future Phase 30 achievement-rate sorting
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _slots: CommitSlot[]
): MemberFeedResult[] {
  const thisWeekDates = getWeekDates(0)
  const dateSet = new Set(thisWeekDates)

  return [...results].sort((a, b) => {
    const aCount = countArticlesInDateSet(a.items, dateSet)
    const bCount = countArticlesInDateSet(b.items, dateSet)
    if (bCount !== aCount) return bCount - aCount // 降順
    return a.member.addedAt.localeCompare(b.member.addedAt) // 登録順昇順
  })
}

/**
 * Count articles whose JST date falls within the given date set.
 */
function countArticlesInDateSet(items: FeedItem[], dateSet: Set<string>): number {
  return items.filter((item) => {
    if (!item.isoDate) return false
    const key = isoToJSTDateKey(item.isoDate)
    return key !== null && dateSet.has(key)
  }).length
}
