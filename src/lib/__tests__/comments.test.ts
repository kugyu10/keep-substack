import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  parseNoteId,
  parseComment,
  parseReplies,
  isFresh,
  CACHE_TTL_MS,
  getNoteComments,
} from '../comments'
import readerFixture from './fixtures/comment_reader.json'
import repliesFixture from './fixtures/comment_replies.json'

// supabase clients をモック（fetch/DB 非依存でキャッシュ層を検証）。
const selectMaybeSingle = vi.fn()
const adminUpsert = vi.fn().mockResolvedValue({ error: null })

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: selectMaybeSingle,
        }),
      }),
    }),
  })),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: vi.fn(() => ({
    from: () => ({
      upsert: adminUpsert,
    }),
  })),
}))

describe('parseNoteId - 寛容パース（COMMENT-01）', () => {
  it('URL（c-付き）から数字 ID を抽出する', () => {
    expect(
      parseNoteId('https://substack.com/@uojun/note/c-276780760')
    ).toBe('276780760')
  })

  it('c-付き ID から数字部分を返す', () => {
    expect(parseNoteId('c-276780760')).toBe('276780760')
  })

  it('裸の数字 ID をそのまま返す', () => {
    expect(parseNoteId('276780760')).toBe('276780760')
  })

  it('前後の空白を許容する', () => {
    expect(parseNoteId('  c-276780760  ')).toBe('276780760')
  })

  it('空文字 → null', () => {
    expect(parseNoteId('')).toBeNull()
    expect(parseNoteId('   ')).toBeNull()
  })

  // 回帰ガード: 共有ボタンが吐く URL はクエリに数字を含むので、
  // 「最後の数字列」を拾う実装だと r=1abc2 の "2" を ID と誤認していた。
  it('共有 URL（utm_source + r クエリ付き）から正しい ID を抽出する', () => {
    expect(
      parseNoteId(
        'https://substack.com/@uojun/note/c-276780760?utm_source=notes-share-action&r=1abc2'
      )
    ).toBe('276780760')
  })

  it('r クエリのみ付いた共有 URL でも正しい ID を抽出する', () => {
    expect(parseNoteId('https://substack.com/@uojun/note/c-276780760?r=4xk9z')).toBe('276780760')
  })

  it('フラグメント付き URL でも正しい ID を抽出する', () => {
    expect(parseNoteId('https://substack.com/@uojun/note/c-276780760#comment-1')).toBe('276780760')
  })

  it('末尾スラッシュを許容する', () => {
    expect(parseNoteId('https://substack.com/@uojun/note/c-276780760/')).toBe('276780760')
  })

  it('c- も裸の数字末尾も無い URL → null', () => {
    expect(parseNoteId('https://open.substack.com/pub/uojun/p/hello-world?r=4xk9z')).toBeNull()
  })

  it('数字を含まない文字列 → null', () => {
    expect(parseNoteId('garbage')).toBeNull()
    expect(parseNoteId('c-')).toBeNull()
  })

  it('string でない入力 → null（throw しない）', () => {
    expect(parseNoteId(null)).toBeNull()
    expect(parseNoteId(undefined)).toBeNull()
    expect(parseNoteId(276780760)).toBeNull()
    expect(parseNoteId({})).toBeNull()
  })
})

describe('parseComment - children_count を件数化（COMMENT-02）', () => {
  it('reader フィクスチャから children_count(4) を返す', () => {
    expect(parseComment(readerFixture)).toBe(4)
  })

  it('children_count が 0 の正常レスポンス → 0（0件は error と区別）', () => {
    const json = { item: { comment: { children_count: 0 } } }
    expect(parseComment(json)).toBe(0)
  })

  it('不正 json / 欠落 → 0 を返し throw しない', () => {
    expect(parseComment(null)).toBe(0)
    expect(parseComment(undefined)).toBe(0)
    expect(parseComment('string')).toBe(0)
    expect(parseComment({})).toBe(0)
    expect(parseComment({ item: null })).toBe(0)
    expect(parseComment({ item: { comment: null } })).toBe(0)
    expect(parseComment({ item: { comment: { children_count: 'x' } } })).toBe(0)
  })
})

