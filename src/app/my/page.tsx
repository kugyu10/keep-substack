import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import LinkMemberForm from './LinkMemberForm'
import MyProfileForm from './MyProfileForm'
import LogoutButton from '@/components/LogoutButton'

export default async function MyPage({ searchParams }: { searchParams: Promise<{ handle?: string }> } = { searchParams: Promise.resolve({}) }) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { handle } = await searchParams

  const admin = createSupabaseAdminClient()
  const { data: member } = await admin
    .from('members')
    .select(`
      name,
      publication_id,
      substack_handle,
      member_teams (
        teams (name, status)
      )
    `)
    .eq('user_id', user.id)
    .maybeSingle()

  const currentTeams: { name: string; status: string }[] = member
    ? (member.member_teams as any[])
        .map((mt: any) => mt.teams)
        .filter(
          (t: unknown): t is { name: string; status: string } =>
            t !== null && typeof t === 'object' && 'name' in (t as object)
        )
    : []

  const { data: publicTeamsData } = await admin
    .from('teams')
    .select('id, name')
    .eq('status', 'public')
    .order('name')

  const publicTeams: { name: string }[] = (publicTeamsData ?? []).map(
    (t: any) => ({ name: t.name })
  )

  const substackHandleDefault = (member as any)?.substack_handle ?? handle ?? undefined

  return (
    <main className="max-w-sm mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">マイページ</h1>
        <LogoutButton />
      </div>
      {!member ? (
        <LinkMemberForm />
      ) : (
        <MyProfileForm
          member={{
            name: member.name,
            publicationId: member.publication_id,
            currentTeams,
            publicTeams,
          }}
          substackHandleDefault={substackHandleDefault}
        />
      )}
    </main>
  )
}
