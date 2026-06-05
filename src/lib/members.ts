import { createSupabaseAdminClient } from './supabase/admin'
import type { Member } from './types'

export async function getMembers(): Promise<Member[]> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('members')
    .select(`
      id,
      name,
      publication_id,
      added_at,
      substack_handle,
      member_teams (
        teams (name, status)
      )
    `)
  if (error) throw error
  if (!data) return []
  return data.map((m: any) => ({
    id: m.id,
    name: m.name,
    publicationId: m.publication_id,
    teams: (m.member_teams as any[])
      .map((mt: any) => mt.teams)
      .filter((t: unknown): t is { name: string; status: string } =>
        t !== null && typeof t === 'object' && 'name' in (t as object)
      ),
    addedAt: m.added_at,
    substackHandle: m.substack_handle ?? undefined,
  }))
}

export async function addMember(member: Omit<Member, 'addedAt'>): Promise<void> {
  const supabase = createSupabaseAdminClient()

  const { data: existing } = await supabase
    .from('members')
    .select('id')
    .eq('publication_id', member.publicationId)
    .maybeSingle()
  if (existing) {
    throw new Error(`publicationId "${member.publicationId}" は既に登録されています`)
  }

  const { data: newMember, error: insertError } = await supabase
    .from('members')
    .insert({
      name: member.name,
      publication_id: member.publicationId,
      added_at: new Date().toISOString(),
    })
    .select('id')
    .single()
  if (insertError) throw insertError

  for (const teamObj of member.teams) {
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .upsert({ name: teamObj.name, status: teamObj.status }, { onConflict: 'name' })
      .select('id')
      .single()
    if (teamError) throw teamError

    const { error: mtError } = await supabase
      .from('member_teams')
      .insert({ member_id: newMember.id, team_id: team.id })
    if (mtError) throw mtError
  }
}

// 存在しない publicationId を削除しようとしても静かに成功する（既存動作を維持）
export async function deleteMember(publicationId: string): Promise<void> {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from('members')
    .delete()
    .eq('publication_id', publicationId)
  if (error) throw error
}

export async function updateMember(
  publicationId: string,
  updates: Partial<Omit<Member, 'id'>>
): Promise<void> {
  const supabase = createSupabaseAdminClient()

  const { data: member, error: findError } = await supabase
    .from('members')
    .select('id')
    .eq('publication_id', publicationId)
    .maybeSingle()
  if (findError) throw findError
  if (!member) throw new Error(`メンバーが見つかりません: ${publicationId}`)

  const memberUpdate: Record<string, unknown> = {}
  if (updates.name !== undefined) memberUpdate.name = updates.name
  if (updates.addedAt !== undefined) memberUpdate.added_at = updates.addedAt
  if (updates.substackHandle !== undefined) memberUpdate.substack_handle = updates.substackHandle
  if (updates.publicationId !== undefined) memberUpdate.publication_id = updates.publicationId

  if (Object.keys(memberUpdate).length > 0) {
    const { error: updateError } = await supabase
      .from('members')
      .update(memberUpdate)
      .eq('publication_id', publicationId)
    if (updateError) throw updateError
  }

  // publication_id 変更時に articles テーブルを連動 UPDATE
  if (updates.publicationId !== undefined && updates.publicationId !== publicationId) {
    const { error: articlesUpdateError } = await supabase
      .from('articles')
      .update({ publication_id: updates.publicationId })
      .eq('publication_id', publicationId)
    if (articlesUpdateError) throw articlesUpdateError
  }

  if (updates.teams !== undefined) {
    const { error: deleteError } = await supabase
      .from('member_teams')
      .delete()
      .eq('member_id', member.id)
    if (deleteError) throw deleteError

    for (const teamObj of updates.teams) {
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .upsert({ name: teamObj.name, status: teamObj.status }, { onConflict: 'name' })
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
