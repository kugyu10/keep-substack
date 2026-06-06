'use client'

import type { ReactNode } from 'react'

type CommitGridCellProps = {
  href?: string
  title?: string
  children: ReactNode
}

export default function CommitGridCell({ href, title, children }: CommitGridCellProps) {
  const tooltip = title ? (
    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-10 whitespace-nowrap bg-gray-800 text-white text-[10px] leading-snug rounded px-2 py-1 max-w-[160px] truncate opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150">
      {title}
    </span>
  ) : null

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="group relative h-full block"
      >
        {tooltip}
        {children}
      </a>
    )
  }

  return (
    <div className="group relative h-full block">
      {tooltip}
      {children}
    </div>
  )
}
