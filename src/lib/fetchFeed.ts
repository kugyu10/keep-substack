import Parser from 'rss-parser'
import { unstable_cache } from 'next/cache'
import type { FeedItem, Member, MemberFeedResult } from './types'

// D-03: タイムアウト5秒（rss-parserの組み込みtimeoutオプション）
const parser = new Parser({
  timeout: 5000,
  customFields: {
    item: [['content:encoded', 'contentEncoded']]
  }
})

const RETRY_DELAY_MS = 1000 // D-01: リトライ前の待機時間
const MAX_ARTICLES = 30     // D-04: 直近30件まで

// D-01: フィード取得失敗時は1秒待ってリトライ、それでもダメなら空配列を返す
async function fetchWithRetry(url: string): Promise<FeedItem[]> {
  try {
    const feed = await parser.parseURL(url)
    return feed.items.slice(0, MAX_ARTICLES) as FeedItem[]
  } catch {
    // 1秒待ってリトライ
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS))
    try {
      const feed = await parser.parseURL(url)
      return feed.items.slice(0, MAX_ARTICLES) as FeedItem[]
    } catch {
      return [] // 非表示（D-01: ダメなら空配列）
    }
  }
}

// D-02: Promise.allSettled で全フィードを並列取得
async function fetchAllFeeds(members: Member[]): Promise<MemberFeedResult[]> {
  const results = await Promise.allSettled(
    members.map((member) =>
      fetchWithRetry(`https://${member.substackId}.substack.com/feed`)
    )
  )
  return members.map((member, i) => ({
    member,
    items: results[i].status === 'fulfilled' ? results[i].value : [],
  }))
}

// D-06: REVALIDATE_SECONDS 環境変数でrevalidateを管理（unstable_cacheを使用）
// export const revalidate はリテラルのみ有効なため unstable_cache でラップする
const REVALIDATE_SECONDS = parseInt(process.env.REVALIDATE_SECONDS ?? '300') // D-05: デフォルト300秒

export const fetchAllFeedsCached = unstable_cache(
  async (members: Member[]) => fetchAllFeeds(members),
  ['all-feeds'],
  { revalidate: REVALIDATE_SECONDS, tags: ['feeds'] }
)
