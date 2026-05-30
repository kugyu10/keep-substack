import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Hoisted mocks -------------------------------------------------------

const {
  mockGetUser,
  mockCreateServerClient,
  mockEq,
  mockUpdate,
  mockFrom,
  mockCreateAdminClient,
  mockRevalidatePath,
} = vi.hoisted(() => {
  const mockGetUser = vi.fn()
  const mockCreateServerClient = vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  }))

  // chainable admin client: from(...).update(...).eq(...) → { error }
  const mockEq = vi.fn()
  const mockUpdate = vi.fn(() => ({ eq: mockEq }))
  const mockFrom = vi.fn(() => ({ update: mockUpdate }))
  const mockCreateAdminClient = vi.fn(() => ({ from: mockFrom }))

  const mockRevalidatePath = vi.fn()

  return {
    mockGetUser,
    mockCreateServerClient,
    mockEq,
    mockUpdate,
    mockFrom,
    mockCreateAdminClient,
    mockRevalidatePath,
  }
})

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mockCreateServerClient,
}))
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: mockCreateAdminClient,
}))
vi.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
}))

import { updateTeamStatusAction } from '../actions'

describe('updateTeamStatusAction (TEAM-02)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // re-establish chainable defaults cleared by clearAllMocks
    mockCreateServerClient.mockImplementation(async () => ({
      auth: { getUser: mockGetUser },
    }))
    mockUpdate.mockImplementation(() => ({ eq: mockEq }))
    mockFrom.mockImplementation(() => ({ update: mockUpdate }))
    mockCreateAdminClient.mockImplementation(() => ({ from: mockFrom }))
    mockEq.mockResolvedValue({ error: null })
  })

  // (a) no authenticated user → unauthorized
  it('returns 権限がありません when no user is authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const result = await updateTeamStatusAction('team-1', 'public')

    expect(result).toBe('権限がありません')
    expect(mockCreateAdminClient).not.toHaveBeenCalled()
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  // (a) authenticated but non-admin role → unauthorized
  it('returns 権限がありません when user role is not admin', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1', app_metadata: { role: 'member' } } },
    })

    const result = await updateTeamStatusAction('team-1', 'hidden')

    expect(result).toBe('権限がありません')
    expect(mockCreateAdminClient).not.toHaveBeenCalled()
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  // (b) admin success → null, update called with correct args, revalidate called
  it('admin: updates team status, returns null, revalidates path', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'admin1', app_metadata: { role: 'admin' } } },
    })
    mockEq.mockResolvedValue({ error: null })

    const result = await updateTeamStatusAction('team-42', 'private')

    expect(result).toBeNull()
    expect(mockFrom).toHaveBeenCalledWith('teams')
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'private' })
    expect(mockEq).toHaveBeenCalledWith('id', 'team-42')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/teams')
  })

  // (c) supabase error → returns error message, no revalidate
  it('admin: returns the supabase error message on failure', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'admin1', app_metadata: { role: 'admin' } } },
    })
    mockEq.mockResolvedValue({ error: { message: 'update failed' } })

    const result = await updateTeamStatusAction('team-42', 'public')

    expect(result).toBe('update failed')
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })
})
