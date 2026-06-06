'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

export async function sendMagicLinkAction(
  prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const email = formData.get('email') as string
  if (!email) return 'メールアドレスを入力してください'

  const pid = (formData.get('pid') as string | null)?.trim() || null
  const handle = (formData.get('handle') as string | null)?.trim() || null

  // D-01: pid と handle は両方必須。片方でも欠けていたら早期エラー
  if (!pid || !handle) return '登録リンクが不正です'

  const headersList = await headers()
  const origin = headersList.get('origin') ?? ''

  // pid && handle が保証されたため単一形式で生成
  const callbackUrl = `${origin}/auth/callback?pid=${encodeURIComponent(pid)}&handle=${encodeURIComponent(handle)}`

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: callbackUrl,
    },
  })

  if (error) {
    console.error('[sendMagicLink]', error)
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
