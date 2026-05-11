'use client'

import { useState, useRef, useEffect } from 'react'
import type { ReactNode } from 'react'

type HeatmapTooltipProps = {
  articles: { title?: string; link?: string; thumbnail?: string }[]
  colorClass: string
  imageUrl?: string
  children?: ReactNode
}

function withUtm(url: string): string {
  if (!url || url === '#') return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}utm_source=keep-substack&utm_medium=referral`
}

export default function HeatmapTooltip({ articles, colorClass, imageUrl, children }: HeatmapTooltipProps) {
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
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={(e) => {
        if (cellRef.current && !cellRef.current.contains(e.relatedTarget as Node)) {
          setOpen(false)
        }
      }}
    >
      <button
        className={`aspect-square w-full rounded-full ${colorClass} flex items-center justify-center`}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        {children}
      </button>
      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 z-10">
          <div className="bg-white border border-gray-200 rounded shadow-lg p-2 min-w-[220px] max-w-xs relative">
            <button
              onClick={() => setOpen(false)}
              aria-label="閉じる"
              className="absolute top-1 right-1 text-gray-400 hover:text-gray-600 text-xs"
            >
              ×
            </button>
            <ul>
              {articles.map((article, i) => (
                <li key={i} className="mb-3 last:mb-0">
                  <a
                    href={withUtm(article.link ?? '#')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    {(article.thumbnail || imageUrl) && (
                      <img
                        src={article.thumbnail ?? imageUrl!}
                        alt=""
                        className="w-full rounded mb-1 object-cover max-h-24"
                        style={{ maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)' }}
                      />
                    )}
                    <span className="text-xs text-blue-600 hover:underline break-words block">
                      {article.title}
                    </span>
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
