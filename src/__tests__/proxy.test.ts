import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// --- Module mock: @supabase/ssr createServerClient ---
// proxy.ts calls createServerClient(...).auth.getUser(). We stub that single call
// so the test never touches a real Supabase instance. mockGetUser is hoisted so the
// vi.mock factory (also hoisted) can close over it.
const { mockGetUser } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
}))

vi.mock('@supabase/ssr', () => ({
  // proxy.ts only uses .auth.getUser() and the cookies adapter callbacks (which it
  // supplies itself). Returning a minimal stub is sufficient.
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}))

import { proxy } from '../proxy'

const ADMIN_TEAMS_URL =
  'https://example.com/admin/teams/' + encodeURIComponent('営業部')

function makeRequest(): NextRequest {
  // Real NextRequest so request.nextUrl.pathname is '/admin/teams/...' and
  // request.cookies.getAll() works without further stubbing.
  return new NextRequest(new URL(ADMIN_TEAMS_URL))
}

describe('proxy() — /admin/teams/{teamName} authorization gate (VIEW-02)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Dummy env so createServerClient(...!) does not blow up on undefined.
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://x.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon'
  })

  it('non-admin redirect: a non-admin user is redirected to / (T-24-03)', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u-1', app_metadata: { role: 'member' } } },
    })

    const res = await proxy(makeRequest())

    // NextResponse.redirect defaults to 307.
    expect([307, 308]).toContain(res.status)
    const location = res.headers.get('location')
    expect(location).not.toBeNull()
    // redirect target is the site root '/'
    expect(location).toBe('https://example.com/')
  })

  it('unauthenticated redirect: a request with no user is redirected to /', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const res = await proxy(makeRequest())

    expect([307, 308]).toContain(res.status)
    expect(res.headers.get('location')).toBe('https://example.com/')
  })

  it('admin passes through: an admin user is not redirected (no location header)', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u-admin', app_metadata: { role: 'admin' } } },
    })

    const res = await proxy(makeRequest())

    // NextResponse.next() carries no location header → request passes through.
    expect(res.headers.get('location')).toBeNull()
  })
})
