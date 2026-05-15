import { getMembers } from '@/lib/kvMembers'
import { fetchAllFeedsCached } from '@/lib/fetchFeed'
import { HIDDEN_TEAM } from '@/lib/types'
import WeeklyHeatmapGrid from '@/components/WeeklyHeatmapGrid'

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

  return (
    <main className="max-w-[600px] mx-auto px-3 py-4 pb-16">
      <h1 className="text-2xl mb-2" style={{ fontFamily: 'Georgia, serif', fontWeight: 900 }}>Keep Substack</h1>

      {teams.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          <a
            href="/"
            className={`px-3 py-1 rounded text-sm border ${
              !team ? 'bg-primary text-white border-primary' : 'bg-gray-800 text-white border-gray-800 hover:bg-gray-700'
            }`}
          >
            All
          </a>
          {teams.map((t) => (
            <a
              key={t}
              href={`/?team=${encodeURIComponent(t)}`}
              className={`px-3 py-1 rounded text-sm border ${
                team === t ? 'bg-primary text-white border-primary' : 'bg-gray-800 text-white border-gray-800 hover:bg-gray-700'
              }`}
            >
              {t}
            </a>
          ))}
        </div>
      )}

      <WeeklyHeatmapGrid results={results} />
    </main>
  )
}
