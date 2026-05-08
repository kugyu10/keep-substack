export type DayInfo = {
  date: number      // 1-31
  colStart?: number // 月初日のみ: 1（日曜）〜7（土曜）
}

export type ArticleMap = Map<string, { title?: string; link?: string }[]>

/**
 * ISO 8601 の isoDate 文字列をタイムゾーン安全にパースする。
 * new Date() は使わない（タイムゾーン依存バグを防ぐため）。
 */
export function parseIsoDate(
  isoDate: string
): { year: number; month: number; day: number } | null {
  const m = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  return {
    year: parseInt(m[1], 10),
    month: parseInt(m[2], 10),
    day: parseInt(m[3], 10),
  }
}

/**
 * 指定した年月の日付グリッド（DayInfo[]）を返す。
 * 1日目に colStart（曜日オフセット）をセットする。
 */
export function buildDayGrid(year: number, month: number): DayInfo[] {
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay() // 0=日曜
  const lastDate = new Date(year, month, 0).getDate()
  const days: DayInfo[] = []
  for (let date = 1; date <= lastDate; date++) {
    if (date === 1) {
      days.push({ date, colStart: firstDayOfWeek + 1 })
    } else {
      days.push({ date })
    }
  }
  return days
}

/**
 * FeedItem[] から ArticleMap（"YYYY-MM-DD" キー）を構築する。
 * isoDate がない、またはパースできない item はスキップする。
 */
export function buildArticleMap(
  items: { title?: string; link?: string; isoDate?: string }[]
): ArticleMap {
  const map: ArticleMap = new Map()
  for (const item of items) {
    if (!item.isoDate) continue
    const parsed = parseIsoDate(item.isoDate)
    if (!parsed) continue
    const key = `${parsed.year}-${String(parsed.month).padStart(2, '0')}-${String(parsed.day).padStart(2, '0')}`
    const existing = map.get(key) ?? []
    existing.push({ title: item.title, link: item.link })
    map.set(key, existing)
  }
  return map
}

/**
 * SubstackフィードURLからサブドメイン（substackId）を抽出する。
 * 例: "https://uojun.substack.com/feed" -> "uojun"
 * Substack形式でないURLはnullを返す。
 */
export function extractSubstackId(feedUrl: string): string | null {
  const m = feedUrl.match(/^https?:\/\/([^.]+)\.substack\.com/)
  return m ? m[1] : null
}
