import { getMembers } from '@/lib/members'
import { fetchAllFeedsCached } from '@/lib/fetchFeed'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import WeeklyHeatmapGrid from '@/components/WeeklyHeatmapGrid'
import ShareButton from '@/components/ShareButton'
import ViewTabs from '@/components/ViewTabs'
import { SHARE_REQUIRE_LOGIN } from '@/lib/share'

export const revalidate = 300

type Props = {
  searchParams: Promise<{ team?: string }>
}

export default async function Home({ searchParams }: Props) {
  const { team } = await searchParams
  const allMembers = await getMembers()

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const showShare = SHARE_REQUIRE_LOGIN ? !!user : true

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
      <div className="flex items-center justify-between gap-2">
        <ViewTabs active="daily" />
        {showShare && <ShareButton view={{ type: 'daily', team }} />}
      </div>

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
