/**
 * ワンボタン共有（Phase 38）の定型文・ハッシュタグ・共有テキスト組み立てを一元管理する。
 *
 * 文面を変えたいときはここの定数 1か所を編集するだけでよい（SHARE-05）。
 * 公開URLの生成は Phase 37 の buildShareUrl に委譲し、ロジックを重複させない。
 */
import { buildShareUrl, type ShareView } from './shareUrl'

export type { ShareView }

/** 共有テキストの定型文（前向きトーン）。文面変更はここ1か所。 */
export const SHARE_TEMPLATE = 'Substack継続を頑張っています📈'

/** 共有テキストに付与するハッシュタグ。 */
export const SHARE_HASHTAG = '#KeepSubstack'

/** クリップボードコピー後に開く Substack Notes コンポーザー。 */
export const SHARE_NOTES_URL = 'https://substack.com/notes'

/**
 * 共有ボタンをログイン済みユーザーのみに見せるか。
 * false にすると全ビューで全員に表示される（全員表示への切替はこの1か所のみ）（SHARE-06）。
 */
export const SHARE_REQUIRE_LOGIN = true

/**
 * 対象ビューの公開URLと共有テキストを組み立てる。
 *
 * - url: buildShareUrl(view) の相対パス。origin が与えられれば絶対URL化する。
 * - text: `${SHARE_TEMPLATE} ${SHARE_HASHTAG}\n${url}`。
 *
 * origin はクライアントで window.location.origin を渡す想定
 * （本番 https://keep-substack.com / dev を正しく反映。ベースURLの env が無いため）。
 * 省略時は相対URLのまま（テスト容易性）。
 */
export function buildShareText({
  view,
  origin,
}: {
  view: ShareView
  origin?: string
}): { url: string; text: string } {
  const relative = buildShareUrl(view)
  const url = origin ? new URL(relative, origin).toString() : relative
  const text = `${SHARE_TEMPLATE} ${SHARE_HASHTAG}\n${url}`
  return { url, text }
}
