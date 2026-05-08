// RESEARCH.md §3「D-06の実現方法」に従い、unstable_cacheがrevalidateを制御するため
// export const revalidate は使わず export const dynamic = 'force-static' を使う
export const dynamic = 'force-static'

import { fetchAllFeedsCached } from '@/lib/fetchFeed'
import { buildArticleMap } from '@/lib/calendarUtils'
import CalendarGrid from '@/components/CalendarGrid'
import members from '@/data/members.json'
import type { Member } from '@/lib/types'

export default async function Home() {
  // members.json の型はJSONインポートのため as でキャスト
  const results = await fetchAllFeedsCached(members as Member[])

  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Keep Substack</h1>
      {results.map(({ member, items }) => {
        const map = buildArticleMap(items)
        const articleMapEntries = Array.from(map.entries())
        return (
          <div key={member.feedUrl} className="mb-10">
            <CalendarGrid
              memberName={member.name}
              articleMap={articleMapEntries}
            />
          </div>
        )
      })}
    </main>
  )
}
