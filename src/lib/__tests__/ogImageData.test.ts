import { describe, it, expect } from 'vitest'
import {
  buildOgGrassStrip,
  OG_GRASS_WEEKS,
  OG_MEMBER_ROWS,
  ogInitial,
  ogTruncateName,
  ogHandle,
  buildOgWeeklyGrid,
} from '../ogImageData'
import { getWeekDates } from '../commitUtils'
import { isoToJSTDateKey } from '../calendarUtils'
import type { CommitSlot, FeedItem } from '../types'

// JST「今日」を基準にした daysAgo 日前の ISO 文字列を返す。
// 実装は実時刻（Date.now()）基準なので、JST 日付境界付近（00:00–09:00 JST）に
// 実行すると日付キーが揺れうる点に注意（正午オフセット等の固定はしていない）。
function jstTodayIso(daysAgo = 0): string {
  const ms = Date.now() - daysAgo * 24 * 60 * 60 * 1000
  return new Date(ms).toISOString()
}

describe('OG_GRASS_WEEKS', () => {
  it('正の整数（週数）である', () => {
    expect(Number.isInteger(OG_GRASS_WEEKS)).toBe(true)
    expect(OG_GRASS_WEEKS).toBeGreaterThan(0)
  })
})

describe('buildOgGrassStrip', () => {
  it('配列長が weeks×7 になる（デフォルト OG_GRASS_WEEKS）', () => {
    const strip = buildOgGrassStrip([])
    expect(strip).toHaveLength(OG_GRASS_WEEKS * 7)
  })

  it('weeks 引数を指定すると weeks×7 の配列を返す', () => {
    const strip = buildOgGrassStrip([], 4)
    expect(strip).toHaveLength(4 * 7)
  })

  it('古い→新しい順で日付キーが並ぶ（末尾が今日）', () => {
    const strip = buildOgGrassStrip([], 2)
    const keys = strip.map((s) => s.dateKey)
    const sorted = [...keys].sort()
    expect(keys).toEqual(sorted)
    expect(keys[keys.length - 1]).toBe(isoToJSTDateKey(jstTodayIso(0)))
  })

  it('記事のない日は count:0 になる', () => {
    const strip = buildOgGrassStrip([], 2)
    expect(strip.every((s) => s.count === 0)).toBe(true)
  })

  it('同じ日に2記事あると該当日が count:2 になる', () => {
    const todayKey = isoToJSTDateKey(jstTodayIso(0))
    const items: FeedItem[] = [
      { isoDate: jstTodayIso(0) },
      { isoDate: jstTodayIso(0) },
    ]
    const strip = buildOgGrassStrip(items, 2)
    const today = strip.find((s) => s.dateKey === todayKey)
    expect(today?.count).toBe(2)
  })

  it('別々の日に1記事ずつあると各日が count:1 になる', () => {
    const items: FeedItem[] = [
      { isoDate: jstTodayIso(0) },
      { isoDate: jstTodayIso(1) },
    ]
    const strip = buildOgGrassStrip(items, 2)
    const k0 = isoToJSTDateKey(jstTodayIso(0))
    const k1 = isoToJSTDateKey(jstTodayIso(1))
    expect(strip.find((s) => s.dateKey === k0)?.count).toBe(1)
    expect(strip.find((s) => s.dateKey === k1)?.count).toBe(1)
  })

  it('isoDate を持たない item は無視する', () => {
    const items: FeedItem[] = [{ title: 'no date' }, { link: 'x' }]
    const strip = buildOgGrassStrip(items, 2)
    expect(strip.every((s) => s.count === 0)).toBe(true)
  })

  it('範囲外（古すぎる）の記事は集計に含めない', () => {
    const items: FeedItem[] = [{ isoDate: jstTodayIso(365) }]
    const strip = buildOgGrassStrip(items, 2)
    expect(strip.every((s) => s.count === 0)).toBe(true)
  })

  it('未来日の記事は集計に含めない', () => {
    const futureIso = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    const items: FeedItem[] = [{ isoDate: futureIso }]
    const strip = buildOgGrassStrip(items, 2)
    expect(strip.every((s) => s.count === 0)).toBe(true)
  })
})

describe('OG_MEMBER_ROWS', () => {
  it('3〜5 の範囲の正整数', () => {
    expect(Number.isInteger(OG_MEMBER_ROWS)).toBe(true)
    expect(OG_MEMBER_ROWS).toBeGreaterThanOrEqual(3)
    expect(OG_MEMBER_ROWS).toBeLessThanOrEqual(5)
  })
})