describe('parseReplies - commentBranches をフラット化（COMMENT-03/04）', () => {
  it('replies フィクスチャから 4件の CommentItem に変換する', () => {
    const items = parseReplies(repliesFixture)
    expect(items).toHaveLength(4)
  })

  it('各 item は id/name/body/photoUrl/date のみを持つ（reactionCount 非含・COMMENT-07 defer）', () => {
    const items = parseReplies(repliesFixture)
    for (const it of items) {
      expect(typeof it.id).toBe('number')
      expect(typeof it.name).toBe('string')
      expect(typeof it.body).toBe('string')
      expect(typeof it.date).toBe('string')
      expect(it.photoUrl === null || typeof it.photoUrl === 'string').toBe(true)
      expect(Object.keys(it).sort()).toEqual(['body', 'date', 'id', 'name', 'photoUrl'])
    }
  })

  it('photo_url が string → photoUrl に保持される', () => {
    const items = parseReplies(repliesFixture)
    expect(items[0].photoUrl).toContain('https://')
  })

  it('photo_url 欠落/非string → photoUrl は null に正規化（COMMENT-04）', () => {
    const json = {
      commentBranches: [
        { comment: { id: 1, name: 'a', body: 'x', date: '2025-01-01T00:00:00Z' } }, // photo_url 欠落
        { comment: { id: 2, name: 'b', body: 'y', date: '2025-01-01T00:00:00Z', photo_url: null } },
        { comment: { id: 3, name: 'c', body: 'z', date: '2025-01-01T00:00:00Z', photo_url: 42 } },
      ],
    }
    const items = parseReplies(json)
    expect(items.map((i) => i.photoUrl)).toEqual([null, null, null])
  })

  it('型不正 branch は除外される（型ガード）', () => {
    const json = {
      commentBranches: [
        { comment: { id: 1, name: 'a', body: 'x', date: '2025-01-01T00:00:00Z' } },
        { comment: { id: 'x', name: 'a', body: 'x', date: '2025-01-01T00:00:00Z' } }, // id 型不正
        { comment: { id: 2, name: 1, body: 'x', date: '2025-01-01T00:00:00Z' } }, // name 型不正
        { comment: { id: 3, name: 'a', body: 1, date: '2025-01-01T00:00:00Z' } }, // body 型不正
        { comment: { id: 4, name: 'a', body: 'x' } }, // date 欠落
        { comment: null },
        {},
      ],
    }
    const items = parseReplies(json)
    expect(items).toHaveLength(1)
    expect(items[0].id).toBe(1)
  })

  it('不正 json / commentBranches 欠落 → [] を返し throw しない', () => {
    expect(parseReplies(null)).toEqual([])
    expect(parseReplies(undefined)).toEqual([])
    expect(parseReplies('string')).toEqual([])
    expect(parseReplies({})).toEqual([])
    expect(parseReplies({ commentBranches: null })).toEqual([])
    expect(parseReplies({ commentBranches: 'x' })).toEqual([])
  })

  it('commentBranches 空配列 → [] （0件）', () => {
    expect(parseReplies({ commentBranches: [] })).toEqual([])
  })
})

describe('isFresh - 鮮度判定（CACHE_TTL_MS=30分・COMMENT-05）', () => {
  it('CACHE_TTL_MS は 30 * 60 * 1000（回帰耐性）', () => {
    expect(CACHE_TTL_MS).toBe(30 * 60 * 1000)
  })

  it('1分前 → fresh（true）', () => {
    const now = Date.now()
    const fetchedAt = new Date(now - 60 * 1000).toISOString()
    expect(isFresh(fetchedAt, now)).toBe(true)
  })

  it('31分前 → stale（false）', () => {
    const now = Date.now()
    const fetchedAt = new Date(now - 31 * 60 * 1000).toISOString()
    expect(isFresh(fetchedAt, now)).toBe(false)
  })

  it('ちょうど 30分前 → stale（false、未満判定）', () => {
    const now = Date.now()
    const fetchedAt = new Date(now - CACHE_TTL_MS).toISOString()
    expect(isFresh(fetchedAt, now)).toBe(false)
  })

  it('不正な日付文字列 → false', () => {
    expect(isFresh('not-a-date')).toBe(false)
  })
})

