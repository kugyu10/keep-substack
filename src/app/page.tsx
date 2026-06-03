import { getMembers } from '@/lib/members'
import { fetchAllFeedsCached } from '@/lib/fetchFeed'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import CommitGoalView from '@/components/CommitGoalView'
import PrBanner from '@/components/PrBanner'
import type { CommitSlot } from '@/lib/types'

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
        // Team-selected view: include members of the selected team regardless of status
        m.teams.some((t) => t.name === team)
      )
    : allMembers.filter((m) => m.teams.every((t) => t.status !== 'hidden'))

  // Fetch all commit slots for all members (D-05)
  const admin = createSupabaseAdminClient()
  const { data: slotsData } = await admin
    .from('member_commit_slots')
    .select('member_id, day_of_week, hour')

  const results = await fetchAllFeedsCached(filteredMembers)

  // Filter to 21-day window (3 weeks) for CommitGoalView (D-04)
  const cutoff = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString()
  const results21 = results.map((r) => ({
    ...r,
    items: r.items.filter((item) => item.isoDate && item.isoDate >= cutoff),
  }))

  return (
    <main className="max-w-[600px] mx-auto px-3 py-4">
      <h1 className="text-2xl mb-2" style={{ fontFamily: 'Georgia, serif', fontWeight: 900 }}>Keep Substack</h1>

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
      <PrBanner />
    </main>
  )
}
