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
  const popoverRef = useRef<HTMLDivElement>(null)

  // ビューポートからはみ出ないよう水平位置を補正する
  useEffect(() => {
    if (!open || !popoverRef.current) return
    const el = popoverRef.current
    el.style.transform = 'translateX(-50%)'
    const rect = el.getBoundingClientRect()
    const margin = 8
    if (rect.right > window.innerWidth - margin) {
      const shift = rect.right - (window.innerWidth - margin)
      el.style.transform = `translateX(calc(-50% - ${shift}px))`
    } else if (rect.left < margin) {
      const shift = margin - rect.left
      el.style.transform = `translateX(calc(-50% + ${shift}px))`
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      const target = e instanceof TouchEvent ? e.touches[0]?.target : (e as MouseEvent).target
      if (cellRef.current && target instanceof Node && !cellRef.current.contains(target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside as EventListener)
    document.addEventListener('touchstart', handleClickOutside as EventListener)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside as EventListener)
      document.removeEventListener('touchstart', handleClickOutside as EventListener)
    }
  }, [open])

  return (
    <div
      ref={cellRef}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={(e) => {
        if (cellRef.current && !(e.relatedTarget instanceof Node && cellRef.current.contains(e.relatedTarget))) {
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
        <div ref={popoverRef} className="absolute top-full left-1/2 pt-2 z-10" style={{ transform: 'translateX(-50%)' }}>
          <div className="bg-zinc-800 rounded shadow-2xl p-2 min-w-[220px] max-w-xs relative">
            <button
              onClick={() => setOpen(false)}
              aria-label="閉じる"
              className="absolute top-1 right-1 text-zinc-400 hover:text-white text-xs"
            >
              ×
            </button>
            <ul>
              {articles.map((article, i) => (
                <li key={i} className="mb-2 last:mb-0">
                  <a
                    href={withUtm(article.link ?? '#')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2"
                  >
                    {(article.thumbnail || imageUrl) && (
                      <img
                        src={article.thumbnail ?? imageUrl!}
                        alt=""
                        className="w-12 h-12 rounded object-cover shrink-0"
                      />
                    )}
                    <span
                      className="text-xs text-white hover:underline flex-1 min-w-0"
                      style={{ overflow: 'hidden', display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2 }}
                    >
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
