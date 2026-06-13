'use client'

/**
 * ワンボタン共有（Phase 38 / v1.9 UX改善）。
 *
 * Substack には Note 本文を URL 等でプリフィルする API が無いため、ユーザーは
 * 必ず手動で貼り付ける必要がある。旧実装はクリック後すぐ Notes を新規タブで開いて
 * いたため、ユーザーは「何を貼ればいいか分からない真っ白なコンポーザー」に着地し
 * 混乱していた（UATフィードバック）。
 *
 * 新フロー（SHARE-02/03/04 を踏襲しつつ UX 改善）:
 *  1. クリックで共有テキストをクリップボードへコピー
 *  2. ページ内モーダルを開き、手動貼り付け手順を明示（まだ遷移しない）
 *  3. モーダル内の主ボタンを押して初めて Substack Notes を新規タブで開く
 *     （2度目の明示的ジェスチャ＝ポップアップブロック回避）
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
  const [isOpen, setIsOpen] = useState(false)
  // コピー成否。null = 未試行 / true = 成功 / false = 失敗（手動コピー誘導に切替）
  const [copied, setCopied] = useState<boolean | null>(null)
  const [shareText, setShareText] = useState('')

  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  // モーダルを開いたらダイアログへフォーカスを移す（アクセシビリティ）
  useEffect(() => {
    if (isOpen) dialogRef.current?.focus()
  }, [isOpen])

  /** クリップボードへコピーを試み、成否を返す（再コピーでも共用）。 */
  async function copyToClipboard(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      return false
    }
  }

  // ボタンクリック: コピー → モーダルを開く（まだ Substack へは遷移しない）
  async function handleShare() {
    const { text } = buildShareText({ view, origin: window.location.origin })
    setShareText(text)
    const ok = await copyToClipboard(text)
    setCopied(ok)
    setIsOpen(true)
  }

  // モーダル内「再コピー」: もう一度クリップボードへ
  async function handleRecopy() {
    const ok = await copyToClipboard(shareText)
    setCopied(ok)
  }

  // モーダル内「Substackでノートを開く」: 2度目の明示ジェスチャで新規タブを開く
  function handleOpenSubstack() {
    window.open(SHARE_NOTES_URL, '_blank', 'noopener')
    closeModal()
  }

  function closeModal() {
    setIsOpen(false)
    triggerRef.current?.focus()
  }

  return (
    <span className={`relative inline-block ${className ?? ''}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleShare}
        aria-label={label}
        className="text-sm border border-gray-300 rounded px-3 py-1 hover:bg-gray-50 transition-colors"
      >
        {label}
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={closeModal}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-modal-title"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Escape') closeModal()
            }}
            className="bg-white rounded shadow-xl w-full max-w-md mx-4 p-6 relative text-left outline-none"
          >
            <button
              type="button"
              aria-label="閉じる"
              onClick={closeModal}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700"
            >
              ×
            </button>

            <h2
              id="share-modal-title"
              className="text-lg font-semibold mb-3 text-[#363737]"
            >
              継続をシェア
            </h2>

            {copied ? (
              <p className="text-sm font-semibold text-[#363737] mb-2">
                ✅ 共有テキストをコピーしました
              </p>
            ) : (
              <p className="text-sm font-semibold text-red-600 mb-2">
                下のテキストをコピーしてください
              </p>
            )}

            <p className="text-sm text-[#363737] mb-3 leading-relaxed">
              このあと Substack
              のノート作成画面が開きます。本文に ⌘V（Windows は
              Ctrl+V）で貼り付けて「ポスト」してください。
            </p>

            <textarea
              ref={textareaRef}
              readOnly
              value={shareText}
              rows={3}
              aria-label="共有テキスト"
              onFocus={(e) => e.currentTarget.select()}
              className="w-full text-sm border border-gray-300 rounded px-3 py-2 mb-2 resize-none bg-gray-50 text-[#363737]"
            />

            <div className="mb-4">
              <button
                type="button"
                onClick={handleRecopy}
                className="text-sm border border-gray-300 rounded px-3 py-1 hover:bg-gray-50 transition-colors"
              >
                再コピー
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleOpenSubstack}
                className="w-full bg-[#FF6719] text-white rounded px-4 py-2 text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Substackでノートを開く →
              </button>
              <button
                type="button"
                onClick={closeModal}
                className="w-full border border-gray-300 rounded px-4 py-2 text-sm text-[#363737] hover:bg-gray-50 transition-colors"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </span>
  )
}
