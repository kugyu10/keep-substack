/**
 * ゲーミフィケーション（ストリーク・XP・レベル）の計算層。
 *
 * XPは導出型で、articles 履歴と現在の member_commit_slots から毎回計算する。
 *
 * 既知の制約（承知の上で許容している。恒久対応は別リリース）:
 * スロットに履歴が無いため、過去の週もオンタイム判定も「現在のスロット設定」で
 * 再評価される。したがってスロットを変更するとXPが減り、レベルが下がりうる
 * （実測: 1年継続ユーザーがスロットを1枠追加すると Lv16 → Lv12）。
 * 恒久対応は member_commit_slots に effective_from を持たせ、各週を当時の
 * スロットで判定すること。それまでは「スロットは頻繁に変えない」前提で運用する。
 */
import { isoToJSTDateKey, isoToJSTParts } from './calendarUtils'
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

// XP配点
export const XP_PER_POST = 10
export const XP_PER_ON_TIME = 10
export const XP_PER_WEEK = 30

const MINUTES_PER_WEEK = 7 * 24 * 60
// コミット時刻の前後どこまでを「オンタイム」とみなすか（分）。
// 窓は [hour-1:00, hour+1:00) の半開区間。閉区間にすると2時間差の
// 隣接スロット同士の窓が1点で接し、判定が曖昧になるため。
const ON_TIME_WINDOW_MINUTES = 60

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
 * 「コミットした曜日・時刻の ±1時間以内に投稿した」件数を数える。
 *
 * 週内の循環距離で判定するので、日曜23:30の投稿と月曜0:00のスロットのような
 * 日跨ぎ・週跨ぎも拾える。同じ (スロット, 週) では1回しか数えない
 * ——同じ時間帯に連投して稼げてしまうのを防ぐため。
 *
 * 注意: スロットには履歴が無いため、過去の投稿も「現在のスロット設定」で判定される。
 */
export function calcOnTimePostCount(items: FeedItem[], slots: CommitSlot[]): number {
  if (slots.length === 0) return 0

  const counted = new Set<string>()
  for (const item of items) {
    if (!item.isoDate) continue
    const parts = isoToJSTParts(item.isoDate)
    const dateKey = isoToJSTDateKey(item.isoDate)
    if (!parts || !dateKey) continue

    const postMinutes = (parts.dayOfWeek - 1) * 24 * 60 + parts.hour * 60 + parts.minute
    // その投稿が属する週の月曜。(スロット, 週) の重複判定に使う
    const weekKey = shiftDateKey(dateKey, -(parts.dayOfWeek - 1))

    for (const slot of slots) {
      const slotMinutes = (slot.day_of_week - 1) * 24 * 60 + slot.hour * 60
      const half = MINUTES_PER_WEEK / 2
      const diff = postMinutes - slotMinutes
      // [-half, half) に正規化した符号付き差分（JSの % は負を返すので下駄を履かせる）
      const offset = (((diff + half) % MINUTES_PER_WEEK) + MINUTES_PER_WEEK) % MINUTES_PER_WEEK - half
      if (offset < -ON_TIME_WINDOW_MINUTES || offset >= ON_TIME_WINDOW_MINUTES) continue

      const key = `${weekKey}:${slot.day_of_week}:${slot.hour}`
      if (!counted.has(key)) counted.add(key)
      // 1投稿は1スロット分までしか数えない（窓が重なるスロットでの二重取り防止）
      break
    }
  }
  return counted.size
}

/**
 * XP = 投稿数 * 10 + オンタイム投稿数 * 10 + 達成週数 * 30
 *
 * オンタイム投稿は「投稿XPが2倍になる」と読める配点にしている。
 * 達成週（宣言した週の完遂）が1件あたり最大の重みを持つのは、
 * 本アプリの目的が「量産」ではなく「継続」であるため。
 */
export function calcXp({
  postCount,
  onTimeCount,
  achievedWeekCount,
}: {
  postCount: number
  onTimeCount: number
  achievedWeekCount: number
}): number {
  return postCount * XP_PER_POST + onTimeCount * XP_PER_ON_TIME + achievedWeekCount * XP_PER_WEEK
}

/**
 * Lv n の下限XP。2段階（助走 → 巡航）で、増分は境界で連続する。
 *
 * - Lv10 まで: 5n(n-1)   → 増分 10n（+20, +30 … +90）。「Lv n→n+1 は投稿n件分」
 * - Lv11 以降: 450 + 50(n-10)(n-9) → 増分 100(n-9)（+100, +200, +300 …）
 *
 * 前半を安くして初期の報酬密度を上げ（習慣形成は初期の繰り返しほど自動性が伸びる）、
 * 後半を重くして長期ユーザーのレベルが青天井にインフレするのを防ぐ。
 */
function levelFloorXp(level: number): number {
  if (level <= 10) return 5 * level * (level - 1)
  return 450 + 50 * (level - 10) * (level - 9)
}

/**
 * xp からレベル情報を計算する。
 * 2段階式で逆関数が単純でないため、Lv1から線形に上げて求める
 * （到達レベルはたかだか数十なのでコストは無視できる）。
 */
export function calcLevel(xp: number): {
  level: number
  xp: number
  currentLevelFloor: number
  nextLevelXp: number
  progressRatio: number
} {
  const safeXp = Math.max(0, xp)
  let level = 1
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
  const onTimeCount = calcOnTimePostCount(items, slots)
  const achievedWeekCount = calcAchievedWeekCount(slots, items, now)
  const xp = calcXp({ postCount, onTimeCount, achievedWeekCount })
  const { level, currentLevelFloor, nextLevelXp, progressRatio } = calcLevel(xp)

  return {
    memberId: member.id,
    dailyStreak,
    weeklyStreak,
    postCount,
    onTimeCount,
    achievedWeekCount,
    xp,
    xpBreakdown: {
      post: postCount * XP_PER_POST,
      onTime: onTimeCount * XP_PER_ON_TIME,
      achieved: achievedWeekCount * XP_PER_WEEK,
    },
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
