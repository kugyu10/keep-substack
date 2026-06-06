import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export default async function Header() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <header className="border-b border-[#ebebeb] bg-white">
      <div className="max-w-[960px] mx-auto px-4 py-3 flex items-center justify-between">
        <Link
          href="/"
          className="text-lg font-black hover:opacity-70 transition-opacity"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          Keep Substack
        </Link>
        {user ? (
          <Link
            href="/my"
            className="text-sm border border-gray-300 rounded px-3 py-1 hover:bg-gray-50 transition-colors"
          >
            マイページ
          </Link>
        ) : (
          <Link
            href="/login"
            className="text-sm border border-gray-300 rounded px-3 py-1 hover:bg-gray-50 transition-colors"
          >
            ログイン
          </Link>
        )}
      </div>
    </header>
  )
}
