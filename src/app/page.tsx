import Link from 'next/link'
import { getMembers } from '@/lib/kvMembers'
import { fetchAllFeedsCached } from '@/lib/fetchFeed'
import { buildArticleMap } from '@/lib/calendarUtils'
import MiniCalendar from '@/components/MiniCalendar'

export default async function Home() {
  const members = await getMembers()
  const results = await fetchAllFeedsCached(members)

  return (
    <main className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Keep Substack</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {results.map(({ member, items }) => {
          const map = buildArticleMap(items)
          const articleMapEntries = Array.from(map.entries())
          return (
            <Link key={member.substackId} href={`/member/${member.substackId}`}>
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
