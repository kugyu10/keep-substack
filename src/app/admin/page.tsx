import { getMembers } from '@/lib/members'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import AdminAddForm from './AdminAddForm'
import AdminMemberList from './AdminMemberList'
import LogoutButton from '@/components/LogoutButton'

export default async function AdminPage() {
  const supabase = createSupabaseAdminClient()
  const [members, teamsResult] = await Promise.all([
    getMembers(),
    supabase.from('teams').select('name').order('name'),
  ])
  const teams = (teamsResult.data ?? []).map((t) => t.name)

  return (
    <main className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">管理画面</h1>
        <LogoutButton />
      </div>
      <p className="text-sm text-gray-600 mb-4">メンバー数：{members.length}</p>
      <AdminAddForm teams={teams} />
      <AdminMemberList members={members} teams={teams} />
    </main>
  )
}
