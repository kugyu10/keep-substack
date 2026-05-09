import { Redis } from '@upstash/redis'

// D-02: @upstash/redis の自動シリアライズを使用（redis.json.* は使わない）
// D-01: 単一キー 'members' に Member 配列を JSON 格納
export const redis = Redis.fromEnv()
