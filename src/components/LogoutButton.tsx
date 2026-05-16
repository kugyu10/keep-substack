'use client'

import { signOutAction } from '@/lib/authActions'

export default function LogoutButton() {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className="text-xs text-gray-500 hover:text-gray-800 border border-gray-300 rounded px-3 py-1"
      >
        ログアウト
      </button>
    </form>
  )
}
