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
 * Builds a Map from JST date key ('YYYY-MM-DD') to FeedItem[] from the given items array.
 * Internal helper — not exported.
 */
function buildArticleDateMap(items: FeedItem[]): Map<string, FeedItem[]> {
  const map = new Map<string, FeedItem[]>()
  for (const item of items) {
    if (!item.isoDate) continue
    const key = isoToJSTDateKey(item.isoDate)
    if (!key) continue
    const existing = map.get(key) ?? []
    existing.push(item)
    map.set(key, existing)
  }
  return map
}

/**
 * Returns true if all commit slots for the given week have at least one article.
 * Returns false if slots is empty (vacuous truth prevention).
 *
 * @param slots - commit slots to check (for a single member)
 * @param weekDates - 7-element array from getWeekDates(offset), index 0 = Monday
 * @param articleDateMap - Map from 'YYYY-MM-DD' to FeedItem[] for the member's articles
 */
export function isCurrentWeekComplete(
  slots: CommitSlot[],
  weekDates: string[],
  articleDateMap: Map<string, FeedItem[]>
): boolean {
  if (slots.length === 0) return false
  return slots.every((slot) => {
    const dateKey = weekDates[slot.day_of_week - 1]
    if (!dateKey) return false
    const articles = articleDateMap.get(dateKey)
    return articles !== undefined && articles.length > 0
  })
}

/**
 * Returns true if all commit slots for the current week are fulfilled.
 * Convenience wrapper around isCurrentWeekComplete that handles map building internally.
 */
export function isThisWeekComplete(slots: CommitSlot[], items: FeedItem[]): boolean {
  if (slots.length === 0) return false
  return isCurrentWeekComplete(slots, getWeekDates(0), buildArticleDateMap(items))
}

/**
 * Returns true if any slot's day has already passed this week (strictly before today
 * in JST) and has no article. Used to distinguish "slot day not yet arrived" from
 * "slot day passed and missed".
 */
function hasWeekFailed(
  slots: CommitSlot[],
  weekDates: string[],
  articleDateMap: Map<string, FeedItem[]>
): boolean {
  const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000)
  const todayKey = `${nowJST.getUTCFullYear()}-${String(nowJST.getUTCMonth() + 1).padStart(2, '0')}-${String(nowJST.getUTCDate()).padStart(2, '0')}`
  return slots.some((slot) => {
    const dateKey = weekDates[slot.day_of_week - 1]
    if (!dateKey) return false
    if (dateKey >= todayKey) return false // today or future — not missed yet
    const articles = articleDateMap.get(dateKey)
    return !(articles && articles.length > 0)
  })
}

/**
 * Returns the number of consecutive weeks in which all commit slots were fulfilled.
 *
 * - slots=[] → 0
 * - This week: slot day not yet arrived (still pending) → check prior weeks
 * - This week: slot day passed with no article → 0
 * - This week only complete → 1
 * - This week + last week → 2
 * - This week + last week + 2 weeks ago → 3
 *
 * articleDateMap is built once outside the loop (Pitfall 1 prevention).
 */
export function consecutiveWeekStreak(slots: CommitSlot[], items: FeedItem[]): number {
  if (slots.length === 0) return 0
  const articleDateMap = buildArticleDateMap(items)
  let streak = 0
  // Look back at most 3 weeks (current + 2 prior). Spec caps streak display at 3.
  for (let offset = 0; offset >= -2; offset--) {
    const weekDates = getWeekDates(offset)
    if (isCurrentWeekComplete(slots, weekDates, articleDateMap)) {
      streak++
    } else if (offset === 0 && !hasWeekFailed(slots, weekDates, articleDateMap)) {
      // Current week: no slot day has passed without an article yet.
      // Slot day is today or in the future — don't count this week but keep checking prior weeks.
      continue
    } else {
      break
    }
  }
  return streak
}

/**
 * Compute achievement rate for a member in a given week.
 * rate = achieved slots / total slots (0 if slots empty)
 */
function achievementRate(
  slots: CommitSlot[],
  weekDates: string[],
  articleDateMap: Map<string, FeedItem[]>
): number {
  if (slots.length === 0) return 0
  const achieved = slots.filter((slot) => {
    const dateKey = weekDates[slot.day_of_week - 1]
    if (!dateKey) return false
    const articles = articleDateMap.get(dateKey)
    return articles !== undefined && articles.length > 0
  }).length
  return achieved / slots.length
}

/**
 * Sorts members for CommitGoalView — D-10 完全版.
 * ① Today's-week achievement rate (achieved slots / total slots) descending
 * ② Streak weeks (consecutiveWeekStreak) descending
 * ③ addedAt ascending (earlier registered members first)
 */
export function sortMembersForCommitView(
  results: MemberFeedResult[],
  slots: CommitSlot[]
): MemberFeedResult[] {
  const thisWeekDates = getWeekDates(0)

  return [...results].sort((a, b) => {
    const aSlots = slots.filter((s) => s.member_id === a.member.id)
    const bSlots = slots.filter((s) => s.member_id === b.member.id)

    // ① achievement rate descending
    const aRate = achievementRate(aSlots, thisWeekDates, buildArticleDateMap(a.items))
    const bRate = achievementRate(bSlots, thisWeekDates, buildArticleDateMap(b.items))
    if (bRate !== aRate) return bRate - aRate

    // ② streak weeks descending
    const aStreak = consecutiveWeekStreak(aSlots, a.items)
    const bStreak = consecutiveWeekStreak(bSlots, b.items)
    if (bStreak !== aStreak) return bStreak - aStreak

    // ③ addedAt ascending
    return a.member.addedAt.localeCompare(b.member.addedAt)
  })
}
