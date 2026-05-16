'use server'

import { revalidatePath } from 'next/cache'
import { addMember, deleteMember, updateMember } from '@/lib/members'
import { fetchWithRetry } from '@/lib/fetchFeed'
import { saveArticles, deleteArticles } from '@/lib/articles'
import { createSupabaseServerClient } from '@/lib/supabase/server'

async function requireAdmin(): Promise<void> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') {
    throw new Error('Unauthorized')
  }
}

export async function addMemberAction(
  prevState: string | null,
  formData: FormData
): Promise<string | null> {
  try { await requireAdmin() } catch { return '権限がありません' }

  const name = formData.get('name') as string
  const publicationId = formData.get('publicationId') as string
  const teamNames = formData.getAll('teamNames') as string[]

  if (!name || !publicationId) {
    return 'name と publicationId は必須です'
  }

  try {
    await addMember({ name, publicationId, teamNames })
  } catch (e) {
    return e instanceof Error ? e.message : '追加に失敗しました'
  }

  revalidatePath('/admin')

  try {
    const { items, imageUrl } = await fetchWithRetry(
      `https://${publicationId}.substack.com/feed`
    )
    await saveArticles(publicationId, items, imageUrl)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'RSS取得に失敗しました'
    return `メンバーを追加しましたが、RSS取得に失敗しました: ${msg}`
  }

  return null
}

export async function deleteMemberAction(publicationId: string): Promise<void> {
  await requireAdmin()
  await deleteMember(publicationId)
  await deleteArticles(publicationId)
  revalidatePath('/admin')
}

export async function updateMemberAction(
  publicationId: string,
  formData: FormData
): Promise<string | null> {
  try { await requireAdmin() } catch { return '権限がありません' }

  const name = formData.get('name') as string
  const teamNames = formData.getAll('teamNames') as string[]
  const addedAt = formData.get('addedAt') as string

  if (!name) return 'name は必須です'
  if (!addedAt || new Date(addedAt).toString() === 'Invalid Date') {
    return 'addedAt は有効なISO日付文字列を入力してください'
  }

  try {
    await updateMember(publicationId, { name, teamNames, addedAt })
    revalidatePath('/admin')
    return null
  } catch (e) {
    return e instanceof Error ? e.message : '更新に失敗しました'
  }
}
