import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// --- Module mock: @supabase/ssr createServerClient ---
// middleware.ts calls createServerClient(...).auth.getUser(). We stub that single call
// so the test never touches a real Supabase instance. mockGetUser is hoisted so the
// vi.mock factory (also hoisted) can close over it.
const { mockGetUser } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}))

import { middleware } from './middleware'

function makeRequest(path: string): NextRequest {
  return new NextRequest(new URL(`https://example.com${path}`))
}

describe('middleware() — /my auth guard (BUG-02)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://x.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon'
  })

  it('Test 1: GET /my with no session cookie → redirects to /login?next=%2Fmy', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const res = await middleware(makeRequest('/my'))

    expect([307, 308]).toContain(res.status)
    const location = res.headers.get('location')
    expect(location).not.toBeNull()
    expect(location).toMatch(/\/login\?next=%2Fmy/)
  })

  it('Test 2: GET /my with valid session → response is NextResponse.next() (no redirect)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u-1', email: 'test@example.com' } } })

    const res = await middleware(makeRequest('/my'))

    // NextResponse.next() has no location header
    expect(res.headers.get('location')).toBeNull()
  })

  it('Test 3: GET /my/settings with no session → redirects to /login?next=%2Fmy%2Fsettings', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const res = await middleware(makeRequest('/my/settings'))

    expect([307, 308]).toContain(res.status)
    const location = res.headers.get('location')
    expect(location).not.toBeNull()
    expect(location).toMatch(/\/login\?next=%2Fmy%2Fsettings/)
  })
})
