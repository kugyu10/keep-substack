'use client'

import { useActionState } from 'react'
import { linkMemberAction } from './actions'

export default function LinkMemberForm() {
  const [state, action, isPending] = useActionState(linkMemberAction, null)

  return (
    <div>
      <p className="text-sm text-gray-600 mb-4">
        管理者から登録してもらった パブリケーションID を入力して、アカウントと紐付けてください。
      </p>
      <form action={action} className="space-y-4">
        {state && <p className="text-sm text-red-600">{state}</p>}
        <div>
          <label htmlFor="publicationId" className="block text-sm font-medium mb-1">
            パブリケーションID
          </label>
          <input
            id="publicationId"
            name="publicationId"
            type="text"
            required
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="yourname"
          />
          <p className="text-xs text-gray-500 mt-1">
            例: yourname（yourname.substack.com の yourname 部分）
          </p>
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-orange-500 text-white rounded px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {isPending ? '紐付け中...' : 'アカウントと紐付ける'}
        </button>
      </form>
    </div>
  )
}
