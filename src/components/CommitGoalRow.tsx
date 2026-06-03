// Server Component — do NOT add 'use client'
import Link from 'next/link'
import type { Member, FeedItem, CommitSlot } from '@/lib/types'
import CommitGrid from './CommitGrid'

type CommitGoalRowProps = {
  member: Member
  items: FeedItem[]
  slots: CommitSlot[]
  imageUrl?: string
}

export default function CommitGoalRow({ member, items, slots, imageUrl }: CommitGoalRowProps) {
  return (
    <div className="flex items-center border-b border-[#ebebeb] py-1">
      {/* Column 1: Avatar + Name */}
      <Link
        href={`/member/${member.publicationId}`}
        className="w-16 sm:w-52 shrink-0 pr-2 flex items-center gap-1 overflow-hidden"
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            width={40}
            height={40}
            className="w-10 h-10 rounded-full shrink-0 object-cover"
          />
        ) : (
          <span className="w-10 h-10 rounded-full shrink-0 bg-gray-200 inline-block" aria-hidden="true" />
        )}
        <div className="flex-1 min-w-0 text-xs font-semibold leading-snug truncate hidden sm:block">
          {member.name}
        </div>
        <span className="shrink-0 text-gray-400 text-sm" aria-hidden="true">›</span>
      </Link>

      {/* Column 2: CommitGrid or no-commit fallback (VIEW-06) */}
      {slots.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-sm text-gray-400">未コミット</span>
        </div>
      ) : (
        <div className="flex-1">
          <CommitGrid slots={slots} items={items} />
        </div>
      )}

      {/* Column 3: Achievement placeholder (D-09) — Phase 30 will fill this */}
      <div className="w-8 shrink-0" aria-hidden="true" />
    </div>
  )
}
