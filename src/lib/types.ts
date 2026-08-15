// RESEARCH.md §2「カレンダーUI向けのキーフィールド」に基づく
export type FeedItem = {
  title?: string
  link?: string
  pubDate?: string
  isoDate?: string // rss-parserが自動付与するISO 8601形式
  thumbnail?: string  // フェッチ時にcontent:encodedから抽出済みのサムネURL
}

export type Member = {
  id: string  // UUID from members.id — required; use a placeholder UUID in test fixtures
  name: string
  publicationId: string
  teams: { name: string; status: string }[]
  addedAt: string  // ISO 8601
  substackHandle?: string | null
  hasUser: boolean  // true if members.user_id IS NOT NULL (auth user registered)
}

// Phase 4 KV移行後のスキーマ（D-03）。フィードURLは publicationId から動的生成する（D-08）

// Plan 01-02 の page.tsx が使う集約型
export type MemberFeedResult = {
  member: Member
  items: FeedItem[]
  imageUrl?: string  // channel.image.url（取得失敗時 undefined）
}

// Phase 29: member_commit_slots テーブルの行を型安全に表現する
// day_of_week は ISO 8601 規則: 1=月曜 〜 7=日曜 (Phase 28 D-15)
export type CommitSlot = {
  member_id: string  // UUID — members.id FK
  day_of_week: number  // 1–7 (1=月〜7=日)
  hour: number  // 0–23
}

// ゲーミフィケーション: src/lib/gamification.ts が導出する1メンバー分の統計
export type MemberGameStats = {
  memberId: string
  dailyStreak: number
  weeklyStreak: number
  postCount: number
  achievedWeekCount: number
  xp: number
  level: number
  currentLevelFloor: number
  nextLevelXp: number
  progressRatio: number // 0..1
}
