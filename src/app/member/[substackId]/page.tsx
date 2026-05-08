export const dynamic = 'force-static'
export const dynamicParams = false

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fetchAllFeedsCached } from '@/lib/fetchFeed'
import { buildArticleMap, extractSubstackId } from '@/lib/calendarUtils'
import CalendarGrid from '@/components/CalendarGrid'
import members from '@/data/members.json'
import type { Member } from '@/lib/types'

export function generateStaticParams() {
  return (members as Member[])
    .map((m) => extractSubstackId(m.feedUrl))
    .filter((id): id is string => id !== null)
    .map((substackId) => ({ substackId }))
}

export default async function MemberPage({
  params,
}: {
  params: Promise<{ substackId: string }>
}) {
  const { substackId } = await params

  const results = await fetchAllFeedsCached(members as Member[])
  const memberResult = results.find(
    (r) => extractSubstackId(r.member.feedUrl) === substackId
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
