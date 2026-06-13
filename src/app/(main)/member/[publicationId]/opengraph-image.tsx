import { ImageResponse } from 'next/og'
import { getMembers } from '@/lib/members'
import { getArticles } from '@/lib/articles'
import {
  buildOgGrassStrip,
  OG_GRASS_WEEKS,
  ogInitial,
  ogTruncateName,
  ogHandle,
} from '@/lib/ogImageData'
import { loadOgFonts } from '@/lib/ogFonts'
import { OG_SIZE } from '@/lib/ogMembersGrid'
import type { FeedItem } from '@/lib/types'

// メンバー専用 1200x630 動的OG画像（本人中心: 大アバター + 名前 + @handle + 草 + 記事数）。
// データは安価な Supabase クエリ（getMembers + getArticles）のみ。RSS フェッチ禁止（T-39-03）。

export const alt = 'Substack継続記録のOG画像'
export const size = OG_SIZE
export const contentType = 'image/png'

// page.tsx の ISR（revalidate = 300）に合わせる。存在しない publicationId を
// 連打されても毎回フルクエリ＋画像合成が走らないようキャッシュさせる（WR-02）。
export const revalidate = 300

const PRIMARY = '#FF6719'
const EMPTY = '#e8eaed'
const TEXT = '#1a1a1a'

const AVATAR_BG = ['#FF6719', '#2563eb', '#16a34a', '#9333ea', '#dc2626', '#0891b2']
function avatarBg(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_BG[h % AVATAR_BG.length]
}

// count に応じた草の濃淡（getIntensityClass の色感に合わせる）。
function grassColor(count: number): string {
  if (count <= 0) return EMPTY
  if (count === 1) return 'rgba(255,103,25,0.7)'
  if (count === 2) return PRIMARY
  return '#e5481f'
}

// member 未一致時のブランドデフォルト（getArticles / 草合成を呼ばず安価に済ませる。WR-02）。
function renderBrandDefault(fonts: Awaited<ReturnType<typeof loadOgFonts>>): ImageResponse {
  const fontFamily = fonts.length > 0 ? 'Noto Sans JP' : undefined
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '90px',
          background: '#ffffff',
          backgroundImage: 'linear-gradient(135deg, #ffffff 0%, #fff4ee 100%)',
          ...(fontFamily ? { fontFamily } : {}),
        }}
      >
        <div style={{ display: 'flex', width: '140px', height: '14px', borderRadius: '7px', background: PRIMARY, marginBottom: '40px' }} />
        <div style={{ display: 'flex', fontSize: '92px', fontWeight: 700, color: TEXT, lineHeight: 1.05 }}>
          Keep Substack
        </div>
        <div style={{ display: 'flex', fontSize: '40px', color: PRIMARY, fontWeight: 700, marginTop: '28px' }}>
          Substack継続を草で可視化
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: fonts.length > 0 ? fonts : undefined }
  )
}

export default async function MemberOpengraphImage({
  params,
}: {
  params: Promise<{ publicationId: string }>
}) {
  const { publicationId } = await params
  const fonts = await loadOgFonts()

  const members = await getMembers()
  const member = members.find((m) => m.publicationId === publicationId)

  if (!member) {
    return renderBrandDefault(fonts)
  }

  const stored = await getArticles(publicationId)
  const items: FeedItem[] = stored.items
  const articleCount = items.length
  const imageUrl = stored.imageUrl

  const strip = buildOgGrassStrip(items, OG_GRASS_WEEKS)
  const handle = ogHandle(member.substackHandle, publicationId)
  const name = ogTruncateName(member.name, 14)

  // 直近の記事カバー画像（自慢用）。items は pub_date 降順なので先頭から最大4枚。
  const recentThumbs = items
    .filter((it) => it.thumbnail)
    .slice(0, 4)
    .map((it) => it.thumbnail as string)

  // 直近 OG_GRASS_WEEKS×7 日を 7行×週列のグリッドへ切り分けて装飾表示（連続日, WR-01）。
  const columns: { dateKey: string; count: number }[][] = []
  for (let w = 0; w < OG_GRASS_WEEKS; w++) {
    columns.push(strip.slice(w * 7, w * 7 + 7))
  }

  const fontFamily = fonts.length > 0 ? 'Noto Sans JP' : undefined

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '48px 64px',
          background: '#ffffff',
          backgroundImage: 'linear-gradient(135deg, #ffffff 0%, #fff4ee 100%)',
          ...(fontFamily ? { fontFamily } : {}),
        }}
      >
        {/* brand strip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: PRIMARY,
            color: '#ffffff',
            fontSize: '26px',
            fontWeight: 700,
            padding: '8px 20px',
            borderRadius: '999px',
            alignSelf: 'flex-start',
          }}
        >
          Keep Substack
        </div>

        {/* identity: avatar + name + handle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
          <div
            style={{
              display: 'flex',
              width: '120px',
              height: '120px',
              borderRadius: '60px',
              background: avatarBg(member.name || publicationId),
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: '56px',
              fontWeight: 700,
              overflow: 'hidden',
              flexShrink: 0,
              border: '4px solid #ffffff',
              boxShadow: '0 0 0 3px #ffd9c6',
            }}
          >
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="" width={120} height={120} style={{ width: '120px', height: '120px', objectFit: 'cover' }} />
            ) : (
              ogInitial(member.name)
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {name && (
              <div style={{ display: 'flex', fontSize: '56px', fontWeight: 700, color: TEXT, lineHeight: 1.1 }}>
                {name}
              </div>
            )}
            <div style={{ display: 'flex', fontSize: '34px', fontWeight: 700, color: PRIMARY, marginTop: name ? '4px' : '0' }}>
              {handle}
            </div>
          </div>
        </div>

        {/* recent article cover thumbnails (自慢) */}
        {recentThumbs.length > 0 && (
          <div style={{ display: 'flex', gap: '18px' }}>
            {recentThumbs.map((src, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  width: '124px',
                  height: '124px',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  border: `3px solid ${PRIMARY}`,
                  background: EMPTY,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" width={124} height={124} style={{ width: '124px', height: '124px', objectFit: 'cover' }} />
              </div>
            ))}
          </div>
        )}

        {/* footer: grass strip + article count on one row */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {columns.map((col, ci) => (
              <div key={ci} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {col.map((cell, ri) => (
                  <div key={ri} style={{ width: '17px', height: '17px', borderRadius: '4px', background: grassColor(cell.count) }} />
                ))}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
            <div style={{ display: 'flex', fontSize: '92px', fontWeight: 700, color: PRIMARY, lineHeight: 1 }}>
              {articleCount}
            </div>
            <div style={{ display: 'flex', fontSize: '34px', fontWeight: 700, color: '#5a5a5a' }}>
              本の継続記録
            </div>
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: fonts.length > 0 ? fonts : undefined }
  )
}
