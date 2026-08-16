import { isoToJSTDateKey } from './calendarUtils'
import type { CommitSlot, FeedItem, Member, MemberFeedResult } from './types'

/**
 * Returns an array of 7 date strings ['YYYY-MM-DD', ...] for the Monday-start week
 * in JST. index 0 = Monday, index 6 = Sunday.
 * mondayOffsetWeeks=0 → current week, =-1 → last week, =-2 → two weeks ago.
 * now: optional injection point for the current instant (defaults to real "now").
 * Existing call sites omit it, so behavior is unchanged.
 */
export function getWeekDates(mondayOffsetWeeks: number, now: Date = new Date()): string[] {
  // JST: UTC+9
  const nowJST = new Date(now.getTime() + 9 * 60 * 60 * 1000)

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
 * Exported (promoted from internal helper) so gamification.ts can reuse it.
 */
export function buildArticleDateMap(items: FeedItem[]): Map<string, FeedItem[]> {
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
 * Exported (promoted from internal helper) so gamification.ts can reuse it.
 * now: optional injection point for the current instant (defaults to real "now").
 * Existing call sites omit it, so behavior is unchanged.
 */
export function hasWeekFailed(
  slots: CommitSlot[],
  weekDates: string[],
  articleDateMap: Map<string, FeedItem[]>,
  now: Date = new Date()
): boolean {
  const nowJST = new Date(now.getTime() + 9 * 60 * 60 * 1000)
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
export function achievementRate(
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
 * Returns the group number for a member:
 * - 0 (Group A): hasUser=true and has at least one commit slot
 * - 1 (Group B): hasUser=true but no commit slots
 * - 2 (Group C): hasUser=false (no linked auth user)
 */
function getGroup(member: Member, memberSlots: CommitSlot[]): 0 | 1 | 2 {
  if (!member.hasUser) return 2
  if (memberSlots.length === 0) return 1
  return 0
}

/**
 * Sorts members for CommitGoalView — D-13/D-14 3-group 5-key sort.
 * Groups (D-14):
 *   A: hasUser=true + slots > 0
 *   B: hasUser=true + slots === 0
 *   C: hasUser=false
 * Within each group, sort keys (D-13):
 *   ① group ascending (A→B→C)
 *   ② thisWeek achievement rate descending
 *   ③ streak weeks descending
 *   ④ lastWeek achievement rate descending
 *   ⑤ twoWeeksAgo achievement rate descending
 *   ⑥ addedAt ascending
 */
export function sortMembersForCommitView(
  results: MemberFeedResult[],
  slots: CommitSlot[]
): MemberFeedResult[] {
  const thisWeekDates = getWeekDates(0)
  const lastWeekDates = getWeekDates(-1)
  const twoWeeksAgoDates = getWeekDates(-2)

  // Pre-compute per-member values once to avoid rebuilding Maps inside the comparator.
  const meta = new Map(
    results.map(({ member, items }) => {
      const memberSlots = slots.filter((s) => s.member_id === member.id)
      const dateMap = buildArticleDateMap(items)
      return [
        member.id,
        {
          group: getGroup(member, memberSlots),
          rate0: achievementRate(memberSlots, thisWeekDates, dateMap),
          streak: consecutiveWeekStreak(memberSlots, items),
          rate1: achievementRate(memberSlots, lastWeekDates, dateMap),
          rate2: achievementRate(memberSlots, twoWeeksAgoDates, dateMap),
        },
      ]
    })
  )

  return [...results].sort((a, b) => {
    const am = meta.get(a.member.id)!
    const bm = meta.get(b.member.id)!

    // ① group ascending (A=0, B=1, C=2)
    if (am.group !== bm.group) return am.group - bm.group

    // ② this week achievement rate descending
    if (bm.rate0 !== am.rate0) return bm.rate0 - am.rate0

    // ③ streak weeks descending
    if (bm.streak !== am.streak) return bm.streak - am.streak

    // ④ last week achievement rate descending
    if (bm.rate1 !== am.rate1) return bm.rate1 - am.rate1

    // ⑤ two weeks ago achievement rate descending
    if (bm.rate2 !== am.rate2) return bm.rate2 - am.rate2

    // ⑥ addedAt ascending
    return a.member.addedAt.localeCompare(b.member.addedAt)
  })
}
