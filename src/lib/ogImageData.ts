import { isoToJSTDateKey } from './calendarUtils'
import { getWeekDates } from './commitUtils'
import type { CommitSlot, FeedItem } from './types'

/**
 * OG画像の草ストリップを描く週数（直近 OG_GRASS_WEEKS 週ぶん）。
 */
export const OG_GRASS_WEEKS = 12

/**
 * 「仲間一覧風」OG画像に並べるメンバー行の最大数（3〜5行の上限）。
 */
export const OG_MEMBER_ROWS = 5

/**
 * 表示名から avatar フォールバック用の頭文字（1文字）を取り出す純関数。
 * 空/空白のみのときは '?' を返す。先頭の絵文字や結合文字も1コードポイントとして拾う。
 */
export function ogInitial(name: string | null | undefined): string {
  const trimmed = (name ?? '').trim()
  if (!trimmed) return '?'
  // サロゲートペア（絵文字等）を1文字として扱う
  const first = Array.from(trimmed)[0]
  return first.toUpperCase()
}

/**
 * 表示名を OG画像の幅に収まる長さへ丸める純関数（超過時は末尾を「…」に）。
 */
export function ogTruncateName(
  name: string | null | undefined,
  max = 12
): string {
  const trimmed = (name ?? '').trim()
  if (!trimmed) return ''
  const chars = Array.from(trimmed)
  if (chars.length <= max) return trimmed
  return chars.slice(0, max - 1).join('') + '…'
}

/**
 * 表示用 @handle 文字列を生成する純関数。
 * handle が無ければ publicationId を使い、先頭の余分な @ は1つに正規化する。
 */
export function ogHandle(
  handle: string | null | undefined,
  publicationId: string
): string {
  const raw = (handle ?? '').trim() || publicationId
  return '@' + raw.replace(/^@+/, '')
}

/**
 * 1メンバーぶんの「週次コミットグリッド」セル。CommitGoalView と同じ
 * 3週（2週前→先週→今週）×コミット枠の達成可否を表す。
 * achieved: その枠の曜日に記事があったか。
 */
export type OgWeeklyCell = { achieved: boolean }
export type OgWeeklyGrid = { weeks: OgWeeklyCell[][]; slotCount: number }

/**
 * CommitGoalView / CommitGrid と同一ロジックで、メンバーの直近3週ぶんの
 * コミット達成グリッドを組み立てる純関数（OG画像用に bool だけへ簡約）。
 *
 * - slots を Mon→Sun (day_of_week 1→7) に整列
 * - getWeekDates(-2)/(-1)/(0) の各週について、slot 曜日に記事があれば achieved
 * - slots が空のメンバーは weeks=[] / slotCount=0 を返す（呼び出し側でプレースホルダ表示）
 */
export function buildOgWeeklyGrid(
  slots: CommitSlot[],
  items: FeedItem[]
): OgWeeklyGrid {
  const sortedSlots = [...slots].sort((a, b) => a.day_of_week - b.day_of_week)
  if (sortedSlots.length === 0) return { weeks: [], slotCount: 0 }

  // 記事の JST 日付キー集合（存在判定のみ）
  const articleDays = new Set<string>()
  for (const item of items) {
    if (!item.isoDate) continue
    const key = isoToJSTDateKey(item.isoDate)
    if (key) articleDays.add(key)
  }

  const weekOffsets = [-2, -1, 0] // 2週前 → 先週 → 今週
  const weeks = weekOffsets.map((offset) => {
    const weekDates = getWeekDates(offset)
    return sortedSlots.map((slot) => {
      const dateKey = weekDates[slot.day_of_week - 1]
      return { achieved: !!dateKey && articleDays.has(dateKey) }
    })
  })

  return { weeks, slotCount: sortedSlots.length }
}

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
