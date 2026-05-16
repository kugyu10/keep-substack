import { createSupabaseAdminClient } from './supabase/admin'
import type { FeedItem } from './types'

type StoredFeed = { items: FeedItem[]; imageUrl?: string }

export async function getArticles(substackId: string): Promise<StoredFeed> {
  const supabase = createSupabaseAdminClient()
  const [articlesResult, memberResult] = await Promise.all([
    supabase
      .from('articles')
      .select('title, link, pub_date, image_url')
      .eq('substack_id', substackId)
      .order('pub_date', { ascending: false }),
    supabase
      .from('members')
      .select('image_url')
      .eq('substack_id', substackId)
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

export async function deleteArticles(substackId: string): Promise<void> {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from('articles')
    .delete()
    .eq('substack_id', substackId)
  if (error) throw error
}

// ON CONFLICT (link) DO NOTHING で重複排除（schema.sql の UNIQUE(link) 制約を利用）
// imageUrl が渡された場合は members.image_url を更新する
export async function saveArticles(
  substackId: string,
  newItems: FeedItem[],
  imageUrl?: string
): Promise<void> {
  const supabase = createSupabaseAdminClient()

  const validItems = newItems.filter((item) => item.link)
  if (validItems.length > 0) {
    const { error } = await supabase.from('articles').upsert(
      validItems.map((item) => ({
        substack_id: substackId,
        title: item.title ?? null,
        link: item.link!,
        pub_date: item.isoDate ?? null,
        image_url: item.thumbnail ?? null,
      })),
      { onConflict: 'link', ignoreDuplicates: true }
    )
    if (error) throw error
  }

  if (imageUrl !== undefined) {
    const { error } = await supabase
      .from('members')
      .update({ image_url: imageUrl })
      .eq('substack_id', substackId)
    if (error) throw error
  }
}
