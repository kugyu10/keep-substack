/**
 * 共有URL（正規の公開URL）ヘルパ。
 * Phase 38（共有ボタン）が参照する正規URL取得規約をここに集約する。
 *
 * - 表示状態を表す公開URLは buildShareUrl 1関数で取得する。
 * - 個人カレンダーの表示月は ?ym=YYYY-MM searchParam で表現する。
 */

/**
 * ?ym=YYYY-MM 値を { year, month } に解釈する。
 * 不正値（域外の月・非数値・ゼロ詰めなし等）や未指定は現在JST年月へフォールバックする。
 *
 * 信頼境界: ym は未ログイン訪問者からの外部入力（信頼できない）。
 * `^(\d{4})-(\d{2})$` にマッチし、かつ year が妥当範囲（YM_MIN_YEAR〜YM_MAX_YEAR）・
 * month が 1〜12 のときのみ採用する（T-37-01 対策, WR-02）。
 * 年域外（例: 0000-06 / 9999-12）はカレンダー復元が破綻するためフォールバックする。
 */
// 妥当な年範囲。本プロジェクトの運用想定に合わせて調整可。
const YM_MIN_YEAR = 2000
const YM_MAX_YEAR = 2100

export function parseYmParam(
  ym: string | undefined | null
): { year: number; month: number } {
  if (typeof ym === 'string') {
    const m = ym.match(/^(\d{4})-(\d{2})$/)
    if (m) {
      const year = parseInt(m[1], 10)
      const month = parseInt(m[2], 10)
      if (
        year >= YM_MIN_YEAR &&
        year <= YM_MAX_YEAR &&
        month >= 1 &&
        month <= 12
      ) {
        return { year, month }
      }
    }
  }
  return currentJstYearMonth()
}

/**
 * { year, month } を "YYYY-MM"（月は2桁ゼロ詰め）に整形する。
 * calendarUtils と同じゼロ詰め規約（String(month).padStart(2,'0')）を使う。
 */
export function formatYmParam(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

export type ShareView =
  | { type: 'goal'; team?: string }
  | { type: 'daily'; team?: string }
  | { type: 'member'; publicationId: string; ym?: string }

/**
 * 対象4ビューの「現在表示中の状態を表す正規の公開URL」（相対パス）を返す。
 * クエリ値・パスセグメントは必ず encodeURIComponent でエンコードする。
 *
 * member の ym は parseYmParam→formatYmParam で正準化してから埋め込む（WR-03）。
 * これにより buildShareUrl の出力は常に parseYmParam で復元可能（ラウンドトリップ対称）。
 * 不正な ym（例: "2026/6"）は域外扱いで現在JST年月へ正準化される。
 */
export function buildShareUrl(view: ShareView): string {
  switch (view.type) {
    case 'goal':
      return view.team ? `/?team=${encodeURIComponent(view.team)}` : '/'
    case 'daily':
      return view.team
        ? `/daily?team=${encodeURIComponent(view.team)}`
        : '/daily'
    case 'member': {
      const base = `/member/${encodeURIComponent(view.publicationId)}`
      if (!view.ym) return base
      const { year, month } = parseYmParam(view.ym)
      const canonicalYm = formatYmParam(year, month)
      return `${base}?ym=${encodeURIComponent(canonicalYm)}`
    }
  }
}

/**
 * 現在のJST（UTC+9）年月を返す。
 * calendarUtils.isoToJSTDateKey と同じ JST 換算規約（Date.now() + 9h の UTC 値）に合わせる。
 */
function currentJstYearMonth(): { year: number; month: number } {
  const jst = new Date(Date.now() + 9 * 60 * 60 * 1000)
  return { year: jst.getUTCFullYear(), month: jst.getUTCMonth() + 1 }
}
