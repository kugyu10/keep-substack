import Parser from 'rss-parser'
import { unstable_cache } from 'next/cache'
import type { FeedItem, Member, MemberFeedResult } from './types'
import { extractThumbnail } from './heatmapUtils'

// D-03: タイムアウト5秒（rss-parserの組み込みtimeoutオプション）
const parser = new Parser({
  timeout: 5000,
  customFields: {
    item: [['content:encoded', 'contentEncoded']]
  }
})

const RETRY_DELAY_MS = 1000 // D-01: リトライ前の待機時間

type FeedResult = { items: FeedItem[]; imageUrl?: string }
type RawItem = { title?: string; link?: string; isoDate?: string; contentEncoded?: string }

function toFeedItems(rawItems: RawItem[]): FeedItem[] {
  return rawItems.map((item) => ({
    title: item.title,
    link: item.link,
    isoDate: item.isoDate,
    thumbnail: extractThumbnail(item.contentEncoded),
  }))
}

// D-01: フィード取得失敗時は1秒待ってリトライ、それでもダメなら空配列を返す
async function fetchWithRetry(url: string): Promise<FeedResult> {
  try {
    const feed = await parser.parseURL(url)
    return {
      items: toFeedItems(feed.items as RawItem[]),
      imageUrl: feed.image?.url,
    }
  } catch {
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS))
    try {
      const feed = await parser.parseURL(url)
      return {
        items: toFeedItems(feed.items as RawItem[]),
        imageUrl: feed.image?.url,
      }
    } catch {
      return { items: [] }
    }
  }
}

// D-06: REVALIDATE_SECONDS 環境変数でrevalidateを管理（unstable_cacheを使用）
const REVALIDATE_SECONDS = parseInt(process.env.REVALIDATE_SECONDS ?? '300')

// メンバー単位でキャッシュ（全体一括は2MB上限に抵触するため）
async function fetchMemberFeedCached(member: Member): Promise<FeedResult> {
  const cached = unstable_cache(
    () => fetchWithRetry(`https://${member.substackId}.substack.com/feed`),
    [`feed-${member.substackId}`],
    { revalidate: REVALIDATE_SECONDS, tags: ['feeds'] }
  )
  return cached()
}

export async function fetchAllFeedsCached(members: Member[]): Promise<MemberFeedResult[]> {
  const results = await Promise.allSettled(members.map(fetchMemberFeedCached))
  return members.map((member, i) => {
    const value = results[i].status === 'fulfilled' ? results[i].value : { items: [] }
    return { member, ...value }
  })
}
