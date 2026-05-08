// RESEARCH.md §2「カレンダーUI向けのキーフィールド」に基づく
export type FeedItem = {
  title?: string
  link?: string
  pubDate?: string
  isoDate?: string // rss-parserが自動付与するISO 8601形式
}

export type Member = {
  name: string
  feedUrl: string
}

// Plan 01-02 の page.tsx が使う集約型
export type MemberFeedResult = {
  member: Member
  items: FeedItem[]
}
