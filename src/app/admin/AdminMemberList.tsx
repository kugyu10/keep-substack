'use client'

import { deleteMemberAction } from './actions'
import type { Member } from '@/lib/types'

type Props = { members: Member[] }

export default function AdminMemberList({ members }: Props) {
  async function handleDelete(substackId: string) {
    if (!window.confirm(`"${substackId}" を削除しますか？`)) return
    await deleteMemberAction(substackId)
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="border px-3 py-2">名前</th>
            <th className="border px-3 py-2">substackId</th>
            <th className="border px-3 py-2">teamName</th>
            <th className="border px-3 py-2">addedAt</th>
            <th className="border px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.substackId} className="hover:bg-gray-50">
              <td className="border px-3 py-2">{m.name}</td>
              <td className="border px-3 py-2">{m.substackId}</td>
              <td className="border px-3 py-2">{m.teamName}</td>
              <td className="border px-3 py-2 text-xs text-gray-500">
                {new Date(m.addedAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
              </td>
              <td className="border px-3 py-2">
                <button
                  onClick={() => handleDelete(m.substackId)}
                  className="text-red-600 hover:underline text-xs"
                >
                  削除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {members.length === 0 && (
        <p className="text-gray-400 text-sm mt-2">メンバーがいません</p>
      )}
    </div>
  )
}
