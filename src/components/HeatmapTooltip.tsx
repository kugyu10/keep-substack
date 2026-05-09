'use client'

import { useState, useRef, useEffect } from 'react'

type HeatmapTooltipProps = {
  articles: { title?: string; link?: string; thumbnail?: string }[]
  colorClass: string
}

function withUtm(url: string): string {
  if (!url || url === '#') return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}utm_source=keep-substack&utm_medium=referral`
}

export default function HeatmapTooltip({ articles, colorClass }: HeatmapTooltipProps) {
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
    <div ref={cellRef} className="relative">
      <button
        className={`aspect-square w-full rounded-sm ${colorClass}`}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={(e) => {
          if (cellRef.current && !cellRef.current.contains(e.relatedTarget as Node)) {
            setOpen(false)
          }
        }}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      />
      {open && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 pb-2 z-10"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          <div className="bg-white border border-gray-200 rounded shadow-lg p-2 max-w-xs relative">
            <button
              onClick={() => setOpen(false)}
              aria-label="閉じる"
              className="absolute top-1 right-1 text-gray-400 hover:text-gray-600 text-xs"
            >
              ×
            </button>
            <ul>
              {articles.map((article, i) => (
                <li key={i} className="mb-1 last:mb-0">
                  {article.thumbnail && (
                    <img
                      src={article.thumbnail}
                      alt=""
                      className="w-full rounded mb-1 object-cover max-h-24"
                    />
                  )}
                  <a
                    href={withUtm(article.link ?? '#')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline break-words block"
                  >
                    {article.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
