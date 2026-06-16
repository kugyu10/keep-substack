import { describe, it, expect } from 'vitest'
import {
  buildOgRenderTargetPath,
  buildOgImagePath,
  buildOgImageUrl,
  OG_WIDTH,
  OG_HEIGHT,
} from '../ogScreenshotUrl'

describe('ogScreenshotUrl', () => {
  it('OG サイズは 1200x630', () => {
    expect(OG_WIDTH).toBe(1200)
    expect(OG_HEIGHT).toBe(630)
  })

  describe('buildOgRenderTargetPath', () => {
    it('goal は /og-view/goal', () => {
      expect(buildOgRenderTargetPath('goal')).toBe('/og-view/goal')
    })
    it('daily は /og-view/daily', () => {
      expect(buildOgRenderTargetPath('daily')).toBe('/og-view/daily')
    })
    it('member は publicationId を付ける', () => {
      expect(buildOgRenderTargetPath('member', { publicationId: 'foo-bar' })).toBe(
        '/og-view/member?publicationId=foo-bar'
      )
    })
    it('member で publicationId が無いと throw', () => {
      expect(() => buildOgRenderTargetPath('member')).toThrow()
    })
    it('publicationId をURLエンコードする', () => {
      expect(
        buildOgRenderTargetPath('member', { publicationId: 'a b&c' })
      ).toBe('/og-view/member?publicationId=a+b%26c')
    })
  })

  describe('buildOgImagePath', () => {
    it('goal は /api/og?view=goal', () => {
      expect(buildOgImagePath('goal')).toBe('/api/og?view=goal')
    })
    it('member は view と publicationId を付ける', () => {
      expect(buildOgImagePath('member', { publicationId: 'foo' })).toBe(
        '/api/og?view=member&publicationId=foo'
      )
    })
    it('member で publicationId が無いと throw', () => {
      expect(() => buildOgImagePath('member')).toThrow()
    })
  })

  describe('buildOgImageUrl', () => {
    it('origin を前置した絶対URL', () => {
      expect(buildOgImageUrl('https://keep-substack.com', 'goal')).toBe(
        'https://keep-substack.com/api/og?view=goal'
      )
    })
    it('origin 末尾スラッシュを除去', () => {
      expect(buildOgImageUrl('https://example.test/', 'daily')).toBe(
        'https://example.test/api/og?view=daily'
      )
    })
    it('member の絶対URL', () => {
      expect(
        buildOgImageUrl('https://keep-substack.com', 'member', {
          publicationId: 'foo',
        })
      ).toBe('https://keep-substack.com/api/og?view=member&publicationId=foo')
    })
  })
})
