/**
 * OG メタタグ（og:title / og:description）用の文字列生成ヘルパ（純関数）。
 *
 * ImageResponse のピクセルは単体検証できないため、メタ文字列生成は
 * すべてここに切り出して vitest で検証する（Phase 39, OGP-01）。
 */

const MEMBER_TITLE_SUFFIX = 'のSubstack継続記録 📈'
const MEMBER_TITLE_DEFAULT = 'Substack継続記録 📈'

/**
 * メンバーページの og:title を生成する。
 * name が空/空白のみのときは安全なデフォルトへフォールバックする。
 */
export function buildMemberMetaTitle(name: string): string {
  const trimmed = (name ?? '').trim()
  if (!trimmed) return MEMBER_TITLE_DEFAULT
  return `${trimmed}${MEMBER_TITLE_SUFFIX}`
}

/**
 * メンバーページの og:description（自慢/誘引文）を生成する。
 * articleCount=0 のときは「N本を公開」を避けた誘引文へフォールバックする。
 */
export function buildMemberMetaDescription(
  name: string,
  articleCount: number
): string {
  const trimmed = (name ?? '').trim()
  const subject = trimmed ? `${trimmed}さん` : 'このメンバー'
  if (articleCount <= 0) {
    return `${subject}のSubstack継続の記録。草の記録を見にいこう。`
  }
  return `${subject}のSubstack継続の記録。これまで${articleCount}本を公開。草の記録を見にいこう。`
}

/** top（コミット目標ビュー）用のデフォルト OG コピー。 */
export const TOP_META: { title: string; description: string } = {
  title: 'Keep Substack — Substack継続をみんなで楽しむ 📈',
  description:
    'Substackコミュニティの継続記録を草で可視化。あなたの「続けた証」を共有しよう。',
}

/** daily（日次ヒートマップビュー）用のデフォルト OG コピー。 */
export const DAILY_META: { title: string; description: string } = {
  title: 'Keep Substack — 今日のSubstack更新をチェック 📈',
  description:
    'Substackコミュニティの直近の更新を日次ヒートマップで一望。今日の草を見にいこう。',
}
