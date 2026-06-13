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
import { getSiteUrl } from '@/lib/siteUrl'
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

// このリクエストを処理している自分自身のオリジンを解決する。
//   - x-forwarded-host / x-forwarded-proto（Vercel/プロキシ背後）を最優先。
//   - 無ければ Host ヘッダ + リクエストURLのスキーム。
//   - それも無ければ getSiteUrl()（運用上書き/本番フォールバック）。
function resolveSelfOrigin(req: Request, reqUrl: URL): string {
  const xfHost = req.headers.get('x-forwarded-host')
  const xfProto = req.headers.get('x-forwarded-proto')
  if (xfHost) {
    const proto = (xfProto?.split(',')[0] ?? 'https').trim()
    return `${proto}://${xfHost.split(',')[0].trim()}`
  }
  const host = req.headers.get('host')
  if (host) {
    return `${reqUrl.protocol}//${host}`
  }
  return getSiteUrl()
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

  // 撮影対象は「このリクエストを処理している自分自身のオリジン」の描画専用ページ。
  // これでローカル(localhost)・preview・本番のいずれでも、配信中の自分を撮る
  // （本番の旧ページを掴まない）。リクエストから取れない場合のみ getSiteUrl() に退避。
  const reqUrl = new URL(req.url)
  const origin = resolveSelfOrigin(req, reqUrl).replace(/\/+$/, '')
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
