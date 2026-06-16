import type { Metadata } from 'next'
import { getMembers } from '@/lib/members'
import { fetchAllFeedsCached } from '@/lib/fetchFeed'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import WeeklyHeatmapGrid from '@/components/WeeklyHeatmapGrid'
import ShareButton from '@/components/ShareButton'
import ViewTabs from '@/components/ViewTabs'
import { SHARE_REQUIRE_LOGIN } from '@/lib/share'
import { DAILY_META } from '@/lib/ogMeta'
import { buildOgImagePath, OG_WIDTH, OG_HEIGHT } from '@/lib/ogScreenshotUrl'

export const revalidate = 300

// og:image はスクリーンショット型（/api/og）。metadataBase で絶対URL化される。
const DAILY_OG_IMAGE = {
  url: buildOgImagePath('daily'),
  width: OG_WIDTH,
  height: OG_HEIGHT,
}

export const metadata: Metadata = {
  title: DAILY_META.title,
  description: DAILY_META.description,
  openGraph: {
    title: DAILY_META.title,
    description: DAILY_META.description,
    url: '/daily',
    images: [DAILY_OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: DAILY_META.title,
    description: DAILY_META.description,
    images: [DAILY_OG_IMAGE.url],
  },
}

type Props = {
  searchParams: Promise<{ team?: string }>
}

export default async function Home({ searchParams }: Props) {
  const { team } = await searchParams
  const allMembers = await getMembers()

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError) console.error('[Daily] auth.getUser error:', authError)
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
