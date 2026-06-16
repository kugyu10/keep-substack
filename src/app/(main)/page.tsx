import type { Metadata } from 'next'
import { getMembers } from '@/lib/members'
import { fetchAllFeedsCached } from '@/lib/fetchFeed'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import CommitGoalView from '@/components/CommitGoalView'
import ShareButton from '@/components/ShareButton'
import ViewTabs from '@/components/ViewTabs'
import { SHARE_REQUIRE_LOGIN } from '@/lib/share'
import { TOP_META } from '@/lib/ogMeta'
import { buildOgImagePath, OG_WIDTH, OG_HEIGHT } from '@/lib/ogScreenshotUrl'
import type { CommitSlot } from '@/lib/types'

export const revalidate = 300

// og:image はスクリーンショット型（/api/og）。metadataBase（= getSiteUrl）で
// 絶対URL化される。team 別 OG は v1.9 では既定/All のみ（後で対応）。
const TOP_OG_IMAGE = {
  url: buildOgImagePath('goal'),
  width: OG_WIDTH,
  height: OG_HEIGHT,
}

export const metadata: Metadata = {
  title: TOP_META.title,
  description: TOP_META.description,
  openGraph: {
    title: TOP_META.title,
    description: TOP_META.description,
    url: '/',
    images: [TOP_OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: TOP_META.title,
    description: TOP_META.description,
    images: [TOP_OG_IMAGE.url],
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
  if (authError) console.error('[Home] auth.getUser error:', authError)
  const showShare = SHARE_REQUIRE_LOGIN ? !!user : true

  const teams = [
    ...new Set(
      allMembers
        .flatMap((m) => m.teams.filter((t) => t.status !== 'hidden').map((t) => t.name))
        .filter(Boolean)
    ),
  ]
  const filteredMembers = team
    ? allMembers.filter((m) =>
        // Team-selected view: include members of the selected team regardless of status
        m.teams.some((t) => t.name === team)
      )
    : allMembers.filter((m) => m.teams.every((t) => t.status !== 'hidden'))

  // Fetch all commit slots for all members (D-05)
  const admin = createSupabaseAdminClient()
  const { data: slotsData, error: slotsError } = await admin
    .from('member_commit_slots')
    .select('member_id, day_of_week, hour')
  if (slotsError) {
    console.error('[Home] member_commit_slots fetch error:', slotsError)
  }

  const results = await fetchAllFeedsCached(filteredMembers)

  // Filter to 21-day window (3 weeks) for CommitGoalView (D-04)
  const cutoff = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString()
  const results21 = results.map((r) => ({
    ...r,
    items: r.items.filter((item) => item.isoDate && item.isoDate >= cutoff),
  }))

  return (
    <main className="max-w-[960px] mx-auto px-4 py-4">
      <div className="flex items-center justify-between gap-2">
        <ViewTabs active="goal" />
        {showShare && <ShareButton view={{ type: 'goal', team }} />}
      </div>

      {teams.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          <a
            href="/"
            className={`px-3 py-1 rounded text-sm border ${
              !team ? 'bg-primary text-white border-primary' : 'bg-white text-[#363737] border-[#ebebeb] hover:bg-[#fafafa] hover:border-[#d8d8d8]'
            }`}
          >
            All
          </a>
          {teams.map((t) => (
            <a
              key={t}
              href={`/?team=${encodeURIComponent(t)}`}
              className={`px-3 py-1 rounded text-sm border ${
                team === t ? 'bg-primary text-white border-primary' : 'bg-white text-[#363737] border-[#ebebeb] hover:bg-[#fafafa] hover:border-[#d8d8d8]'
              }`}
            >
              {t}
            </a>
          ))}
        </div>
      )}

      <CommitGoalView results={results21} slots={(slotsData ?? []) as CommitSlot[]} />
    </main>
  )
}
