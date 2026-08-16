// Server Component — do NOT add 'use client'
import Link from 'next/link'
import type { Member, FeedItem, CommitSlot, MemberGameStats } from '@/lib/types'
import CommitGrid from './CommitGrid'

type CommitGoalRowProps = {
  member: Member
  items: FeedItem[]
  slots: CommitSlot[]
  imageUrl?: string
  streak: number
  crownEarned: boolean
  stats?: MemberGameStats
}

export default function CommitGoalRow({
  member,
  items,
  slots,
  imageUrl,
  streak,
  crownEarned,
  stats,
}: CommitGoalRowProps) {
  // Group C（hasUser=false）= 未登録: auth ユーザー未連携。淡色で控えめに見せる。
  // Group B（hasUser=true・slots なし）= 未コミットメント とは表示・濃度を分離する。
  const isUnregistered = !member.hasUser
  return (
    <div className={`flex items-center border-b border-[#ebebeb] py-1${isUnregistered ? ' opacity-60' : ''}`}>
      {/* Column 1: Avatar + Name */}
      <Link
        href={`/member/${member.publicationId}`}
        className="w-16 sm:w-52 shrink-0 pr-2 flex items-center gap-1 overflow-hidden"
      >
        <span className="sr-only">{member.name}</span>
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
        <div className="flex-1 min-w-0 text-xs font-semibold leading-snug truncate hidden sm:block" aria-hidden="true">
          {member.name}
        </div>
        <span className="shrink-0 text-gray-400 text-sm" aria-hidden="true">›</span>
      </Link>

      {/* Column 2: CommitGrid or no-commit fallback (VIEW-06) */}
      {slots.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          {isUnregistered ? (
            <span className="text-sm text-gray-400">未登録</span>
          ) : (
            <span className="text-sm text-gray-400">未コミットメント</span>
          )}
        </div>
      ) : (
        <div className="flex-1">
          <CommitGrid slots={slots} items={items} imageUrl={imageUrl} />
        </div>
      )}

      {/* Column 3: Achievement badges
          👑 = today's week fully complete (crownEarned) — unchanged
          🔥N = weekly streak >= 1 (uncapped; N = consecutive completed weeks)
          Lv N = level pill, shown whenever stats are available */}
      <div className="w-14 shrink-0 flex flex-col items-center justify-center gap-0.5">
        {(crownEarned || streak >= 1) && (
          <div className="flex items-center justify-center gap-0.5">
            {crownEarned && (
              <span role="img" aria-label="今週達成" className="text-sm leading-none">
                👑
              </span>
            )}
            {streak >= 1 && (
              <span
                role="img"
                aria-label={`連続${streak}週達成`}
                className="text-sm leading-none"
              >
                {`🔥${streak}`}
              </span>
            )}
          </div>
        )}
        {stats && (
          <span className="text-xs px-1.5 rounded-full bg-primary/10 text-primary font-medium leading-tight">
            {`Lv${stats.level}`}
          </span>
        )}
      </div>
    </div>
  )
}
