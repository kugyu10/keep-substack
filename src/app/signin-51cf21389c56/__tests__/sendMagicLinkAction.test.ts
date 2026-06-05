import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Module mocks ---

// Mock next/headers to return a deterministic origin
const mockHeadersGet = vi.fn()
vi.mock('next/headers', () => ({
  headers: vi.fn(async () => ({
    get: mockHeadersGet,
  })),
}))

// Mock signInWithOtp to succeed by default
const mockSignInWithOtp = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: {
      signInWithOtp: mockSignInWithOtp,
    },
  })),
}))

import { sendMagicLinkAction } from '../actions'

// --- Test helpers ---

function makeFormData(email: string, pid?: string, handle?: string): FormData {
  const fd = new FormData()
  fd.append('email', email)
  if (pid !== undefined) fd.append('pid', pid)
  if (handle !== undefined) fd.append('handle', handle)
  return fd
}

describe('sendMagicLinkAction — pid/handle validation (Phase 31 D-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHeadersGet.mockReturnValue('http://localhost')
    mockSignInWithOtp.mockResolvedValue({ error: null })
  })

  it('Test 1: pid が欠けた FormData → 登録リンクが不正です', async () => {
    // pid なし、handle あり
    const fd = makeFormData('user@example.com', undefined, '@hoge')
    const result = await sendMagicLinkAction(null, fd)
    expect(result).toBe('登録リンクが不正です')
    // signInWithOtp は呼ばれないこと
    expect(mockSignInWithOtp).not.toHaveBeenCalled()
  })

  it('Test 2: handle が欠けた FormData → 登録リンクが不正です', async () => {
    // pid あり、handle なし
    const fd = makeFormData('user@example.com', 'pid-123', undefined)
    const result = await sendMagicLinkAction(null, fd)
    expect(result).toBe('登録リンクが不正です')
    expect(mockSignInWithOtp).not.toHaveBeenCalled()
  })

  it('Test 3: pid と handle が両方ある → Supabase signInWithOtp を呼び SENT が返る', async () => {
    const fd = makeFormData('user@example.com', 'pid-123', '@hoge')
    const result = await sendMagicLinkAction(null, fd)
    expect(result).toBe('SENT')
    expect(mockSignInWithOtp).toHaveBeenCalledOnce()
    // callbackUrl に pid と handle が含まれることを確認
    const callArgs = mockSignInWithOtp.mock.calls[0][0]
    expect(callArgs.options.emailRedirectTo).toContain('pid=')
    expect(callArgs.options.emailRedirectTo).toContain('handle=')
  })

  it('Test 4: email が空 → メールアドレスを入力してください', async () => {
    const fd = makeFormData('', 'pid-123', '@hoge')
    const result = await sendMagicLinkAction(null, fd)
    expect(result).toBe('メールアドレスを入力してください')
    expect(mockSignInWithOtp).not.toHaveBeenCalled()
  })
})
