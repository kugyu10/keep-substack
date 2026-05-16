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

  const headersList = await headers()
  const origin = headersList.get('origin') ?? ''

  const callbackUrl = pid
    ? `${origin}/auth/callback?pid=${encodeURIComponent(pid)}`
    : `${origin}/auth/callback`

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
    return 'メールの送信に失敗しました。しばらく経ってから再試行してください'
  }

  return 'SENT'
}
