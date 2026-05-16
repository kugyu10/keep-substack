'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export async function linkMemberAction(
  prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const substackId = (formData.get('substackId') as string)?.trim()
  if (!substackId) return 'Substack ID を入力してください'

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return '認証が必要です'

  const admin = createSupabaseAdminClient()

  const { data: member } = await admin
    .from('members')
    .select('id, user_id')
    .eq('substack_id', substackId)
    .maybeSingle()

  if (!member) return `"${substackId}" というメンバーは登録されていません`
  if (member.user_id) return 'このメンバーは既に別のアカウントと紐付けられています'

  const { error } = await admin
    .from('members')
    .update({ user_id: user.id })
    .eq('substack_id', substackId)

  if (error) {
    console.error('[linkMember]', error)
    return '紐付けに失敗しました'
  }

  revalidatePath('/my')
  return null
}

export async function updateMyProfileAction(
  prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const name = (formData.get('name') as string)?.trim()
  const teamNamesRaw = (formData.get('teamNames') as string) ?? ''

  if (!name) return '名前を入力してください'

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return '認証が必要です'

  const admin = createSupabaseAdminClient()

  const { data: member, error: updateError } = await admin
    .from('members')
    .update({ name })
    .eq('user_id', user.id)
    .select('id')
    .single()

  if (updateError || !member) {
    console.error('[updateMyProfile] member update:', updateError)
    return 'プロフィールの更新に失敗しました'
  }

  const teamNames = teamNamesRaw.split(',').map((s) => s.trim()).filter(Boolean)

  const { error: deleteError } = await admin
    .from('member_teams')
    .delete()
    .eq('member_id', member.id)

  if (deleteError) {
    console.error('[updateMyProfile] delete member_teams:', deleteError)
    return 'チーム情報の更新に失敗しました'
  }

  for (const teamName of teamNames) {
    const { data: team, error: teamError } = await admin
      .from('teams')
      .upsert({ name: teamName }, { onConflict: 'name' })
      .select('id')
      .single()

    if (teamError) {
      console.error('[updateMyProfile] upsert team:', teamError)
      continue
    }

    await admin.from('member_teams').insert({ member_id: member.id, team_id: team.id })
  }

  revalidatePath('/my')
  return null
}
