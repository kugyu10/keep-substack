'use client'

import { useActionState } from 'react'
import { sendMagicLinkAction } from './actions'

export default function LoginForm({ pid }: { pid?: string }) {
  const [state, action, isPending] = useActionState(sendMagicLinkAction, null)

  if (state === 'SENT') {
    return (
      <div className="text-center py-8">
        <p className="text-lg font-medium mb-2">メールを送信しました</p>
        <p className="text-sm text-gray-600">
          受信トレイを確認してログインリンクをクリックしてください
        </p>
      </div>
    )
  }

  return (
    <form action={action} className="space-y-4">
      {pid && <input type="hidden" name="pid" value={pid} />}
      {state && state !== 'SENT' && (
        <p className="text-sm text-red-600">{state}</p>
      )}
      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1">
          メールアドレス
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full border rounded px-3 py-2 text-sm"
          placeholder="you@example.com"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-orange-500 text-white rounded px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {isPending ? '送信中...' : 'ログインリンクを送信'}
      </button>
    </form>
  )
}
