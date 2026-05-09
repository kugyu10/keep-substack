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

  return (
    <div className="flex items-center border-b border-gray-100 py-1">
      <Link
        href={`/member/${member.substackId}`}
        className="w-32 shrink-0 truncate text-sm font-semibold pr-2 hover:underline"
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
    </div>
  )
}
