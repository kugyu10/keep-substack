import { buildDayGrid } from '@/lib/calendarUtils'

type Article = { title?: string; link?: string }

type Props = {
  memberName: string
  articleMap: [string, Article[]][]
}

export default function MiniCalendar({ memberName, articleMap }: Props) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const days = buildDayGrid(year, month)
  const map = new Map(articleMap)

  return (
    <div className="border rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer">
      <p className="text-sm font-semibold mb-2 truncate">{memberName}</p>
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day) => {
          const key = `${year}-${String(month).padStart(2, '0')}-${String(day.date).padStart(2, '0')}`
          const count = (map.get(key) ?? []).length
          const intensity =
            count === 0 ? 'bg-gray-100 text-gray-400'
            : count === 1 ? 'bg-green-200 text-green-800'
            : count === 2 ? 'bg-green-400 text-white'
            : 'bg-green-600 text-white'
          return (
            <div
              key={day.date}
              style={day.colStart ? { gridColumnStart: day.colStart } : undefined}
              className={`aspect-square rounded-sm text-xs flex items-center justify-center ${intensity}`}
            >
              {day.date}
            </div>
          )
        })}
      </div>
    </div>
  )
}
