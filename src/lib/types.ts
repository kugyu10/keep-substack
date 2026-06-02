// RESEARCH.md §2「カレンダーUI向けのキーフィールド」に基づく
export type FeedItem = {
  title?: string
  link?: string
  pubDate?: string
  isoDate?: string // rss-parserが自動付与するISO 8601形式
  thumbnail?: string  // フェッチ時にcontent:encodedから抽出済みのサムネURL
}

export type Member = {
  name: string
  publicationId: string
  teams: { name: string; status: string }[]
  addedAt: string  // ISO 8601
  substackHandle?: string
}

// Phase 4 KV移行後のスキーマ（D-03）。フィードURLは publicationId から動的生成する（D-08）

// Plan 01-02 の page.tsx が使う集約型
export type MemberFeedResult = {
  member: Member
  items: FeedItem[]
  imageUrl?: string  // channel.image.url（取得失敗時 undefined）
}
