'use client'

/**
 * ワンボタン共有（Phase 38）。
 *
 * クリックすると「定型文＋ハッシュタグ＋対象ビューの公開URL」をクリップボードへコピーし（SHARE-02）、
 * 続けて Substack Notes コンポーザーを新規タブで開く（SHARE-03）。
 * コピー完了は軽量なインラインフィードバックで知らせる（SHARE-04）。
 *
 * 再利用可能なコンポーネント。配置は各ビューで <ShareButton view={...} /> の1行を置くだけ（SHARE-01）。
 */
import { useEffect, useRef, useState } from 'react'
import { buildShareText, SHARE_NOTES_URL, type ShareView } from '@/lib/share'

/** 共有ボタンの既定キャプション（BUG1）。文面変更はこの1か所。 */
export const SHARE_BUTTON_LABEL = '継続をシェア'

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
  const [feedback, setFeedback] = useState<'idle' | 'copied' | 'error'>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // アンマウント時に保留中のタイマーを破棄（unmounted setState 回避, WR-02）
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  function showFeedback(state: 'copied' | 'error') {
    setFeedback(state)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setFeedback('idle'), 4000)
  }

  async function handleShare() {
    const { text } = buildShareText({ view, origin: window.location.origin })
    // ポップアップブロック回避（WR-01）: Notes タブはユーザー操作コンテキスト内で
    // 同期的に開く。await の後だと Safari 等でブロックされうるため先に開く（SHARE-03）。
    window.open(SHARE_NOTES_URL, '_blank', 'noopener,noreferrer')
    try {
      await navigator.clipboard.writeText(text)
      showFeedback('copied')
    } catch {
      showFeedback('error')
    }
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
      {feedback !== 'idle' && (
        <span
          role="status"
          className={`absolute left-0 top-full mt-1 whitespace-nowrap rounded px-2 py-1 text-xs shadow ${
            feedback === 'copied'
              ? 'bg-[#363737] text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {feedback === 'copied'
            ? 'コピー完了！貼り付けて投稿してください'
            : 'コピーに失敗しました'}
        </span>
      )}
    </span>
  )
}
