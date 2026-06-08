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

function makeFormData(email: string, next?: string): FormData {
  const fd = new FormData()
  fd.append('email', email)
  if (next) fd.append('next', next)
  return fd
}

describe('sendMagicLinkAction — /login 既存メンバー再ログイン (Phase 31 G-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHeadersGet.mockReturnValue('http://localhost')
    mockSignInWithOtp.mockResolvedValue({ error: null })
  })

  it('Test L-1: email のみ（pid/handle なし） → SENT が返り、signInWithOtp が呼ばれる', async () => {
    const fd = makeFormData('user@example.com')
    const result = await sendMagicLinkAction(null, fd)
    expect(result).toBe('SENT')
    expect(mockSignInWithOtp).toHaveBeenCalledOnce()
  })

  it('Test L-2: callbackUrl に pid/handle パラメータが含まれない（/auth/callback のみ）', async () => {
    const fd = makeFormData('user@example.com')
    await sendMagicLinkAction(null, fd)
    const callArgs = mockSignInWithOtp.mock.calls[0][0]
    expect(callArgs.options.emailRedirectTo).toContain('/auth/callback')
    expect(callArgs.options.emailRedirectTo).not.toContain('pid=')
    expect(callArgs.options.emailRedirectTo).not.toContain('handle=')
  })

  it("Test L-2b: next='/my' のとき callbackUrl に ?next=%2Fmy が付与される", async () => {
    const fd = makeFormData('user@example.com', '/my')
    await sendMagicLinkAction(null, fd)
    const callArgs = mockSignInWithOtp.mock.calls[0][0]
    expect(callArgs.options.emailRedirectTo).toBe('http://localhost/auth/callback?next=%2Fmy')
  })

  it('Test L-2c: next なし のとき callbackUrl に ?next= が付与されない', async () => {
    const fd = makeFormData('user@example.com')
    await sendMagicLinkAction(null, fd)
    const callArgs = mockSignInWithOtp.mock.calls[0][0]
    expect(callArgs.options.emailRedirectTo).toBe('http://localhost/auth/callback')
  })

  it('Test L-3: email が空 → メールアドレスを入力してください が返り、signInWithOtp は呼ばれない', async () => {
    const fd = makeFormData('')
    const result = await sendMagicLinkAction(null, fd)
    expect(result).toBe('メールアドレスを入力してください')
    expect(mockSignInWithOtp).not.toHaveBeenCalled()
  })

  it('Test L-4: Supabase が 429 エラー → 送信制限に達しました。しばらく待ってから再試行してください', async () => {
    mockSignInWithOtp.mockResolvedValue({ error: { status: 429 } })
    const fd = makeFormData('user@example.com')
    const result = await sendMagicLinkAction(null, fd)
    expect(result).toBe('送信制限に達しました。しばらく待ってから再試行してください')
  })
})
