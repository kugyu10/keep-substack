import { createSupabaseAdminClient } from './supabase/admin'
import type { Member } from './types'

export async function getMembers(): Promise<Member[]> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('members')
    .select(`
      name,
      substack_id,
      added_at,
      member_teams (
        teams (name)
      )
    `)
  if (error) throw error
  if (!data) return []
  return data.map((m: any) => ({
    name: m.name,
    substackId: m.substack_id,
    teamNames: (m.member_teams as any[])
      .map((mt: any) => mt.teams?.name)
      .filter((n: unknown): n is string => typeof n === 'string'),
    addedAt: m.added_at,
  }))
}

export async function addMember(member: Omit<Member, 'addedAt'>): Promise<void> {
  const supabase = createSupabaseAdminClient()

  const { data: existing } = await supabase
    .from('members')
    .select('id')
    .eq('substack_id', member.substackId)
    .maybeSingle()
  if (existing) {
    throw new Error(`substackId "${member.substackId}" は既に登録されています`)
  }

  const { data: newMember, error: insertError } = await supabase
    .from('members')
    .insert({
      name: member.name,
      substack_id: member.substackId,
      added_at: new Date().toISOString(),
    })
    .select('id')
    .single()
  if (insertError) throw insertError

  for (const teamName of member.teamNames) {
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .upsert({ name: teamName }, { onConflict: 'name' })
      .select('id')
      .single()
    if (teamError) throw teamError

    const { error: mtError } = await supabase
      .from('member_teams')
      .insert({ member_id: newMember.id, team_id: team.id })
    if (mtError) throw mtError
  }
}

// 存在しない substackId を削除しようとしても静かに成功する（既存動作を維持）
export async function deleteMember(substackId: string): Promise<void> {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from('members')
    .delete()
    .eq('substack_id', substackId)
  if (error) throw error
}

export async function updateMember(
  substackId: string,
  updates: Partial<Omit<Member, 'substackId'>>
): Promise<void> {
  const supabase = createSupabaseAdminClient()

  const { data: member, error: findError } = await supabase
    .from('members')
    .select('id')
    .eq('substack_id', substackId)
    .maybeSingle()
  if (findError) throw findError
  if (!member) throw new Error(`メンバーが見つかりません: ${substackId}`)

  const memberUpdate: Record<string, unknown> = {}
  if (updates.name !== undefined) memberUpdate.name = updates.name
  if (updates.addedAt !== undefined) memberUpdate.added_at = updates.addedAt
  if (Object.keys(memberUpdate).length > 0) {
    const { error: updateError } = await supabase
      .from('members')
      .update(memberUpdate)
      .eq('substack_id', substackId)
    if (updateError) throw updateError
  }

  if (updates.teamNames !== undefined) {
    const { error: deleteError } = await supabase
      .from('member_teams')
      .delete()
      .eq('member_id', member.id)
    if (deleteError) throw deleteError

    for (const teamName of updates.teamNames) {
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .upsert({ name: teamName }, { onConflict: 'name' })
        .select('id')
        .single()
      if (teamError) throw teamError

      const { error: mtError } = await supabase
        .from('member_teams')
        .insert({ member_id: member.id, team_id: team.id })
      if (mtError) throw mtError
    }
  }
}
