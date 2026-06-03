// Server Component — do NOT add 'use client'
import type { MemberFeedResult, CommitSlot } from '@/lib/types'
import { sortMembersForCommitView } from '@/lib/commitUtils'
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
      {sorted.map(({ member, items, imageUrl }) => {
        const memberSlots = slots.filter((s) => s.member_id === member.id)
        return (
          <CommitGoalRow
            key={member.publicationId}
            member={member}
            items={items}
            slots={memberSlots}
            imageUrl={imageUrl}
          />
        )
      })}
    </div>
  )
}
