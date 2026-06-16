'use client'

/**
 * ワンボタン共有（Phase 38 / v1.9）。
 *
 * Substack には Note 本文を URL 等でプリフィルする API が無いため、ユーザーは
 * 必ず手動で貼り付ける必要がある。
 *
 * フロー（v1.9 最終版 — コピー → 案内表示 → 約3秒後に同一タブで Substack へ遷移）:
 *  1. クリックで共有テキストをクリップボードへコピー（貼り付け用）
 *  2. はっきり見えるインライン案内を表示
 *     「コピーしました！ノートに貼り付けるだけでシェアできます」
 *     「まもなくSubstackへ移動します…」
 *  3. 約3000ms 後に window.location.assign で同一タブで Substack Notes へ遷移
 *     （setTimeout 内の window.open はポップアップブロックされるため使わない）
 *  4. コピー失敗時は遷移せず、手動コピー用の読み取り専用テキストと
 *     「Substackへ移動」ボタンを表示（グレースフルデグラデーション）
 *
 * 再利用可能なコンポーネント。配置は各ビューで <ShareButton view={...} /> の1行を置くだけ（SHARE-01）。
 */
import { useEffect, useRef, useState } from 'react'
import { buildShareText, SHARE_NOTES_URL, type ShareView } from '@/lib/share'

/** 共有ボタンの既定キャプション（BUG1）。文面変更はこの1か所。 */
export const SHARE_BUTTON_LABEL = '継続をシェア'

/** コピー成功後、Substack へ自動遷移するまでのミリ秒。 */
export const SHARE_NAVIGATE_DELAY_MS = 3000

/** コピー成功時の案内（主文）。 */
export const SHARE_SUCCESS_MESSAGE =
  'コピーしました！ノートに貼り付けるだけでシェアできます'
/** コピー成功時の案内（副文）。 */
export const SHARE_SUCCESS_SUBMESSAGE = 'まもなくSubstackへ移動します…'
/** コピー失敗時の案内。 */
export const SHARE_FAILURE_MESSAGE =
  'コピーできませんでした。下のテキストを手動でコピーしてください'

type ShareStatus =
  | { kind: 'idle' }
  | { kind: 'success' }
  | { kind: 'failure'; text: string }

type ShareButtonProps = {
  view: ShareView
  className?: string
  /** ボタンのキャプション。省略時は SHARE_BUTTON_LABEL（「継続をシェア」）。 */
  label?: string
}

export default function ShareButton({
  view,
  className,
  label = SHARE_BUTTON_LABEL,
}: ShareButtonProps) {
  const [status, setStatus] = useState<ShareStatus>({ kind: 'idle' })

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // アンマウント時にタイマーを掃除（遷移がアンマウント後に発火しないように）
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  // ボタンクリック: コピー → 案内 → 約3秒後に同一タブで Substack へ遷移
  async function handleShare() {
    const { text } = buildShareText({ view, origin: window.location.origin })
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // コピー失敗: 自動遷移せず、手動コピー用テキストを表示
      setStatus({ kind: 'failure', text })
      return
    }
    // コピー成功: 案内を出してから同一タブで遷移
    setStatus({ kind: 'success' })
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      window.location.assign(SHARE_NOTES_URL)
    }, SHARE_NAVIGATE_DELAY_MS)
  }

  return (
    <span className={`relative inline-block ${className ?? ''}`}>
      <button
        type="button"
        onClick={handleShare}
        aria-label={label}
        className="text-sm border border-gray-300 rounded px-3 py-1 hover:bg-gray-50 transition-colors"
      >
        {label}
      </button>

      {status.kind === 'success' && (
        <span
          role="status"
          aria-live="polite"
          className="absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded border-l-4 border-[#FF6719] bg-white px-4 py-3 text-sm text-gray-900 shadow-lg"
        >
          <span className="block font-semibold">{SHARE_SUCCESS_MESSAGE}</span>
          <span className="mt-1 block text-xs text-gray-500">
            {SHARE_SUCCESS_SUBMESSAGE}
          </span>
        </span>
      )}

      {status.kind === 'failure' && (
        <span
          role="status"
          aria-live="polite"
          className="absolute left-1/2 top-full z-50 mt-2 flex w-64 -translate-x-1/2 flex-col gap-2 rounded border-l-4 border-[#FF6719] bg-white px-4 py-3 text-sm text-gray-900 shadow-lg"
        >
          <span className="font-semibold">{SHARE_FAILURE_MESSAGE}</span>
          <textarea
            readOnly
            value={status.text}
            autoFocus
            onFocus={(e) => e.currentTarget.select()}
            className="h-20 w-full resize-none rounded border border-gray-300 p-2 text-xs"
          />
          <a
            href={SHARE_NOTES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block self-start rounded bg-[#FF6719] px-3 py-1 text-xs font-semibold text-white hover:opacity-90"
          >
            Substackへ移動
          </a>
        </span>
      )}
    </span>
  )
}
