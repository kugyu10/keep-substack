import { describe, it, expect } from 'vitest'
import {
  todayJSTKey,
  calcDailyStreak,
  calcWeeklyGoalStreak,
  calcAchievedWeekCount,
  calcXp,
  calcLevel,
  buildGameStats,
  buildStatsById,
} from '../gamification'
import type { CommitSlot, FeedItem, Member, MemberFeedResult } from '../types'

// Helper: build a minimal Member fixture (same convention as commitUtils.test.ts)
function member(name: string, addedAt = '2026-01-01T00:00:00.000Z'): Member {
  return {
    id: `00000000-0000-0000-0000-${name.charCodeAt(0).toString(16).padStart(12, '0')}`,
    name,
    publicationId: `pub-${name}`,
    teams: [],
    addedAt,
    hasUser: true,
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

// 全テストで固定する「現在時刻」: JSTで 2026-06-10（水曜日）13:00
// 2026-06-01 が月曜であることは commitUtils.test.ts と共有の前提（getWeekDates(0)基準）。
// この now を注入することで、実際のカレンダー日に依存しない決定的なテストにする。
const NOW = new Date('2026-06-10T04:00:00.000Z')

// ─────────────────────────────────────────────────
// todayJSTKey
// ─────────────────────────────────────────────────
describe('todayJSTKey', () => {
  it('returns the JST date key for the injected now', () => {
    expect(todayJSTKey(NOW)).toBe('2026-06-10')
  })

  it('rolls over to the next JST day when UTC time is late in the day', () => {
    // 2026-06-10T15:30:00.000Z + 9h = 2026-06-11T00:30:00 JST
    expect(todayJSTKey(new Date('2026-06-10T15:30:00.000Z'))).toBe('2026-06-11')
  })
})

// ─────────────────────────────────────────────────
// calcDailyStreak
// ─────────────────────────────────────────────────
describe('calcDailyStreak', () => {
  const todayKey = '2026-06-10'

  it('今日投稿済みなら今日を起点に連続日数を数える', () => {
    const postDateKeys = new Set(['2026-06-10', '2026-06-09', '2026-06-08'])
    expect(calcDailyStreak(postDateKeys, todayKey)).toBe(3)
  })

  it('当日猶予: 今日未投稿でも昨日までの連続が生きる', () => {
    const postDateKeys = new Set(['2026-06-09', '2026-06-08'])
    expect(calcDailyStreak(postDateKeys, todayKey)).toBe(2)
  })

  it('昨日も投稿が無ければ 0', () => {
    const postDateKeys = new Set(['2026-06-08']) // 2日前のみ
    expect(calcDailyStreak(postDateKeys, todayKey)).toBe(0)
  })

  it('投稿が1件もなければ 0', () => {
    expect(calcDailyStreak(new Set(), todayKey)).toBe(0)
  })

  it('途中に空白日があればそこで打ち切る', () => {
    // 今日・昨日はあるが、一昨日が欠けている → 2で止まる
    const postDateKeys = new Set(['2026-06-10', '2026-06-09', '2026-06-07'])
    expect(calcDailyStreak(postDateKeys, todayKey)).toBe(2)
  })
})

// ─────────────────────────────────────────────────
// calcWeeklyGoalStreak
// ─────────────────────────────────────────────────
describe('calcWeeklyGoalStreak', () => {
  it('slots が空なら 0', () => {
    expect(calcWeeklyGoalStreak([], [feedItem('2026-06-05T00:30:00.000Z')], NOW)).toBe(0)
  })

  it('今週のスロット日が未到来（保留）でも先週・2週前の連続を数える', () => {
    // Slot: 金曜日 (day_of_week=5)。NOW=2026-06-10(水) なので今週の金曜(06-12)は未到来。
    const slots: CommitSlot[] = [{ member_id: 'uuid-1', day_of_week: 5, hour: 10 }]
    const items: FeedItem[] = [
      feedItem('2026-06-05T00:30:00.000Z'), // 先週金曜(達成)
      feedItem('2026-05-29T00:30:00.000Z'), // 2週前金曜(達成)
    ]
    expect(calcWeeklyGoalStreak(slots, items, NOW)).toBe(2)
  })

  it('確定失敗週（今週のスロット日が既に過ぎて未達）があればそこで停止する', () => {
    // Slot: 火曜日 (day_of_week=2)。NOW=2026-06-10(水) なので今週の火曜(06-09)は既に過ぎている。
    const slots: CommitSlot[] = [{ member_id: 'uuid-1', day_of_week: 2, hour: 10 }]
    const items: FeedItem[] = [
      feedItem('2026-06-02T00:30:00.000Z'), // 先週火曜(達成) — だが今週未達で止まるため無関係
      feedItem('2026-05-26T00:30:00.000Z'), // 2週前火曜(達成) — 同上
    ]
    expect(calcWeeklyGoalStreak(slots, items, NOW)).toBe(0)
  })

  it('無制限版: consecutiveWeekStreak の上限3週を超えて連続を数える', () => {
    // Slot: 金曜日。今週は保留、直近4週連続で金曜達成 → streak=4（3週キャップなし）
    const slots: CommitSlot[] = [{ member_id: 'uuid-1', day_of_week: 5, hour: 10 }]
    const items: FeedItem[] = [
      feedItem('2026-06-05T00:30:00.000Z'), // 先週
      feedItem('2026-05-29T00:30:00.000Z'), // 2週前
      feedItem('2026-05-22T00:30:00.000Z'), // 3週前
      feedItem('2026-05-15T00:30:00.000Z'), // 4週前
    ]
    expect(calcWeeklyGoalStreak(slots, items, NOW)).toBe(4)
  })

  it('items が空なら（今週保留判定を除き）streak は0のまま', () => {
    const slots: CommitSlot[] = [{ member_id: 'uuid-1', day_of_week: 5, hour: 10 }]
    expect(calcWeeklyGoalStreak(slots, [], NOW)).toBe(0)
  })
})

// ─────────────────────────────────────────────────
// calcAchievedWeekCount
// ─────────────────────────────────────────────────
describe('calcAchievedWeekCount', () => {
  it('slots が空なら 0', () => {
    expect(calcAchievedWeekCount([], [feedItem('2026-06-05T00:30:00.000Z')], NOW)).toBe(0)
  })

  it('記事が1件もなければ 0', () => {
    const slots: CommitSlot[] = [{ member_id: 'uuid-1', day_of_week: 5, hour: 10 }]
    expect(calcAchievedWeekCount(slots, [], NOW)).toBe(0)
  })

  it('連続不問: 途中に未達成週を挟んでも全期間の達成週数を数える', () => {
    // Slot: 金曜日。先週(06-05)達成、2週前(05-29)未達成、3週前(05-22)達成。
    // 最古記事は3週前の金曜 → そこまで遡って走査し、連続していない2週分をカウントする。
    const slots: CommitSlot[] = [{ member_id: 'uuid-1', day_of_week: 5, hour: 10 }]
    const items: FeedItem[] = [
      feedItem('2026-06-05T00:30:00.000Z'), // 先週金曜(達成)
      feedItem('2026-05-22T00:30:00.000Z'), // 3週前金曜(達成)
    ]
    expect(calcAchievedWeekCount(slots, items, NOW)).toBe(2)
  })

  it('今週保留中の週は未達成として扱われない（達成週にも失敗週にも数えない）', () => {
    const slots: CommitSlot[] = [{ member_id: 'uuid-1', day_of_week: 5, hour: 10 }]
    // 今週の金曜(06-12)はまだ来ていないので記事なしでも「達成週」に加算されない
    const items: FeedItem[] = [feedItem('2026-06-05T00:30:00.000Z')] // 先週分のみ
    expect(calcAchievedWeekCount(slots, items, NOW)).toBe(1)
  })
})

// ─────────────────────────────────────────────────
// calcXp
// ─────────────────────────────────────────────────
describe('calcXp', () => {
  it('postCount*10 + achievedWeekCount*20 で計算する', () => {
    expect(calcXp({ postCount: 5, achievedWeekCount: 3 })).toBe(110)
  })

  it('両方0なら0', () => {
    expect(calcXp({ postCount: 0, achievedWeekCount: 0 })).toBe(0)
  })
})

// ─────────────────────────────────────────────────
// calcLevel — レベル境界値
// ─────────────────────────────────────────────────
describe('calcLevel', () => {
  it('xp=0 → Lv1', () => {
    const { level, currentLevelFloor, nextLevelXp, progressRatio } = calcLevel(0)
    expect(level).toBe(1)
    expect(currentLevelFloor).toBe(0)
    expect(nextLevelXp).toBe(50)
    expect(progressRatio).toBe(0)
  })

  it('xp=49 → Lv1（Lv2境界の直前）', () => {
    const { level, progressRatio } = calcLevel(49)
    expect(level).toBe(1)
    expect(progressRatio).toBeCloseTo(49 / 50)
  })

  it('xp=50 → Lv2', () => {
    const { level, currentLevelFloor, nextLevelXp, progressRatio } = calcLevel(50)
    expect(level).toBe(2)
    expect(currentLevelFloor).toBe(50)
    expect(nextLevelXp).toBe(200)
    expect(progressRatio).toBe(0)
  })

  it('xp=200 → Lv3', () => {
    const { level, currentLevelFloor, nextLevelXp, progressRatio } = calcLevel(200)
    expect(level).toBe(3)
    expect(currentLevelFloor).toBe(200)
    expect(nextLevelXp).toBe(450)
    expect(progressRatio).toBe(0)
  })

  it('Lv内の中間値では progressRatio が 0..1 の範囲に収まる', () => {
    // xp=125 は Lv2 (floor=50, next=200) のちょうど中間
    const { level, progressRatio } = calcLevel(125)
    expect(level).toBe(2)
    expect(progressRatio).toBeCloseTo(0.5)
    expect(progressRatio).toBeGreaterThanOrEqual(0)
    expect(progressRatio).toBeLessThanOrEqual(1)
  })

  it('大きなxpでも progressRatio は 0..1 の範囲に収まる', () => {
    const { progressRatio } = calcLevel(4690) // 毎日投稿+週達成1年相当 ≈ Lv10
    expect(progressRatio).toBeGreaterThanOrEqual(0)
    expect(progressRatio).toBeLessThanOrEqual(1)
  })

  it('負のxpは0として扱う（防御的）', () => {
    const { level, xp, currentLevelFloor } = calcLevel(-10)
    expect(level).toBe(1)
    expect(xp).toBe(0)
    expect(currentLevelFloor).toBe(0)
  })
})

// ─────────────────────────────────────────────────
// buildGameStats / buildStatsById
// ─────────────────────────────────────────────────
describe('buildGameStats', () => {
  it('日次・週次ストリークとXP/レベルを合成する', () => {
    const m = member('Solo')
    const slots: CommitSlot[] = [{ member_id: m.id, day_of_week: 5, hour: 10 }]
    const items: FeedItem[] = [
      // デイリーストリーク用: 今日・昨日・一昨日
      feedItem('2026-06-10T00:30:00.000Z'),
      feedItem('2026-06-09T00:30:00.000Z'),
      feedItem('2026-06-08T00:30:00.000Z'),
      // 週次ゴール用: 金曜スロットの先週・2週前分（達成）
      feedItem('2026-06-05T00:30:00.000Z'),
      feedItem('2026-05-29T00:30:00.000Z'),
    ]

    const stats = buildGameStats(m, items, slots, NOW)

    expect(stats.memberId).toBe(m.id)
    expect(stats.dailyStreak).toBe(3)
    expect(stats.weeklyStreak).toBe(2)
    expect(stats.postCount).toBe(5)
    expect(stats.achievedWeekCount).toBe(2)
    expect(stats.xp).toBe(90) // 5*10 + 2*20
    expect(stats.level).toBe(2)
    expect(stats.currentLevelFloor).toBe(50)
    expect(stats.nextLevelXp).toBe(200)
    expect(stats.progressRatio).toBeCloseTo(40 / 150)
  })

  it('slots が空でも postCount/dailyStreak は計算される', () => {
    const m = member('NoSlots')
    const items: FeedItem[] = [feedItem('2026-06-10T00:30:00.000Z')]
    const stats = buildGameStats(m, items, [], NOW)
    expect(stats.weeklyStreak).toBe(0)
    expect(stats.achievedWeekCount).toBe(0)
    expect(stats.postCount).toBe(1)
    expect(stats.dailyStreak).toBe(1)
    expect(stats.xp).toBe(10)
    expect(stats.level).toBe(1)
  })
})

describe('buildStatsById', () => {
  it('member.id をキーにした統計マップを構築し、メンバーごとにslotsをフィルタする', () => {
    const memberA = member('A')
    const memberB = member('B')

    const slotsA: CommitSlot[] = [{ member_id: memberA.id, day_of_week: 5, hour: 10 }]
    const slotsB: CommitSlot[] = [{ member_id: memberB.id, day_of_week: 1, hour: 9 }]
    const allSlots = [...slotsA, ...slotsB]

    const itemsA: FeedItem[] = [
      feedItem('2026-06-05T00:30:00.000Z'),
      feedItem('2026-05-29T00:30:00.000Z'),
    ]
    const itemsB: FeedItem[] = [] // Bは記事なし

    const results: MemberFeedResult[] = [result(memberA, itemsA), result(memberB, itemsB)]

    const statsById = buildStatsById(results, allSlots, NOW)

    expect(Object.keys(statsById).sort()).toEqual([memberA.id, memberB.id].sort())
    expect(statsById[memberA.id].weeklyStreak).toBe(2)
    expect(statsById[memberA.id].postCount).toBe(2)
    expect(statsById[memberB.id].weeklyStreak).toBe(0)
    expect(statsById[memberB.id].postCount).toBe(0)
  })

  it('results が空なら空オブジェクトを返す', () => {
    expect(buildStatsById([], [], NOW)).toEqual({})
  })
})
