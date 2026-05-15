import { isoToJSTDateKey } from './calendarUtils'
import type { FeedItem, MemberFeedResult } from './types'

export type HeatmapArticle = {
  title?: string
  link?: string
  thumbnail?: string
}

export function extractThumbnail(contentEncoded?: string): string | undefined {
  if (!contentEncoded) return undefined
  const match = contentEncoded.match(/<img[^>]+src=["']([^"']+)["']/)
  return match ? match[1] : undefined
}

export function getIntensityClass(count: number): string {
  if (count === 1) return 'bg-[#FF623E]/40 text-[#8B2000]'
  if (count === 2) return 'bg-[#FF623E] text-white'
  return 'bg-[#FF623E] text-white [filter:saturate(2)_brightness(1.05)]'
}

export function getRecentDays(weekOffset = 0): string[] {
  const days: string[] = []
  // JST（UTC+9）の現在日時を基準にする
  const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000)
  const offsetMs = weekOffset * 7 * 24 * 60 * 60 * 1000
  for (let i = 6; i >= 0; i--) {
    const d = new Date(nowJST.getTime() + offsetMs - i * 24 * 60 * 60 * 1000)
    const year = d.getUTCFullYear()
    const month = String(d.getUTCMonth() + 1).padStart(2, '0')
    const day = String(d.getUTCDate()).padStart(2, '0')
    days.push(`${year}-${month}-${day}`)
  }
  return days
}

export function buildHeatmapArticleMap(
  items: FeedItem[]
): Map<string, HeatmapArticle[]> {
  const map = new Map<string, HeatmapArticle[]>()
  for (const item of items) {
    if (!item.isoDate) continue
    const key = isoToJSTDateKey(item.isoDate)
    if (!key) continue
    const existing = map.get(key) ?? []
    existing.push({
      title: item.title,
      link: item.link,
      thumbnail: item.thumbnail,
    })
    map.set(key, existing)
  }
  return map
}

function countArticlesInDates(items: FeedItem[], dateSet: Set<string>): number {
  return items.filter((item) => {
    if (!item.isoDate) return false
    const key = isoToJSTDateKey(item.isoDate)
    return key !== null && dateSet.has(key)
  }).length
}

export function sortByWeeklyCount(
  results: MemberFeedResult[],
  dates: string[]
): MemberFeedResult[] {
  const dateSet = new Set(dates)
  return [...results].sort((a, b) => {
    const aCount = countArticlesInDates(a.items, dateSet)
    const bCount = countArticlesInDates(b.items, dateSet)
    if (bCount !== aCount) return bCount - aCount  // 降順
    return a.member.addedAt.localeCompare(b.member.addedAt)  // addedAt昇順
  })
}
