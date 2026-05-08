// RESEARCH.md §3「D-06の実現方法」に従い、unstable_cacheがrevalidateを制御するため
// export const revalidate は使わず export const dynamic = 'force-static' を使う
export const dynamic = 'force-static'

import Link from 'next/link'
import { fetchAllFeedsCached } from '@/lib/fetchFeed'
import { buildArticleMap, extractSubstackId } from '@/lib/calendarUtils'
import MiniCalendar from '@/components/MiniCalendar'
import members from '@/data/members.json'
import type { Member } from '@/lib/types'

export default async function Home() {
  const results = await fetchAllFeedsCached(members as Member[])

  return (
    <main className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Keep Substack</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {results.map(({ member, items }) => {
          const substackId = extractSubstackId(member.feedUrl)
          if (!substackId) return null
          const map = buildArticleMap(items)
          const articleMapEntries = Array.from(map.entries())
          return (
            <Link key={member.feedUrl} href={`/member/${substackId}`}>
              <MiniCalendar
                memberName={member.name}
                articleMap={articleMapEntries}
              />
            </Link>
          )
        })}
      </div>
    </main>
  )
}
