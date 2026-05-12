import { getMembers } from '@/lib/kvMembers'
import AdminAddForm from './AdminAddForm'
import AdminMemberList from './AdminMemberList'

export default async function AdminPage() {
  const members = await getMembers()

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6">管理画面</h1>
      <p className="text-sm text-gray-600 mb-4">メンバー数：{members.length}</p>
      <AdminAddForm />
      <AdminMemberList members={members} />
    </main>
  )
}
