import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import LoginForm from './LoginForm'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/my')

  const { next } = await searchParams
  const safeNext = next && next.startsWith('/') && !next.startsWith('//')
    ? next
    : undefined

  return (
    <main className="max-w-sm mx-auto px-4 py-16">
      <h1 className="text-2xl font-semibold mb-8 text-center">ログイン</h1>
      <LoginForm next={safeNext} />
    </main>
  )
}
