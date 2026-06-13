import { isoToJSTDateKey } from './calendarUtils'
import type { FeedItem } from './types'

/**
 * OG画像の草ストリップを描く週数（直近 OG_GRASS_WEEKS 週ぶん）。
 */
export const OG_GRASS_WEEKS = 12

/**
 * 直近 weeks×7 日ぶんの JST 日付キー配列（古い→新しい順, 末尾=今日）を返す。
 *
 * heatmapUtils.getRecentDays / calendarUtils.isoToJSTDateKey と同一の JST 規約
 * （Date.now() + 9h を UTC 値として読む）を用い、独自の日付計算は導入しない。
 */
function buildRecentJstDateKeys(days: number): string[] {
  const keys: string[] = []
  const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000)
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(nowJST.getTime() - i * 24 * 60 * 60 * 1000)
    const year = d.getUTCFullYear()
    const month = String(d.getUTCMonth() + 1).padStart(2, '0')
    const day = String(d.getUTCDate()).padStart(2, '0')
    keys.push(`${year}-${month}-${day}`)
  }
  return keys
}

/**
 * 記事 items から OG画像用の草ストリップ（各日の記事数）を整形する純関数。
 *
 * 直近 weeks×7 日について、isoDate を JST 日付キーへ正規化して日別に集計する
 * （buildHeatmapArticleMap と同じ JST 規約）。記事のない日は count:0。
 * 範囲外（古すぎ/未来）・isoDate 無しの item は無視する。
 */
export function buildOgGrassStrip(
  items: FeedItem[],
  weeks: number = OG_GRASS_WEEKS
): { dateKey: string; count: number }[] {
  const dateKeys = buildRecentJstDateKeys(weeks * 7)
  const counts = new Map<string, number>()
  for (const key of dateKeys) counts.set(key, 0)

  for (const item of items) {
    if (!item.isoDate) continue
    const key = isoToJSTDateKey(item.isoDate)
    if (key === null) continue
    if (!counts.has(key)) continue // 範囲外（古すぎ/未来）は除外
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  return dateKeys.map((dateKey) => ({
    dateKey,
    count: counts.get(dateKey) ?? 0,
  }))
}
