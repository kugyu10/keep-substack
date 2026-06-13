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
    // BUG2 修正: コピー → フィードバック表示 → Notes を開く の順にする。
    // 旧実装は先に window.open で新規タブを開いており、元タブがフォーカスを失って
    // clipboard.writeText とトーストが「元タブに戻るまで」遅延していた（"何も開かない"）。
    // ユーザー操作コンテキスト内で await clipboard を先に解決し、トーストを出してから開く。
    try {
      await navigator.clipboard.writeText(text)
      showFeedback('copied')
    } catch {
      // クリップボード不可（権限/非対応）でも導線は止めない:
      // エラーを知らせたうえで Notes は開く（手動コピーで投稿できるよう保険）。
      showFeedback('error')
    }
    // コピー＆トースト確定後に Notes を開く。await 直後の open はユーザー操作の
    // 余韻内に収まり、通常ポップアップブロックされない（SHARE-03）。
    window.open(SHARE_NOTES_URL, '_blank', 'noopener,noreferrer')
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
            ? 'コピーしました！貼り付けて投稿してください'
            : 'コピーに失敗しました。テキストを手動でコピーして投稿してください'}
        </span>
      )}
    </span>
  )
}
