import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Module mocks ---

// next/cache revalidatePath → no-op
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Supabase server client (anon, cookie-based) → only used for auth.getUser() (requireAdmin)
const mockGetUser = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}))

// @/lib/members の updateMember をモック
// vi.mock はホイストされるため、ファクトリ内で外部変数は参照できない
// → vi.hoisted を使うパターン
const { mockUpdateMember } = vi.hoisted(() => ({
  mockUpdateMember: vi.fn(),
}))
vi.mock('@/lib/members', () => ({
  updateMember: mockUpdateMember,
  addMember: vi.fn(),
  deleteMember: vi.fn(),
}))

// fetchWithRetry と saveArticles も no-op でモック（addMemberAction 依存）
const { mockFetchFeedOrThrow } = vi.hoisted(() => ({
  mockFetchFeedOrThrow: vi.fn(),
}))
vi.mock('@/lib/fetchFeed', () => ({
  fetchWithRetry: vi.fn(async () => ({ items: [], imageUrl: undefined })),
  fetchFeedOrThrow: mockFetchFeedOrThrow,
}))
vi.mock('@/lib/articles', () => ({
  saveArticles: vi.fn(async () => {}),
  deleteArticles: vi.fn(async () => {}),
}))

import { updateMemberAction } from '../actions'

// --- Helpers ---

function makeFormData(
  name: string,
  addedAt: string,
  substackHandle?: string,
  newPublicationId?: string
): FormData {
  const fd = new FormData()
  fd.append('name', name)
  fd.append('addedAt', addedAt)
  if (substackHandle !== undefined) fd.append('substack_handle', substackHandle)
  if (newPublicationId !== undefined) fd.append('new_publication_id', newPublicationId)
  return fd
}

const DEFAULT_NAME = 'Test Member'
const DEFAULT_ADDED_AT = '2026-01-01T00:00:00.000Z'
const ADMIN_USER = { id: 'u1', role: 'admin' }

describe('updateMemberAction — substack_handle / publication_id 拡張 (Phase 31 D-04/D-05)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // default: authenticated admin
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER } })
    // default: updateMember succeeds
    mockUpdateMember.mockResolvedValue(undefined)
    // default: 実在チェックのフィード取得は成功
    mockFetchFeedOrThrow.mockResolvedValue({ items: [], imageUrl: undefined })
  })

  it('Test 1: substack_handle を含む FormData → updateMember が substackHandle: "@hoge" で呼ばれる', async () => {
    const formData = makeFormData(DEFAULT_NAME, DEFAULT_ADDED_AT, 'hoge')

    const result = await updateMemberAction('pub-1', formData)

    expect(result).toBeNull()
    expect(mockUpdateMember).toHaveBeenCalledOnce()
    const [, updates] = mockUpdateMember.mock.calls[0]
    expect(updates).toMatchObject({ substackHandle: '@hoge' })
  })

  it('Test 2: 空の substack_handle → updateMember が substackHandle: null で呼ばれる', async () => {
    const formData = makeFormData(DEFAULT_NAME, DEFAULT_ADDED_AT, '')

    const result = await updateMemberAction('pub-1', formData)

    expect(result).toBeNull()
    expect(mockUpdateMember).toHaveBeenCalledOnce()
    const [, updates] = mockUpdateMember.mock.calls[0]
    expect(updates).toMatchObject({ substackHandle: null })
  })

  it('Test 3: new_publication_id を含む FormData → updateMember が publicationId: "new-pid" で呼ばれる', async () => {
    const formData = makeFormData(DEFAULT_NAME, DEFAULT_ADDED_AT, undefined, 'new-pid')

    const result = await updateMemberAction('pub-1', formData)

    expect(result).toBeNull()
    expect(mockUpdateMember).toHaveBeenCalledOnce()
    const [, updates] = mockUpdateMember.mock.calls[0]
    expect(updates).toMatchObject({ publicationId: 'new-pid' })
  })

  it('Test 3b: new_publication_id 変更で実在チェック失敗 → エラー返却・updateMember 未呼び出し', async () => {
    mockFetchFeedOrThrow.mockRejectedValue(new Error('HTTP 404'))
    const formData = makeFormData(DEFAULT_NAME, DEFAULT_ADDED_AT, undefined, 'nonexistent-pid')

    const result = await updateMemberAction('pub-1', formData)

    expect(result).toContain('取得できませんでした')
    expect(mockUpdateMember).not.toHaveBeenCalled()
  })

  it('Test 4: updateMember が 23505 を含む Error を throw → "このハンドルはすでに使用されています" が返る', async () => {
    const err = new Error('duplicate key value violates unique constraint')
    ;(err as any).code = '23505'
    mockUpdateMember.mockRejectedValue(err)

    const formData = makeFormData(DEFAULT_NAME, DEFAULT_ADDED_AT, '@conflicthoge')

    const result = await updateMemberAction('pub-1', formData)

    expect(result).toBe('このハンドルはすでに使用されています')
  })

  it('Test 5: 不正な substack_handle（スペース含む）→ バリデーションエラーが返り updateMember は呼ばれない', async () => {
    const formData = makeFormData(DEFAULT_NAME, DEFAULT_ADDED_AT, '@ invalid')
    const result = await updateMemberAction('pub-1', formData)
    expect(result).toBe('ハンドルに使用できない文字が含まれています（英数字・_・- のみ使用可）')
    expect(mockUpdateMember).not.toHaveBeenCalled()
  })

  it('Test 6: requireAdmin が Unauthorized → "権限がありません" が返る', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const formData = makeFormData(DEFAULT_NAME, DEFAULT_ADDED_AT)

    const result = await updateMemberAction('pub-1', formData)

    expect(result).toBe('権限がありません')
    expect(mockUpdateMember).not.toHaveBeenCalled()
  })
})
