import { ImageResponse } from 'next/og'
import { getMembers } from '@/lib/members'
import { getArticles } from '@/lib/articles'
import { buildOgGrassStrip, OG_GRASS_WEEKS } from '@/lib/ogImageData'

// メンバー専用 1200x630 動的OG画像（草ストリップ + 記事数 + ハンドル + #FF6719）。
// データは安価な Supabase クエリ（getMembers + getArticles）のみ。RSS フェッチ禁止（T-39-03）。

export const alt = 'Substack継続記録のOG画像'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const PRIMARY = '#FF6719'
const EMPTY = '#ebedef'

// count に応じた草の濃淡（getIntensityClass の色感に合わせる。className 不可なので背景色を直接指定）。
function grassColor(count: number): string {
  if (count <= 0) return EMPTY
  if (count === 1) return 'rgba(255,103,25,0.7)' // primary/70 相当
  if (count === 2) return PRIMARY
  return '#e5481f' // 2+（濃いめ・赤系）
}

export default async function MemberOpengraphImage({
  params,
}: {
  params: Promise<{ publicationId: string }>
}) {
  const { publicationId } = await params

  const members = await getMembers()
  const member = members.find((m) => m.publicationId === publicationId)

  // member 未一致でも破綻させない（草ゼロ・ブランドデフォルト寄りの体裁）。
  let articleCount = 0
  let items: { isoDate?: string }[] = []
  if (member) {
    const stored = await getArticles(publicationId)
    items = stored.items
    articleCount = stored.items.length
  }

  const strip = buildOgGrassStrip(items as never, OG_GRASS_WEEKS)
  const handle = member?.substackHandle ?? publicationId
  const name = member?.name ?? ''

  // 草を 7行（曜日）×週 のグリッドに並べる（縦=曜日, 横=週）。
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
