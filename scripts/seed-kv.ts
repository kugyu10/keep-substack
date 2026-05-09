// D-09: 一度だけ実行する移行スクリプト。npx tsx scripts/seed-kv.ts で実行。
// Pitfall 2 対策: dotenv は .env.local を明示指定する
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { Redis } from '@upstash/redis'
import membersJson from '../src/data/members.json'

const redis = Redis.fromEnv()

// 旧スキーマ: { name: string, feedUrl: string }
// 新スキーマ (D-03): { name: string, substackId: string, teamId: string, addedAt: string }
function migrate(old: { name: string; feedUrl: string }) {
  const m = old.feedUrl.match(/^https?:\/\/([^.]+)\.substack\.com/)
  if (!m) throw new Error(`feedUrl から substackId を抽出できません: ${old.feedUrl}`)
  return {
    name: old.name,
    substackId: m[1],
    teamId: 'default',
    addedAt: new Date().toISOString(),
  }
}

async function main() {
  const members = membersJson.map(migrate)
  // D-01: 単一キー 'members' に Member 配列を格納
  // D-02: @upstash/redis の自動シリアライズを使用（手動での文字列化は不要）
  await redis.set('members', members)
  console.log(`Seeded ${members.length} members:`)
  members.forEach((m) => console.log(`  - ${m.name} (${m.substackId})`))
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
