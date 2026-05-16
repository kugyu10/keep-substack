'use client'

import { useState } from 'react'
import type { MemberFeedResult } from '@/lib/types'
import { buildHeatmapArticleMap, getRecentDays, sortByWeeklyCount } from '@/lib/heatmapUtils'
import HeatmapRow from './HeatmapRow'

type WeeklyHeatmapGridProps = {
  results: MemberFeedResult[]
}

export default function WeeklyHeatmapGrid({ results }: WeeklyHeatmapGridProps) {
  const [weekOffset, setWeekOffset] = useState(0)
  const dates = getRecentDays(weekOffset)
  const sorted = sortByWeeklyCount(results, dates)

  return (
    <div>
      <div className="flex justify-between items-center mb-1 text-xs text-gray-500">
        <button
          onClick={() => setWeekOffset((w) => w - 1)}
          className="px-2 py-0.5 hover:bg-[#ebebeb] hover:text-[#363737] rounded"
        >
          ＜
        </button>
        <span>
          {dates[0].slice(5).replace('-', '/')} 〜 {dates[6].slice(5).replace('-', '/')}
        </span>
        {weekOffset < 0 ? (
          <button
            onClick={() => setWeekOffset((w) => w + 1)}
            className="px-2 py-0.5 hover:bg-[#ebebeb] hover:text-[#363737] rounded"
          >
            ＞
          </button>
        ) : (
          <span className="px-2 py-0.5 invisible">＞</span>
        )}
      </div>
      <div className="flex mb-1">
        <div className="w-16 sm:w-52 shrink-0" />
        <div className="grid grid-cols-7 gap-1 flex-1">
          {dates.map((d) => {
            const [y, m, day] = d.split('-').map(Number)
            const dow = new Date(y, m - 1, day).getDay()
            const colorClass =
              dow === 6 ? 'text-cyan-600' : dow === 0 ? 'text-orange-500' : 'text-gray-500'
            return (
              <div key={d} className={`text-xs text-center ${colorClass}`}>
                {`${m}/${day}`}
              </div>
            )
          })}
        </div>
        <div className="w-10 shrink-0 text-xs text-right text-gray-400 pr-1">計</div>
      </div>
      {sorted.map(({ member, items, imageUrl }) => (
        <HeatmapRow
          key={member.publicationId}
          member={member}
          articlesByDateEntries={Array.from(buildHeatmapArticleMap(items).entries())}
          dates={dates}
          imageUrl={imageUrl}
        />
      ))}
    </div>
  )
}
