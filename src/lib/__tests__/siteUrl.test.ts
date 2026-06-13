import { describe, it, expect } from 'vitest'
import { resolveSiteUrl, PROD_FALLBACK } from '../siteUrl'

describe('resolveSiteUrl', () => {
  it('env が無いとき本番フォールバックを返す', () => {
    expect(resolveSiteUrl({})).toBe(PROD_FALLBACK)
  })

  it('NEXT_PUBLIC_SITE_URL が最優先（スキーム付きはそのまま）', () => {
    expect(
      resolveSiteUrl({
        NEXT_PUBLIC_SITE_URL: 'https://example.test',
        VERCEL_PROJECT_PRODUCTION_URL: 'keep-substack.com',
        VERCEL_URL: 'preview-abc.vercel.app',
        VERCEL_ENV: 'production',
      })
    ).toBe('https://example.test')
  })

  it('production では本番ドメインを指し、preview ホストを掴まない（BUG3 核心）', () => {
    expect(
      resolveSiteUrl({
        VERCEL_ENV: 'production',
        VERCEL_PROJECT_PRODUCTION_URL: 'keep-substack.com',
        VERCEL_URL: 'keep-substack-xyz.vercel.app',
      })
    ).toBe('https://keep-substack.com')
  })

  it('preview デプロイはそのデプロイ固有ホストを指す（本番旧画像を取得しない）', () => {
    expect(
      resolveSiteUrl({
        VERCEL_ENV: 'preview',
        VERCEL_PROJECT_PRODUCTION_URL: 'keep-substack.com',
        VERCEL_URL: 'keep-substack-git-develop.vercel.app',
      })
    ).toBe('https://keep-substack-git-develop.vercel.app')
  })

  it('スキームなしのホスト名には https:// を補う', () => {
    expect(resolveSiteUrl({ VERCEL_URL: 'foo.vercel.app' })).toBe(
      'https://foo.vercel.app'
    )
  })

  it('末尾スラッシュを除去する', () => {
    expect(
      resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: 'https://example.test/' })
    ).toBe('https://example.test')
  })

  it('production フラグなしでも本番ドメインだけ判れば使う', () => {
    expect(
      resolveSiteUrl({ VERCEL_PROJECT_PRODUCTION_URL: 'keep-substack.com' })
    ).toBe('https://keep-substack.com')
  })
})
