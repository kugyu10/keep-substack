import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { FeedItem } from '../types'

// createSupabaseAdminClient をモックして upsert 呼び出しを捕捉する
const upsertMock = vi.fn(() => ({ error: null }))
const eqMock = vi.fn(() => ({ error: null }))
const updateMock = vi.fn(() => ({ eq: eqMock }))

vi.mock('../supabase/admin', () => ({
  createSupabaseAdminClient: () => ({
    from: (table: string) => {
      if (table === 'articles') return { upsert: upsertMock }
      return { update: updateMock }
    },
  }),
}))

import { saveArticles } from '../articles'

const item = (link: string, thumbnail?: string): FeedItem => ({
  title: `title-${link}`,
  link,
  isoDate: '2025-01-01T00:00:00Z',
  thumbnail,
})

describe('saveArticles - image_url バックフィル', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('thumbnail がある項目は merge-duplicates（ignoreDuplicates なし）で image_url 込み upsert する', async () => {
    await saveArticles('pub1', [item('https://e.com/a', 'https://img/a.jpg')])

    const withThumbCall = upsertMock.mock.calls.find(
      ([rows]) => (rows as any[])[0]?.image_url
    )
    expect(withThumbCall).toBeDefined()
    const [rows, opts] = withThumbCall as [any[], any]
    expect(rows[0]).toMatchObject({
      publication_id: 'pub1',
      link: 'https://e.com/a',
      image_url: 'https://img/a.jpg',
    })
    // 既存行を更新（バックフィル）するため ignoreDuplicates は付けない
    expect(opts).toEqual({ onConflict: 'link' })
    expect(opts.ignoreDuplicates).toBeUndefined()
  })

  it('thumbnail が無い項目は INSERT のみ（ignoreDuplicates: true）で既存 image_url を保護する', async () => {
    await saveArticles('pub1', [item('https://e.com/b')])

    const withoutThumbCall = upsertMock.mock.calls.find(
      ([, opts]) => (opts as any)?.ignoreDuplicates === true
    )
    expect(withoutThumbCall).toBeDefined()
    const [, opts] = withoutThumbCall as [any[], any]
    expect(opts).toEqual({ onConflict: 'link', ignoreDuplicates: true })
  })

  it('混在時は thumbnail 有無で2回に分けて upsert する', async () => {
    await saveArticles('pub1', [
      item('https://e.com/a', 'https://img/a.jpg'),
      item('https://e.com/b'),
    ])
    expect(upsertMock).toHaveBeenCalledTimes(2)
  })

  it('link が無い項目は除外される', async () => {
    await saveArticles('pub1', [{ title: 'no-link', link: undefined, isoDate: '2025-01-01' }])
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('imageUrl が渡されると members.image_url を更新する', async () => {
    await saveArticles('pub1', [], 'https://avatar/x.png')
    expect(updateMock).toHaveBeenCalledWith({ image_url: 'https://avatar/x.png' })
    expect(eqMock).toHaveBeenCalledWith('publication_id', 'pub1')
  })
})
