import { getMembers } from '@/lib/members'
import { fetchAllFeedsCached } from '@/lib/fetchFeed'
import WeeklyHeatmapGrid from '@/components/WeeklyHeatmapGrid'

export const revalidate = 300

type Props = {
  params: Promise<{ teamName: string }>
}

export default async function AdminTeamPage({ params }: Props) {
  const { teamName: raw } = await params
  const teamName = decodeURIComponent(raw)

  const allMembers = await getMembers()
  // status 非依存・完全一致のみ（D-06/D-07）。hidden チームも表示する。
  const filtered = allMembers.filter((m) => m.teams.some((t) => t.name === teamName))

  return (
    <main className="max-w-[600px] mx-auto px-3 py-4">
      <a href="/admin" className="text-sm text-blue-600 hover:underline block mb-4">
        ← 管理画面へ
      </a>
      <h1 className="text-2xl mb-2" style={{ fontFamily: 'Georgia, serif', fontWeight: 900 }}>
        {teamName}
      </h1>

      {filtered.length === 0 ? (
        // DB未存在もメンバー0人も同一扱い（D-01/D-02）。200 でメッセージを返す。
        <p className="text-sm text-gray-500">該当するチームのメンバーがいません</p>
      ) : (
        <WeeklyHeatmapGrid results={await fetchAllFeedsCached(filtered)} />
      )}
    </main>
  )
}
