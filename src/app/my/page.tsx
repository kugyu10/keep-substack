import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import LinkMemberForm from './LinkMemberForm'
import MyProfileForm from './MyProfileForm'

export default async function MyPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login-51cf21389c56')

  const admin = createSupabaseAdminClient()
  const { data: member } = await admin
    .from('members')
    .select(`
      name,
      publication_id,
      member_teams (
        teams (name)
      )
    `)
    .eq('user_id', user.id)
    .maybeSingle()

  const teamNames: string[] = member
    ? (member.member_teams as any[])
        .map((mt: any) => mt.teams?.name)
        .filter((n: unknown): n is string => typeof n === 'string')
    : []

  return (
    <main className="max-w-sm mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-6">マイページ</h1>
      {!member ? (
        <LinkMemberForm />
      ) : (
        <MyProfileForm
          member={{
            name: member.name,
            publicationId: member.publication_id,
            team_names: teamNames,
          }}
        />
      )}
    </main>
  )
}
