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

// Supabase admin client (service role) → table reads/writes + rpc
const mockAdminFrom = vi.fn()
const mockAdminRpc = vi.fn()
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: vi.fn(() => ({
    from: mockAdminFrom,
    rpc: mockAdminRpc,
  })),
}))

import { updateCommitSlotsAction } from '../actions'

// --- Test helpers ---

const MEMBER_ID = 'test-member-uuid'
const AUTH_ERROR = 'ログインセッションが切れました。再ログインしてください'

function setupAdminMock(opts: {
  member?: { id: string } | null
  memberError?: unknown
  rpcError?: unknown
} = {}) {
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
    throw new Error(`unexpected table: ${table}`)
  })

  mockAdminRpc.mockResolvedValue({ error: opts.rpcError ?? null })

  return { selectSpy, mockAdminRpc }
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

  it('テスト1 (SCHED-03): 認証済みユーザーで rpc を呼び出し null を返す', async () => {
    setupAdminMock()

    const result = await updateCommitSlotsAction(null, makeFormData([{ day_of_week: 1, hour: 8 }]))

    expect(result).toBeNull()
    expect(mockAdminRpc).toHaveBeenCalledWith('replace_member_commit_slots', {
      p_member_id: MEMBER_ID,
      p_slots: [{ day_of_week: 1, hour: 8 }],
    })
  })

  it('テスト2 (SCHED-03): 未認証時は AUTH_ERROR を返し rpc は呼ばれない', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    setupAdminMock()

    const result = await updateCommitSlotsAction(null, makeFormData([{ day_of_week: 1, hour: 8 }]))

    expect(result).toBe(AUTH_ERROR)
    expect(mockAdminRpc).not.toHaveBeenCalled()
  })

  it('テスト3: slots が空配列のとき rpc を空配列で呼び出す（削除のみのケース）', async () => {
    setupAdminMock()

    const result = await updateCommitSlotsAction(null, makeFormData([]))

    expect(result).toBeNull()
    expect(mockAdminRpc).toHaveBeenCalledWith('replace_member_commit_slots', {
      p_member_id: MEMBER_ID,
      p_slots: [],
    })
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

  it('rpc エラー時は "保存に失敗しました..." を返す', async () => {
    setupAdminMock({ rpcError: { message: 'db error' } })
    const result = await updateCommitSlotsAction(null, makeFormData([{ day_of_week: 1, hour: 8 }]))
    expect(result).toBe('保存に失敗しました。もう一度お試しください')
  })
})
