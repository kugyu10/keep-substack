import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Module mocks ---

// next/cache revalidatePath → no-op
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Supabase server client (anon, cookie-based) → only used for auth.getUser()
const mockGetUser = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}))

// Supabase admin client (service role) → table reads/writes
const mockAdminFrom = vi.fn()
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: vi.fn(() => ({
    from: mockAdminFrom,
  })),
}))

// TODO: implement in Plan 02
import { updateCommitSlotsAction } from '../actions'

// --- Test helpers ---

const MEMBER_ID = 'test-member-uuid'
const AUTH_ERROR = 'ログインセッションが切れました。再ログインしてください'

function setupAdminMock(opts: {
  member?: { id: string } | null
  memberError?: unknown
  deleteError?: unknown
  insertError?: unknown
} = {}) {
  const insertSpy = vi.fn(async () => ({ error: opts.insertError ?? null }))
  const deleteSpy = vi.fn(() => ({
    eq: async () => ({ error: opts.deleteError ?? null }),
  }))
  const selectSpy = vi.fn(() => ({
    eq: () => ({
      single: async () => ({
        data: opts.member === undefined ? { id: MEMBER_ID } : opts.member,
        error: opts.memberError ?? null,
      }),
    }),
  }))

  mockAdminFrom.mockImplementation((table: string) => {
    if (table === 'members') return { select: selectSpy }
    if (table === 'member_commit_slots') return { delete: deleteSpy, insert: insertSpy }
    throw new Error(`unexpected table: ${table}`)
  })

  return { insertSpy, deleteSpy, selectSpy }
}

function makeFormData(slots: { day_of_week: number; hour: number }[]): FormData {
  const fd = new FormData()
  fd.append('slots', JSON.stringify(slots))
  return fd
}

describe('updateCommitSlotsAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
  })

  it('テスト1 (SCHED-03): 認証済みユーザーで delete → insert を実行し null を返す', async () => {
    const { deleteSpy, insertSpy } = setupAdminMock()

    const result = await updateCommitSlotsAction(null, makeFormData([{ day_of_week: 1, hour: 8 }]))

    expect(result).toBeNull()
    expect(deleteSpy).toHaveBeenCalled()
    expect(insertSpy).toHaveBeenCalledWith([{ member_id: MEMBER_ID, day_of_week: 1, hour: 8 }])
  })

  it('テスト2 (SCHED-03): 未認証時は AUTH_ERROR を返し DB 操作ゼロ', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const { deleteSpy, insertSpy } = setupAdminMock()

    const result = await updateCommitSlotsAction(null, makeFormData([{ day_of_week: 1, hour: 8 }]))

    expect(result).toBe(AUTH_ERROR)
    expect(deleteSpy).not.toHaveBeenCalled()
    expect(insertSpy).not.toHaveBeenCalled()
  })

  it('テスト3 (SCHED-01/02): slots が空配列のとき delete のみ実行し insert はスキップする', async () => {
    const { deleteSpy, insertSpy } = setupAdminMock()

    const result = await updateCommitSlotsAction(null, makeFormData([]))

    expect(result).toBeNull()
    expect(deleteSpy).toHaveBeenCalled()
    expect(insertSpy).not.toHaveBeenCalled()
  })

  it('テスト4 (SCHED-01): slots.length > 4 のとき "不正なスロット数です" を返す', async () => {
    setupAdminMock()

    const result = await updateCommitSlotsAction(
      null,
      makeFormData([
        { day_of_week: 1, hour: 8 },
        { day_of_week: 2, hour: 8 },
        { day_of_week: 3, hour: 8 },
        { day_of_week: 4, hour: 8 },
        { day_of_week: 5, hour: 8 },
      ])
    )

    expect(result).toBe('不正なスロット数です')
  })

  it('テスト5 (SCHED-02): day_of_week が範囲外（0）のとき "曜日の値が不正です" を返す', async () => {
    setupAdminMock()

    const result = await updateCommitSlotsAction(null, makeFormData([{ day_of_week: 0, hour: 8 }]))

    expect(result).toBe('曜日の値が不正です')
  })

  it('テスト6 (SCHED-02): hour が範囲外（24）のとき "時刻の値が不正です" を返す', async () => {
    setupAdminMock()

    const result = await updateCommitSlotsAction(null, makeFormData([{ day_of_week: 1, hour: 24 }]))

    expect(result).toBe('時刻の値が不正です')
  })

  it('delete エラー時は "保存に失敗しました..." を返す', async () => {
    setupAdminMock({ deleteError: { message: 'db error' } })
    const result = await updateCommitSlotsAction(null, makeFormData([{ day_of_week: 1, hour: 8 }]))
    expect(result).toBe('保存に失敗しました。もう一度お試しください')
  })

  it('insert エラー時は "保存に失敗しました..." を返す', async () => {
    setupAdminMock({ insertError: { message: 'db error' } })
    const result = await updateCommitSlotsAction(null, makeFormData([{ day_of_week: 1, hour: 8 }]))
    expect(result).toBe('保存に失敗しました。もう一度お試しください')
  })
})
