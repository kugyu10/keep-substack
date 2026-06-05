'use client'

import { useState } from 'react'
import { deleteMemberAction, updateMemberAction } from './actions'
import type { Member } from '@/lib/types'

type Props = { members: Member[]; teams: string[] }

export default function AdminMemberList({ members, teams }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editError, setEditError] = useState<string | null>(null)

  async function handleDelete(publicationId: string) {
    if (!window.confirm(`"${publicationId}" を削除しますか？`)) return
    await deleteMemberAction(publicationId)
  }

  async function handleUpdate(publicationId: string, e: React.MouseEvent<HTMLButtonElement>) {
    const tr = e.currentTarget.closest('tr')
    if (!tr) return
    const formData = new FormData()

    // publication_id 変更時の確認ダイアログ
    const newPublicationId = tr.querySelector<HTMLInputElement>('input[name="new_publication_id"]')?.value
    if (newPublicationId && newPublicationId !== publicationId) {
      if (!window.confirm('publication_id を変更します。記事データとの紐付けに影響します。続けますか？')) return
    }

    // テキスト入力（name, addedAt, substack_handle, new_publication_id）
    tr.querySelectorAll<HTMLInputElement>('input[name]:not([type="checkbox"])').forEach(
      (input) => formData.append(input.name, input.value)
    )
    // チェックボックス: checked のもののみ
    tr.querySelectorAll<HTMLInputElement>('input[type="checkbox"][name]:checked').forEach(
      (cb) => formData.append(cb.name, cb.value)
    )

    const error = await updateMemberAction(publicationId, formData)
    if (error) {
      setEditError(error)
    } else {
      setEditingId(null)
      setEditError(null)
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse text-[#363737]">
        <thead>
          <tr className="bg-[#fafafa] text-left">
            <th className="border border-[#ebebeb] px-3 py-2">名前</th>
            <th className="border border-[#ebebeb] px-3 py-2">publicationId</th>
            <th className="border border-[#ebebeb] px-3 py-2">handle</th>
            <th className="border border-[#ebebeb] px-3 py-2">publicationId (edit)</th>
            <th className="border border-[#ebebeb] px-3 py-2">チーム</th>
            <th className="border border-[#ebebeb] px-3 py-2">addedAt</th>
            <th className="border border-[#ebebeb] px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) =>
            editingId === m.publicationId ? (
              <tr key={m.publicationId} className="bg-[#fffbf8]">
                <td className="border border-[#ebebeb] px-3 py-2">
                  <input
                    defaultValue={m.name}
                    name="name"
                    className="bg-white border border-[#d8d8d8] rounded px-1 w-full text-sm text-[#363737]"
                  />
                </td>
                <td className="border border-[#ebebeb] px-3 py-2 text-gray-400">{m.publicationId}</td>
                <td className="border border-[#ebebeb] px-3 py-2">
                  <input
                    defaultValue={m.substackHandle ?? ''}
                    name="substack_handle"
                    placeholder="@handle"
                    className="bg-white border border-[#d8d8d8] rounded px-1 w-full text-sm text-[#363737]"
                  />
                </td>
                <td className="border border-[#ebebeb] px-3 py-2">
                  <input
                    defaultValue={m.publicationId}
                    name="new_publication_id"
                    className="bg-white border border-[#d8d8d8] rounded px-1 w-full text-sm font-mono text-[#363737]"
                  />
                  <p className="text-xs text-gray-500 mt-1">変更すると記事データとの紐付けに影響します</p>
                </td>
                <td className="border border-[#ebebeb] px-3 py-2">
                  <div className="flex flex-col gap-1">
                    {teams.map((team) => (
                      <label key={team} className="flex items-center gap-1 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          name="teamNames"
                          value={team}
                          defaultChecked={m.teams.some((t) => t.name === team)}
                        />
                        {team}
                      </label>
                    ))}
                  </div>
                </td>
                <td className="border border-[#ebebeb] px-3 py-2">
                  <input
                    defaultValue={m.addedAt}
                    name="addedAt"
                    className="bg-white border border-[#d8d8d8] rounded px-1 w-56 text-sm font-mono text-[#363737]"
                  />
                </td>
                <td className="border border-[#ebebeb] px-3 py-2">
                  <button
                    onClick={(e) => handleUpdate(m.publicationId, e)}
                    className="text-blue-600 hover:underline text-xs mr-2"
                  >
                    保存
                  </button>
                  <button
                    onClick={() => { setEditingId(null); setEditError(null) }}
                    className="text-gray-400 hover:underline text-xs"
                  >
                    キャンセル
                  </button>
                  {editError && <p className="text-red-500 text-xs mt-1">{editError}</p>}
                </td>
              </tr>
            ) : (
              <tr key={m.publicationId} className="bg-white hover:bg-[#fafafa]">
                <td className="border border-[#ebebeb] px-3 py-2">{m.name}</td>
                <td className="border border-[#ebebeb] px-3 py-2">{m.publicationId}</td>
                <td className="border border-[#ebebeb] px-3 py-2">{m.substackHandle ?? ''}</td>
                <td className="border border-[#ebebeb] px-3 py-2">{m.publicationId}</td>
                <td className="border border-[#ebebeb] px-3 py-2">{m.teams.map(t => t.name).join(', ')}</td>
                <td className="border border-[#ebebeb] px-3 py-2 text-xs text-gray-400">
                  {new Date(m.addedAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
                </td>
                <td className="border border-[#ebebeb] px-3 py-2">
                  <button
                    onClick={() => { setEditingId(m.publicationId); setEditError(null) }}
                    className="text-blue-600 hover:underline text-xs mr-2"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleDelete(m.publicationId)}
                    className="text-red-500 hover:underline text-xs"
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
