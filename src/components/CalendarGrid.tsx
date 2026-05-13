'use client'

import { useState } from 'react'
import { buildDayGrid } from '@/lib/calendarUtils'
import { getIntensityClass } from '@/lib/heatmapUtils'
import type { HeatmapArticle } from '@/lib/heatmapUtils'
import HeatmapTooltip from '@/components/HeatmapTooltip'

type Props = {
  memberName: string
  articleMap: [string, HeatmapArticle[]][]
  imageUrl?: string
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

export default function CalendarGrid({ memberName, articleMap, imageUrl }: Props) {
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
      <div className="flex items-center gap-2 mb-2">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            width={32}
            height={32}
            className="w-8 h-8 rounded-full object-cover shrink-0"
          />
        ) : (
          <span className="w-8 h-8 rounded-full bg-gray-200 inline-block shrink-0" aria-hidden="true" />
        )}
        <h2 className="text-lg font-semibold">{memberName}</h2>
      </div>

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
          const count = articles.length

          if (count > 0) {
            return (
              <div
                key={day.date}
                style={day.colStart ? { gridColumnStart: day.colStart } : undefined}
              >
                <HeatmapTooltip articles={articles} colorClass={getIntensityClass(count)} imageUrl={imageUrl}>
                  <span className="text-xs font-semibold">{day.date}</span>
                </HeatmapTooltip>
              </div>
            )
          }

          return (
            <div
              key={day.date}
              style={day.colStart ? { gridColumnStart: day.colStart } : undefined}
              className="aspect-square flex items-center justify-center text-sm text-gray-400"
            >
              {day.date}
            </div>
          )
        })}
      </div>
    </div>
  )
}
