import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import TeamStatusList from './TeamStatusList'

export default async function AdminTeamsPage() {
  const supabase = createSupabaseAdminClient()
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, status')
    .order('name')

  return (
    <main className="max-w-3xl mx-auto p-6">
      <a href="/admin" className="text-sm text-blue-600 hover:underline block mb-4">
        ← 管理画面へ
      </a>
      <h1 className="text-2xl font-semibold mb-6">チーム設定</h1>
      <TeamStatusList teams={teams ?? []} />
    </main>
  )
}
