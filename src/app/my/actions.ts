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
  const rawHandle = (formData.get('substack_handle') as string | null)?.trim() ?? ''
  const substack_handle: string | null = rawHandle === '' ? null : rawHandle.startsWith('@') ? rawHandle : '@' + rawHandle

  if (!name) return '名前を入力してください'

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 'ログインセッションが切れました。再ログインしてください'

  const admin = createSupabaseAdminClient()

  // Update the authenticated member's name, scoped to their own user_id (no member_id from client).
  const { data: member, error: updateError } = await admin
    .from('members')
    .update({ name, substack_handle })
    .eq('user_id', user.id)
    .select('id')
    .single()

  // D-05: substack_handle unique 違反 (23505) を先にチェック
  if (updateError?.code === '23505') {
    return 'このハンドルはすでに使用されています'
  }

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

export async function updateCommitSlotsAction(
  prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const rawSlots = formData.get('slots') as string | null
  if (!rawSlots) return 'スロットデータが見つかりません'

  let slots: { day_of_week: number; hour: number }[]
  try {
    slots = JSON.parse(rawSlots)
  } catch {
    return 'スロットデータが不正です'
  }

  if (!Array.isArray(slots) || slots.length > 4) return '不正なスロット数です'
  for (const s of slots) {
    if (
      typeof s !== 'object' || s === null ||
      !Number.isInteger(s.day_of_week) || !Number.isInteger(s.hour)
    ) return 'スロットデータが不正です'
    if (s.day_of_week < 1 || s.day_of_week > 7) return '曜日の値が不正です'
    if (s.hour < 0 || s.hour > 23) return '時刻の値が不正です'
  }

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 'ログインセッションが切れました。再ログインしてください'

  const admin = createSupabaseAdminClient()

  const { data: member, error: memberError } = await admin
    .from('members')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (memberError || !member) {
    console.error('[updateCommitSlots] member lookup:', memberError)
    return '保存に失敗しました。もう一度お試しください'
  }

  // TODO: delete+insert は非アトミック。delete 成功後に insert が失敗するとスロットが消滅する。
  //       Supabase JS が DB トランザクションを直接サポートしないため、
  //       将来的に upsert (onConflict: member_id,day_of_week) + 余剰行 delete に置き換えること。
  const { error: deleteError } = await admin
    .from('member_commit_slots')
    .delete()
    .eq('member_id', member.id)

  if (deleteError) {
    console.error('[updateCommitSlots] delete failed — slots unchanged:', deleteError)
    return '保存に失敗しました。もう一度お試しください'
  }

  if (slots.length > 0) {
    const { error: insertError } = await admin
      .from('member_commit_slots')
      .insert(slots.map(s => ({ member_id: member.id, day_of_week: s.day_of_week, hour: s.hour })))

    if (insertError) {
      // delete は成功済み。スロットが空になった状態で insert が失敗している。
      console.error('[updateCommitSlots] insert failed after delete — slots are now empty:', insertError)
      return '保存に失敗しました。もう一度お試しください'
    }
  }

  revalidatePath('/my')
  return null
}
