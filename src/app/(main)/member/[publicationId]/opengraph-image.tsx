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
          padding: '64px 72px',
          background: '#ffffff',
          backgroundImage: 'linear-gradient(135deg, #ffffff 0%, #fff4ee 100%)',
          ...(fontFamily ? { fontFamily } : {}),
        }}
      >
        {/* brand strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', width: '14px', height: '40px', borderRadius: '5px', background: PRIMARY }} />
          <div style={{ display: 'flex', fontSize: '32px', fontWeight: 700, color: PRIMARY }}>Keep Substack</div>
        </div>

        {/* identity: avatar + name + handle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
          <div
            style={{
              display: 'flex',
              width: '128px',
              height: '128px',
              borderRadius: '64px',
              background: avatarBg(member.name || publicationId),
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: '60px',
              fontWeight: 700,
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="" width={128} height={128} style={{ width: '128px', height: '128px', objectFit: 'cover' }} />
            ) : (
              ogInitial(member.name)
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {name && (
              <div style={{ display: 'flex', fontSize: '58px', fontWeight: 700, color: TEXT, lineHeight: 1.1 }}>
                {name}
              </div>
            )}
            <div style={{ display: 'flex', fontSize: '38px', fontWeight: 700, color: PRIMARY, marginTop: name ? '6px' : '0' }}>
              {handle}
            </div>
          </div>
        </div>

        {/* grass strip */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {columns.map((col, ci) => (
            <div key={ci} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {col.map((cell, ri) => (
                <div key={ri} style={{ width: '36px', height: '36px', borderRadius: '8px', background: grassColor(cell.count) }} />
              ))}
            </div>
          ))}
        </div>

        {/* footer: article count */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
          <div style={{ display: 'flex', fontSize: '88px', fontWeight: 700, color: PRIMARY, lineHeight: 1 }}>
            {articleCount}
          </div>
          <div style={{ display: 'flex', fontSize: '36px', fontWeight: 700, color: '#5a5a5a' }}>
            本の継続記録
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: fonts.length > 0 ? fonts : undefined }
  )
}
