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

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) {
    console.error('[sendMagicLink]', error)
    return 'メールの送信に失敗しました。しばらく経ってから再試行してください'
  }

  return 'SENT'
}
