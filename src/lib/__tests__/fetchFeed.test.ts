import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Member, FeedItem } from '../types'

// rss-parser と kvArticles をモック
vi.mock('../kvArticles', () => ({
  getArticles: vi.fn(),
}))

vi.mock('rss-parser', async () => {
  const { vi: viInner } = await import('vitest')
  const parseURL = viInner.fn().mockRejectedValue(new Error('RSS fetch failed'))
  const Parser = viInner.fn(function () {
    return { parseURL }
  })
  // parseURL を Parser に紐付けて外から参照できるようにする
  ;(Parser as unknown as Record<string, unknown>)._parseURL = parseURL
  return { default: Parser }
})

import { getArticles } from '../kvArticles'
import { fetchAllFeedsCached } from '../fetchFeed'
import Parser from 'rss-parser'

const mockGetArticles = vi.mocked(getArticles)
// Parser インスタンスの parseURL を取得
const getMockParseURL = () =>
  ((Parser as unknown as Record<string, unknown>)._parseURL as ReturnType<typeof vi.fn>)

const makeMember = (substackId: string): Member => ({
  name: substackId,
  substackId,
  teamNames: [],
  addedAt: '2025-01-01',
})

const makeItem = (link: string | undefined, isoDate: string): FeedItem => ({
  title: `title-${link}`,
  link,
  isoDate,
})

describe('fetchAllFeedsCached - ハイブリッドフェッチ', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getMockParseURL().mockRejectedValue(new Error('RSS fetch failed'))
  })

  it('ケース1: ライブRSS成功 + KV成功 → マージ・dedupe・isoDate降順で返す', async () => {
    getMockParseURL().mockResolvedValue({
      items: [
        {
          title: 'live-new',
          link: 'https://example.com/new',
          isoDate: '2025-02-01T00:00:00Z',
          contentEncoded: '',
        },
      ],
      image: { url: 'live-img' },
    })
    const kvItems: FeedItem[] = [
      makeItem('https://example.com/new', '2025-02-01T00:00:00Z'), // 重複
      makeItem('https://kv.example/old', '2025-01-01T00:00:00Z'),
    ]
    mockGetArticles.mockResolvedValueOnce({ items: kvItems, imageUrl: 'kv-img' })

    const members = [makeMember('testuser')]
    const results = await fetchAllFeedsCached(members)

    expect(results).toHaveLength(1)
    // dedupe後: 2件（https://example.com/new は1件に、kv-old は残る）
    expect(results[0].items).toHaveLength(2)
    // isoDate降順
    expect(results[0].items[0].isoDate).toBe('2025-02-01T00:00:00Z')
    expect(results[0].items[1].isoDate).toBe('2025-01-01T00:00:00Z')
    // imageUrl はライブRSS優先
    expect(results[0].imageUrl).toBe('live-img')
  })

  it('ケース2: ライブRSS失敗 + KV成功 → KVのみ返す', async () => {
    const kvItems: FeedItem[] = [makeItem('https://kv.example/1', '2025-01-01T00:00:00Z')]
    mockGetArticles.mockResolvedValueOnce({ items: kvItems, imageUrl: 'kv-img' })

    const members = [makeMember('testuser')]
    const results = await fetchAllFeedsCached(members)

    expect(results).toHaveLength(1)
    expect(results[0].items).toHaveLength(1)
    expect(results[0].items[0].link).toBe('https://kv.example/1')
    expect(results[0].imageUrl).toBe('kv-img')
  })

  it('ケース4: 両方失敗 → 空配列を返す', async () => {
    mockGetArticles.mockRejectedValueOnce(new Error('kv error'))

    const members = [makeMember('failuser')]
    const results = await fetchAllFeedsCached(members)

    expect(results).toHaveLength(1)
    expect(results[0].items).toHaveLength(0)
    expect(results[0].imageUrl).toBeUndefined()
  })

  it('ケース5: link が undefined の記事は dedupe されずすべて含まれる', async () => {
    getMockParseURL().mockResolvedValue({
      items: [
        { title: 'live-no-link', link: undefined, isoDate: '2025-02-01T00:00:00Z', contentEncoded: '' },
      ],
      image: undefined,
    })
    const kvItems: FeedItem[] = [
      makeItem(undefined, '2025-01-01T00:00:00Z'),
    ]
    mockGetArticles.mockResolvedValueOnce({ items: kvItems })

    const members = [makeMember('testuser')]
    const results = await fetchAllFeedsCached(members)

    // link が undefined の記事はすべて含まれる（重複除去しない）
    expect(results[0].items).toHaveLength(2)
  })

  it('D-04: シグネチャが (members: Member[]): Promise<MemberFeedResult[]> を維持', async () => {
    mockGetArticles.mockResolvedValueOnce({ items: [] })
    const members = [makeMember('user1')]
    const results = await fetchAllFeedsCached(members)
    expect(Array.isArray(results)).toBe(true)
    expect(results[0]).toHaveProperty('member')
    expect(results[0]).toHaveProperty('items')
  })
})
