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

  it('?code=valid&handle=hoge → redirects to /my?handle=hoge', async () => {
    const req = makeRequest({ code: 'valid-code', handle: 'hoge' })
    const response = await GET(req)

    expect(response.status).toBe(307)
    const location = response.headers.get('location') ?? ''
    expect(location).toContain('/my')
    expect(location).toContain('handle=hoge')
  })

  it('?code=valid (no handle) → redirects to /my (no handle param)', async () => {
    const req = makeRequest({ code: 'valid-code' })
    const response = await GET(req)

    expect(response.status).toBe(307)
    const location = response.headers.get('location') ?? ''
    expect(location).toMatch(/\/my$/)
    expect(location).not.toContain('handle=')
  })

  it('?code=valid&handle=hoge&pid=testpid → redirects to /my?handle=hoge (pid independent)', async () => {
    // When pid is present, getUser is called for auto-linking
    mockGetUser.mockResolvedValue({ data: { user: { id: 'uid-1' } } })

    const req = makeRequest({ code: 'valid-code', handle: 'hoge', pid: 'testpid' })
    const response = await GET(req)

    expect(response.status).toBe(307)
    const location = response.headers.get('location') ?? ''
    expect(location).toContain('/my')
    expect(location).toContain('handle=hoge')
  })
})
