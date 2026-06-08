import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import LoginForm from './LoginForm'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ pid?: string; handle?: string }>
}) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/my')

  const { pid, handle } = await searchParams

  return (
    <main className="max-w-sm mx-auto px-4 py-12">
      <p className="text-2xl font-black text-center mb-6" style={{ fontFamily: 'Georgia, serif' }}>
        Keep Substack
      </p>
      <h1 className="text-2xl font-black mb-8 text-center">サインイン</h1>
      <LoginForm pid={pid} handle={handle} />
    </main>
  )
}
