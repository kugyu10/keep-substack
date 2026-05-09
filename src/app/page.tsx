import { getMembers } from '@/lib/kvMembers'
import { fetchAllFeedsCached } from '@/lib/fetchFeed'
import { getRecentDays, sortByWeeklyCount } from '@/lib/heatmapUtils'
import WeeklyHeatmapGrid from '@/components/WeeklyHeatmapGrid'

export default async function Home() {
  const members = await getMembers()
  const results = await fetchAllFeedsCached(members)
  const dates = getRecentDays()
  const sorted = sortByWeeklyCount(results, dates)

  return (
    <main className="max-w-[600px] mx-auto p-6 pb-64">
      <h1 className="text-2xl font-semibold mb-6">Keep Substack</h1>
      <WeeklyHeatmapGrid results={sorted} dates={dates} />
    </main>
  )
}
