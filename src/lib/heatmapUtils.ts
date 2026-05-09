import { parseIsoDate } from './calendarUtils'
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
  if (count === 0) return 'bg-gray-100 text-gray-400'
  if (count === 1) return 'bg-green-100 text-green-700'
  if (count === 2) return 'bg-green-200 text-green-800'
  if (count === 3) return 'bg-green-300 text-green-900'
  if (count === 4) return 'bg-green-500 text-white'
  return 'bg-green-700 text-white'
}

export function getRecentDays(): string[] {
  const days: string[] = []
  const now = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
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
    const parsed = parseIsoDate(item.isoDate)
    if (!parsed) continue
    const key = `${parsed.year}-${String(parsed.month).padStart(2, '0')}-${String(parsed.day).padStart(2, '0')}`
    const existing = map.get(key) ?? []
    existing.push({
      title: item.title,
      link: item.link,
      thumbnail: extractThumbnail(item.contentEncoded),
    })
    map.set(key, existing)
  }
  return map
}

function countArticlesInDates(items: FeedItem[], dateSet: Set<string>): number {
  return items.filter((item) => {
    if (!item.isoDate) return false
    const parsed = parseIsoDate(item.isoDate)
    if (!parsed) return false
    const key = `${parsed.year}-${String(parsed.month).padStart(2, '0')}-${String(parsed.day).padStart(2, '0')}`
    return dateSet.has(key)
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
