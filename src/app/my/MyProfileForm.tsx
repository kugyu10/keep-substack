'use client'

import { useActionState } from 'react'
import { updateMyProfileAction } from './actions'

type Member = {
  name: string
  publicationId: string
  team_names: string[]
}

export default function MyProfileForm({ member }: { member: Member }) {
  const [state, action, isPending] = useActionState(updateMyProfileAction, null)

  return (
    <form action={action} className="space-y-4">
      {state && <p className="text-sm text-red-600">{state}</p>}

      <div>
        <label className="block text-sm font-medium mb-1">パブリケーションID</label>
        <p className="text-sm text-gray-400 border rounded px-3 py-2 bg-gray-100">
          {member.publicationId}
        </p>
        <p className="text-xs text-gray-500 mt-1">パブリケーションID は変更できません</p>
      </div>

      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1">
          名前
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={member.name}
          className="w-full border rounded px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label htmlFor="teamNames" className="block text-sm font-medium mb-1">
          所属チーム
        </label>
        <input
          id="teamNames"
          name="teamNames"
          type="text"
          defaultValue={member.team_names.join(', ')}
          className="w-full border rounded px-3 py-2 text-sm"
          placeholder="チームA, チームB"
        />
        <p className="text-xs text-gray-500 mt-1">カンマ区切りで複数入力できます</p>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-orange-500 text-white rounded px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {isPending ? '保存中...' : '保存する'}
      </button>
    </form>
  )
}
