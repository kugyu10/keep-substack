'use client'

import { useActionState } from 'react'
import { updateMyProfileAction } from './actions'

type Member = {
  name: string
  publicationId: string
  currentTeams: { name: string; status: string }[]
  publicTeams: { name: string }[]
}

export default function MyProfileForm({ member, substackHandle }: { member: Member; substackHandle: string | null | undefined }) {
  const [state, action, isPending] = useActionState(updateMyProfileAction, null)

  const joinedNames = new Set(member.currentTeams.map((t) => t.name))
  const privateJoined = member.currentTeams.filter((t) => t.status === 'private')
  const allJoined =
    member.publicTeams.length > 0 &&
    member.publicTeams.every((t) => joinedNames.has(t.name))

  return (
    <form action={action} className="space-y-4">
      {state && (
        <p role="alert" className="text-sm text-red-600">
          {state}
        </p>
      )}

      <div>
        <label className="block text-sm font-semibold mb-1">パブリケーションID</label>
        <p className="text-sm text-gray-400 border rounded px-3 py-2 bg-gray-100">
          {member.publicationId}
        </p>
        <p className="text-xs text-gray-500 mt-1">パブリケーションID は変更できません</p>
      </div>

      <div>
        <label htmlFor="name" className="block text-sm font-semibold mb-1">
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

      {substackHandle != null ? (
        <div>
          <label className="block text-sm font-semibold mb-1">Substack ハンドル</label>
          <p className="text-sm text-gray-400 border rounded px-3 py-2 bg-gray-100">{substackHandle}</p>
          <p className="text-xs text-gray-500 mt-1">Substack ハンドルは変更できません</p>
        </div>
      ) : (
        <div>
          <label htmlFor="substack_handle" className="block text-sm font-semibold mb-1">Substack ハンドル</label>
          <input
            id="substack_handle"
            name="substack_handle"
            type="text"
            placeholder="@yourhandle"
            className="w-full border rounded px-3 py-2 text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">例: @yourname — 入力すると個人ページからプロフィールへのリンクが作成されます</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold mb-2">所属チーム</label>
        {member.publicTeams.length === 0 && privateJoined.length === 0 ? (
          <p className="text-sm text-gray-500">参加できる公開チームはありません</p>
        ) : (
          <>
            <div className="space-y-1 border rounded px-3 py-2">
              {member.publicTeams.map((t) => (
                <label
                  key={t.name}
                  className="flex items-center gap-3 min-h-[44px] cursor-pointer"
                >
                  <span className="relative inline-flex w-4 h-4 shrink-0">
                    <input
                      type="checkbox"
                      name="teams"
                      value={t.name}
                      defaultChecked={joinedNames.has(t.name)}
                      className="peer w-4 h-4 appearance-none rounded border border-gray-400 cursor-pointer checked:bg-orange-500 checked:border-orange-500"
                    />
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="pointer-events-none absolute inset-0 hidden text-white peer-checked:block"
                    >
                      <path d="M3.5 8.5l3 3 6-6" />
                    </svg>
                  </span>
                  <span className="text-sm text-[#363737]">{t.name}</span>
                </label>
              ))}
              {privateJoined.map((t) => (
                <label
                  key={t.name}
                  className="flex items-center gap-3 min-h-[44px] cursor-not-allowed opacity-60"
                >
                  <input
                    type="checkbox"
                    checked
                    disabled
                    aria-label={`${t.name} 管理者設定済み`}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-[#363737]">{t.name}</span>
                  <span className="text-xs text-gray-500 ml-auto">管理者が設定</span>
                </label>
              ))}
            </div>
            {member.publicTeams.length === 0 && (
              <p className="text-sm text-gray-500">参加できる公開チームはありません</p>
            )}
            {allJoined && (
              <p className="text-xs text-gray-500 mt-1">すべての公開チームに参加中です</p>
            )}
          </>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        aria-disabled={isPending}
        className="w-full bg-orange-500 text-white rounded px-4 py-2 text-sm font-semibold disabled:opacity-50"
      >
        {isPending ? '保存中...' : '保存する'}
      </button>
    </form>
  )
}
