import { ImageResponse } from 'next/og'
import { getMembers } from './members'
import { getArticlesForMembers } from './articles'
import { createSupabaseAdminClient } from './supabase/admin'
import {
  sortMembersForCommitView,
  consecutiveWeekStreak,
  isThisWeekComplete,
} from './commitUtils'
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

// グリッドのセル一辺（px）。枠数が多い行は少し小さくして横はみ出しを防ぐ。
function cellSize(slotCount: number): number {
  if (slotCount >= 5) return 38
  if (slotCount >= 3) return 44
  return 50
}

/** 1セル: 達成なら記事カバー画像（無ければオレンジ塗り）、未達成は淡いプレースホルダ。 */
function GridCell({ cell, size }: { cell: { achieved: boolean; thumbnail?: string }; size: number }) {
  const radius = Math.round(size * 0.24)
  if (cell.achieved && cell.thumbnail) {
    return (
      <div
        style={{
          display: 'flex',
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: `${radius}px`,
          overflow: 'hidden',
          background: ACHIEVED,
          border: `2px solid ${PRIMARY}`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cell.thumbnail}
          alt=""
          width={size}
          height={size}
          style={{ width: `${size}px`, height: `${size}px`, objectFit: 'cover' }}
        />
      </div>
    )
  }
  return (
    <div
      style={{
        display: 'flex',
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: `${radius}px`,
        background: cell.achieved ? ACHIEVED : EMPTY,
      }}
    />
  )
}

/** 週次グリッド（3週 × コミット枠）を週ごとのまとまりとして描く。 */
function WeeklyGrid({ grid }: { grid: OgWeeklyGrid }) {
  if (grid.slotCount === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', color: '#9aa0a6', fontSize: '24px' }}>
        未コミットメント
      </div>
    )
  }
  const size = cellSize(grid.slotCount)
  return (
    <div style={{ display: 'flex', gap: '14px' }}>
      {grid.weeks.map((week, wi) => (
        <div
          key={wi}
          style={{
            display: 'flex',
            gap: '6px',
            padding: '8px',
            borderRadius: '12px',
            background: '#f4f5f7',
          }}
        >
          {week.map((c, ci) => (
            <GridCell key={ci} cell={c} size={size} />
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
  streak,
  complete,
}: {
  name: string
  imageUrl?: string
  grid: OgWeeklyGrid
  streak: number
  complete: boolean
}) {
  const display = ogTruncateName(name, 8)
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '22px',
        padding: '11px 0',
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
          border: '3px solid #ffffff',
          boxShadow: '0 0 0 2px #ffd9c6',
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
          flexDirection: 'column',
          width: '280px',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', fontSize: '34px', fontWeight: 700, color: TEXT, lineHeight: 1.1 }}>
          {display}
        </div>
        {(complete || streak >= 2) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', fontSize: '24px' }}>
            {complete && <span style={{ display: 'flex' }}>👑</span>}
            {streak >= 2 && (
              <span style={{ display: 'flex', alignItems: 'center', color: PRIMARY, fontWeight: 700 }}>
                🔥{streak}週連続
              </span>
            )}
          </div>
        )}
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
          padding: '40px 64px',
          background: '#ffffff',
          backgroundImage: 'linear-gradient(135deg, #ffffff 0%, #fff4ee 100%)',
          ...fontOpts,
        }}
      >
        {/* header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
            paddingBottom: '18px',
            borderBottom: `3px solid ${PRIMARY}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <div style={{ display: 'flex', width: '14px', height: '54px', borderRadius: '5px', background: PRIMARY }} />
            <div style={{ display: 'flex', fontSize: '52px', fontWeight: 700, color: TEXT, lineHeight: 1.05 }}>
              {brandTitle(variant, team)}
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: PRIMARY,
              color: '#ffffff',
              fontSize: '24px',
              fontWeight: 700,
              padding: '8px 18px',
              borderRadius: '999px',
            }}
          >
            Keep Substack
          </div>
        </div>

        {/* member rows */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {sorted.length === 0 ? (
            <div style={{ display: 'flex', fontSize: '30px', color: '#9aa0a6', paddingTop: '40px' }}>
              まだメンバーがいません
            </div>
          ) : (
            sorted.map((r) => {
              const memberSlots = slots.filter((s) => s.member_id === r.member.id)
              return (
                <MemberRow
                  key={r.member.publicationId}
                  name={r.member.name}
                  imageUrl={r.imageUrl}
                  grid={buildOgWeeklyGrid(memberSlots, r.items)}
                  streak={consecutiveWeekStreak(memberSlots, r.items)}
                  complete={isThisWeekComplete(memberSlots, r.items)}
                />
              )
            })
          )}
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: fonts.length > 0 ? fonts : undefined }
  )
}
