import { redis } from './redis'
import type { Member } from './types'

// D-10: KV からメンバーを取得する関数
// D-01: redis.get('members') で Member[] を取得。キーが存在しない場合は [] を返す
export async function getMembers(): Promise<Member[]> {
  const members = await redis.get<Member[]>('members')
  return members ?? []
}
