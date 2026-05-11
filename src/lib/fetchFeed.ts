import Parser from 'rss-parser'
import type { FeedItem, Member, MemberFeedResult } from './types'
import { extractThumbnail } from './heatmapUtils'
import { getArticles } from './kvArticles'

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
export async function fetchWithRetry(url: string): Promise<FeedResult> {
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

export async function fetchAllFeedsCached(members: Member[]): Promise<MemberFeedResult[]> {
  const results = await Promise.allSettled(
    members.map((m) => getArticles(m.substackId))
  )
  return members.map((member, i) => {
    const data = results[i].status === 'fulfilled' ? results[i].value : { items: [] }
    return { member, items: data.items, imageUrl: data.imageUrl }
  })
}
