import { describe, it, expect } from 'vitest'
import { resolveSiteUrl, PROD_FALLBACK, isAllowedOgHost } from '../siteUrl'

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

describe('isAllowedOgHost (SSRF 防御)', () => {
  it('本番ドメインを許可する', () => {
    expect(isAllowedOgHost('keep-substack.com')).toBe(true)
    expect(isAllowedOgHost('www.keep-substack.com')).toBe(true)
  })

  it('localhost / 127.0.0.1 を許可する（dev）', () => {
    expect(isAllowedOgHost('localhost')).toBe(true)
    expect(isAllowedOgHost('127.0.0.1')).toBe(true)
  })

  it('getSiteUrl 由来の正規デプロイ host を許可する（preview 自己参照）', () => {
    const site = 'https://keep-substack-git-develop.vercel.app'
    expect(
      isAllowedOgHost('keep-substack-git-develop.vercel.app', site)
    ).toBe(true)
  })

  it('許可リスト外の任意ホストを拒否する（SSRF 核心）', () => {
    expect(isAllowedOgHost('evil.example.com')).toBe(false)
    expect(
      isAllowedOgHost('attacker.internal', 'https://keep-substack.com')
    ).toBe(false)
  })

  it('内部/ループバック/RFC1918/リンクローカルを拒否する', () => {
    expect(isAllowedOgHost('169.254.169.254')).toBe(false) // メタデータ
    expect(isAllowedOgHost('10.0.0.5')).toBe(false)
    expect(isAllowedOgHost('172.16.0.1')).toBe(false)
    expect(isAllowedOgHost('192.168.1.1')).toBe(false)
    expect(isAllowedOgHost('0.0.0.0')).toBe(false)
  })

  it('空文字を拒否する', () => {
    expect(isAllowedOgHost('')).toBe(false)
  })
})
