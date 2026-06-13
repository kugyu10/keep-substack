import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fetchAllFeedsCached } from '@/lib/fetchFeed'
import { getArticles } from '@/lib/articles'
import { buildHeatmapArticleMap } from '@/lib/heatmapUtils'
import CalendarGrid from '@/components/CalendarGrid'
import ShareButton from '@/components/ShareButton'
import { getMembers } from '@/lib/members'
import { parseYmParam, formatYmParam, buildShareUrl } from '@/lib/shareUrl'
import { buildMemberMetaTitle, buildMemberMetaDescription } from '@/lib/ogMeta'
import { SHARE_REQUIRE_LOGIN } from '@/lib/share'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const revalidate = 300

export async function generateMetadata({
  params,
}: {
  params: Promise<{ publicationId: string }>
}): Promise<Metadata> {
  const { publicationId } = await params

  // 安価な Supabase クエリのみ（fetchAllFeedsCached / RSS は使わない）。
  const members = await getMembers()
  const member = members.find((m) => m.publicationId === publicationId)

  // メンバー未一致時はサイトデフォルトに準じた安全な metadata を返す
  // （notFound は page 本体に委ねる）。
  if (!member) {
    return {}
  }

  const { items } = await getArticles(publicationId)
  const articleCount = items.length

  const title = buildMemberMetaTitle(member.name)
  const description = buildMemberMetaDescription(member.name, articleCount)
  const url = buildShareUrl({ type: 'member', publicationId })

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
    },
  }
}

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
    error: authError,
  } = await supabase.auth.getUser()
  if (authError) console.error('[MemberPage] auth.getUser error:', authError)
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
