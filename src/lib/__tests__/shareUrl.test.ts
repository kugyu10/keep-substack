import { describe, it, expect } from 'vitest'
import { parseYmParam, formatYmParam, buildShareUrl } from '../shareUrl'

describe('parseYmParam', () => {
  it('"2026-06" を { year: 2026, month: 6 } にパースする', () => {
    expect(parseYmParam('2026-06')).toEqual({ year: 2026, month: 6 })
  })

  it('"2026-12" を { year: 2026, month: 12 } にパースする', () => {
    expect(parseYmParam('2026-12')).toEqual({ year: 2026, month: 12 })
  })

  it('undefined のとき現在JST年月（正の年・1〜12月）へフォールバックする', () => {
    const r = parseYmParam(undefined)
    expect(r.year).toBeGreaterThan(0)
    expect(r.month).toBeGreaterThanOrEqual(1)
    expect(r.month).toBeLessThanOrEqual(12)
  })

  it('null のとき現在JST年月へフォールバックする', () => {
    const r = parseYmParam(null)
    expect(r.year).toBeGreaterThan(0)
    expect(r.month).toBeGreaterThanOrEqual(1)
    expect(r.month).toBeLessThanOrEqual(12)
  })

  it('空文字のとき現在JST年月へフォールバックする', () => {
    const r = parseYmParam('')
    expect(r.year).toBeGreaterThan(0)
    expect(r.month).toBeGreaterThanOrEqual(1)
    expect(r.month).toBeLessThanOrEqual(12)
  })

  it('月域外 "2026-13" は現在JST年月へフォールバックする', () => {
    const r = parseYmParam('2026-13')
    expect(r.month).toBeGreaterThanOrEqual(1)
    expect(r.month).toBeLessThanOrEqual(12)
    expect(r).not.toEqual({ year: 2026, month: 13 })
  })

  it('月域外 "2026-00" は現在JST年月へフォールバックする', () => {
    const r = parseYmParam('2026-00')
    expect(r.month).toBeGreaterThanOrEqual(1)
    expect(r.month).toBeLessThanOrEqual(12)
  })

  it('非数値 "abc" は現在JST年月へフォールバックする', () => {
    const r = parseYmParam('abc')
    expect(r.year).toBeGreaterThan(0)
    expect(r.month).toBeGreaterThanOrEqual(1)
    expect(r.month).toBeLessThanOrEqual(12)
  })

  it('ゼロ詰めなし "2026-6" は現在JST年月へフォールバックする', () => {
    const r = parseYmParam('2026-6')
    expect(r.month).toBeGreaterThanOrEqual(1)
    expect(r.month).toBeLessThanOrEqual(12)
  })

  it('パストラバーサル "../" を含む値はフォールバックする', () => {
    const r = parseYmParam('../etc')
    expect(r.year).toBeGreaterThan(0)
    expect(r.month).toBeGreaterThanOrEqual(1)
    expect(r.month).toBeLessThanOrEqual(12)
  })

  it('年下限外 "0000-06" は現在JST年月へフォールバックする（WR-02）', () => {
    const r = parseYmParam('0000-06')
    expect(r.year).toBeGreaterThanOrEqual(2000)
    expect(r.year).toBeLessThanOrEqual(2100)
    expect(r).not.toEqual({ year: 0, month: 6 })
  })

  it('年下限外 "1999-06" は現在JST年月へフォールバックする（WR-02）', () => {
    const r = parseYmParam('1999-06')
    expect(r.year).toBeGreaterThanOrEqual(2000)
    expect(r).not.toEqual({ year: 1999, month: 6 })
  })

  it('年上限外 "9999-12" は現在JST年月へフォールバックする（WR-02）', () => {
    const r = parseYmParam('9999-12')
    expect(r.year).toBeLessThanOrEqual(2100)
    expect(r).not.toEqual({ year: 9999, month: 12 })
  })

  it('年下限ちょうど "2000-01" は採用する（WR-02 境界）', () => {
    expect(parseYmParam('2000-01')).toEqual({ year: 2000, month: 1 })
  })

  it('年上限ちょうど "2100-12" は採用する（WR-02 境界）', () => {
    expect(parseYmParam('2100-12')).toEqual({ year: 2100, month: 12 })
  })
})

describe('formatYmParam', () => {
  it('(2026, 6) を "2026-06" にゼロ詰めする', () => {
    expect(formatYmParam(2026, 6)).toBe('2026-06')
  })

  it('(2026, 12) を "2026-12" にする', () => {
    expect(formatYmParam(2026, 12)).toBe('2026-12')
  })

  it('(2026, 1) を "2026-01" にする', () => {
    expect(formatYmParam(2026, 1)).toBe('2026-01')
  })
})

describe('parseYmParam ⇔ formatYmParam ラウンドトリップ', () => {
  it('formatYmParam の出力を parseYmParam が同じ値に戻す', () => {
    const s = formatYmParam(2025, 3)
    expect(parseYmParam(s)).toEqual({ year: 2025, month: 3 })
  })
})

describe('buildShareUrl', () => {
  it('goal（team未指定）で "/" を返す', () => {
    expect(buildShareUrl({ type: 'goal' })).toBe('/')
  })

  it('goal（team="A"）で "/?team=A" を返す', () => {
    expect(buildShareUrl({ type: 'goal', team: 'A' })).toBe('/?team=A')
  })

  it('goal の team はエンコードされる（"a b" → "?team=a%20b"）', () => {
    expect(buildShareUrl({ type: 'goal', team: 'a b' })).toBe('/?team=a%20b')
  })

  it('daily（team未指定）で "/daily" を返す', () => {
    expect(buildShareUrl({ type: 'daily' })).toBe('/daily')
  })

  it('daily（team="A"）で "/daily?team=A" を返す', () => {
    expect(buildShareUrl({ type: 'daily', team: 'A' })).toBe('/daily?team=A')
  })

  it('member（ym未指定）で "/member/uojun" を返す', () => {
    expect(buildShareUrl({ type: 'member', publicationId: 'uojun' })).toBe(
      '/member/uojun'
    )
  })

  it('member（ym="2026-06"）で "/member/uojun?ym=2026-06" を返す', () => {
    expect(
      buildShareUrl({ type: 'member', publicationId: 'uojun', ym: '2026-06' })
    ).toBe('/member/uojun?ym=2026-06')
  })

  it('member の publicationId はエンコードされる', () => {
    expect(
      buildShareUrl({ type: 'member', publicationId: 'a b' })
    ).toBe('/member/a%20b')
  })

  it('member の ym は正準化される（"2026/6" → 現在JST年月へフォールバック, WR-03）', () => {
    const url = buildShareUrl({
      type: 'member',
      publicationId: 'uojun',
      ym: '2026/6',
    })
    // 非正準値はエンコードされず、parseYmParam→formatYmParam で正準形になる
    expect(url).not.toContain('%2F')
    expect(url).toMatch(/^\/member\/uojun\?ym=\d{4}-\d{2}$/)
  })

  it('member の ym 正準形 "2026-06" はそのまま保たれる（WR-03）', () => {
    expect(
      buildShareUrl({ type: 'member', publicationId: 'uojun', ym: '2026-06' })
    ).toBe('/member/uojun?ym=2026-06')
  })

  it('buildShareUrl の出力 ym は parseYmParam で復元できる（ラウンドトリップ対称, WR-03）', () => {
    const url = buildShareUrl({
      type: 'member',
      publicationId: 'uojun',
      ym: '2026-06',
    })
    const ym = url.split('?ym=')[1]
    expect(parseYmParam(ym)).toEqual({ year: 2026, month: 6 })
  })
})
