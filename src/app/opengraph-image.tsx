import { ImageResponse } from 'next/og'

// サイト共通ブランドデフォルト OG画像（top / daily のフォールバック）。
// KISS: ルート個別の opengraph-image は作らず、この共通画像で OGP-02 を充足する。

export const alt = 'Keep Substack — Substackの継続を草で可視化'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const PRIMARY = '#FF6719'

export default async function OpengraphImage() {
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
          backgroundImage: `linear-gradient(135deg, #ffffff 0%, #fff4ee 100%)`,
        }}
      >
        {/* アクセントバー */}
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
        {/* 草ストリップ風の装飾（ブランドの視覚的記号） */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            marginTop: '56px',
          }}
        >
          {Array.from({ length: 14 }).map((_, i) => (
            <div
              key={i}
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '10px',
                background:
                  i % 4 === 0
                    ? '#ebedef'
                    : i % 4 === 1
                      ? 'rgba(255,103,25,0.45)'
                      : i % 4 === 2
                        ? 'rgba(255,103,25,0.75)'
                        : PRIMARY,
              }}
            />
          ))}
        </div>
      </div>
    ),
    { ...size }
  )
}
