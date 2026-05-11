'use server'

import { revalidatePath } from 'next/cache'
import { addMember, deleteMember, updateMember } from '@/lib/kvMembers'

export async function addMemberAction(
  prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const name = formData.get('name') as string
  const substackId = formData.get('substackId') as string
  const teamName = formData.get('teamName') as string

  if (!name || !substackId) {
    return 'name と substackId は必須です'
  }

  try {
    await addMember({ name, substackId, teamName: teamName ?? '' })
    revalidatePath('/admin')
    return null
  } catch (e) {
    return e instanceof Error ? e.message : '追加に失敗しました'
  }
}

export async function deleteMemberAction(substackId: string): Promise<void> {
  await deleteMember(substackId)
  revalidatePath('/admin')
}

export async function updateMemberAction(
  substackId: string,
  formData: FormData
): Promise<string | null> {
  const name = formData.get('name') as string
  const teamName = formData.get('teamName') as string
  const addedAt = formData.get('addedAt') as string

  if (!name) return 'name は必須です'
  if (!addedAt || new Date(addedAt).toString() === 'Invalid Date') {
    return 'addedAt は有効なISO日付文字列を入力してください'
  }

  try {
    await updateMember(substackId, { name, teamName: teamName ?? '', addedAt })
    revalidatePath('/admin')
    return null
  } catch (e) {
    return e instanceof Error ? e.message : '更新に失敗しました'
  }
}
