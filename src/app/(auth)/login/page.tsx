import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import LoginForm from './LoginForm'
import { safeRedirectPath } from '@/lib/safe-redirect'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/my')

  const { next } = await searchParams
  const safeNext = safeRedirectPath(next) ?? undefined

  return (
    <main className="max-w-sm mx-auto px-4 py-12">
      <p className="text-2xl font-black text-center mb-6" style={{ fontFamily: 'Georgia, serif' }}>
        Keep Substack
      </p>
      <h1 className="text-2xl font-black mb-8 text-center">ログイン</h1>
      <LoginForm next={safeNext} />
      <p className="text-xs text-gray-400 text-center mt-6">
        サブスタ継続可視化ツールKeep Substackは現在完全招待制です。招待されている方のみログインできます
      </p>
    </main>
  )
}
