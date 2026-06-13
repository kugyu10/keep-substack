/**
 * サイトのベースURL解決（BUG3 / OGP 絶対URL対策）。
 *
 * 背景:
 *   layout.tsx の metadataBase をハードコードの本番URL（https://keep-substack.com）に
 *   していたため、preview / develop / ローカル UAT のデプロイでも og:image / og:url の
 *   絶対URLが「本番」を指していた。本番には未マージの旧コードが動いているため、
 *   Substack が preview で貼られたURLに対し本番の古い OG 画像を取得し、
 *   "全然違う OGP" が表示されていた。
 *
 * 方針:
 *   実際にそのデプロイが配信されているオリジンを優先して解決する。
 *   - 明示の NEXT_PUBLIC_SITE_URL があれば最優先（運用での上書き用）。
 *   - 本番Vercel: VERCEL_PROJECT_PRODUCTION_URL（= keep-substack の本番ドメイン）。
 *   - preview/branch デプロイ: VERCEL_URL（そのデプロイ固有のホスト）。
 *     → preview の og:image は preview 自身を指し、本番の旧画像を取得しない。
 *   - どれも無い（ローカル等）: PROD_FALLBACK。
 *
 * Vercel の *_URL 系はスキームなしのホスト名のため https:// を補う。
 */

/** env がすべて欠落したときの最終フォールバック（本番ドメイン）。 */
export const PROD_FALLBACK = 'https://keep-substack.com'

/** スキームなしのホスト名に https:// を補い、末尾スラッシュを除く。 */
function normalizeOrigin(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '')
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

/**
 * テスト容易性のため env を引数で注入できる純関数。
 * 優先順位: NEXT_PUBLIC_SITE_URL > VERCEL_PROJECT_PRODUCTION_URL > VERCEL_URL > PROD_FALLBACK。
 */
export function resolveSiteUrl(
  env: {
    NEXT_PUBLIC_SITE_URL?: string
    VERCEL_PROJECT_PRODUCTION_URL?: string
    VERCEL_URL?: string
    VERCEL_ENV?: string
  } = {}
): string {
  // 1) 明示の上書き（運用優先）
  const explicit = normalizeOrigin(env.NEXT_PUBLIC_SITE_URL ?? '')
  if (explicit) return explicit

  // 2) 本番デプロイは常に本番ドメインへ固定（preview ホストを掴まない）
  if (env.VERCEL_ENV === 'production') {
    const prod = normalizeOrigin(env.VERCEL_PROJECT_PRODUCTION_URL ?? '')
    if (prod) return prod
    return PROD_FALLBACK
  }

  // 3) preview / その他 Vercel デプロイは、そのデプロイ固有のホストを指す
  const deployment = normalizeOrigin(env.VERCEL_URL ?? '')
  if (deployment) return deployment

  // 4) production フラグは無いが本番ドメインだけ判る場合
  const prod = normalizeOrigin(env.VERCEL_PROJECT_PRODUCTION_URL ?? '')
  if (prod) return prod

  // 5) ローカル等
  return PROD_FALLBACK
}

/**
 * 実行時 env から解決したサイトのベースURL。
 * metadataBase / OG 絶対URLの基点に使う。
 */
export function getSiteUrl(): string {
  return resolveSiteUrl({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
    VERCEL_URL: process.env.VERCEL_URL,
    VERCEL_ENV: process.env.VERCEL_ENV,
  })
}
