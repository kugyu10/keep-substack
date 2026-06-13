import { describe, it, expect } from 'vitest'
import {
  buildMemberMetaTitle,
  buildMemberMetaDescription,
  TOP_META,
  DAILY_META,
} from '../ogMeta'

describe('buildMemberMetaTitle', () => {
  it('既知 name から「{name}のSubstack継続記録 📈」を生成する', () => {
    expect(buildMemberMetaTitle('うおじゅん')).toBe('うおじゅんのSubstack継続記録 📈')
  })

  it('空文字 name のとき安全なデフォルトを返す', () => {
    expect(buildMemberMetaTitle('')).toBe('Substack継続記録 📈')
  })

  it('空白のみの name のとき安全なデフォルトを返す', () => {
    expect(buildMemberMetaTitle('   ')).toBe('Substack継続記録 📈')
  })
})

describe('buildMemberMetaDescription', () => {
  it('既知 name と記事数から自慢/誘引文を生成する', () => {
    const desc = buildMemberMetaDescription('うおじゅん', 42)
    expect(desc).toContain('うおじゅん')
    expect(desc).toContain('42')
  })

  it('articleCount=0 のときも破綻しない文面を返す', () => {
    const desc = buildMemberMetaDescription('うおじゅん', 0)
    expect(typeof desc).toBe('string')
    expect(desc.length).toBeGreaterThan(0)
    // 「0本を公開」のような不自然な文にならないこと
    expect(desc).not.toContain('0本')
  })

  it('複数記事のとき本数を文面に含める', () => {
    const desc = buildMemberMetaDescription('うおじゅん', 5)
    expect(desc).toContain('5本')
  })

  it('空 name のときもデフォルト主語で破綻しない', () => {
    const desc = buildMemberMetaDescription('', 3)
    expect(typeof desc).toBe('string')
    expect(desc.length).toBeGreaterThan(0)
    expect(desc).toContain('3本')
  })
})

describe('TOP_META / DAILY_META', () => {
  it('TOP_META は title/description を持つ', () => {
    expect(typeof TOP_META.title).toBe('string')
    expect(TOP_META.title.length).toBeGreaterThan(0)
    expect(typeof TOP_META.description).toBe('string')
    expect(TOP_META.description.length).toBeGreaterThan(0)
  })

  it('DAILY_META は title/description を持つ', () => {
    expect(typeof DAILY_META.title).toBe('string')
    expect(DAILY_META.title.length).toBeGreaterThan(0)
    expect(typeof DAILY_META.description).toBe('string')
    expect(DAILY_META.description.length).toBeGreaterThan(0)
  })
})
