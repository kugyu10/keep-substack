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
    members.map(async (member) => {
      const feedUrl = `https://${member.substackId}.substack.com/feed`
      const [liveResult, kvResult] = await Promise.allSettled([
        fetchWithRetry(feedUrl),
        getArticles(member.substackId),
      ])

      const live = liveResult.status === 'fulfilled' ? liveResult.value : { items: [], imageUrl: undefined }
      const kv = kvResult.status === 'fulfilled' ? kvResult.value : { items: [] }

      const imageUrl = live.imageUrl ?? kv.imageUrl

      const seenLinks = new Set<string>()
      const merged: FeedItem[] = []
      for (const item of [...live.items, ...kv.items]) {
        if (item.link && seenLinks.has(item.link)) continue
        if (item.link) seenLinks.add(item.link)
        merged.push(item)
      }

      merged.sort((a, b) => {
        if (!a.isoDate && !b.isoDate) return 0
        if (!a.isoDate) return 1
        if (!b.isoDate) return -1
        return b.isoDate.localeCompare(a.isoDate)
      })

      return { member, items: merged, imageUrl }
    })
  )

  return results.map((result, i) => {
    if (result.status === 'fulfilled') return result.value
    return { member: members[i], items: [], imageUrl: undefined }
  })
}
