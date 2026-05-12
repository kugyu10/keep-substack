import { getMembers } from '@/lib/kvMembers'
import { fetchAllFeedsCached } from '@/lib/fetchFeed'
import { getRecentDays, sortByWeeklyCount } from '@/lib/heatmapUtils'
import { HIDDEN_TEAM } from '@/lib/types'
import WeeklyHeatmapGrid from '@/components/WeeklyHeatmapGrid'
import topLogo from '@/data/top_logo.png'

export const revalidate = 300

type Props = {
  searchParams: Promise<{ team?: string }>
}

export default async function Home({ searchParams }: Props) {
  const { team } = await searchParams
  const allMembers = await getMembers()

  const teams = [...new Set(allMembers.flatMap((m) => m.teamNames).filter(Boolean))].filter(
    (t) => t !== HIDDEN_TEAM
  )
  const filteredMembers = team
    ? allMembers.filter((m) => m.teamNames.includes(team))
    : allMembers.filter((m) => !m.teamNames.includes(HIDDEN_TEAM))

  const results = await fetchAllFeedsCached(filteredMembers)
  const dates = getRecentDays()
  const sorted = sortByWeeklyCount(results, dates)

  return (
    <main className="max-w-[600px] mx-auto p-6 pb-64">
      <h1 className="text-2xl font-semibold mb-4">Keep Substack</h1>

      {teams.length > 0 && (
        <div className="flex gap-2 mb-6 flex-wrap">
          <a
            href="/"
            className={`px-3 py-1 rounded text-sm border ${
              !team ? 'bg-gray-800 text-white border-gray-800' : 'text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            All
          </a>
          {teams.map((t) => (
            <a
              key={t}
              href={`/?team=${encodeURIComponent(t)}`}
              className={`px-3 py-1 rounded text-sm border ${
                team === t ? 'bg-gray-800 text-white border-gray-800' : 'text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {t}
            </a>
          ))}
        </div>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={topLogo.src} alt="Keep Substack" className="w-full h-auto object-contain mb-8 rounded" />

      <WeeklyHeatmapGrid results={sorted} dates={dates} />
    </main>
  )
}
