'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export async function linkMemberAction(
  prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const publicationId = (formData.get('publicationId') as string)?.trim()
  if (!publicationId) return 'Publication ID を入力してください'

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return '認証が必要です'

  const admin = createSupabaseAdminClient()

  const { data: member } = await admin
    .from('members')
    .select('id, user_id')
    .eq('publication_id', publicationId)
    .maybeSingle()

  if (!member) return `"${publicationId}" というメンバーは登録されていません`
  if (member.user_id) return 'このメンバーは既に別のアカウントと紐付けられています'

  const { error } = await admin
    .from('members')
    .update({ user_id: user.id })
    .eq('publication_id', publicationId)

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
  // Field contract for Plan 02's form: checkbox inputs use name="teams".
  const checkedTeamNames = formData.getAll('teams').map(String)

  if (!name) return '名前を入力してください'

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 'ログインセッションが切れました。再ログインしてください'

  const admin = createSupabaseAdminClient()

  // Update the authenticated member's name, scoped to their own user_id (no member_id from client).
  const { data: member, error: updateError } = await admin
    .from('members')
    .update({ name })
    .eq('user_id', user.id)
    .select('id')
    .single()

  if (updateError || !member) {
    console.error('[updateMyProfile] member update:', updateError)
    return '保存に失敗しました。もう一度お試しください'
  }

  // Canonical validation source (D-07): only status='public' teams may be joined/left here.
  const { data: publicTeams, error: teamsError } = await admin
    .from('teams')
    .select('id, name')
    .eq('status', 'public')

  if (teamsError) {
    console.error('[updateMyProfile] fetch public teams:', teamsError)
    return '保存に失敗しました。もう一度お試しください'
  }

  const publicTeamIds = (publicTeams ?? []).map((t) => t.id)
  // D-08: submitted names not in the public set are silently ignored. No free-creation upsert.
  const allowed = (publicTeams ?? []).filter((t) => checkedTeamNames.includes(t.name))

  // D-09: delete ONLY this member's public-team rows; private/hidden membership is preserved.
  // Guard the .in() when there are no public teams so we never issue a broad/no-op delete.
  if (publicTeamIds.length > 0) {
    const { error: deleteError } = await admin
      .from('member_teams')
      .delete()
      .eq('member_id', member.id)
      .in('team_id', publicTeamIds)

    if (deleteError) {
      console.error('[updateMyProfile] delete member_teams:', deleteError)
      return '保存に失敗しました。もう一度お試しください'
    }
  }

  if (allowed.length > 0) {
    const { error: insertError } = await admin
      .from('member_teams')
      .insert(allowed.map((t) => ({ member_id: member.id, team_id: t.id })))

    if (insertError) {
      console.error('[updateMyProfile] insert member_teams:', insertError)
      return '保存に失敗しました。もう一度お試しください'
    }
  }

  revalidatePath('/my')
  return null
}
