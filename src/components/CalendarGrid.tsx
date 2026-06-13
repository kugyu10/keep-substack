import Link from 'next/link'
import { buildDayGrid } from '@/lib/calendarUtils'
import { formatYmParam, buildShareUrl } from '@/lib/shareUrl'
import { getIntensityClass } from '@/lib/heatmapUtils'
import type { HeatmapArticle } from '@/lib/heatmapUtils'
import HeatmapTooltip from '@/components/HeatmapTooltip'

type Props = {
  memberName: string
  articleMap: [string, HeatmapArticle[]][]
  publicationId: string
  year: number
  month: number
  imageUrl?: string
  substackHandle?: string
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

export default function CalendarGrid({ memberName, articleMap, publicationId, year, month, imageUrl, substackHandle }: Props) {
  // 表示月は URL(?ym=YYYY-MM) 駆動。月送りは next/link で ym を更新する（client 状態を持たない）。
  const prevYm =
    month === 1 ? formatYmParam(year - 1, 12) : formatYmParam(year, month - 1)
  const nextYm =
    month === 12 ? formatYmParam(year + 1, 1) : formatYmParam(year, month + 1)
  // 公開URL生成は buildShareUrl に一元化（publicationId のエンコード規約を統一, WR-01）。
  const prevHref = buildShareUrl({ type: 'member', publicationId, ym: prevYm })
  const nextHref = buildShareUrl({ type: 'member', publicationId, ym: nextYm })

  const days = buildDayGrid(year, month)
  const map = new Map(articleMap)

  const avatarNameBlock = (
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
  )

  return (
    <div>
      {substackHandle ? (
        <a
          href={'https://substack.com/' + substackHandle}
          target="_blank"
          rel="noopener noreferrer"
          className="block hover:opacity-80"
        >
          {avatarNameBlock}
        </a>
      ) : (
        avatarNameBlock
      )}

      <div className="flex items-center justify-between mb-3">
        <Link
          href={prevHref}
          aria-label="前の月"
          className="px-2 py-1 text-gray-600 hover:bg-gray-100 rounded"
        >
          ＜
        </Link>
        <span className="text-sm font-medium">
          {year}年{month}月
        </span>
        <Link
          href={nextHref}
          aria-label="次の月"
          className="px-2 py-1 text-gray-600 hover:bg-gray-100 rounded"
        >
          ＞
        </Link>
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
          const dateKey = `${formatYmParam(year, month)}-${String(day.date).padStart(2, '0')}`
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
