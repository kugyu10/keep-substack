'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/requireAdmin'

const VALID_STATUSES = ['public', 'private', 'hidden'] as const

export async function addTeamAction(name: string): Promise<string | null> {
  try { await requireAdmin() } catch { return '権限がありません' }

  const trimmed = name.trim()
  if (!trimmed) return 'チーム名を入力してください'
  if (trimmed.length > 50) return 'チーム名は50文字以内にしてください'

  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from('teams')
    .insert({ name: trimmed, status: 'public' })
  if (error) {
    if (error.code === '23505') return `「${trimmed}」は既に存在します`
    return error.message
  }

  revalidatePath('/admin/teams')
  return null
}

export async function updateTeamStatusAction(
  teamId: string,
  status: string
): Promise<string | null> {
  try { await requireAdmin() } catch { return '権限がありません' }

  if (!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    return '不正なステータスです'
  }

  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from('teams')
    .update({ status })
    .eq('id', teamId)
  if (error) return error.message

  revalidatePath('/admin/teams')
  return null
}
