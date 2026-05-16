import { getMembers } from '@/lib/kvMembers'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import AdminAddForm from './AdminAddForm'
import AdminMemberList from './AdminMemberList'

export default async function AdminPage() {
  const supabase = createSupabaseAdminClient()
  const [members, teamsResult] = await Promise.all([
    getMembers(),
    supabase.from('teams').select('name').order('name'),
  ])
  const teams = (teamsResult.data ?? []).map((t) => t.name)

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6">管理画面</h1>
      <p className="text-sm text-gray-600 mb-4">メンバー数：{members.length}</p>
      <AdminAddForm teams={teams} />
      <AdminMemberList members={members} teams={teams} />
    </main>
  )
}
