'use client'

/**
 * ワンボタン共有（Phase 38 / v1.9）。
 *
 * Substack には Note 本文を URL 等でプリフィルする API が無いため、ユーザーは
 * 必ず手動で貼り付ける必要がある。
 *
 * フロー（v1.9 修正版 — ページ内の説明モーダルは廃止し、即 Substack を開く）:
 *  1. クリックで共有テキストをクリップボードへコピー（貼り付け用）
 *  2. 続けて即 window.open で Substack Notes コンポーザーを新規タブで開く
 *     （Substack 側のノート作成モーダルが現れ、ユーザーは ⌘V / Ctrl+V で貼り付ける）
 *  3. 自ページ側には非ブロッキングのトーストで案内を出す（約4秒で自動消滅）
 *  4. コピー失敗時も Substack は開き、フォールバック文言のトーストを出す
 *
 * 再利用可能なコンポーネント。配置は各ビューで <ShareButton view={...} /> の1行を置くだけ（SHARE-01）。
 */
import { useEffect, useRef, useState } from 'react'
import { buildShareText, SHARE_NOTES_URL, type ShareView } from '@/lib/share'

/** 共有ボタンの既定キャプション（BUG1）。文面変更はこの1か所。 */
export const SHARE_BUTTON_LABEL = '継続をシェア'

/** トーストの自動消滅までのミリ秒。 */
const TOAST_DURATION_MS = 4000

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
  // 非ブロッキングのトースト文言。null = 非表示。
  const [toast, setToast] = useState<string | null>(null)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // アンマウント時にタイマーを掃除
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  function showToast(message: string) {
    setToast(message)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setToast(null), TOAST_DURATION_MS)
  }

  // ボタンクリック: コピー（貼り付け用）→ 即 Substack Notes を新規タブで開く
  async function handleShare() {
    const { text } = buildShareText({ view, origin: window.location.origin })
    let copied = true
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      copied = false
    }
    // コピー成否に関わらず Substack を開く（クリックジェスチャ内で発火）
    window.open(SHARE_NOTES_URL, '_blank', 'noopener')
    showToast(
      copied
        ? 'コピーしました！Substackで貼り付けて投稿してください'
        : 'コピーできませんでした。Substackで本文を入力して投稿してください'
    )
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

      {toast && (
        <span
          role="status"
          aria-live="polite"
          className="absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded bg-[#363737] px-3 py-2 text-xs text-white shadow-lg"
        >
          {toast}
        </span>
      )}
    </span>
  )
}
