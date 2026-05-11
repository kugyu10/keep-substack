import { redis } from './redis'
import type { FeedItem } from './types'

type StoredFeed = { items: FeedItem[]; imageUrl?: string }

// D-01: KVキー = articles:{substackId}
export async function getArticles(substackId: string): Promise<StoredFeed> {
  const data = await redis.get<StoredFeed>(`articles:${substackId}`)
  return data ?? { items: [] }
}

// D-05: article.link URL でdedupe。既存KVに同じlinkがあればスキップ
// imageUrl は毎回最新値で上書きする（アイコンURLが変わった場合に追従）
export async function saveArticles(
  substackId: string,
  newItems: FeedItem[],
  imageUrl?: string
): Promise<void> {
  const existing = await getArticles(substackId)
  const existingLinks = new Set(existing.items.map((a) => a.link))
  const toAdd = newItems.filter((item) => item.link && !existingLinks.has(item.link))
  await redis.set(`articles:${substackId}`, {
    items: [...existing.items, ...toAdd],
    imageUrl: imageUrl ?? existing.imageUrl,
  })
}
