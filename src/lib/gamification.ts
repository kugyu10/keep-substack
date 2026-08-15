import { isoToJSTDateKey } from './calendarUtils'
import {
  buildArticleDateMap,
  getWeekDates,
  hasWeekFailed,
  isCurrentWeekComplete,
} from './commitUtils'
import type { CommitSlot, FeedItem, Member, MemberFeedResult, MemberGameStats } from './types'

// スロットの遡上限（安全上限）。実運用ではメンバーの最古記事を超えた時点で
// hasWeekFailed が即break するため到達しないが、異常データでの無限ループを防ぐ。
const MAX_WEEKS_BACK = 520

/**
 * 現在時刻のJST日付キー（'YYYY-MM-DD'）を返す。
 * `new Date()`（実時刻取得）を直接使うのはこの関数の中だけに閉じる。
 * 他の関数は now を注入して呼び出すことでテスト可能にする。
 */
export function todayJSTKey(now: Date = new Date()): string {
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const year = jst.getUTCFullYear()
  const month = String(jst.getUTCMonth() + 1).padStart(2, '0')
  const day = String(jst.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 'YYYY-MM-DD' の日付キーを days 日分シフトする（負値で過去へ）。
 * 現在時刻は読まない（純粋な日付演算のみ）。
 */
function shiftDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number)
  const shifted = new Date(Date.UTC(year, month - 1, day) + days * 24 * 60 * 60 * 1000)
  const y = shifted.getUTCFullYear()
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0')
  const d = String(shifted.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * items から isoDate を持つ記事の JST 日付キー集合を作る。
 */
function buildPostDateKeySet(items: FeedItem[]): Set<string> {
  const keys = new Set<string>()
  for (const item of items) {
    if (!item.isoDate) continue
    const key = isoToJSTDateKey(item.isoDate)
    if (key) keys.add(key)
  }
  return keys
}

/**
 * items の中で最も古い記事の JST 日付キーを返す（1件もなければ null）。
 */
function earliestPostDateKey(items: FeedItem[]): string | null {
  let earliest: string | null = null
  for (const item of items) {
    if (!item.isoDate) continue
    const key = isoToJSTDateKey(item.isoDate)
    if (!key) continue
    if (earliest === null || key < earliest) earliest = key
  }
  return earliest
}

/**
 * 投稿日キー集合から連続投稿日数（デイリーストリーク）を計算する。
 *
 * - todayKey に投稿があれば、そこから遡って連続日数を数える
 * - todayKey に投稿がなくても、昨日に投稿があれば「当日猶予」として昨日起点で連続日数を数える
 * - 昨日も投稿がなければ 0
 */
export function calcDailyStreak(postDateKeys: Set<string>, todayKey: string): number {
  let cursor = todayKey
  if (!postDateKeys.has(cursor)) {
    // 当日猶予: 今日はまだ投稿していないだけかもしれないので、昨日を起点にする
    cursor = shiftDateKey(cursor, -1)
    if (!postDateKeys.has(cursor)) return 0
  }
  let streak = 0
  while (postDateKeys.has(cursor)) {
    streak++
    cursor = shiftDateKey(cursor, -1)
  }
  return streak
}

/**
 * consecutiveWeekStreak（src/lib/commitUtils.ts）の無制限版。
 * 今週の猶予規則（スロット日が未来/当日なら保留、確定失敗なら break）は commitUtils を再利用して踏襲する。
 *
 * - slots=[] → 0
 * - 過去に遡る上限は MAX_WEEKS_BACK（安全上限、実運用では手前で break する）
 */
export function calcWeeklyGoalStreak(
  slots: CommitSlot[],
  items: FeedItem[],
  now: Date = new Date()
): number {
  if (slots.length === 0) return 0
  const articleDateMap = buildArticleDateMap(items)
  let streak = 0
  for (let offset = 0; offset > -MAX_WEEKS_BACK; offset--) {
    const weekDates = getWeekDates(offset, now)
    if (isCurrentWeekComplete(slots, weekDates, articleDateMap)) {
      streak++
    } else if (offset === 0 && !hasWeekFailed(slots, weekDates, articleDateMap, now)) {
      // 今週: まだどのスロット日も「未達確定」していない（当日/未来のみ）→ 継続チェック
      continue
    } else {
      break
    }
  }
  return streak
}

/**
 * 全期間（メンバーの最古記事の週まで）の達成週総数を数える。連続性は問わない（XP用）。
 *
 * - slots=[] → 0
 * - 記事が1件もない → 0
 * - 過去に遡る上限は MAX_WEEKS_BACK（安全上限）
 */
export function calcAchievedWeekCount(
  slots: CommitSlot[],
  items: FeedItem[],
  now: Date = new Date()
): number {
  if (slots.length === 0) return 0
  const oldestKey = earliestPostDateKey(items)
  if (oldestKey === null) return 0

  const articleDateMap = buildArticleDateMap(items)
  let count = 0
  for (let offset = 0; offset > -MAX_WEEKS_BACK; offset--) {
    const weekDates = getWeekDates(offset, now)
    if (isCurrentWeekComplete(slots, weekDates, articleDateMap)) {
      count++
    }
    // この週の月曜が最古記事の日付以前になったら、それより前の週には記事が存在し得ないので打ち切る
    if (weekDates[0] <= oldestKey) break
  }
  return count
}

/**
 * XP = 投稿数 * 10 + 達成週数 * 20
 */
export function calcXp({
  postCount,
  achievedWeekCount,
}: {
  postCount: number
  achievedWeekCount: number
}): number {
  return postCount * 10 + achievedWeekCount * 20
}

/**
 * Lv n の下限XP = 50 * (n-1)^2 になる整数 n を返す（浮動小数点誤差を境界チェックで吸収する）。
 */
function levelFloorXp(level: number): number {
  return 50 * (level - 1) ** 2
}

/**
 * xp からレベル情報を計算する。
 * level = floor(sqrt(xp/50)) + 1（Lv n の下限 = 50*(n-1)^2）
 */
export function calcLevel(xp: number): {
  level: number
  xp: number
  currentLevelFloor: number
  nextLevelXp: number
  progressRatio: number
} {
  const safeXp = Math.max(0, xp)
  let level = Math.floor(Math.sqrt(safeXp / 50)) + 1
  // 浮動小数点誤差セーフティ: levelFloorXp(level) <= safeXp < levelFloorXp(level+1) になるまで補正
  while (levelFloorXp(level) > safeXp) level--
  while (levelFloorXp(level + 1) <= safeXp) level++

  const currentLevelFloor = levelFloorXp(level)
  const nextLevelXp = levelFloorXp(level + 1)
  const span = nextLevelXp - currentLevelFloor
  const progressRatio = span > 0 ? Math.min(1, Math.max(0, (safeXp - currentLevelFloor) / span)) : 0

  return { level, xp: safeXp, currentLevelFloor, nextLevelXp, progressRatio }
}

/**
 * 1メンバー分のゲーミフィケーション統計をまとめて計算する。
 */
export function buildGameStats(
  member: Member,
  items: FeedItem[],
  slots: CommitSlot[],
  now: Date = new Date()
): MemberGameStats {
  const todayKey = todayJSTKey(now)
  const postDateKeys = buildPostDateKeySet(items)

  const dailyStreak = calcDailyStreak(postDateKeys, todayKey)
  const weeklyStreak = calcWeeklyGoalStreak(slots, items, now)
  const postCount = items.length
  const achievedWeekCount = calcAchievedWeekCount(slots, items, now)
  const xp = calcXp({ postCount, achievedWeekCount })
  const { level, currentLevelFloor, nextLevelXp, progressRatio } = calcLevel(xp)

  return {
    memberId: member.id,
    dailyStreak,
    weeklyStreak,
    postCount,
    achievedWeekCount,
    xp,
    level,
    currentLevelFloor,
    nextLevelXp,
    progressRatio,
  }
}

/**
 * MemberFeedResult[] + slots から member.id をキーにした統計マップを構築する。
 */
export function buildStatsById(
  results: MemberFeedResult[],
  slots: CommitSlot[],
  now: Date = new Date()
): Record<string, MemberGameStats> {
  const statsById: Record<string, MemberGameStats> = {}
  for (const { member, items } of results) {
    const memberSlots = slots.filter((s) => s.member_id === member.id)
    statsById[member.id] = buildGameStats(member, items, memberSlots, now)
  }
  return statsById
}
