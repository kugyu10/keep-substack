import Link from 'next/link'
import type { Member } from '@/lib/types'
import type { HeatmapArticle } from '@/lib/heatmapUtils'
import { getIntensityClass } from '@/lib/heatmapUtils'
import HeatmapTooltip from './HeatmapTooltip'

type HeatmapRowProps = {
  member: Member
  articlesByDateEntries: [string, HeatmapArticle[]][]
  dates: string[]
}

export default function HeatmapRow({ member, articlesByDateEntries, dates }: HeatmapRowProps) {
  const articleMap = new Map(articlesByDateEntries)

  const totalCount = dates.reduce((sum, date) => sum + (articleMap.get(date)?.length ?? 0), 0)

  return (
    <div className="flex items-center border-b border-gray-100 py-1">
      <Link
        href={`/member/${member.substackId}`}
        className="w-32 shrink-0 text-xs font-semibold pr-2 hover:underline leading-snug line-clamp-2"
      >
        {member.name}
      </Link>
      <div className="grid grid-cols-7 gap-1 flex-1">
        {dates.map((date) => {
          const articles = articleMap.get(date) ?? []
          const count = articles.length
          if (count === 0) {
            return <div key={date} className="aspect-square" />
          }
          return (
            <HeatmapTooltip
              key={date}
              articles={articles}
              colorClass={getIntensityClass(count)}
            />
          )
        })}
      </div>
      <div className="w-10 shrink-0 text-xs text-right text-gray-500 font-semibold pr-1">
        {totalCount > 0 ? totalCount : ''}
      </div>
    </div>
  )
}
