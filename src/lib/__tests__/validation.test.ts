import { describe, it, expect } from 'vitest'
import {
  isValidPublicationId,
  parseSubstackHandle,
  PUBLICATION_ID_ERROR,
  SUBSTACK_HANDLE_ERROR,
} from '../validation'

describe('isValidPublicationId (H-1 SSRF 対策)', () => {
  it('小文字英数字・ハイフンを許可する', () => {
    expect(isValidPublicationId('uojun')).toBe(true)
    expect(isValidPublicationId('keep-substack')).toBe(true)
    expect(isValidPublicationId('a1b2c3')).toBe(true)
  })

  it('SSRF を狙う値を拒否する', () => {
    expect(isValidPublicationId('evil.com/')).toBe(false)
    expect(isValidPublicationId('evil.com#')).toBe(false)
    expect(isValidPublicationId('evil.com?')).toBe(false)
    expect(isValidPublicationId('localhost:8080/')).toBe(false)
    expect(isValidPublicationId('169.254.169.254/x')).toBe(false)
    expect(isValidPublicationId('@evil')).toBe(false)
    expect(isValidPublicationId('foo/bar')).toBe(false)
  })

  it('先頭ハイフン・大文字・空・null を拒否する', () => {
    expect(isValidPublicationId('-foo')).toBe(false)
    expect(isValidPublicationId('Foo')).toBe(false)
    expect(isValidPublicationId('')).toBe(false)
    expect(isValidPublicationId(null)).toBe(false)
    expect(isValidPublicationId(undefined)).toBe(false)
  })

  it('63文字超を拒否する', () => {
    expect(isValidPublicationId('a'.repeat(63))).toBe(true)
    expect(isValidPublicationId('a'.repeat(64))).toBe(false)
  })

  it('エラーメッセージが定義されている', () => {
    expect(PUBLICATION_ID_ERROR).toContain('パブリケーションID')
  })
})

describe('parseSubstackHandle', () => {
  it('空・未指定は null を返す', () => {
    expect(parseSubstackHandle('')).toEqual({ ok: true, value: null })
    expect(parseSubstackHandle('   ')).toEqual({ ok: true, value: null })
    expect(parseSubstackHandle(null)).toEqual({ ok: true, value: null })
  })

  it('@ なしを正規化して @ を付与する', () => {
    expect(parseSubstackHandle('hoge')).toEqual({ ok: true, value: '@hoge' })
  })

  it('@ 付きを二重化しない', () => {
    expect(parseSubstackHandle('@hoge')).toEqual({ ok: true, value: '@hoge' })
  })

  it('不正文字（スペース・先頭ハイフン）を拒否する', () => {
    expect(parseSubstackHandle('a b')).toEqual({ ok: false, error: SUBSTACK_HANDLE_ERROR })
    expect(parseSubstackHandle('-handle')).toEqual({ ok: false, error: SUBSTACK_HANDLE_ERROR })
  })
})
