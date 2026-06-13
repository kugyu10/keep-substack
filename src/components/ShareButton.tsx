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
import { useState } from 'react'
import { buildShareText, SHARE_NOTES_URL, type ShareView } from '@/lib/share'

type ShareButtonProps = {
  view: ShareView
  className?: string
}

export default function ShareButton({ view, className }: ShareButtonProps) {
  const [feedback, setFeedback] = useState<'idle' | 'copied' | 'error'>('idle')

  async function handleShare() {
    const { text } = buildShareText({ view, origin: window.location.origin })
    try {
      await navigator.clipboard.writeText(text)
      setFeedback('copied')
      // コピー成功時のみ Notes コンポーザーを開く（SHARE-03）
      window.open(SHARE_NOTES_URL, '_blank', 'noopener,noreferrer')
    } catch {
      setFeedback('error')
    }
    // フィードバックは数秒で自動的に消す
    window.setTimeout(() => setFeedback('idle'), 4000)
  }

  return (
    <span className={`relative inline-block ${className ?? ''}`}>
      <button
        type="button"
        onClick={handleShare}
        className="text-sm border border-gray-300 rounded px-3 py-1 hover:bg-gray-50 transition-colors"
      >
        共有
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
