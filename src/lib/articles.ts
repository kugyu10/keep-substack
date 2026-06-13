import { createSupabaseAdminClient } from './supabase/admin'
import type { FeedItem } from './types'

type StoredFeed = { items: FeedItem[]; imageUrl?: string }

export async function getArticles(publicationId: string): Promise<StoredFeed> {
  const supabase = createSupabaseAdminClient()
  const [articlesResult, memberResult] = await Promise.all([
    supabase
      .from('articles')
      .select('title, link, pub_date, image_url')
      .eq('publication_id', publicationId)
      .order('pub_date', { ascending: false }),
    supabase
      .from('members')
      .select('image_url')
      .eq('publication_id', publicationId)
      .maybeSingle(),
  ])

  const items: FeedItem[] = (articlesResult.data ?? []).map((a: any) => ({
    title: a.title ?? undefined,
    link: a.link,
    isoDate: a.pub_date ?? undefined,
    thumbnail: a.image_url ?? undefined,
  }))

  return {
    items,
    imageUrl: memberResult.data?.image_url ?? undefined,
  }
}

/**
 * 複数 publicationId ぶんの記事と members.image_url を安価な DB クエリ（2本）で
 * 一括取得する。OG画像の「仲間一覧風」描画用（RSS フェッチ禁止）。
 * 返り値は publicationId をキーにした Map。
 */
export async function getArticlesForMembers(
  publicationIds: string[]
): Promise<Map<string, StoredFeed>> {
  const result = new Map<string, StoredFeed>()
  for (const id of publicationIds) result.set(id, { items: [] })
  if (publicationIds.length === 0) return result

  const supabase = createSupabaseAdminClient()
  const [articlesResult, membersResult] = await Promise.all([
    supabase
      .from('articles')
      .select('publication_id, title, link, pub_date, image_url')
      .in('publication_id', publicationIds)
      .order('pub_date', { ascending: false }),
    supabase
      .from('members')
      .select('publication_id, image_url')
      .in('publication_id', publicationIds),
  ])

  for (const a of articlesResult.data ?? []) {
    const row = a as any
    const feed = result.get(row.publication_id)
    if (!feed) continue
    feed.items.push({
      title: row.title ?? undefined,
      link: row.link,
      isoDate: row.pub_date ?? undefined,
      thumbnail: row.image_url ?? undefined,
    })
  }
  for (const m of membersResult.data ?? []) {
    const row = m as any
    const feed = result.get(row.publication_id)
    if (feed) feed.imageUrl = row.image_url ?? undefined
  }
  return result
}

export async function deleteArticles(publicationId: string): Promise<void> {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from('articles')
    .delete()
    .eq('publication_id', publicationId)
  if (error) throw error
}

// schema.sql の UNIQUE(link) 制約を利用して link 単位で upsert する。
// thumbnail がある項目は ON CONFLICT で値を更新（image_url のバックフィル）し、
// thumbnail が無い項目は INSERT のみ（ignoreDuplicates）にして既存の image_url を
// NULL で上書きしないようにする。これにより、過去に空で保存された古い記事も
// live feed に残っている間に正しいサムネイルへバックフィルされる。
// imageUrl が渡された場合は members.image_url を更新する
export async function saveArticles(
  publicationId: string,
  newItems: FeedItem[],
  imageUrl?: string
): Promise<void> {
  const supabase = createSupabaseAdminClient()

  const validItems = newItems.filter((item) => item.link)

  // thumbnail あり: image_url 込みで merge-duplicates（既存行も更新＝バックフィル）
  const withThumb = validItems.filter((item) => item.thumbnail)
  // thumbnail なし: INSERT のみ（既存の image_url を保持し、NULL 上書きを防ぐ）
  const withoutThumb = validItems.filter((item) => !item.thumbnail)

  if (withThumb.length > 0) {
    const { error } = await supabase.from('articles').upsert(
      withThumb.map((item) => ({
        publication_id: publicationId,
        title: item.title ?? null,
        link: item.link!,
        pub_date: item.isoDate ?? null,
        image_url: item.thumbnail,
      })),
      { onConflict: 'link' }
    )
    if (error) throw error
  }

  if (withoutThumb.length > 0) {
    const { error } = await supabase.from('articles').upsert(
      withoutThumb.map((item) => ({
        publication_id: publicationId,
        title: item.title ?? null,
        link: item.link!,
        pub_date: item.isoDate ?? null,
        image_url: null,
      })),
      { onConflict: 'link', ignoreDuplicates: true }
    )
    if (error) throw error
  }

  if (imageUrl !== undefined) {
    const { error } = await supabase
      .from('members')
      .update({ image_url: imageUrl })
      .eq('publication_id', publicationId)
    if (error) throw error
  }
}
