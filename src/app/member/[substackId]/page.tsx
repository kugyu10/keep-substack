import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fetchAllFeedsCached } from '@/lib/fetchFeed'
import { buildArticleMap } from '@/lib/calendarUtils'
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

  const map = buildArticleMap(memberResult.items)
  const articleMapEntries = Array.from(map.entries())

  return (
    <main className="max-w-2xl mx-auto p-6">
      <Link
        href="/"
        className="text-sm text-gray-500 hover:text-gray-800 mb-4 inline-block"
      >
        ← ダッシュボードに戻る
      </Link>
      <CalendarGrid
        memberName={memberResult.member.name}
        articleMap={articleMapEntries}
      />
    </main>
  )
}
