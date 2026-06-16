// OG スクリーンショット用の描画専用ページ（v1.9）。
//
// 役割: /api/og がヘッドレス Chromium でこのページを開き、1200x630 を撮影する。
//   - ヘッダー/フッター/ナビ/共有ボタンを一切持たない（(main) レイアウト外の
//     トップレベルセグメントなので、root layout.tsx しか継承しない）。
//   - 実ビューのコンポーネント（CommitGoalView / WeeklyHeatmapGrid / CalendarGrid）を
//     そのまま再利用するので、ライブ表示とピクセル等価になる。
//   - 1200x630 の白フレームに収め、スクロールバーを出さない。
//
// noindex（robots）で検索回避。撮影専用なので人間向けではない。

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getMembers } from '@/lib/members'
import { fetchAllFeedsCached } from '@/lib/fetchFeed'
import { getArticles } from '@/lib/articles'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { buildHeatmapArticleMap } from '@/lib/heatmapUtils'
import CommitGoalView from '@/components/CommitGoalView'
import WeeklyHeatmapGrid from '@/components/WeeklyHeatmapGrid'
import CalendarGrid from '@/components/CalendarGrid'
import { parseYmParam } from '@/lib/shareUrl'
import { OG_WIDTH, OG_HEIGHT } from '@/lib/ogScreenshotUrl'
import type { CommitSlot } from '@/lib/types'

export const revalidate = 300

// 撮影専用ページは検索インデックス・SNS 取得の対象にしない。
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

type Params = Promise<{ view: string }>
type Search = Promise<{ publicationId?: string; team?: string }>

// 1200x630 の固定フレーム。内側は実ページと同じ最大幅・余白で実ビューを描く。
// scale で内容をフレームに収め、はみ出し（スクロールバー）を抑える。
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: `${OG_WIDTH}px`,
        height: `${OG_HEIGHT}px`,
        overflow: 'hidden',
        background: '#ffffff',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: '28px 40px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </div>
    </div>
  )
}

// ブランド見出し（撮影フレーム上部）。実ページの ViewTabs/共有ボタン帯の代わりに、
// OG として最低限のブランド表示を置く（共有ボタン等のアプリ chrome は出さない）。
function Brand({ label }: { label: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '14px',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          background: '#FF6719',
          color: '#fff',
          fontWeight: 700,
          fontSize: '20px',
          padding: '4px 14px',
          borderRadius: '999px',
        }}
      >
        Keep Substack
      </span>
      <span style={{ color: '#5a5a5a', fontSize: '18px', fontWeight: 600 }}>
        {label}
      </span>
    </div>
  )
}

async function GoalView() {
  const allMembers = await getMembers()
  const members = allMembers.filter((m) =>
    m.teams.every((t) => t.status !== 'hidden')
  )

  const admin = createSupabaseAdminClient()
  const { data: slotsData } = await admin
    .from('member_commit_slots')
    .select('member_id, day_of_week, hour')

  const results = await fetchAllFeedsCached(members)
  const cutoff = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString()
  const results21 = results.map((r) => ({
    ...r,
    items: r.items.filter((item) => item.isoDate && item.isoDate >= cutoff),
  }))

  return (
    <Frame>
      <Brand label="コミット & ゴール" />
      <div style={{ maxWidth: '960px', flex: 1, overflow: 'hidden' }}>
        <CommitGoalView results={results21} slots={(slotsData ?? []) as CommitSlot[]} />
      </div>
    </Frame>
  )
}

async function DailyView() {
  const allMembers = await getMembers()
  const members = allMembers.filter((m) =>
    m.teams.every((t) => t.status !== 'hidden')
  )
  const results = await fetchAllFeedsCached(members)

  return (
    <Frame>
      <Brand label="みんなのSubstack更新（日次）" />
      <div style={{ maxWidth: '960px', flex: 1, overflow: 'hidden' }}>
        <WeeklyHeatmapGrid results={results} />
      </div>
    </Frame>
  )
}

async function MemberView({ publicationId }: { publicationId?: string }) {
  if (!publicationId) notFound()
  const members = await getMembers()
  const member = members.find((m) => m.publicationId === publicationId)
  if (!member) notFound()

  const results = await fetchAllFeedsCached(members)
  const memberResult = results.find(
    (r) => r.member.publicationId === publicationId
  )
  if (!memberResult) notFound()

  const { year, month } = parseYmParam(undefined)
  const map = buildHeatmapArticleMap(memberResult.items)

  return (
    <Frame>
      <Brand label="Substack継続記録" />
      {/* member カレンダーは正方形寄り。フレーム幅いっぱいに引き伸ばして中央寄せし、
          OG カードとして余白が出すぎないようにする（実コンポーネントはそのまま）。 */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          overflow: 'hidden',
        }}
      >
        <div style={{ width: '820px' }}>
          <CalendarGrid
            memberName={memberResult.member.name}
            articleMap={Array.from(map.entries())}
            publicationId={publicationId}
            year={year}
            month={month}
            imageUrl={memberResult.imageUrl}
            substackHandle={memberResult.member.substackHandle ?? undefined}
          />
        </div>
      </div>
    </Frame>
  )
}

export default async function OgViewPage({
  params,
  searchParams,
}: {
  params: Params
  searchParams: Search
}) {
  const { view } = await params
  const { publicationId } = await searchParams

  if (view === 'goal') return <GoalView />
  if (view === 'daily') return <DailyView />
  if (view === 'member') return <MemberView publicationId={publicationId} />
  notFound()
}
