import { redis } from './redis'
import type { Member } from './types'

// D-10: KV からメンバーを取得する関数
// D-01: redis.get('members') で Member[] を取得。キーが存在しない場合は [] を返す
export async function getMembers(): Promise<Member[]> {
  const members = await redis.get<any[]>('members')
  if (!members) return []
  return members.map((m) => ({
    ...m,
    teamName: m.teamName ?? m.teamId ?? '',
  }))
}

// D-07: addedAt はサーバー側で付与する
// D-15: 重複substackIdはErrorをthrow（useActionStateでのエラーハンドリング用）
export async function addMember(member: Omit<Member, 'addedAt'>): Promise<void> {
  const members = await getMembers()
  if (members.some((m) => m.substackId === member.substackId)) {
    throw new Error(`substackId "${member.substackId}" は既に登録されています`)
  }
  const newMember: Member = { ...member, addedAt: new Date().toISOString() }
  await redis.set('members', [...members, newMember])
}

// 存在しないsubstackIdを削除しようとしても静かに成功する
export async function deleteMember(substackId: string): Promise<void> {
  const members = await getMembers()
  const updated = members.filter((m) => m.substackId !== substackId)
  await redis.set('members', updated)
}

export async function updateMember(
  substackId: string,
  updates: Partial<Omit<Member, 'substackId'>>
): Promise<void> {
  const members = await getMembers()
  const idx = members.findIndex((m) => m.substackId === substackId)
  if (idx === -1) throw new Error(`メンバーが見つかりません: ${substackId}`)
  members[idx] = { ...members[idx], ...updates }
  await redis.set('members', members)
}
