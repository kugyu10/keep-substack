import { ImageResponse } from 'next/og'
import { getMembers } from '@/lib/members'
import { getArticles } from '@/lib/articles'
import { buildOgGrassStrip, OG_GRASS_WEEKS } from '@/lib/ogImageData'
import type { FeedItem } from '@/lib/types'

// メンバー専用 1200x630 動的OG画像（草ストリップ + 記事数 + ハンドル + #FF6719）。
// データは安価な Supabase クエリ（getMembers + getArticles）のみ。RSS フェッチ禁止（T-39-03）。

export const alt = 'Substack継続記録のOG画像'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// page.tsx の ISR（revalidate = 300）に合わせる。存在しない publicationId を
// 連打されても毎回フルクエリ＋画像合成が走らないようキャッシュさせる（WR-02）。
export const revalidate = 300

const PRIMARY = '#FF6719'
const EMPTY = '#ebedef'

// count に応じた草の濃淡（getIntensityClass の色感に合わせる。className 不可なので背景色を直接指定）。
function grassColor(count: number): string {
  if (count <= 0) return EMPTY
  if (count === 1) return 'rgba(255,103,25,0.7)' // primary/70 相当
  if (count === 2) return PRIMARY
  return '#e5481f' // 2+（濃いめ・赤系）
}

// member 未一致時のフォールバック。サイト共通 OG画像（src/app/opengraph-image.tsx）
// 相当のブランドデフォルトを返す（getArticles / 草合成を呼ばず安価に済ませる。WR-02）。
function renderBrandDefault(): ImageResponse {
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
        }}
      >
        <div
          style={{
            display: 'flex',
            width: '140px',
            height: '14px',
            borderRadius: '7px',
            background: PRIMARY,
            marginBottom: '40px',
          }}
        />
        <div
          style={{
            display: 'flex',
            fontSize: '92px',
            fontWeight: 800,
            color: '#1a1a1a',
            letterSpacing: '-2px',
            lineHeight: 1.05,
          }}
        >
          Keep Substack
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: '40px',
            color: PRIMARY,
            fontWeight: 700,
            marginTop: '28px',
          }}
        >
          Track your Substack streak.
        </div>
      </div>
    ),
    { ...size }
  )
}

export default async function MemberOpengraphImage({
  params,
}: {
  params: Promise<{ publicationId: string }>
}) {
  const { publicationId } = await params

  const members = await getMembers()
  const member = members.find((m) => m.publicationId === publicationId)

  // member 未一致時は getArticles も画像合成もスキップし、ブランドデフォルト相当へ
  // 早期 return（外部入力の任意 publicationId 連打に対する保険。WR-02 / IN-03）。
  if (!member) {
    return renderBrandDefault()
  }

  const stored = await getArticles(publicationId)
  const items: FeedItem[] = stored.items
  const articleCount = items.length

  const strip = buildOgGrassStrip(items, OG_GRASS_WEEKS)
  const handle = member.substackHandle ?? publicationId
  const name = member.name ?? ''

  // 草は「直近 OG_GRASS_WEEKS×7 日」を古い→新しい順に並べたフラットな連続ストリップ。
  // ヒートマップのような曜日整列はしておらず、見た目を 7行×週列のグリッドに切り分けて
  // 表示しているだけ（装飾目的）。データ形状は連続日であることに注意（WR-01）。
  const weeks = OG_GRASS_WEEKS
  const columns: { dateKey: string; count: number }[][] = []
  for (let w = 0; w < weeks; w++) {
    columns.push(strip.slice(w * 7, w * 7 + 7))
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px',
          background: '#ffffff',
          backgroundImage: 'linear-gradient(135deg, #ffffff 0%, #fff4ee 100%)',
        }}
      >
        {/* ヘッダ: ブランド + ハンドル */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <div
              style={{
                display: 'flex',
                width: '20px',
                height: '52px',
                borderRadius: '6px',
                background: PRIMARY,
              }}
            />
            <div
              style={{
                display: 'flex',
                fontSize: '40px',
                fontWeight: 800,
                color: '#1a1a1a',
                letterSpacing: '-1px',
              }}
            >
              Keep Substack
            </div>
          </div>
          {name && (
            <div
              style={{
                display: 'flex',
                fontSize: '56px',
                fontWeight: 800,
                color: '#1a1a1a',
                marginTop: '34px',
                lineHeight: 1.1,
              }}
            >
              {name}
            </div>
          )}
          <div
            style={{
              display: 'flex',
              fontSize: '40px',
              fontWeight: 700,
              color: PRIMARY,
              marginTop: name ? '10px' : '34px',
            }}
          >
            @{handle}
          </div>
        </div>

        {/* 草ストリップ */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '24px' }}>
          {columns.map((col, ci) => (
            <div
              key={ci}
              style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
            >
              {col.map((cell, ri) => (
                <div
                  key={ri}
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    background: grassColor(cell.count),
                  }}
                />
              ))}
            </div>
          ))}
        </div>

        {/* フッタ: 記事数 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '16px',
            marginTop: '24px',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: '96px',
              fontWeight: 900,
              color: PRIMARY,
              lineHeight: 1,
            }}
          >
            {articleCount}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: '40px',
              fontWeight: 700,
              color: '#5a5a5a',
            }}
          >
            articles published
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
