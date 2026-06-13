import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fetchAllFeedsCached } from '@/lib/fetchFeed'
import { buildHeatmapArticleMap } from '@/lib/heatmapUtils'
import CalendarGrid from '@/components/CalendarGrid'
import ShareButton from '@/components/ShareButton'
import { getMembers } from '@/lib/members'
import { parseYmParam, formatYmParam } from '@/lib/shareUrl'
import { SHARE_REQUIRE_LOGIN } from '@/lib/share'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const revalidate = 300

export default async function MemberPage({
  params,
  searchParams,
}: {
  params: Promise<{ publicationId: string }>
  searchParams: Promise<{ ym?: string }>
}) {
  const { publicationId } = await params
  const { ym } = await searchParams
  const { year, month } = parseYmParam(ym)

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const showShare = SHARE_REQUIRE_LOGIN ? !!user : true

  const members = await getMembers()
  const results = await fetchAllFeedsCached(members)
  const memberResult = results.find(
    (r) => r.member.publicationId === publicationId
  )

  if (!memberResult) notFound()

  const map = buildHeatmapArticleMap(memberResult.items)
  const articleMapEntries = Array.from(map.entries())

  return (
    <main className="max-w-[600px] mx-auto p-6">
      <div className="flex items-start justify-between gap-2 mb-4">
        {memberResult.member.teams.length > 0 ? (
          <div className="flex gap-3">
            {memberResult.member.teams.map((t) => (
              <Link
                key={t.name}
                href={`/?team=${encodeURIComponent(t.name)}`}
                className="text-sm text-gray-500 hover:text-gray-800 inline-block"
              >
                ← {t.name}
              </Link>
            ))}
          </div>
        ) : (
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-800 inline-block"
          >
            ← メンバー一覧
          </Link>
        )}
        {showShare && (
          <ShareButton
            view={{
              type: 'member',
              publicationId,
              ym: formatYmParam(year, month),
            }}
          />
        )}
      </div>
      <CalendarGrid
        memberName={memberResult.member.name}
        articleMap={articleMapEntries}
        publicationId={publicationId}
        year={year}
        month={month}
        imageUrl={memberResult.imageUrl}
        substackHandle={memberResult.member.substackHandle ?? undefined}
      />
    </main>
  )
}
