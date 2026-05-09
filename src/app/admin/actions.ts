'use server'

import { revalidatePath } from 'next/cache'
import { addMember, deleteMember } from '@/lib/kvMembers'

export async function addMemberAction(
  prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const name = formData.get('name') as string
  const substackId = formData.get('substackId') as string
  const teamId = formData.get('teamId') as string

  if (!name || !substackId) {
    return 'name と substackId は必須です'
  }

  try {
    await addMember({ name, substackId, teamId: teamId ?? '' })
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
