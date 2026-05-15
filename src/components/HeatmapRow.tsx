import Link from 'next/link'
import type { Member } from '@/lib/types'
import type { HeatmapArticle } from '@/lib/heatmapUtils'
import { getIntensityClass } from '@/lib/heatmapUtils'
import HeatmapTooltip from './HeatmapTooltip'

type HeatmapRowProps = {
  member: Member
  articlesByDateEntries: [string, HeatmapArticle[]][]
  dates: string[]
  imageUrl?: string
}

export default function HeatmapRow({ member, articlesByDateEntries, dates, imageUrl }: HeatmapRowProps) {
  const articleMap = new Map(articlesByDateEntries)

  const totalCount = dates.reduce((sum, date) => sum + (articleMap.get(date)?.length ?? 0), 0)

  return (
    <div className="flex items-center border-b border-gray-100 py-1">
      <Link
        href={`/member/${member.substackId}`}
        className="w-16 sm:w-52 shrink-0 pr-2 flex items-center gap-1 overflow-hidden"
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            width={40}
            height={40}
            className="w-10 h-10 rounded-full shrink-0 object-cover"
          />
        ) : (
          <span className="w-10 h-10 rounded-full shrink-0 bg-gray-200 inline-block" aria-hidden="true" />
        )}
        <div className="flex-1 min-w-0 text-xs font-semibold leading-snug underline truncate hidden sm:block">
          {member.name}
        </div>
        <span className="shrink-0 text-gray-400 text-sm" aria-hidden="true">›</span>
      </Link>
      <div className="grid grid-cols-7 gap-1 flex-1">
        {dates.map((date) => {
          const articles = articleMap.get(date) ?? []
          const count = articles.length
          if (count === 0) {
            return <div key={date} className="aspect-square rounded-full border border-dashed border-gray-300" />
          }
          return (
            <HeatmapTooltip
              key={date}
              articles={articles}
              colorClass={getIntensityClass(count)}
              imageUrl={imageUrl}
            >
              {count === 1
                ? <span className="text-xs leading-none opacity-60">1</span>
                : <span className="text-xs font-bold leading-none">{count}</span>
              }
            </HeatmapTooltip>
          )
        })}
      </div>
      <div className="w-10 shrink-0 text-xs text-right text-gray-500 font-semibold pr-1">
        {totalCount > 0 ? totalCount : ''}
      </div>
    </div>
  )
}