describe('getNoteComments - キャッシュ層 + fetch&retry（COMMENT-05/06/A2）', () => {
  // reader: comment 本体（件数）/ replies: 一覧 を返す fetch モックを組む。
  function mockFetchOk() {
    return vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
      const u = String(url)
      if (u.endsWith('/replies')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(repliesFixture) } as Response)
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(readerFixture) } as Response)
    })
  }

  beforeEach(() => {
    vi.useFakeTimers()
    selectMaybeSingle.mockReset()
    adminUpsert.mockClear().mockResolvedValue({ error: null })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('parseNoteId が null → invalid_input（fetch も select もしない・COMMENT-01）', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const result = await getNoteComments('garbage')
    expect(result).toEqual({ status: 'invalid_input' })
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(selectMaybeSingle).not.toHaveBeenCalled()
  })

  it('cache hit（fresh && !force）: select のみ・fetch しない・fromCache:true（COMMENT-05）', async () => {
    selectMaybeSingle.mockResolvedValue({
      data: {
        comment_count: 4,
        comments: [{ id: 1, name: 'a', body: 'x', photoUrl: null, date: '2026-06-15T22:00:00Z' }],
        fetched_at: new Date(Date.now() - 60 * 1000).toISOString(),
      },
      error: null,
    })
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const result = await getNoteComments('c-276780760')
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.fromCache).toBe(true)
      expect(result.count).toBe(4)
      expect(result.comments).toHaveLength(1)
    }
  })

  it('cache miss: fetch → upsert → fromCache:false（件数=children_count）', async () => {
    selectMaybeSingle.mockResolvedValue({ data: null, error: null })
    mockFetchOk()
    const promise = getNoteComments('276780760')
    await vi.runAllTimersAsync()
    const result = await promise
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.fromCache).toBe(false)
      expect(result.count).toBe(4) // reader children_count
      expect(result.comments).toHaveLength(4) // replies branches
    }
    expect(adminUpsert).toHaveBeenCalledTimes(1)
  })

  it('stale cache（31分前）: fetch して更新・fromCache:false', async () => {
    selectMaybeSingle.mockResolvedValue({
      data: {
        comment_count: 1,
        comments: [],
        fetched_at: new Date(Date.now() - 31 * 60 * 1000).toISOString(),
      },
      error: null,
    })
    mockFetchOk()
    const promise = getNoteComments('276780760')
    await vi.runAllTimersAsync()
    const result = await promise
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.fromCache).toBe(false)
      expect(result.count).toBe(4)
    }
    expect(adminUpsert).toHaveBeenCalledTimes(1)
  })

  it('force: fresh cache でも fetch して更新・fromCache:false', async () => {
    selectMaybeSingle.mockResolvedValue({
      data: {
        comment_count: 99,
        comments: [],
        fetched_at: new Date(Date.now() - 60 * 1000).toISOString(), // fresh
      },
      error: null,
    })
    mockFetchOk()
    const promise = getNoteComments('276780760', { force: true })
    await vi.runAllTimersAsync()
    const result = await promise
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.fromCache).toBe(false)
      expect(result.count).toBe(4) // cache の 99 ではなく fetch 結果
    }
    expect(adminUpsert).toHaveBeenCalledTimes(1)
  })

  it('fetch 異常が2回続く → error。stale をフォールバック返却しない（A2/COMMENT-06）', async () => {
    selectMaybeSingle.mockResolvedValue({
      data: {
        comment_count: 5,
        comments: [{ id: 1, name: 'a', body: 'stale', photoUrl: null, date: '2026-06-15T22:00:00Z' }],
        fetched_at: new Date(Date.now() - 31 * 60 * 1000).toISOString(), // stale
      },
      error: null,
    })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 500 } as Response)
    const promise = getNoteComments('276780760')
    await vi.runAllTimersAsync()
    const result = await promise
    expect(result).toEqual({ status: 'error' }) // stale を返さない
    expect(adminUpsert).not.toHaveBeenCalled()
  })

  it('1回目失敗 → 1秒待ち → 2回目成功 → ok（リトライ踏襲）', async () => {
    selectMaybeSingle.mockResolvedValue({ data: null, error: null })
    let call = 0
    vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
      call++
      // 最初の2リクエスト（本体+replies の1試行目）を失敗させ、2試行目を成功させる
      if (call <= 2) return Promise.resolve({ ok: false, status: 500 } as Response)
      const u = String(url)
      if (u.endsWith('/replies')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(repliesFixture) } as Response)
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(readerFixture) } as Response)
    })
    const promise = getNoteComments('276780760')
    await vi.runAllTimersAsync()
    const result = await promise
    expect(result.status).toBe('ok')
  })

  it('0件（children_count===0 / commentBranches 空）: ok・count:0・comments:[]（error と区別・COMMENT-06）', async () => {
    selectMaybeSingle.mockResolvedValue({ data: null, error: null })
    vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
      const u = String(url)
      if (u.endsWith('/replies')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ commentBranches: [] }) } as Response)
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ item: { comment: { children_count: 0 } } }),
      } as Response)
    })
    const promise = getNoteComments('276780760')
    await vi.runAllTimersAsync()
    const result = await promise
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.count).toBe(0)
      expect(result.comments).toEqual([])
      expect(result.fromCache).toBe(false)
    }
  })
})
