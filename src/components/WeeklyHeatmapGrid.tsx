import type { MemberFeedResult } from '@/lib/types'
import { buildHeatmapArticleMap } from '@/lib/heatmapUtils'
import HeatmapRow from './HeatmapRow'

type WeeklyHeatmapGridProps = {
  results: MemberFeedResult[]
  dates: string[]
}

export default function WeeklyHeatmapGrid({ results, dates }: WeeklyHeatmapGridProps) {
  return (
    <div>
      <div className="flex mb-1">
        <div className="w-12 sm:w-52 shrink-0" />
        <div className="grid grid-cols-7 gap-1 flex-1">
          {dates.map((d) => {
            const [, m, day] = d.split('-')
            return (
              <div key={d} className="text-xs text-center text-gray-500">
                {`${parseInt(m)}/${parseInt(day)}`}
              </div>
            )
          })}
        </div>
        <div className="w-10 shrink-0 text-xs text-right text-gray-400 pr-1">計</div>
      </div>
      {results.map(({ member, items, imageUrl }) => (
        <HeatmapRow
          key={member.substackId}
          member={member}
          articlesByDateEntries={Array.from(buildHeatmapArticleMap(items).entries())}
          dates={dates}
          imageUrl={imageUrl}
        />
      ))}
    </div>
  )
}
