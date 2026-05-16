'use client'

import { useActionState } from 'react'
import { addMemberAction } from './actions'

type Props = { teams: string[] }

export default function AdminAddForm({ teams }: Props) {
  const [error, formAction] = useActionState(addMemberAction, null)

  return (
    <form action={formAction} className="space-y-3 mb-8">
      <h2 className="text-lg font-semibold">メンバー追加</h2>
      <div className="flex gap-2">
        <input
          name="name"
          placeholder="名前"
          required
          className="border rounded px-2 py-1 text-sm flex-1"
        />
        <input
          name="publicationId"
          placeholder="publicationId"
          required
          className="border rounded px-2 py-1 text-sm flex-1"
        />
      </div>
      {teams.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-1">チーム</p>
          <div className="flex gap-3 flex-wrap">
            {teams.map((team) => (
              <label key={team} className="flex items-center gap-1 text-sm cursor-pointer">
                <input type="checkbox" name="teamNames" value={team} />
                {team}
              </label>
            ))}
          </div>
        </div>
      )}
      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-1 rounded text-sm hover:bg-blue-700"
      >
        追加
      </button>
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </form>
  )
}
