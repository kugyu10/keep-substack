'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

async function requireAdmin(): Promise<void> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') {
    throw new Error('Unauthorized')
  }
}

export async function updateTeamStatusAction(
  teamId: string,
  status: string
): Promise<string | null> {
  try { await requireAdmin() } catch { return '権限がありません' }

  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from('teams')
    .update({ status })
    .eq('id', teamId)
  if (error) return error.message

  revalidatePath('/admin/teams')
  return null
}
