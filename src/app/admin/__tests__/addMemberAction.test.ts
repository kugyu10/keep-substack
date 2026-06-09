import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/requireAdmin', () => ({ requireAdmin: vi.fn(async () => {}) }))

const { mockAddMember, mockFetchFeedOrThrow, mockSaveArticles } = vi.hoisted(() => ({
  mockAddMember: vi.fn(),
  mockFetchFeedOrThrow: vi.fn(),
  mockSaveArticles: vi.fn(),
}))
vi.mock('@/lib/members', () => ({
  addMember: mockAddMember,
  updateMember: vi.fn(),
  deleteMember: vi.fn(),
}))
vi.mock('@/lib/fetchFeed', () => ({
  fetchFeedOrThrow: mockFetchFeedOrThrow,
  fetchWithRetry: vi.fn(),
}))
vi.mock('@/lib/articles', () => ({
  saveArticles: mockSaveArticles,
  deleteArticles: vi.fn(),
}))

import { addMemberAction } from '../actions'

function fd(name: string, publicationId: string): FormData {
  const f = new FormData()
  f.append('name', name)
  f.append('publicationId', publicationId)
  return f
}

describe('addMemberAction — 実在チェック', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchFeedOrThrow.mockResolvedValue({ items: [{ link: 'x', title: 't' }], imageUrl: 'img' })
    mockAddMember.mockResolvedValue(undefined)
    mockSaveArticles.mockResolvedValue(undefined)
  })

  it('RSS取得失敗（存在しない pid）→ 登録されず addMember 未呼び出し・エラー返却', async () => {
    mockFetchFeedOrThrow.mockRejectedValue(new Error('HTTP 404'))
    const result = await addMemberAction(null, fd('Test', 'nonexistent-pub'))
    expect(result).toContain('取得できませんでした')
    expect(mockAddMember).not.toHaveBeenCalled()
    expect(mockSaveArticles).not.toHaveBeenCalled()
  })

  it('RSS取得成功 → addMember と saveArticles が呼ばれ null を返す', async () => {
    const result = await addMemberAction(null, fd('Test', 'realpub'))
    expect(result).toBeNull()
    expect(mockAddMember).toHaveBeenCalledOnce()
    expect(mockSaveArticles).toHaveBeenCalledWith('realpub', [{ link: 'x', title: 't' }], 'img')
  })

  it('不正形式 pid（SSRF狙い）→ フィード取得前に弾かれ addMember 未呼び出し', async () => {
    const result = await addMemberAction(null, fd('Test', 'evil.com/'))
    expect(result).toContain('パブリケーションID')
    expect(mockFetchFeedOrThrow).not.toHaveBeenCalled()
    expect(mockAddMember).not.toHaveBeenCalled()
  })
})
