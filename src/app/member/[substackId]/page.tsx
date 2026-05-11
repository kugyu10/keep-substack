import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fetchAllFeedsCached } from '@/lib/fetchFeed'
import { buildHeatmapArticleMap } from '@/lib/heatmapUtils'
import CalendarGrid from '@/components/CalendarGrid'
import { getMembers } from '@/lib/kvMembers'

export default async function MemberPage({
  params,
}: {
  params: Promise<{ substackId: string }>
}) {
  const { substackId } = await params

  const members = await getMembers()
  const results = await fetchAllFeedsCached(members)
  const memberResult = results.find(
    (r) => r.member.substackId === substackId
  )

  if (!memberResult) notFound()

  const map = buildHeatmapArticleMap(memberResult.items)
  const articleMapEntries = Array.from(map.entries())

  return (
    <main className="max-w-[600px] mx-auto p-6 pb-64">
      <Link
        href={memberResult.member.teamId ? `/?team=${memberResult.member.teamId}` : '/'}
        className="text-sm text-gray-500 hover:text-gray-800 mb-4 inline-block"
      >
        ← メンバー一覧
      </Link>
      <CalendarGrid
        memberName={memberResult.member.name}
        articleMap={articleMapEntries}
      />
    </main>
  )
}
