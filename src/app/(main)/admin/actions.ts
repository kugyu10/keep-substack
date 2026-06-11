'use server'

import { revalidatePath } from 'next/cache'
import { addMember, deleteMember, updateMember } from '@/lib/members'
import { fetchFeedOrThrow } from '@/lib/fetchFeed'
import { saveArticles, deleteArticles } from '@/lib/articles'
import { requireAdmin } from '@/lib/requireAdmin'
import { isValidPublicationId, parseSubstackHandle, PUBLICATION_ID_ERROR } from '@/lib/validation'

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

  // H-1: publication_id は外部 fetch の URL に埋め込まれるため形式を厳格化（SSRF 対策）
  if (!isValidPublicationId(publicationId)) {
    return PUBLICATION_ID_ERROR
  }

  // 実在チェック: RSS フィードを取得できなければ登録しない（存在しない / typo の
  // publication_id を弾く）。fetchFeedOrThrow は失敗時に例外を投げる。
  // 取得できたフィードはそのまま保存に再利用し、二重フェッチを避ける。
  let feed
  try {
    feed = await fetchFeedOrThrow(`https://${publicationId}.substack.com/feed`)
  } catch {
    return `"${publicationId}" のSubstackフィードを取得できませんでした。publicationIDが正しいか確認してください`
  }

  try {
    await addMember({ name, publicationId, teams: teamNames.map((n) => ({ name: n, status: 'public' })) })
  } catch (e) {
    return e instanceof Error ? e.message : '追加に失敗しました'
  }

  revalidatePath('/admin')

  try {
    await saveArticles(publicationId, feed.items, feed.imageUrl)
  } catch (e) {
    const msg = e instanceof Error ? e.message : '記事の保存に失敗しました'
    return `メンバーを追加しましたが、記事の保存に失敗しました: ${msg}`
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

  const parsedHandle = parseSubstackHandle(formData.get('substack_handle') as string | null)
  if (!parsedHandle.ok) return parsedHandle.error
  const substack_handle = parsedHandle.value

  const new_publication_id = (formData.get('new_publication_id') as string | null)?.trim() || null
  // H-1: publication_id 変更時も形式を厳格化（SSRF 対策）
  if (new_publication_id !== null && !isValidPublicationId(new_publication_id)) {
    return PUBLICATION_ID_ERROR
  }

  // 実在チェック: publication_id を別IDへ変更する場合、新IDのSubstackフィードが
  // 取得できなければ更新しない（存在しない / typo を弾く）。
  if (new_publication_id !== null && new_publication_id !== publicationId) {
    try {
      await fetchFeedOrThrow(`https://${new_publication_id}.substack.com/feed`)
    } catch {
      return `"${new_publication_id}" のSubstackフィードを取得できませんでした。publicationIDが正しいか確認してください`
    }
  }

  try {
    await updateMember(publicationId, {
      name,
      teams: teamNames.map((teamName) => ({ name: teamName, status: 'public' })),
      addedAt,
      substackHandle: substack_handle,
      ...(new_publication_id ? { publicationId: new_publication_id } : {}),
    })
    revalidatePath('/admin')
    return null
  } catch (e) {
    if (e instanceof Error && ((e as any).code === '23505' || e.message.includes('23505'))) {
      return 'このハンドルはすでに使用されています'
    }
    return e instanceof Error ? e.message : '更新に失敗しました'
  }
}
