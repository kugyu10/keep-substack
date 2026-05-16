import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fetchAllFeedsCached } from '@/lib/fetchFeed'
import { buildHeatmapArticleMap } from '@/lib/heatmapUtils'
import CalendarGrid from '@/components/CalendarGrid'
import { getMembers } from '@/lib/members'

export const revalidate = 300

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
      {memberResult.member.teamNames.length > 0 ? (
        <div className="flex gap-3 mb-4">
          {memberResult.member.teamNames.map((t) => (
            <Link
              key={t}
              href={`/?team=${encodeURIComponent(t)}`}
              className="text-sm text-gray-500 hover:text-gray-800 inline-block"
            >
              ← {t}
            </Link>
          ))}
        </div>
      ) : (
        <Link
          href="/"
          className="text-sm text-gray-500 hover:text-gray-800 mb-4 inline-block"
        >
          ← メンバー一覧
        </Link>
      )}
      <CalendarGrid
        memberName={memberResult.member.name}
        articleMap={articleMapEntries}
        imageUrl={memberResult.imageUrl}
      />
    </main>
  )
}
