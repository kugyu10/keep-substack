// Server Component — do NOT add 'use client'
import type { MemberFeedResult, CommitSlot } from '@/lib/types'
import { sortMembersForCommitView, consecutiveWeekStreak, isThisWeekComplete } from '@/lib/commitUtils'
import CommitGoalRow from './CommitGoalRow'

type CommitGoalViewProps = {
  results: MemberFeedResult[]
  slots: CommitSlot[]
}

export default function CommitGoalView({ results, slots }: CommitGoalViewProps) {
  if (results.length === 0) return null

  const sorted = sortMembersForCommitView(results, slots)

  return (
    <div>
      {/* Week header — aligned to CommitGoalRow column structure */}
      <div className="flex items-center pb-1 mb-0.5">
        {/* Spacer matching avatar+name column (w-16 sm:w-52 + pr-2) */}
        <div className="w-16 sm:w-52 shrink-0 pr-2" />
        {/* Week labels — gap-2 matches CommitGrid gap */}
        <div className="flex flex-1 gap-2">
          <div className="hidden sm:flex flex-1 justify-center">
            <span className="text-[10px] text-gray-400">2週前</span>
          </div>
          <div className="hidden sm:flex flex-1 justify-center">
            <span className="text-[10px] text-gray-400">先週</span>
          </div>
          <div className="flex flex-1 justify-center">
            <span className="text-[10px] text-gray-500 font-medium">今週</span>
          </div>
        </div>
        {/* Spacer matching achievement placeholder */}
        <div className="w-10 shrink-0" />
      </div>
      {sorted.map(({ member, items, imageUrl }) => {
        const memberSlots = slots.filter((s) => s.member_id === member.id)
        const streak = consecutiveWeekStreak(memberSlots, items)
        const crownEarned = isThisWeekComplete(memberSlots, items)
        return (
          <CommitGoalRow
            key={member.publicationId}
            member={member}
            items={items}
            slots={memberSlots}
            imageUrl={imageUrl}
            streak={streak}
            crownEarned={crownEarned}
          />
        )
      })}
    </div>
  )
}
