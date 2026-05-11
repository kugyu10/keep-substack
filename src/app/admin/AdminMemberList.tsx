'use client'

import { useState } from 'react'
import { deleteMemberAction, updateMemberAction } from './actions'
import type { Member } from '@/lib/types'

type Props = { members: Member[] }

export default function AdminMemberList({ members }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editError, setEditError] = useState<string | null>(null)

  async function handleDelete(substackId: string) {
    if (!window.confirm(`"${substackId}" を削除しますか？`)) return
    await deleteMemberAction(substackId)
  }

  async function handleUpdate(substackId: string, e: React.MouseEvent<HTMLButtonElement>) {
    const tr = e.currentTarget.closest('tr')
    if (!tr) return
    const formData = new FormData()
    const inputs = tr.querySelectorAll<HTMLInputElement>('input[name]')
    inputs.forEach((input) => formData.append(input.name, input.value))
    const error = await updateMemberAction(substackId, formData)
    if (error) {
      setEditError(error)
    } else {
      setEditingId(null)
      setEditError(null)
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-300 text-left">
            <th className="border px-3 py-2">名前</th>
            <th className="border px-3 py-2">substackId</th>
            <th className="border px-3 py-2">teamName</th>
            <th className="border px-3 py-2">addedAt</th>
            <th className="border px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) =>
            editingId === m.substackId ? (
              <tr key={m.substackId} className="hover:bg-gray-50">
                <td className="border px-3 py-2">
                  <input defaultValue={m.name} name="name" className="border rounded px-1 w-full text-sm" />
                </td>
                <td className="border px-3 py-2 text-gray-400">{m.substackId}</td>
                <td className="border px-3 py-2">
                  <input defaultValue={m.teamName} name="teamName" className="border rounded px-1 w-full text-sm" />
                </td>
                <td className="border px-3 py-2">
                  <input defaultValue={m.addedAt} name="addedAt" className="border rounded px-1 w-56 text-sm font-mono text-xs" />
                </td>
                <td className="border px-3 py-2">
                  <button
                    onClick={(e) => handleUpdate(m.substackId, e)}
                    className="text-blue-600 hover:underline text-xs mr-2"
                  >
                    保存
                  </button>
                  <button
                    onClick={() => { setEditingId(null); setEditError(null) }}
                    className="text-gray-500 hover:underline text-xs"
                  >
                    キャンセル
                  </button>
                  {editError && <p className="text-red-600 text-xs mt-1">{editError}</p>}
                </td>
              </tr>
            ) : (
              <tr key={m.substackId} className="hover:bg-gray-50">
                <td className="border px-3 py-2">{m.name}</td>
                <td className="border px-3 py-2">{m.substackId}</td>
                <td className="border px-3 py-2">{m.teamName}</td>
                <td className="border px-3 py-2 text-xs text-gray-500">
                  {new Date(m.addedAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
                </td>
                <td className="border px-3 py-2">
                  <button
                    onClick={() => { setEditingId(m.substackId); setEditError(null) }}
                    className="text-blue-600 hover:underline text-xs mr-2"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleDelete(m.substackId)}
                    className="text-red-600 hover:underline text-xs"
                  >
                    削除
                  </button>
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
      {members.length === 0 && (
        <p className="text-gray-400 text-sm mt-2">メンバーがいません</p>
      )}
    </div>
  )
}
