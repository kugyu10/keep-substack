import { describe, it, expect } from 'vitest'
import {
  buildShareText,
  SHARE_TEMPLATE,
  SHARE_HASHTAG,
  SHARE_NOTES_URL,
  SHARE_REQUIRE_LOGIN,
} from '../share'

describe('buildShareText', () => {
  it('定型文＋ハッシュタグ＋URL を組み立てる（相対URL, origin なし）', () => {
    const { url, text } = buildShareText({ view: { type: 'goal' } })
    expect(url).toBe('/')
    expect(text).toBe(`${SHARE_TEMPLATE} ${SHARE_HASHTAG}\n/`)
  })

  it('origin が与えられれば絶対URL化する', () => {
    const { url, text } = buildShareText({
      view: { type: 'daily' },
      origin: 'https://keep-substack.com',
    })
    expect(url).toBe('https://keep-substack.com/daily')
    expect(text).toBe(
      `${SHARE_TEMPLATE} ${SHARE_HASHTAG}\nhttps://keep-substack.com/daily`
    )
  })

  it('goal+team の URL を正しく埋める', () => {
    const { url } = buildShareText({
      view: { type: 'goal', team: 'チームA' },
      origin: 'https://keep-substack.com',
    })
    expect(url).toBe(
      `https://keep-substack.com/?team=${encodeURIComponent('チームA')}`
    )
  })

  it('daily+team の URL を正しく埋める', () => {
    const { url } = buildShareText({
      view: { type: 'daily', team: 'teamB' },
      origin: 'https://keep-substack.com',
    })
    expect(url).toBe('https://keep-substack.com/daily?team=teamB')
  })

  it('member+ym の URL を正しく埋める', () => {
    const { url } = buildShareText({
      view: { type: 'member', publicationId: 'pub-123', ym: '2026-06' },
      origin: 'https://keep-substack.com',
    })
    expect(url).toBe('https://keep-substack.com/member/pub-123?ym=2026-06')
  })
})

describe('共有定数', () => {
  it('Notes コンポーザーURLは substack.com/notes', () => {
    expect(SHARE_NOTES_URL).toBe('https://substack.com/notes')
  })

  it('既定はログインゲート（SHARE-06）', () => {
    expect(SHARE_REQUIRE_LOGIN).toBe(true)
  })

  it('ハッシュタグが定型文に含まれる組み立てになっている', () => {
    const { text } = buildShareText({ view: { type: 'goal' } })
    expect(text).toContain(SHARE_HASHTAG)
    expect(text).toContain(SHARE_TEMPLATE)
  })
})