describe('ogInitial', () => {
  it('空/空白/undefined は ?', () => {
    expect(ogInitial('')).toBe('?')
    expect(ogInitial('   ')).toBe('?')
    expect(ogInitial(undefined)).toBe('?')
    expect(ogInitial(null)).toBe('?')
  })
  it('英字は大文字の頭文字', () => {
    expect(ogInitial('alice')).toBe('A')
    expect(ogInitial('  bob smith ')).toBe('B')
  })
  it('日本語は先頭1文字', () => {
    expect(ogInitial('田中太郎')).toBe('田')
  })
  it('絵文字（サロゲートペア）も1文字として拾う', () => {
    expect(ogInitial('🔥streak')).toBe('🔥')
  })
})

describe('ogTruncateName', () => {
  it('max 以下はそのまま', () => {
    expect(ogTruncateName('田中', 10)).toBe('田中')
  })
  it('max 超過は末尾を … に', () => {
    expect(ogTruncateName('あいうえおかきくけこさ', 10)).toBe('あいうえおかきくけ…')
  })
  it('空/undefined は空文字', () => {
    expect(ogTruncateName('', 10)).toBe('')
    expect(ogTruncateName(undefined, 10)).toBe('')
  })
  it('絵文字を含んでもコードポイント単位で数える', () => {
    expect(ogTruncateName('🔥🔥🔥', 5)).toBe('🔥🔥🔥')
  })
})

describe('ogHandle', () => {
  it('handle があれば @handle', () => {
    expect(ogHandle('alice', 'pub-1')).toBe('@alice')
  })
  it('handle が空なら publicationId にフォールバック', () => {
    expect(ogHandle('', 'pub-1')).toBe('@pub-1')
    expect(ogHandle(null, 'pub-1')).toBe('@pub-1')
    expect(ogHandle(undefined, 'pub-1')).toBe('@pub-1')
  })
  it('先頭の余分な @ を1つに正規化', () => {
    expect(ogHandle('@@alice', 'pub-1')).toBe('@alice')
    expect(ogHandle('@alice', 'pub-1')).toBe('@alice')
  })
})

describe('buildOgWeeklyGrid', () => {
  const M = 'm-1'
  function slot(day_of_week: number): CommitSlot {
    return { member_id: M, day_of_week, hour: 9 }
  }
  // 今週(offset 0)の指定 day_of_week の ISO 文字列（正午JST相当）を作る
  function isoForThisWeek(dow: number): string {
    const key = getWeekDates(0)[dow - 1]
    return `${key}T03:00:00.000Z` // JST 正午
  }

  it('slots が空なら weeks=[] / slotCount=0', () => {
    const g = buildOgWeeklyGrid([], [])
    expect(g.slotCount).toBe(0)
    expect(g.weeks).toEqual([])
  })

  it('3週ぶん × slot数 の形状になる', () => {
    const g = buildOgWeeklyGrid([slot(1), slot(3)], [])
    expect(g.slotCount).toBe(2)
    expect(g.weeks).toHaveLength(3)
    g.weeks.forEach((w) => expect(w).toHaveLength(2))
  })

  it('記事がなければ全 achieved=false', () => {
    const g = buildOgWeeklyGrid([slot(1)], [])
    expect(g.weeks.every((w) => w.every((c) => !c.achieved))).toBe(true)
  })

  it('今週の slot 曜日に記事があれば achieved=true', () => {
    const items: FeedItem[] = [{ isoDate: isoForThisWeek(2) }] // 火曜
    const g = buildOgWeeklyGrid([slot(2)], items)
    // weeks[2] が今週、その唯一の slot が達成
    expect(g.weeks[2][0].achieved).toBe(true)
    // 2週前/先週は未達成
    expect(g.weeks[0][0].achieved).toBe(false)
    expect(g.weeks[1][0].achieved).toBe(false)
  })

  it('slot は Mon→Sun に整列される', () => {
    const items: FeedItem[] = [{ isoDate: isoForThisWeek(1) }] // 月曜のみ
    const g = buildOgWeeklyGrid([slot(5), slot(1)], items)
    // 整列後 index0=月(達成), index1=金(未達成)
    expect(g.weeks[2][0].achieved).toBe(true)
    expect(g.weeks[2][1].achieved).toBe(false)
  })
})
