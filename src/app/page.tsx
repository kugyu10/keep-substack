// RESEARCH.md §3「D-06の実現方法」に従い、unstable_cacheがrevalidateを制御するため
// export const revalidate は使わず export const dynamic = 'force-static' を使う
export const dynamic = 'force-static'

import { fetchAllFeedsCached } from '@/lib/fetchFeed'
import members from '@/data/members.json'
import type { Member } from '@/lib/types'

export default async function Home() {
  // members.json の型はJSONインポートのため as でキャスト
  const results = await fetchAllFeedsCached(members as Member[])

  return (
    <main className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Keep Substack</h1>
      {results.map(({ member, items }) => (
        <section key={member.feedUrl} className="mb-8">
          <h2 className="text-xl font-semibold mb-2">{member.name}</h2>
          {items.length === 0 ? (
            <p className="text-gray-500">記事を取得できませんでした</p>
          ) : (
            <ul className="space-y-1">
              {items.map((item, i) => (
                <li key={i} className="flex gap-4">
                  <span className="text-gray-500 text-sm w-32 shrink-0">
                    {item.isoDate
                      ? new Date(item.isoDate).toLocaleDateString('ja-JP')
                      : item.pubDate ?? '日付不明'}
                  </span>
                  <a
                    href={item.link ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm"
                  >
                    {item.title ?? '(タイトルなし)'}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </main>
  )
}
