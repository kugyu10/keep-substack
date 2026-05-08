'use client'

import { useState } from 'react'
import { buildDayGrid } from '@/lib/calendarUtils'
import ArticleTooltip from '@/components/ArticleTooltip'

type Article = { title?: string; link?: string }

type Props = {
  memberName: string
  articleMap: [string, Article[]][]
  // Map はシリアライズ不可のため Server→Client 渡しは配列で行う
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

export default function CalendarGrid({ memberName, articleMap }: Props) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  function prevMonth() {
    if (month === 1) {
      setYear(year - 1)
      setMonth(12)
    } else {
      setMonth(month - 1)
    }
  }

  function nextMonth() {
    if (month === 12) {
      setYear(year + 1)
      setMonth(1)
    } else {
      setMonth(month + 1)
    }
  }

  const days = buildDayGrid(year, month)
  const map = new Map(articleMap)

  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">{memberName}</h2>

      <div className="flex items-center justify-between mb-3">
        <button
          onClick={prevMonth}
          className="px-2 py-1 text-gray-600 hover:bg-gray-100 rounded"
        >
          ＜
        </button>
        <span className="text-sm font-medium">
          {year}年{month}月
        </span>
        <button
          onClick={nextMonth}
          className="px-2 py-1 text-gray-600 hover:bg-gray-100 rounded"
        >
          ＞
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((wd) => (
          <div
            key={wd}
            className="aspect-square flex items-center justify-center text-xs text-gray-400 font-medium"
          >
            {wd}
          </div>
        ))}

        {days.map((day) => {
          const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day.date).padStart(2, '0')}`
          const articles = map.get(dateKey) ?? []
          if (articles.length > 0) {
            return (
              <ArticleTooltip
                key={day.date}
                date={day.date}
                articles={articles}
                colStart={day.colStart}
              />
            )
          }
          return (
            <div
              key={day.date}
              style={day.colStart ? { gridColumnStart: day.colStart } : undefined}
              className="aspect-square flex items-center justify-center text-sm w-full h-full rounded text-gray-500 hover:bg-gray-100"
            >
              {day.date}
            </div>
          )
        })}
      </div>
    </div>
  )
}
