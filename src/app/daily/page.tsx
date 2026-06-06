import { getMembers } from '@/lib/members'
import { fetchAllFeedsCached } from '@/lib/fetchFeed'
import WeeklyHeatmapGrid from '@/components/WeeklyHeatmapGrid'
import ViewTabs from '@/components/ViewTabs'

export const revalidate = 300

type Props = {
  searchParams: Promise<{ team?: string }>
}

export default async function Home({ searchParams }: Props) {
  const { team } = await searchParams
  const allMembers = await getMembers()

  const teams = [
    ...new Set(
      allMembers
        .flatMap((m) => m.teams.filter((t) => t.status === 'public').map((t) => t.name))
        .filter(Boolean)
    ),
  ]
  const filteredMembers = team
    ? allMembers.filter((m) =>
        m.teams.some((t) => t.name === team && t.status !== 'hidden')
      )
    : allMembers.filter((m) => m.teams.every((t) => t.status !== 'hidden'))

  const results = await fetchAllFeedsCached(filteredMembers)

  return (
    <main className="max-w-[600px] mx-auto px-3 py-4">
      <h1 className="text-2xl mb-4" style={{ fontFamily: 'Georgia, serif', fontWeight: 900 }}>Keep Substack</h1>

      <ViewTabs active="daily" />

      {teams.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          <a
            href="/daily"
            className={`px-3 py-1 rounded text-sm border ${
              !team ? 'bg-primary text-white border-primary' : 'bg-white text-[#363737] border-[#ebebeb] hover:bg-[#fafafa] hover:border-[#d8d8d8]'
            }`}
          >
            All
          </a>
          {teams.map((t) => (
            <a
              key={t}
              href={`/daily?team=${encodeURIComponent(t)}`}
              className={`px-3 py-1 rounded text-sm border ${
                team === t ? 'bg-primary text-white border-primary' : 'bg-white text-[#363737] border-[#ebebeb] hover:bg-[#fafafa] hover:border-[#d8d8d8]'
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
