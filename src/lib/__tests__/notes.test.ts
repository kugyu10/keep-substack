import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { parseNoteFeed, fetchAdminNotes } from '../notes'
import fixture from './fixtures/profile_feed.json'

describe('parseNoteFeed - 純関数（fetch 非依存）', () => {
  it('フィクスチャから note だけ 8件抽出する（restack は除外）', () => {
    const notes = parseNoteFeed(fixture)
    expect(notes).toHaveLength(8)
  })

  it('各 NoteItem は id:number / body:string / date:string のみを持つ（children_count/reaction_count を含めない＝D-04）', () => {
    const notes = parseNoteFeed(fixture)
    for (const n of notes) {
      expect(typeof n.id).toBe('number')
      expect(typeof n.body).toBe('string')
      expect(typeof n.date).toBe('string')
      // D-04: 余分なキーを持たない
      expect(Object.keys(n).sort()).toEqual(['body', 'date', 'id'])
    }
  })

  it('body に \\n を含む item（id=278196925）で改行が保持される', () => {
    const notes = parseNoteFeed(fixture)
    const target = notes.find((n) => n.id === 278196925)
    expect(target).toBeDefined()
    expect(target!.body).toContain('\n')
  })

  it('items が空配列の json → 空配列を返す', () => {
    expect(parseNoteFeed({ items: [] })).toEqual([])
  })

  it('items キーが無い json → 空配列を返す（throw しない）', () => {
    expect(parseNoteFeed({})).toEqual([])
  })

  it('null / 配列でない不正 json → 空配列を返す（throw しない）', () => {
    expect(parseNoteFeed(null)).toEqual([])
    expect(parseNoteFeed(undefined)).toEqual([])
    expect(parseNoteFeed('string')).toEqual([])
    expect(parseNoteFeed(42)).toEqual([])
    expect(parseNoteFeed({ items: 'not-an-array' })).toEqual([])
    expect(parseNoteFeed({ items: null })).toEqual([])
  })

  it('comment.id/body/date のいずれかが欠落/型不正な note は除外される（型ガード）', () => {
    const json = {
      items: [
        { context: { type: 'note' }, comment: { id: 1, body: 'ok', date: '2025-01-01T00:00:00Z' } },
        { context: { type: 'note' }, comment: { id: 'not-number', body: 'x', date: '2025-01-01T00:00:00Z' } },
        { context: { type: 'note' }, comment: { id: 2, body: 123, date: '2025-01-01T00:00:00Z' } },
        { context: { type: 'note' }, comment: { id: 3, body: 'x', date: null } },
        { context: { type: 'note' }, comment: { id: 4, body: 'x' } }, // date 欠落
        { context: { type: 'note' }, comment: null }, // comment null
        { context: { type: 'note' } }, // comment 欠落
      ],
    }
    const notes = parseNoteFeed(json)
    expect(notes).toHaveLength(1)
    expect(notes[0]).toEqual({ id: 1, body: 'ok', date: '2025-01-01T00:00:00Z' })
  })

  it('context.type が note 以外（comment_restack/post_restack）は除外する', () => {
    const json = {
      items: [
        { context: { type: 'note' }, comment: { id: 1, body: 'a', date: '2025-01-01T00:00:00Z' } },
        { context: { type: 'comment_restack' }, comment: { id: 2, body: 'b', date: '2025-01-01T00:00:00Z' } },
        { context: { type: 'post_restack' }, comment: null },
      ],
    }
    const notes = parseNoteFeed(json)
    expect(notes).toHaveLength(1)
    expect(notes[0].id).toBe(1)
  })
})

describe('fetchAdminNotes - 判別ユニオン（fetch を mock）', () => {
  const ORIGINAL_ENV = process.env.SUBSTACK_ADMIN_USER_ID

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    if (ORIGINAL_ENV === undefined) {
      delete process.env.SUBSTACK_ADMIN_USER_ID
    } else {
      process.env.SUBSTACK_ADMIN_USER_ID = ORIGINAL_ENV
    }
  })

  it('SUBSTACK_ADMIN_USER_ID 未設定 → fetch せず { status:"error" }（Pitfall 3）', async () => {
    delete process.env.SUBSTACK_ADMIN_USER_ID
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const result = await fetchAdminNotes()
    expect(result).toEqual({ status: 'error' })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('HTTP エラー（res.ok=false）が2回続く → { status:"error" }（空配列フォールバックしない＝NOTE-03 / Pitfall 1）', async () => {
    process.env.SUBSTACK_ADMIN_USER_ID = '110584954'
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
    } as Response)
    const promise = fetchAdminNotes()
    await vi.runAllTimersAsync()
    const result = await promise
    expect(result).toEqual({ status: 'error' })
  })

  it('正常レスポンス（フィクスチャ json）→ { status:"ok", notes: 8件 }', async () => {
    process.env.SUBSTACK_ADMIN_USER_ID = '110584954'
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(fixture),
    } as Response)
    const promise = fetchAdminNotes()
    await vi.runAllTimersAsync()
    const result = await promise
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.notes).toHaveLength(8)
    }
  })

  it('items 空の正常レスポンス → { status:"ok", notes:[] }（0件＝error と区別）', async () => {
    process.env.SUBSTACK_ADMIN_USER_ID = '110584954'
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [] }),
    } as Response)
    const promise = fetchAdminNotes()
    await vi.runAllTimersAsync()
    const result = await promise
    expect(result).toEqual({ status: 'ok', notes: [] })
  })

  it('1回目失敗 → 1秒待ち → 2回目成功 → { status:"ok" }（リトライ踏襲）', async () => {
    process.env.SUBSTACK_ADMIN_USER_ID = '110584954'
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: false, status: 500 } as Response)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(fixture) } as Response)
    const promise = fetchAdminNotes()
    await vi.runAllTimersAsync()
    const result = await promise
    expect(result.status).toBe('ok')
  })
})
