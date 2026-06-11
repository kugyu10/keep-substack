'use client'

import { useState } from 'react'
import { updateTeamStatusAction, addTeamAction } from './actions'

type Team = { id: string; name: string; status: string }
type Props = { teams: Team[] }

export default function TeamStatusList({ teams }: Props) {
  const [statuses, setStatuses] = useState<Record<string, string>>(
    Object.fromEntries(teams.map((t) => [t.id, t.status]))
  )
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, string | null>>({})

  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAdding(true)
    setAddError(null)
    const error = await addTeamAction(newName)
    setAdding(false)
    if (error) {
      setAddError(error)
    } else {
      setNewName('')
    }
  }

  async function handleSave(team: Team) {
    const newStatus = statuses[team.id]
    if (newStatus === 'hidden') {
      const confirmed = window.confirm(
        'このチームをhiddenにすると、メンバーがAll表示からも非表示になります。続けますか？'
      )
      if (!confirmed) return
    }

    setSaving((prev) => ({ ...prev, [team.id]: true }))
    const error = await updateTeamStatusAction(team.id, newStatus)
    setSaving((prev) => ({ ...prev, [team.id]: false }))
    setErrors((prev) => ({ ...prev, [team.id]: error }))
  }

  return (
    <div>
      {/* Add team form */}
      <form onSubmit={handleAdd} className="flex gap-2 mb-6 items-start">
        <div className="flex flex-col gap-1">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="新しいチーム名"
            className="border border-[#d8d8d8] rounded px-3 py-1.5 text-sm text-[#363737] bg-white w-56"
          />
          {addError && <p className="text-red-500 text-xs">{addError}</p>}
        </div>
        <button
          type="submit"
          disabled={adding || !newName.trim()}
          className="px-4 py-1.5 rounded text-sm bg-primary text-white disabled:opacity-50 hover:opacity-90"
        >
          {adding ? '追加中…' : 'チームを追加'}
        </button>
      </form>

    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse text-[#363737]">
        <thead>
          <tr className="bg-[#fafafa] text-left">
            <th className="border border-[#ebebeb] px-3 py-2">チーム名</th>
            <th className="border border-[#ebebeb] px-3 py-2">ステータス</th>
            <th className="border border-[#ebebeb] px-3 py-2">操作</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((team) => (
            <tr key={team.id} className="bg-white hover:bg-[#fafafa]">
              <td className="border border-[#ebebeb] px-3 py-2">{team.name}</td>
              <td className="border border-[#ebebeb] px-3 py-2">
                <select
                  value={statuses[team.id]}
                  onChange={(e) =>
                    setStatuses((prev) => ({ ...prev, [team.id]: e.target.value }))
                  }
                  className="w-40 border border-[#d8d8d8] rounded px-2 py-1 text-sm text-[#363737] bg-white"
                >
                  <option value="public">public</option>
                  <option value="private">private</option>
                  <option value="hidden">hidden</option>
                </select>
              </td>
              <td className="border border-[#ebebeb] px-3 py-2">
                <button
                  onClick={() => handleSave(team)}
                  disabled={saving[team.id]}
                  className="text-blue-600 hover:underline text-xs disabled:opacity-50"
                >
                  ステータスを保存
                </button>
                {errors[team.id] && (
                  <p className="text-red-500 text-xs mt-1">{errors[team.id]}</p>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {teams.length === 0 && (
      <p className="text-sm text-gray-400 mt-4">まだチームがありません。上のフォームで追加してください。</p>
    )}
    </div>
  )
}
