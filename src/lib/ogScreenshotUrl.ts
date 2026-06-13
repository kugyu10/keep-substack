/**
 * スクリーンショット型 OG 画像（v1.9）のURL生成ヘルパ（純関数・テスト容易）。
 *
 * 設計:
 *   1. 各共有ルートの generateMetadata は openGraph.images に
 *      `buildOgImageUrl(...)`（= /api/og?...）を絶対URLで指す。
 *   2. /api/og がヘッドレス Chromium を起動し、`buildOgRenderTargetPath(...)`
 *      （= /og-view/<view>）を同一オリジンで開いて 1200x630 を撮影する。
 *
 * URL を文字列生成に切り出すことで、ImageResponse のピクセル検証不能問題
 * （ogMeta.ts と同じ方針）を避け、ここを vitest で固定する。
 */

export type OgView = 'goal' | 'daily' | 'member'

export const OG_WIDTH = 1200
export const OG_HEIGHT = 630

/**
 * スクリーンショット対象（描画専用ページ）のパスを生成する。
 * 例: goal -> /og-view/goal, member -> /og-view/member?publicationId=foo
 */
export function buildOgRenderTargetPath(
  view: OgView,
  opts: { publicationId?: string } = {}
): string {
  const base = `/og-view/${view}`
  const params = new URLSearchParams()
  if (view === 'member') {
    if (!opts.publicationId) {
      throw new Error('member view requires publicationId')
    }
    params.set('publicationId', opts.publicationId)
  }
  const qs = params.toString()
  return qs ? `${base}?${qs}` : base
}

/**
 * og:image に指す撮影エンドポイント（/api/og）のパスを生成する。
 * /api/og 側は `view`（+ member は publicationId）から
 * buildOgRenderTargetPath を再構築して撮影する。
 */
export function buildOgImagePath(
  view: OgView,
  opts: { publicationId?: string } = {}
): string {
  const params = new URLSearchParams()
  params.set('view', view)
  if (view === 'member') {
    if (!opts.publicationId) {
      throw new Error('member view requires publicationId')
    }
    params.set('publicationId', opts.publicationId)
  }
  return `/api/og?${params.toString()}`
}

/**
 * og:image 用の絶対URL（origin 付き）を生成する。
 * origin は呼び出し側で getSiteUrl() を渡す（末尾スラッシュなしを期待）。
 */
export function buildOgImageUrl(
  origin: string,
  view: OgView,
  opts: { publicationId?: string } = {}
): string {
  const base = origin.replace(/\/+$/, '')
  return `${base}${buildOgImagePath(view, opts)}`
}
