import { describe, it, expect } from 'vitest'
import { buildOgGrassStrip, OG_GRASS_WEEKS } from '../ogImageData'
import { isoToJSTDateKey } from '../calendarUtils'
import type { FeedItem } from '../types'

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
