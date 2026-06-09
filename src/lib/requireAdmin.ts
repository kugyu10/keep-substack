import { createSupabaseServerClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/authz'

// server action 用 admin ガードの単一実装（M-2）。
// admin/actions.ts と admin/teams/actions.ts の重複していた requireAdmin を集約。
export async function requireAdmin(): Promise<void> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdmin(user)) {
    throw new Error('Unauthorized')
  }
}
