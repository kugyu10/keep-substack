import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Module mocks ---

// Mock exchangeCodeForSession to return success
const mockExchangeCode = vi.fn()
const mockGetUser = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: {
      exchangeCodeForSession: mockExchangeCode,
      getUser: mockGetUser,
    },
  })),
}))

const mockAdminFrom = vi.fn()
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: vi.fn(() => ({
    from: mockAdminFrom,
  })),
}))

import { GET } from '../callback/route'
import { NextRequest } from 'next/server'

// Helper to build a NextRequest for the callback route
function makeRequest(params: Record<string, string>): NextRequest {
  const url = new URL('http://localhost/auth/callback')
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  return new NextRequest(url.toString())
}

describe('GET /auth/callback — ?handle= propagation (Phase 27 D-04)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // default: successful code exchange
    mockExchangeCode.mockResolvedValue({ error: null })
    // default: no pid-related user lookup needed
    mockGetUser.mockResolvedValue({ data: { user: null } })
    // default: admin from not called
    mockAdminFrom.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: async () => ({ data: null, error: null }),
        })),
      })),
    })
  })

  it('?code=valid&handle=hoge → redirects to /my (D-02: handle param removed from redirect)', async () => {
    const req = makeRequest({ code: 'valid-code', handle: 'hoge' })
    const response = await GET(req)

    expect(response.status).toBe(307)
    const location = response.headers.get('location') ?? ''
    expect(location).toContain('/my')
    // D-02 後: /my への直接リダイレクト（handle= パラメータなし）
  })

  it('?code=valid (no handle) → redirects to /my (no handle param)', async () => {
    const req = makeRequest({ code: 'valid-code' })
    const response = await GET(req)

    expect(response.status).toBe(307)
    const location = response.headers.get('location') ?? ''
    expect(location).toMatch(/\/my$/)
    expect(location).not.toContain('handle=')
  })

  it('?code=valid&handle=hoge&pid=testpid → redirects to /my (D-02: direct redirect)', async () => {
    // When pid is present, getUser is called for auto-linking
    mockGetUser.mockResolvedValue({ data: { user: { id: 'uid-1' } } })

    // member found (existing member with user_id null → UPDATE)
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'members') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: async () => ({
                data: { id: 'member-1', user_id: null },
                error: null,
              }),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(async () => ({ error: null })),
          })),
        }
      }
      throw new Error(`unexpected table: ${table}`)
    })

    const req = makeRequest({ code: 'valid-code', handle: 'hoge', pid: 'testpid' })
    const response = await GET(req)

    expect(response.status).toBe(307)
    const location = response.headers.get('location') ?? ''
    expect(location).toContain('/my')
  })
})

describe('GET /auth/callback — D-02: member not found → INSERT (Phase 31)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockExchangeCode.mockResolvedValue({ error: null })
    mockGetUser.mockResolvedValue({ data: { user: { id: 'new-user-id' } } })
  })

  it('Test A: pid あり、member 存在しない → INSERT が呼ばれ /my にリダイレクト', async () => {
    const insertMock = vi.fn(async () => ({ error: null }))

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'members') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: async () => ({ data: null, error: null }),
            })),
          })),
          insert: insertMock,
        }
      }
      throw new Error(`unexpected table: ${table}`)
    })

    const req = makeRequest({ code: 'valid-code', pid: 'new-pid', handle: '@newhoge' })
    const response = await GET(req)

    expect(response.status).toBe(307)
    const location = response.headers.get('location') ?? ''
    expect(location).toMatch(/\/my$/)
    // INSERT が呼ばれたこと
    expect(insertMock).toHaveBeenCalledOnce()
    const insertPayload = (insertMock.mock.calls as unknown as [unknown[]][])[0][0]
    expect(insertPayload).toMatchObject({
      publication_id: 'new-pid',
      name: 'new-pid',
      user_id: 'new-user-id',
      substack_handle: '@newhoge',
    })
  })

  it('Test B: pid あり、member 存在しない、INSERT が 23505 → handle=null で再 INSERT が呼ばれる', async () => {
    let insertCallCount = 0
    const insertMock = vi.fn(async (payload: Record<string, unknown>) => {
      insertCallCount++
      if (insertCallCount === 1) {
        // 1回目: 23505 エラー
        return { error: { code: '23505', message: 'duplicate key value violates unique constraint' } }
      }
      // 2回目: フォールバック INSERT 成功
      return { error: null }
    })

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'members') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: async () => ({ data: null, error: null }),
            })),
          })),
          insert: insertMock,
        }
      }
      throw new Error(`unexpected table: ${table}`)
    })

    const req = makeRequest({ code: 'valid-code', pid: 'new-pid', handle: '@conflicthoge' })
    const response = await GET(req)

    expect(response.status).toBe(307)
    // INSERT が 2 回呼ばれたこと
    expect(insertMock).toHaveBeenCalledTimes(2)
    // 2 回目のペイロードは substack_handle=null
    const secondCallPayload = insertMock.mock.calls[1][0]
    expect(secondCallPayload).toMatchObject({
      publication_id: 'new-pid',
      substack_handle: null,
    })
  })

  it('Test D (H-1): pid が不正形式（SSRF狙い）→ INSERT/UPDATE は呼ばれず /へリダイレクトせず /my に進む', async () => {
    const insertMock = vi.fn(async () => ({ error: null }))
    const updateMock = vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) }))
    const selectMock = vi.fn()

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'members') {
        return {
          select: selectMock.mockReturnValue({
            eq: vi.fn(() => ({ maybeSingle: async () => ({ data: null, error: null }) })),
          }),
          insert: insertMock,
          update: updateMock,
        }
      }
      throw new Error(`unexpected table: ${table}`)
    })

    const req = makeRequest({ code: 'valid-code', pid: 'evil.com/', handle: '@x' })
    const response = await GET(req)

    expect(response.status).toBe(307)
    // 不正 pid のため紐付け処理（select/insert/update）は一切行われない
    expect(selectMock).not.toHaveBeenCalled()
    expect(insertMock).not.toHaveBeenCalled()
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('Test C: pid あり、member 存在する、user_id null → UPDATE が呼ばれる（既存動作の維持）', async () => {
    const updateEqMock = vi.fn(async () => ({ error: null }))
    const updateMock = vi.fn(() => ({ eq: updateEqMock }))

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'members') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: async () => ({
                data: { id: 'existing-member-id', user_id: null },
                error: null,
              }),
            })),
          })),
          update: updateMock,
        }
      }
      throw new Error(`unexpected table: ${table}`)
    })

    const req = makeRequest({ code: 'valid-code', pid: 'existing-pid', handle: '@existinghoge' })
    const response = await GET(req)

    expect(response.status).toBe(307)
    const location = response.headers.get('location') ?? ''
    expect(location).toContain('/my')
    // UPDATE が呼ばれたこと
    expect(updateMock).toHaveBeenCalledOnce()
    expect(updateMock).toHaveBeenCalledWith({ user_id: 'new-user-id' })
  })
})
