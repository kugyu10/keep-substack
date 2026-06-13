// スクリーンショット型 OG 画像エンドポイント（v1.9）。
//
// フロー:
//   1. クエリ `view`（goal|daily|member）+ member は publicationId を受ける。
//   2. 同一オリジンの描画専用ページ /og-view/<view> をヘッドレス Chromium で開く。
//   3. 1200x630 を撮影し image/png を返す（キャッシュヘッダ付き）。
//   4. 起動/撮影が失敗したら、簡素なブランド PNG（ImageResponse）にフォールバック。
//      → og:image が 500 を返さないことを保証する。
//
// runtime=nodejs（Edge ではヘッドレス Chromium を起動できない）。

import { ImageResponse } from 'next/og'
import { getSiteUrl, isAllowedOgHost } from '@/lib/siteUrl'
import {
  buildOgRenderTargetPath,
  type OgView,
  OG_WIDTH,
  OG_HEIGHT,
} from '@/lib/ogScreenshotUrl'

export const runtime = 'nodejs'
// Chromium のコールドスタート（~4s）+ ページ描画/撮影に余裕を持たせる。
export const maxDuration = 60
// 撮影は高コスト。撮影結果は CDN/ISR で積極的にキャッシュする。
export const revalidate = 300

function isView(v: string | null): v is OgView {
  return v === 'goal' || v === 'daily' || v === 'member'
}

// 失敗時フォールバック: 撮影なしの簡素なブランド画像（500 回避）。
function fallbackImage(): ImageResponse {
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
            background: '#FF6719',
            marginBottom: '40px',
          }}
        />
        <div style={{ display: 'flex', fontSize: '92px', fontWeight: 700, color: '#1a1a1a' }}>
          Keep Substack
        </div>
        <div style={{ display: 'flex', fontSize: '40px', color: '#FF6719', fontWeight: 700, marginTop: '28px' }}>
          Substack継続を草で可視化
        </div>
      </div>
    ),
    { width: OG_WIDTH, height: OG_HEIGHT }
  )
}

export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url)
  const view = searchParams.get('view')
  const publicationId = searchParams.get('publicationId') ?? undefined

  if (!isView(view)) {
    return fallbackImage()
  }
  if (view === 'member' && !publicationId) {
    return fallbackImage()
  }

  // 撮影対象オリジンは「信頼できる」getSiteUrl()（サーバ env 由来）からのみ導出する。
  // リクエストヘッダ（x-forwarded-host / host）は攻撃者が偽装可能なため使わない（SSRF 対策）。
  // VERCEL_URL 由来なので preview デプロイも自分自身を正しく参照できる。
  const siteUrl = getSiteUrl()
  const origin = siteUrl.replace(/\/+$/, '')

  // 解決したホストを許可リストで検証してからブラウザに渡す（万一の動的ホスト汚染を弾く）。
  let targetHost: string
  try {
    targetHost = new URL(origin).hostname
  } catch {
    return fallbackImage()
  }
  if (!isAllowedOgHost(targetHost, siteUrl)) {
    console.error('[api/og] disallowed screenshot host, returning fallback:', targetHost)
    return fallbackImage()
  }

  const targetUrl = `${origin}${buildOgRenderTargetPath(view, { publicationId })}`

  try {
    // screenshot.ts は playwright-core / @sparticuz/chromium に依存するため
    // 動的 import（フォールバック経路では読み込まない）。
    const { screenshotOg } = await import('@/lib/screenshot')
    const png = await screenshotOg(targetUrl)
    return new Response(new Uint8Array(png), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        // CDN で長め、SWR でバックグラウンド更新。
        'Cache-Control':
          'public, max-age=300, s-maxage=300, stale-while-revalidate=86400',
      },
    })
  } catch (err) {
    console.error('[api/og] screenshot failed, returning fallback:', err)
    return fallbackImage()
  }
}
