'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'

type HeaderNavProps = { user: User | null }

export default function HeaderNav({ user }: HeaderNavProps) {
  const pathname = usePathname()

  if (user) {
    if (pathname === '/my') return null
    return (
      <Link
        href="/my"
        className="text-sm border border-gray-300 rounded px-3 py-1 hover:bg-gray-50 transition-colors"
      >
        マイページ
      </Link>
    )
  }

  return (
    <Link
      href="/login"
      className="text-sm border border-gray-300 rounded px-3 py-1 hover:bg-gray-50 transition-colors"
    >
      ログイン
    </Link>
  )
}
