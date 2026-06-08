'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

export async function sendMagicLinkAction(
  prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const email = formData.get('email') as string
  if (!email) return 'メールアドレスを入力してください'

  const headersList = await headers()
  const origin = headersList.get('origin') ?? ''

  const next = formData.get('next') as string | null
  // next は page.tsx 側で既にバリデーション済み。ここでは存在チェックのみ
  const callbackUrl = next
    ? `${origin}/auth/callback?next=${encodeURIComponent(next)}`
    : `${origin}/auth/callback`

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: callbackUrl,
    },
  })

  if (error) {
    console.error('[sendMagicLink /login]', error)
    if (error.status === 429) {
      return '送信制限に達しました。しばらく待ってから再試行してください'
    }
    if (error.status === 500) {
      return 'メール送信の設定に問題があります。管理者にお問い合わせください'
    }
    return 'メールの送信に失敗しました。しばらく経ってから再試行してください'
  }

  return 'SENT'
}
