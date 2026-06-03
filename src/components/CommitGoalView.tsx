// Phase 29 Plan 01: Stub component — full implementation in Plan 02
// This file satisfies the import in page.tsx and the test mock in page.test.tsx.
// Plan 02 will replace this with the real CommitGoalView implementation.

import type { MemberFeedResult, CommitSlot } from '@/lib/types'

type CommitGoalViewProps = {
  results: MemberFeedResult[]
  slots: CommitSlot[]
}

export default function CommitGoalView({ results, slots: _slots }: CommitGoalViewProps) {
  return (
    <div>
      {results.map(({ member }) => (
        <div key={member.publicationId}>{member.name}</div>
      ))}
    </div>
  )
}
