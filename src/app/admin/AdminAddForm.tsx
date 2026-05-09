'use client'

import { useActionState } from 'react'
import { addMemberAction } from './actions'

export default function AdminAddForm() {
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
          name="substackId"
          placeholder="substackId"
          required
          className="border rounded px-2 py-1 text-sm flex-1"
        />
        <input
          name="teamId"
          placeholder="teamId (任意)"
          className="border rounded px-2 py-1 text-sm flex-1"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-1 rounded text-sm hover:bg-blue-700"
        >
          追加
        </button>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </form>
  )
}
