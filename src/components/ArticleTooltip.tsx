'use client'

import { useState, useRef, useEffect } from 'react'

type Article = { title?: string; link?: string }

function withUtm(url: string): string {
  if (!url || url === '#') return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}utm_source=keep-substack&utm_medium=referral`
}

type Props = {
  date: number
  articles: Article[]
  colStart?: number
}

export default function ArticleTooltip({ date, articles, colStart }: Props) {
  const [open, setOpen] = useState(false)
  const cellRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (cellRef.current && !cellRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div
      ref={cellRef}
      style={colStart ? { gridColumnStart: colStart } : undefined}
      className="relative aspect-square"
    >
      {open && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 pb-2 z-10"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          <div className="bg-white border border-gray-200 rounded shadow-lg p-2 min-w-max max-w-xs">
            <button
              className="absolute top-1 right-1 text-gray-400 hover:text-gray-600 text-xs"
              onClick={() => setOpen(false)}
              aria-label="閉じる"
            >
              ×
            </button>
            <ul className="space-y-1 pr-4">
              {articles.map((a, i) => (
                <li key={i}>
                  <a
                    href={withUtm(a.link ?? '#')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline block"
                  >
                    {a.title ?? '(タイトルなし)'}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      <button
        className="w-full h-full flex items-center justify-center text-sm font-semibold bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={(e) => {
          if (cellRef.current && !cellRef.current.contains(e.relatedTarget as Node)) {
            setOpen(false)
          }
        }}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        {date}
      </button>
    </div>
  )
}
