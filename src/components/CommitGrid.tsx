// Server Component — do NOT add 'use client'
import { getWeekDates, matchArticleToSlot } from '@/lib/commitUtils'
import { isoToJSTDateKey } from '@/lib/calendarUtils'
import type { CommitSlot, FeedItem } from '@/lib/types'

type CommitGridProps = {
  slots: CommitSlot[]
  items: FeedItem[]
}

// Day-of-week label mapping (ISO 8601: 1=Mon … 7=Sun, D-03)
const DAY_NAMES: Record<number, string> = {
  1: '月',
  2: '火',
  3: '水',
  4: '木',
  5: '金',
  6: '土',
  7: '日',
}

// Static grid-cols class map — NEVER use dynamic `grid-cols-${n}` (Pitfall 2)
// Covers all valid day_of_week values (1–7): a member can commit any day of the week.
const COLS_CLASS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
  7: 'grid-cols-7',
}

export default function CommitGrid({ slots, items }: CommitGridProps) {
  // Build articleDateMap: Map<string, FeedItem[]> keyed by JST date key
  const articleDateMap = new Map<string, FeedItem[]>()
  for (const item of items) {
    if (!item.isoDate) continue
    const key = isoToJSTDateKey(item.isoDate)
    if (!key) continue
    const existing = articleDateMap.get(key)
    if (existing) {
      existing.push(item)
    } else {
      articleDateMap.set(key, [item])
    }
  }

  const colsClass = COLS_CLASS[slots.length] ?? 'grid-cols-1'

  // Compute week dates for 3 weeks: -2 (oldest), -1 (middle), 0 (current)
  const week0Dates = getWeekDates(-2) // oldest
  const week1Dates = getWeekDates(-1) // middle
  const week2Dates = getWeekDates(0)  // current (most recent)

  function renderCells(weekDates: string[]) {
    return slots.map((slot, idx) => {
      const article = matchArticleToSlot(slot, weekDates, articleDateMap)
      if (article && article.thumbnail && article.link) {
        return (
          <a
            key={idx}
            href={article.link}
            target="_blank"
            rel="noreferrer"
            className="aspect-square rounded overflow-hidden block"
          >
            <img
              src={article.thumbnail}
              alt=""
              className="object-cover w-full h-full"
            />
          </a>
        )
      }
      if (article && article.thumbnail) {
        // Thumbnail exists but no link — render non-linking image cell
        return (
          <div
            key={idx}
            className="aspect-square rounded overflow-hidden block"
          >
            <img
              src={article.thumbnail}
              alt=""
              className="object-cover w-full h-full"
            />
          </div>
        )
      }
      return (
        <div
          key={idx}
          className="aspect-square flex items-center justify-center rounded border border-dashed border-gray-300"
        >
          <span className="text-xs text-gray-400">{DAY_NAMES[slot.day_of_week]}</span>
        </div>
      )
    })
  }

  return (
    <div className="flex flex-1 gap-2">
      {/* Week 0 (2週前): hidden on mobile */}
      <div className="hidden sm:flex flex-1 bg-gray-50 rounded-md p-1">
        <div className={`grid gap-1 ${colsClass} w-full`}>
          {renderCells(week0Dates)}
        </div>
      </div>
      {/* Week 1 (先週): hidden on mobile */}
      <div className="hidden sm:flex flex-1 bg-gray-50 rounded-md p-1">
        <div className={`grid gap-1 ${colsClass} w-full`}>
          {renderCells(week1Dates)}
        </div>
      </div>
      {/* Week 2 (今週): always visible */}
      <div className="flex flex-1 bg-gray-50 rounded-md p-1">
        <div className={`grid gap-1 ${colsClass} w-full`}>
          {renderCells(week2Dates)}
        </div>
      </div>
    </div>
  )
}
