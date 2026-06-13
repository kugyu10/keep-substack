import { ImageResponse } from 'next/og'
import { getMembers } from './members'
import { getArticlesForMembers } from './articles'
import { createSupabaseAdminClient } from './supabase/admin'
import { sortMembersForCommitView } from './commitUtils'
import {
  buildOgWeeklyGrid,
  ogInitial,
  ogTruncateName,
  ogHandle,
  OG_MEMBER_ROWS,
  type OgWeeklyGrid,
} from './ogImageData'
import { loadOgFonts } from './ogFonts'
import type { CommitSlot, MemberFeedResult } from './types'

// 「仲間一覧風」OG画像（top `/` と `/daily`、team フィルタ込み）の共有レンダラ。
// 実データ（CommitGoalView と同じ並び・週次グリッド）を ImageResponse で再現する。
// データは getMembers + getArticlesForMembers + member_commit_slots のみ（RSS 禁止）。

export const OG_SIZE = { width: 1200, height: 630 }

const PRIMARY = '#FF6719'
const ACHIEVED = PRIMARY
const EMPTY = '#e8eaed'
const TEXT = '#1a1a1a'

// avatar フォールバックの背景色（頭文字円）。表示名から決定的に選ぶ。
const AVATAR_BG = ['#FF6719', '#2563eb', '#16a34a', '#9333ea', '#dc2626', '#0891b2']
function avatarBg(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_BG[h % AVATAR_BG.length]
}

type Variant = 'goal' | 'daily'

function brandTitle(variant: Variant, team?: string): string {
  if (team) return team
  return variant === 'daily' ? 'みんなのSubstack更新' : 'コミット&ゴール'
}

/** 週次グリッド（3週 × コミット枠）を縦並びのセル群として描く。 */
function WeeklyGrid({ grid }: { grid: OgWeeklyGrid }) {
  if (grid.slotCount === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', color: '#9aa0a6', fontSize: '24px' }}>
        未コミットメント
      </div>
    )
  }
  const cell = grid.slotCount >= 5 ? 22 : 28
  return (
    <div style={{ display: 'flex', gap: '14px' }}>
      {grid.weeks.map((week, wi) => (
        <div
          key={wi}
          style={{
            display: 'flex',
            gap: '5px',
            padding: '6px',
            borderRadius: '8px',
            background: '#f4f5f7',
          }}
        >
          {week.map((c, ci) => (
            <div
              key={ci}
              style={{
                width: `${cell}px`,
                height: `${cell}px`,
                borderRadius: '5px',
                background: c.achieved ? ACHIEVED : EMPTY,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

function MemberRow({
  name,
  imageUrl,
  grid,
}: {
  name: string
  imageUrl?: string
  grid: OgWeeklyGrid
}) {
  const display = ogTruncateName(name, 10)
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        padding: '14px 0',
        borderBottom: '1px solid #ededed',
      }}
    >
      {/* avatar (img with colored-initial fallback behind it) */}
      <div
        style={{
          display: 'flex',
          width: '64px',
          height: '64px',
          borderRadius: '32px',
          background: avatarBg(name || '?'),
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontSize: '30px',
          fontWeight: 700,
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            width={64}
            height={64}
            style={{ width: '64px', height: '64px', objectFit: 'cover' }}
          />
        ) : (
          ogInitial(name)
        )}
      </div>
      <div
        style={{
          display: 'flex',
          width: '300px',
          fontSize: '32px',
          fontWeight: 700,
          color: TEXT,
          overflow: 'hidden',
        }}
      >
        {display}
      </div>
      <WeeklyGrid grid={grid} />
    </div>
  )
}

/**
 * `/` と `/daily` の OG画像（team 任意）。CommitGoalView 同等の並びで上位
 * OG_MEMBER_ROWS 名を「avatar + 名前 + 週次グリッド」で再現する。
 */
export async function renderMembersGridOg(
  variant: Variant,
  team?: string
): Promise<ImageResponse> {
  const fonts = await loadOgFonts()

  const allMembers = await getMembers()
  const members = team
    ? allMembers.filter((m) => m.teams.some((t) => t.name === team))
    : allMembers.filter((m) => m.teams.every((t) => t.status !== 'hidden'))

  const pubIds = members.map((m) => m.publicationId)
  const feeds = await getArticlesForMembers(pubIds)

  const admin = createSupabaseAdminClient()
  const { data: slotsData } = await admin
    .from('member_commit_slots')
    .select('member_id, day_of_week, hour')
  const slots = (slotsData ?? []) as CommitSlot[]

  const results: MemberFeedResult[] = members.map((m) => {
    const feed = feeds.get(m.publicationId) ?? { items: [] }
    return { member: m, items: feed.items, imageUrl: feed.imageUrl }
  })

  const sorted = sortMembersForCommitView(results, slots).slice(0, OG_MEMBER_ROWS)

  const fontOpts =
    fonts.length > 0
      ? { fontFamily: 'Noto Sans JP' as const }
      : {}

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '56px 64px',
          background: '#ffffff',
          backgroundImage: 'linear-gradient(135deg, #ffffff 0%, #fff4ee 100%)',
          ...fontOpts,
        }}
      >
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', width: '16px', height: '46px', borderRadius: '5px', background: PRIMARY }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: '46px', fontWeight: 700, color: TEXT, lineHeight: 1.1 }}>
              {brandTitle(variant, team)}
            </div>
            <div style={{ display: 'flex', fontSize: '22px', fontWeight: 400, color: PRIMARY, marginTop: '2px' }}>
              Keep Substack
            </div>
          </div>
        </div>

        {/* member rows */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {sorted.length === 0 ? (
            <div style={{ display: 'flex', fontSize: '30px', color: '#9aa0a6', paddingTop: '40px' }}>
              まだメンバーがいません
            </div>
          ) : (
            sorted.map((r) => (
              <MemberRow
                key={r.member.publicationId}
                name={r.member.name}
                imageUrl={r.imageUrl}
                grid={buildOgWeeklyGrid(
                  slots.filter((s) => s.member_id === r.member.id),
                  r.items
                )}
              />
            ))
          )}
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: fonts.length > 0 ? fonts : undefined }
  )
}
