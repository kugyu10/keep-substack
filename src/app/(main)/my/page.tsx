import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import LinkMemberForm from './LinkMemberForm'
import MyProfileForm from './MyProfileForm'
import CommitScheduleModal from './CommitScheduleModal'
import LogoutButton from '@/components/LogoutButton'

export default async function MyPage({ searchParams }: { searchParams: Promise<{ handle?: string }> }) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { handle } = await searchParams

  const admin = createSupabaseAdminClient()
  const { data: member } = await admin
    .from('members')
    .select(`
      id,
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

  const substackHandle = (member as any)?.substack_handle ?? null

  const { data: commitSlotsData } = member
    ? await admin
        .from('member_commit_slots')
        .select('id, day_of_week, hour')
        .eq('member_id', (member as any).id)
        .order('day_of_week')
    : { data: null }

  const commitSlots = (commitSlotsData ?? []) as { id: number; day_of_week: number; hour: number }[]

  return (
    <main className="max-w-sm mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">マイページ</h1>
        <LogoutButton />
      </div>
      {!member ? (
        <LinkMemberForm />
      ) : (
        <>
          <MyProfileForm
            member={{
              name: member.name,
              publicationId: member.publication_id,
              currentTeams,
              publicTeams,
            }}
            substackHandle={substackHandle}
          />
          <div className="mt-8">
            <h2 className="text-sm font-semibold mb-2">投稿スケジュール</h2>
            <CommitScheduleModal initialSlots={commitSlots} />
          </div>
        </>
      )}
      <div className="mt-10 text-center">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-800 underline">
          トップページへ
        </Link>
      </div>
    </main>
  )
}
